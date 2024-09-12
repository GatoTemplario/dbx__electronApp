const path = require('path');
const Dropbox = require('dropbox').Dropbox;
const dotenv = require('dotenv');
const { renderData } = require('../renderer/renderStructure');
const fs = require('fs');
const { StateManager } = require('./StateManager');

dotenv.config()
const dbx = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN
});
// console.log("accesstoken: ", process.env.DROPBOX_ACCESS_TOKEN);


class objRes {
    name: string;
    path: string;
    folders: objRes[];
    files: any[];

    constructor(name: string, path: string) {
        this.name = name;
        this.path = path;
        this.folders = [];
        this.files = [];
    }
}

function buildStructure(entries: any[]): objRes {
    const root = new objRes("root", "/");
    const pathMap = new Map<string, objRes>();

    // Initialize the root folder in the map
    pathMap.set(root.path, root);

    // Process each entry
    for (const entry of entries) {

        if (entry[".tag"] === "folder") {
            if (!pathMap.has(entry.path_lower)) {
                const folder = new objRes(entry.name, entry.path_lower);
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
                    parentFolder.files.push(entry);
                }
            }
        }
    }

    const aux = Array.from(pathMap.entries())
    const secondElement = aux[1][1]
    
    return secondElement;
}
    
async function getArbolOG(path: string): Promise<any[]> {
    try {
        let response = await dbx.filesListFolder({ path, recursive: true });
        
        let allEntries = response.result.entries;

        while (response.result.has_more) {
            console.log("Pagination detected. Fetching remaining entries...");
            response = await dbx.filesListFolderContinue({ cursor: response.result.cursor });
            allEntries = allEntries.concat(response.result.entries);
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
    const response = (await dbx.filesGetMetadata({ path: filePath })).result as any;
    const timestamp = new Date (response.server_modified)
    const getTime = timestamp.getTime()

    return getTime; // Convert to timestamp
}



let stateManager!: StateManager;

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
        
        if (stateManager && stateManager.hasChanges()) {
            // Merge fetched data with local changes
            stateManager.mergeWithFetchedData(fetchedData);
        } else {
            // Initialize new state manager with fetched data
            stateManager = new StateManager(fetchedData);
        }
        
        fs.writeFileSync(localFilePath, JSON.stringify(fetchedData, null, 2));
        renderData(fetchedData);
    } else if (stateManager && stateManager.hasChanges()) {
        // If there are local changes but no updates from Dropbox, consider syncing local changes
        const changes = stateManager.getChanges();
        // Implement logic to send changes to Dropbox
        // await sendChangesToDropbox(changes);
    }
}

// AGREGADO EXPORT THE CHECKFORUPDATES
export {getArbolOG, buildStructure, objRes, checkForUpdatesAndRender}

