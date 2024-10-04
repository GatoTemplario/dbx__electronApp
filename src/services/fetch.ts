// const path = require('path');
const dotenv = require('dotenv');
// const { renderData } = require('../renderer/renderStructure');
// const fs = require('fs');
// const { StateManager } = require('./state');
// const { FolderData } = require('../renderer/renderStructure');
const { authManager } = require('./dropboxAuthManager');

dotenv.config()
// let stateManager: typeof StateManager | null = null;
function getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
}

interface ExtendedEntry {
    tag: string;
    name: string;
    path_lower: string;
    id: string;
    active?: boolean;
    comment?: string;
    extension: string;

}

class ObjRes {
    name: string;
    path: string;
    id: string;
    active: boolean;
    comment: string;
    folders: ObjRes[];
    extension: string;
    files: ExtendedEntry[];

    constructor(name: string, path: string, id: string) {
        this.name = name;
        this.path = path;
        this.id = id;
        this.active = true;
        this.comment = "";
        this.folders = [];
        this.files = [];
        this.extension = "";
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
                    const fileExtension = getFileExtension(entry.name);
                    parentFolder.files.push({
                        ...entry,
                        active: entry.active || false,
                        comment: entry.comment || "",
                        extension: fileExtension,
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
            console.log(`Fetching more entries for path ${path}...`);
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
        console.log("All entries fetched:", allEntries);
        console.log(`Total entries fetched for path ${path}:`, allEntries.length);
        return allEntries;
    } catch (error) {
        console.error("Error fetching folder contents:", error);
         if (error.response) {
                    console.error(`Error response:`, error.response.data);
                }
                throw error;
            }
        // return [];
}




export {getArbolOG, buildStructure, ObjRes}

