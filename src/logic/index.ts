const path1                = require('path');
const { getDatabase, ref, set, get, onValue } = require("firebase/database");
const { getArbolOG, buildStructure, checkForUpdatesAndRender } = require('./services/fetch');
const { populateFileList } = require('./renderer/renderStructure');
const { rtdb, db }         = require(path1.resolve(__dirname, './logic/db'))
const { state }            = require('./services/state')
const { startPeriodicSync} = require('./services/dropboxSync');

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
            const result = folders.find(item => item.name.includes(newProjectID));

            if (result) {
                console.log("Target folder found: ", result);
                const particularEntry = await getArbolOG(result.path);
                const particularFolder = buildStructure(particularEntry);

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

// Function to update RTDB
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

async function main() {
    try {
        state.initState()
        const currentState = state.getState();
        let currentProjectID = currentState.project;

        const projectsFolderPath = currentState.projectsFolderPath;
        
        const allEntries = await getArbolOG(projectsFolderPath);
        const rootFolder = buildStructure(allEntries);

        console.log("rootFolder: ", rootFolder);

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
            currentProjectID = await projectIDChecker(currentProjectID, rootFolder);
            handleStateChange();

             // Start periodic sync with Dropbox
            startPeriodicSync();
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

main();