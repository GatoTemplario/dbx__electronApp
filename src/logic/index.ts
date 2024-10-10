const path1                = require('path');
const { getDatabase, ref, set, get, onValue } = require("firebase/database");
const { getArbolOG, buildStructure, checkForUpdatesAndRender, fetchChildProject } = require('./services/fetch');
const { populateFileList } = require('./renderer/renderStructure');
const { rtdb, db }         = require(path1.resolve(__dirname, './logic/db'))
const { state }            = require('./services/state')
const { startSync,startPeriodicSync} = require('./services/dropboxSync');
const { dropboxSyncManager } = require('./services/dropboxSync');

let isUpdatingFromRTDB = false;

async function uploadJson(data: any, fileName: string) {
    try {
        const dbRef = ref(rtdb, `fileStructure/${fileName}`);
        await set(dbRef, data);
        console.log(`Successfully uploaded ${fileName} to Dropbox and updated Firebase`);
    } catch (error: any) {
        console.error("Error in uploadJson:", error);
        throw error;
       }
}

async function projectIDChecker(currentProjectID: string, rootFolder: any) {
    const currentState = state.getState();
    const newProjectID = currentState.project;

    if (newProjectID && (newProjectID !== currentProjectID || !currentState.initialLoadComplete)) {
        console.log("New project ID detected or initial load. Checking if update is needed...");
        
        const dbRef = ref(rtdb, `fileStructure/${newProjectID}`);
        const snapshot = await get(dbRef);

        if (!snapshot.exists()) {
            console.log("Project structure not found in database. Updating...");
            const folders = rootFolder.folders;
            const result = folders.find(item => item.name.startsWith(newProjectID.toString()));

            if (result) {
                console.log("Target folder found: ", result);
                const particularFolder = await fetchChildProject(newProjectID, rootFolder.path);

                await uploadJson(particularFolder, newProjectID);
                state.setState({ project: newProjectID, tree: particularFolder, initialLoadComplete: true });
                console.log("Project data uploaded for new project ID: ", newProjectID);
            } else {
                console.log("No matching folder found for project ID: ", newProjectID);
                state.setState({ initialLoadComplete: true });
            }
        } else {
            console.log("Project structure exists in database. Fetching and updating state...");
            const existingStructure = snapshot.val();
            state.setState({ project: newProjectID, tree: existingStructure, initialLoadComplete: true });
        }
        
        return newProjectID;
    } else {
        console.log("No changes in project ID or initial load already complete");
        return currentProjectID;
    }
}
function updateRTDB(projectId: string, treeData: any) {
    const dbRef = ref(rtdb, `fileStructure/${projectId}`);
    set(dbRef, treeData).catch(error => {
        console.error("Error updating RTDB:", error);
    });
}

// Function to handle RTDB updates
function handleRTDBUpdate(snapshot: any) {
    if (snapshot.exists()) {
        const updatedTree = snapshot.val();
        console.log("Detected changes in Firebase, updating state...");
        isUpdatingFromRTDB = true;
        state.setState({ ...state.getState(), tree: updatedTree });
        isUpdatingFromRTDB = false;
    }
}

// Set up RTDB listener
function setupRTDBListener(projectId: string) {
    const dbRef = ref(rtdb, `fileStructure/${projectId}`);
    return onValue(dbRef, handleRTDBUpdate, (error) => {
        console.error("Error listening for changes in Firebase RTDB:", error);
    });
}

// Function to handle state changes
function handleStateChange() {
    const currentState = state.getState();
    if (currentState.initialLoadComplete && !isUpdatingFromRTDB) {
        updateRTDB(currentState.project, currentState.tree);
    }
}
function findProjectFolder(rootFolders, projectId) {
    // console.log("Root Folders: ", rootFolders);

    // Buscar la carpeta que contiene el proyecto
    for (const folder of rootFolders) {
        // Buscar en los hijos de la carpeta
        const matchingChild = folder.children.find(child => child.name.startsWith(projectId));
        
        if (matchingChild) {
            // Devuelve el path de la carpeta encontrada
            return {
                path: matchingChild.path_lower,
                name: matchingChild.name,
                id: matchingChild.id,
                active: matchingChild.active,
                comment: matchingChild.comment,
            };
        }
    }

    // Si no se encuentra la carpeta, devuelve undefined o maneja el caso
    console.log(`No folder found for project ID: ${projectId}`);
    return null;
}

