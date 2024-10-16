const dotenv = require('dotenv');
const { authManager } = require('./dropboxAuthManager');
// const { state }            = require('../services/state');
import { ref, set, get } from 'firebase/database';
import { rtdb } from '../logic/db';
import { driveAuthManager } from './googleAuthManager';
import  express  from 'express';

dotenv.config()
// let stateManager: typeof StateManager | null = null;

interface CachedStructure {
    structure: any;
    lastUpdated: number;
}

export interface ExtendedEntry {
    tag: string;
    name: string;
    path_lower: string;
    id: string;
    active?: boolean;
    comment?: string;
    extension: string;
    children: ExtendedEntry[];
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
    // console.log("Building structure...", entries);
    
    const root = new ObjRes("root", "/", "root-id");
    const pathMap = new Map<string, ObjRes>();

    // Initialize the root folder in the map
    pathMap.set(root.path, root);

    // Helper function to process entries recursively
    function processEntries(currentEntries: ExtendedEntry[], parentPath: string) {
        for (const entry of currentEntries) {
            if (entry.tag === "folder") {
                if (!pathMap.has(entry.path_lower)) {
                    const folder = new ObjRes(entry.name, entry.path_lower, entry.id);
                    folder.active = entry.active || false;
                    folder.comment = entry.comment || "";
                    pathMap.set(entry.path_lower, folder);

                    const parentFolder = pathMap.get(parentPath);
                    if (parentFolder) {
                        parentFolder.folders.push(folder);
                    }

                    // Process children recursively
                    if (entry.children && entry.children.length > 0) {
                        processEntries(entry.children, entry.path_lower);
                    }
                }
            } else if (entry.tag === "file") {
                const parentFolder = pathMap.get(parentPath);
                if (parentFolder) {
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

    // Start processing from the root
    processEntries(entries, "/");

    return Array.from(pathMap.values())[0];
}






async function fetchGoogleDriveProjectFolder(gDrive: any, projectCode: string): Promise<any> {
    try {
        // Step 1: Search for the folder containing the project code
        const folderResponse = await gDrive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name contains '${projectCode}'`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        const projectFolder = folderResponse.data.files[0];
        if (!projectFolder) {
            throw new Error(`No folder found containing project code: ${projectCode}`);
        }

        // Step 2: Fetch all files and subfolders within the project folder
        const filesResponse = await gDrive.files.list({
            q: `'${projectFolder.id}' in parents`,
            fields: 'files(id, name, mimeType, parents, modifiedTime)',
            spaces: 'drive'
        });

        // Step 3: Process and structure the fetched data
        const processedFiles = filesResponse.data.files.map((file: any) => ({
            id: file.id,
            name: file.name,
            type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
            modifiedTime: file.modifiedTime
        }));

        return {
            id: projectFolder.id,
            name: projectFolder.name,
            files: processedFiles
        };
    } catch (error) {
        console.error('Error fetching Google Drive project folder:', error);
        throw error;
    }
}
// 
// async function setupGoogleDriveAuth() {
//     try {
//         if (!driveAuthManager.isAuthorized()) {
//             await performInitialAuthorization();
//         } else {
//             console.log('Already authorized. Attempting to use existing credentials...');
//             try {
//                 await driveAuthManager.getAccessToken();
//                 console.log('Existing credentials are valid.');
//             } catch (error) {
//                 console.error('Error using existing credentials:', error);
//                 console.log('Attempting reauthorization...');
//                 await performInitialAuthorization();
//             }
//         }
//     } catch (error) {
//         console.error('Authorization process failed:', error);
//     }
// }



// async function performInitialAuthorization() {
//     const authUrl = driveAuthManager.generateAuthUrl();
//     console.log('Authorize this app by visiting this url:', authUrl);

//     const app = express();
//     const authPromise = new Promise((resolve, reject) => {
//         app.get('/oauth2callback', async (req, res) => {
//             const { code } = req.query;
//             try {
//                 await driveAuthManager.getTokensFromCode(code as string);
//                 res.send('Authorization successful! You can close this window.');
//                 resolve(null);
//             } catch (error) {
//                 console.error('Error during token exchange:', error);
//                 res.status(500).send('Authorization failed. Please try again.');
//                 reject(error);
//             }
//             server.close();
//         });
//     });

//     const server = app.listen(3000, () => {
//         console.log('Listening on port 3000 for OAuth2 callback');
//     });

//     await authPromise;
// }

// Call this function before using any Google Drive functionality









async function getArbolOG(path: string, depth: number = 2): Promise<ExtendedEntry[]> {
    const dbx    = await authManager.getAuthorizedDropboxInstance();
    const gDrive = await driveAuthManager.getAuthorizedDriveInstance();
    
    console.log("gDrive", gDrive);





    // Fetch from Google Drive
    const projectCode = '171106'; // This should be dynamically set based on your requirements
    try {
        const googleDriveProject = await fetchGoogleDriveProjectFolder(gDrive, projectCode);
        console.log('Google Drive project folder:', googleDriveProject);

        // Merge Google Drive data with Dropbox data
        // This is a simple example; you might need to adjust this based on your data structure
        
        return googleDriveProject;
    } catch (error) {
        console.error('Error fetching Google Drive data:', error);
        // If there's an error with Google Drive, return just the Dropbox entries
        // return dropboxEntries;
    }
    // Test Google Drive file listing
    // try {
    //     console.log("Testing Google Drive file listing...");
    //     const response = await gDrive.files.list({
    //         pageSize: 20,
    //         fields: 'nextPageToken, files(id, name, mimeType, parents, size)',
    //         q: "name contains '171106'",
    //     });
    //     const files = response.data.files;
    //     console.log("response: ",response);
        
    //     if (files.length) {
    //         console.log('Files found in Google Drive:');
    //         // files.forEach((file) => {
    //         //     console.log(`${file.name} (${file.id}) - Type: ${file.mimeType}`);
    //         // });
    //     } else {
    //         console.log('No files found in Google Drive.');
    //     }
    // } catch (error) {
    //     console.error('Error listing files from Google Drive:', error);
    // }
    
    
    
    
    
    const cacheRef = ref(rtdb, `cachedStructures`);
    
    console.log("Fetching folder contents for path:  ", path);
    
    // Try to get cached structure
    const cachedSnapshot = await get(cacheRef);
    const cachedData: CachedStructure | null = cachedSnapshot.val();
    
    if (cachedData && Date.now() - cachedData.lastUpdated < 24 * 60 * 60 * 1000) { // 24 hours
        console.log("Using cached structure");
        return cachedData.structure;
    }
    
    //   console.log(`Fetching folder contents for path: ${path}`);
    const entries = await fetchArbolOGFolderContentsRecursively(dbx, path, depth);
    
    
    // Cache the new structure
    //   await set(cacheRef, { structure: entries, lastUpdated: Date.now() });
    
    return entries;
}

async function fetchArbolOGFolderContentsRecursively(dbx : any, path: string, depth: number): Promise<ExtendedEntry[]> {
    console.log("working on it...");
    
  if (depth === 0) return [];

  let allEntries: ExtendedEntry[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const response = await (cursor
      ? dbx.filesListFolderContinue({ cursor })
      : dbx.filesListFolder({ path, recursive: false, limit: 100 }));
        
      
      
      
      
      console.log("response", response);




      
      const entries = response.result.entries.map((entry: any) => {
        const modifiedEntry = {
                ...entry,
                tag: entry['.tag'],
                active: false,
                comment: ""
        };
        delete modifiedEntry['.tag'];
        
        return modifiedEntry;
    });

    allEntries = allEntries.concat(entries);

    hasMore = response.result.has_more;
    cursor = response.result.cursor;
  }

  // Recursively fetch contents of subfolders
  for (const entry of allEntries) {
    if (entry.tag === "folder") {
      const subEntries = await fetchArbolOGFolderContentsRecursively(dbx, entry.path_lower, depth - 1);
      entry.children = subEntries;
    }
  }

  return allEntries;
}

// Add this to fetch.ts
async function fetchChildProject(projectId: string, projectFolder: any, signal?: AbortSignal) {
    const dbx = await authManager.getAuthorizedDropboxInstance();
    // console.log("projectFolder", projectFolder);
    
    const projectPath = `${projectFolder.path}`;
    console.log(`Fetching child project: ${projectId}`);
    // console.log(`Fetching folder contents for path: ${projectPath}`);

    
    const entries = await fetchProjectContentsRecursively(dbx, projectPath, signal);
    const structuredEntries = buildStructure(entries);
    const numberlessName = projectFolder.name.replace(/^\d{6}_/, '')
    const parsedName = numberlessName.replace(/_/g, ' ')
    

    const fullStructuredEntries = { 
        project: projectId,
        tree: {
            name:    parsedName,
            path:    projectFolder.path,
            id:      projectFolder.id,
            active:  projectFolder.active,
            comment: projectFolder.comment,
            files:   structuredEntries.files,
            folders: structuredEntries.folders
        }, 
        initialLoadComplete: true 
    };
    console.log("Structured project entries: ", fullStructuredEntries);
    
    return fullStructuredEntries;
}

async function fetchProjectContentsRecursively(dbx: any, path: string, signal?: AbortSignal): Promise<ExtendedEntry[]> {
    
    let allEntries: ExtendedEntry[] = [];
    let hasMore = true;
    let cursor: string | undefined;
    
    while (hasMore) {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
        console.log("fetching in process");
        const response = await (cursor
            ? dbx.filesListFolderContinue({ cursor })
            : dbx.filesListFolder({ path, recursive: false, limit: 2000 }));
       
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

        // Fetch children for folders
        for (const entry of newEntries) {
            if (entry.tag === "folder") {
                // console.log("Fetching children for folder: ", entry.path_lower);
                
                entry.children = await fetchProjectContentsRecursively(dbx, entry.path_lower);
            }
        }

        allEntries = allEntries.concat(newEntries);
        hasMore = response.result.has_more;
        cursor = response.result.cursor;
    }  
    return allEntries;
}


function getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
  
  // Update the export statement
  export { getArbolOG, buildStructure, ObjRes, fetchChildProject };