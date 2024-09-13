const path = require('path');
const dotenv = require('dotenv');
const { renderData } = require('../renderer/renderStructure');
const fs = require('fs');
const { StateManager } = require('./state');
const { FolderData } = require('../renderer/renderStructure');
const { authManager } = require('./dropboxAuthManager');

dotenv.config()

interface ExtendedEntry {
    ".tag": string;
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
        this.active = false;
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
        if (entry[".tag"] === "folder") {
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
        } else if (entry[".tag"] === "file") {
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
        // console.log("dbx: ",dbx);
        
        let response = await dbx.filesListFolder({ path, recursive: true });
        
        let allEntries = response.result.entries.map((entry: any) => ({
            ...entry,
            id: entry.id || `generated-${Math.random().toString(36).substr(2, 9)}`,
            active: false,
            comment: ""
        }));

        while (response.result.has_more) {
            console.log("Pagination detected. Fetching remaining entries...");
            response = await dbx.filesListFolderContinue({ cursor: response.result.cursor });
            allEntries = allEntries.concat(response.result.entries.map((entry: any) => ({
                ...entry,
                id: entry.id || `generated-${Math.random().toString(36).substr(2, 9)}`,
                active: false,
                comment: ""
            })));
        }

        return allEntries;
    } catch (error) {
        console.error("Error fetching folder contents:", error);
        return [];
    }
}

// agregado para simular firebase 9/9
async function fetchJsonFromDropbox(filePath: string): Promise<any> {
    try {
        const dbx = await authManager.getAuthorizedDropboxInstance()
        const response = (await dbx.filesDownload({ path: filePath })).result as any;
        const blob = response.fileBlob; // This property should be used if available

        if (blob) {
            const fileContent = await blob.text()
            return fileContent
        } else {
            throw new Error('File content is not in expected format');
        }
    } catch (error) {
        console.error("Error fetching JSON from Dropbox:", error);
        throw error;
    }
}


async function getLastModifiedTimestamp(filePath: string): Promise<number> {
    const dbx = await authManager.getAuthorizedDropboxInstance()
    const response = (await dbx.filesGetMetadata({ path: filePath })).result as any;
    const timestamp = new Date (response.server_modified)
    const getTime = timestamp.getTime()

    return getTime; // Convert to timestamp
}

let currentData: typeof FolderData | null = null;
let stateManager: typeof StateManager | null = null;

function deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) return false;

    let keys1 = Object.keys(obj1);
    let keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (let key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}

async function checkForUpdatesAndRender() {
    const filePath = '/folder/yourData.json';
    const localFilePath = path.join(__dirname, 'yourData.json');
    const lastModified = await getLastModifiedTimestamp(filePath);
    
    let localLastModified = 0;
    
    if (fs.existsSync(localFilePath)) {
        const stats = fs.statSync(localFilePath);
        localLastModified = stats.mtime.getTime();
    }
    
    if (lastModified > localLastModified) {
        const fetchedData = await fetchJsonFromDropbox(filePath);
        
        // Check if the fetched data is different from the current data
        if (!currentData || !deepEqual(fetchedData, currentData)) {
            if (stateManager && stateManager.hasChanges()) {
                // Merge fetched data with local changes
                stateManager.mergeWithFetchedData(fetchedData);
            } else {
                // Initialize new state manager with fetched data
                stateManager = new StateManager(fetchedData);
            }
            
            currentData = fetchedData;
            fs.writeFileSync(localFilePath, JSON.stringify(fetchedData, null, 2));
            renderData(fetchedData);
            console.log("Data updated and rendered");
        } else {
            console.log("Fetched data is the same as current data. No render needed.");
        }
    } else if (stateManager && stateManager.hasChanges()) {
        // If there are local changes but no updates from Dropbox, consider syncing local changes
        const changes = stateManager.getChanges();
        // Implement logic to send changes to Dropbox
        // await sendChangesToDropbox(changes);
    } else {
        console.log("No updates from Dropbox and no local changes.");
    }
}

// AGREGADO EXPORT THE CHECKFORUPDATES
export {getArbolOG, buildStructure, ObjRes, checkForUpdatesAndRender}

