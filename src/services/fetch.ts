// const path = require('path');
const dotenv = require('dotenv');
// const { renderData } = require('../renderer/renderStructure');
// const fs = require('fs');
// const { StateManager } = require('./state');
// const { FolderData } = require('../renderer/renderStructure');
const { authManager } = require('./dropboxAuthManager');

dotenv.config()
// let stateManager: typeof StateManager | null = null;

interface ExtendedEntry {
    tag: string;
    name: string;
    path_lower: string;
    id: string;
    active?: boolean;
    comment?: string;
}

class ObjRes {
    name: string;
    path: string;
    id: string;
    active: boolean;
    comment: string;
    folders: ObjRes[];
    files: ExtendedEntry[];

    constructor(name: string, path: string, id: string) {
        this.name = name;
        this.path = path;
        this.id = id;
        this.active = true;
        this.comment = "";
        this.folders = [];
        this.files = [];
    }
}

function buildStructure(entries: ExtendedEntry[]): ObjRes {
    const root = new ObjRes("root", "/", "root-id");
    const pathMap = new Map<string, ObjRes>();

    // Initialize the root folder in the map
    pathMap.set(root.path, root);

    // Process each entry
    for (const entry of entries) {
        if (entry["tag"] === "folder") {
            if (!pathMap.has(entry.path_lower)) {
                const folder = new ObjRes(entry.name, entry.path_lower, entry.id);
                folder.active = entry.active || false;
                folder.comment = entry.comment || "";
                pathMap.set(entry.path_lower, folder);

                // Determine parent path
                const parentPath = entry.path_lower.substring(0, entry.path_lower.lastIndexOf('/')) || "/";
                const parentFolder = pathMap.get(parentPath);

                if (parentFolder) {
                    parentFolder.folders.push(folder);
                }
            }
        } else if (entry["tag"] === "file") {
            // Determine parent path
            const parentPath = entry.path_lower.substring(0, entry.path_lower.lastIndexOf('/')) || "/";
            const parentFolder = pathMap.get(parentPath);

            if (parentFolder) {
                if (!parentFolder.files.some(file => file.path_lower === entry.path_lower)) {
                    parentFolder.files.push({
                        ...entry,
                        active: entry.active || false,
                        comment: entry.comment || ""
                    });
                }
            }
        }
    }

    const aux = Array.from(pathMap.entries());
    const secondElement = aux[1][1];
    
    return secondElement;
}

async function getArbolOG(path: string): Promise<ExtendedEntry[]> {
    try {
        const dbx = await authManager.getAuthorizedDropboxInstance()
        
        let response = await dbx.filesListFolder({ path, recursive: true });
        
        let allEntries = response.result.entries.map((entry: any) => {
            const modifiedEntry = {
                ...entry,
            
                tag: entry['.tag'],
                active: false,
                comment: ""
            };
            delete modifiedEntry['.tag'];       
            
            return modifiedEntry;
        });
        
        while (response.result.has_more) {
            console.log("Pagination detected. Fetching remaining entries...");
            response = await dbx.filesListFolderContinue({ cursor: response.result.cursor });
            const newEntries = response.result.entries.map((entry: any) => {
            const modifiedEntry = {
                    ...entry,
                    tag: entry['.tag'],
                    active: false,
                    comment: ""
            };
            delete modifiedEntry['.tag'];
                
                return modifiedEntry;
            });
            allEntries = allEntries.concat(newEntries);
        }
        // console.log("All entries fetched:", allEntries);
        
        return allEntries;
    } catch (error) {
        console.error("Error fetching folder contents:", error);
        return [];
    }
}

// agregado para simular firebase 9/9
// 



// async function getLastModifiedTimestamp(filePath: string): Promise<number> {
//     const dbx = await authManager.getAuthorizedDropboxInstance()
//     const response = (await dbx.filesGetMetadata({ path: filePath })).result as any;
//     const timestamp = new Date (response.server_modified)
//     const getTime = timestamp.getTime()

//     return getTime; // Convert to timestamp
// }


// function deepEqual(obj1: any, obj2: any): boolean {
//     if (obj1 === obj2) return true;
//     if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) return false;

//     let keys1 = Object.keys(obj1);
//     let keys2 = Object.keys(obj2);

//     if (keys1.length !== keys2.length) return false;

//     for (let key of keys1) {
//         if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
//     }

//     return true;
// }

// async function checkForUpdatesAndRender() {
//     const filePath = '/folder/rootfolder';
    
//     try {
//         // Step 4: Fetch the latest data from Dropbox
//         const fetchedData = await fetchJsonFromDropbox(filePath)
//         console.log("Fetched Data: ", fetchedData);
        

//         // Step 5: Initialize StateManager if it doesn't exist
//         if (!stateManager) {
//             console.log("no state!");
            
//             stateManager = new StateManager(fetchedData);
//             console.log("State Manager: ", stateManager);
            
//         }

//         // Step 6: Compare fetched data with current state
//         var currentState = stateManager.getCurrentData();
//         console.log("Fetched Data2: ", fetchedData);
//         console.log("State Manager: ", currentState);

        
//         if (!deepEqual(fetchedData, currentState)) {
//             // Step 7: Merge fetched data with local changes
//             currentState = stateManager.mergeWithFetchedData(fetchedData);

//             // Step 8: Render the updated data
//             renderData(currentState);
//             console.log("Data updated and rendered");
//         } else if (stateManager.hasChanges()) {
//             // Step 9: Handle local changes
//             const changes = stateManager.getChanges();
//             // Implement logic to send changes to Dropbox
//             // await sendChangesToDropbox(changes);
//             console.log("Local changes detected. Consider syncing with Dropbox.");
//         } else {
//             console.log("No updates from Dropbox and no local changes.");
//         }
//     } catch (error) {
//         console.error("Error checking for updates:", error);
//     }
// }

// AGREGADO EXPORT THE CHECKFORUPDATES
export {getArbolOG, buildStructure, ObjRes}