async function main() {
    try {
        state.initState()
        const currentState = state.getState();
        let currentProjectID = currentState.project;

        const projectsFolderPath = currentState.projectsFolderPath;
        
        // Step 1: Fetch the overall structure
        const allEntries = await getArbolOG(projectsFolderPath);
        console.log("allEntries: ", allEntries);
        
        // Set up initial RTDB listener
        let rtdbListener = setupRTDBListener(currentProjectID);
        
        state.subscribe(async () => {
            const newState = state.getState();
            if (newState.project !== currentProjectID) {
                // Project has changed, update listener
                if (rtdbListener) rtdbListener();
                currentProjectID = newState.project;
                rtdbListener = setupRTDBListener(currentProjectID);
            }
            
        // Step 2: Check if project ID has changed or initial load is not complete
        if (newState.project && (newState.project !== currentProjectID || !newState.initialLoadComplete)) {
            const projectFolder = findProjectFolder(allEntries, newState.project);
            
            if (projectFolder) {
                const projectContents = await fetchChildProject(newState.project, projectFolder);
                
                if (projectContents) {
                    state.setState({
                        ...newState,
                        ...projectContents
                    });
                } else {
                    console.log(`Root folder for project ID ${newState.project} not found in structured contents`);
                    state.setState({ ...newState, initialLoadComplete: true });
                }
            } else {
                console.log(`Project folder for ID ${newState.project} not found`);
                state.setState({ ...newState, initialLoadComplete: true });
            }
        }
            
            handleStateChange();
        });

        // Start periodic sync with Dropbox
        // startPeriodicSync();
        startPeriodicSync()



    } catch (error) {
        console.error("Error:", error);
    }
}

main();









// const path1                = require('path');
// const { getDatabase, ref, set, get, onValue } = require("firebase/database");
// const { getArbolOG, buildStructure, checkForUpdatesAndRender, fetchChildProject } = require('./services/fetch');
// const { populateFileList } = require('./renderer/renderStructure');
// const { rtdb, db }         = require(path1.resolve(__dirname, './logic/db'))
// const { state }            = require('./services/state')
// const { startPeriodicSync, stopPeriodicSync} = require('./services/dropboxSync');

// // Constants
// const INITIAL_LOAD_DELAY = 1000; // 1 second

// // Firebase Service
// class FirebaseService {
//   private static instance: FirebaseService;

//   private constructor() {}

//   public static getInstance(): FirebaseService {
//     if (!FirebaseService.instance) {
//       FirebaseService.instance = new FirebaseService();
//     }
//     return FirebaseService.instance;
//   }

//   public async updateRTDB(projectId: string, treeData: any): Promise<void> {
//     const dbRef = ref(rtdb, `fileStructure/${projectId}`);
//     try {
//       await set(dbRef, treeData);
//     } catch (error) {
//       console.error("Error updating RTDB:", error);
//       throw error;
//     }
//   }

//   public setupRTDBListener(projectId: string, callback: (snapshot: any) => void): () => void {
//     const dbRef = ref(rtdb, `fileStructure/${projectId}`);
//     return onValue(dbRef, callback, (error) => {
//       console.error("Error listening for changes in Firebase RTDB:", error);
//     });
//   }

//   public async getProjectStructure(projectId: string): Promise<any> {
//     const dbRef = ref(rtdb, `fileStructure/${projectId}`);
//     try {
//       const snapshot = await get(dbRef);
//       return snapshot.exists() ? snapshot.val() : null;
//     } catch (error) {
//       console.error("Error fetching project structure from RTDB:", error);
//       throw error;
//     }
//   }
// }

// // Helper Functions
// function findProjectFolder(rootFolders: any[], projectId: string): any | null {
//     console.log("Finding project folder for project ID: ", rootFolders);
    
//   for (const folder of rootFolders) {
//     const matchingChild = folder.children.find((child: any) => child.name.startsWith(projectId));
//     if (matchingChild) {
//       return {
//         path: matchingChild.path_lower,
//         name: matchingChild.name,
//         id: matchingChild.id,
//         active: matchingChild.active,
//         comment: matchingChild.comment,
//       };
//     }
//   }
//   console.log(`No folder found for project ID: ${projectId}`);
//   return null;
// }

// // Main Application Logic
// class AppManager {
//   private firebaseService: FirebaseService;
//   private rtdbListener: (() => void) | null = null;

//   constructor() {
//     this.firebaseService = FirebaseService.getInstance();
//   }

//   private async handleRTDBUpdate(snapshot: any): Promise<void> {
//     if (snapshot.exists()) {
//       const updatedTree = snapshot.val();
//       console.log("Detected changes in Firebase, updating state...");
//       state.setState({ ...state.getState(), tree: updatedTree });
//     }
//   }

//   private async handleStateChange(): Promise<void> {
//     const currentState = state.getState();
//     if (currentState.initialLoadComplete) {
//       await this.firebaseService.updateRTDB(currentState.project, currentState.tree);
//     }
//   }

//   private async updateProjectStructure(newProjectID: string, rootFolder: any): Promise<void> {
//     console.log("New project ID detected or initial load. Checking if update is needed...");
    
//     const existingStructure = await this.firebaseService.getProjectStructure(newProjectID);

//     if (!existingStructure) {
//       console.log("Project structure not found in database. Updating...");
//       const projectFolder = findProjectFolder(rootFolder.folders, newProjectID);

//       if (projectFolder) {
//         console.log("Target folder found: ", projectFolder);
//         const particularFolder = await fetchChildProject(newProjectID, rootFolder.path);

//         await this.firebaseService.updateRTDB(newProjectID, particularFolder);
//         state.setState({ project: newProjectID, tree: particularFolder, initialLoadComplete: true });
//         console.log("Project data uploaded for new project ID: ", newProjectID);
//       } else {
//         console.log("No matching folder found for project ID: ", newProjectID);
//         state.setState({ initialLoadComplete: true });
//       }
//     } else {
//       console.log("Project structure exists in database. Fetching and updating state...");
//       state.setState({ project: newProjectID, tree: existingStructure, initialLoadComplete: true });
//     }
//   }

//   public async initialize(): Promise<void> {
//     try {
//         state.initState();
//         const currentState = state.getState();
//         let currentProjectID = currentState.project;

//         const projectsFolderPath = currentState.projectsFolderPath;
        
//         // Fetch the overall structure
//         const allEntries = await getArbolOG(projectsFolderPath);
//         console.log("allEntries: ", allEntries);
        
//         // Set up initial RTDB listener
//         this.rtdbListener = this.firebaseService.setupRTDBListener(currentProjectID, this.handleRTDBUpdate.bind(this));
      
//         state.subscribe(async () => {
//             const newState = state.getState();
//             if (newState.project !== currentProjectID) {
//                 // Project has changed, update listener
//                 if (this.rtdbListener) this.rtdbListener();
//                 currentProjectID = newState.project;
//                 this.rtdbListener = this.firebaseService
//                 .setupRTDBListener(currentProjectID, this.handleRTDBUpdate.bind(this));
//             }
            
//             // Check if project ID has changed or initial load is not complete
//             if (newState.project && (newState.project !== currentProjectID || !newState.initialLoadComplete)) {
//                 await this.updateProjectStructure(newState.project, allEntries);
//             }
            
//             await this.handleStateChange();
//         });

//         // Start periodic sync with Dropbox
//         startPeriodicSync();

//     } catch (error) {
//         console.error("Error during initialization:", error);
//     }
//   }
//   public cleanup(): void {
//     stopPeriodicSync();
//     if (this.rtdbListener) {
//         this.rtdbListener();
//     }
// }  
// }

// // Application Entry Point
// async function main() {
//   const app = new AppManager();
//   await app.initialize();

  
// }

// main();