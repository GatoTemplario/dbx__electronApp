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






async function fetchGoogleDriveProjectFolder( projectCode: string ): Promise<any> {
    const gDrive = await driveAuthManager.getAuthorizedDriveInstance();

    try {
        // Step 1: Search for the folder containing the project code
        const folderResponse = await gDrive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name contains '${projectCode}'`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        const projectFolder = folderResponse.data.files[0];

        const numberlessName = projectFolder.name.replace(/^\d{6}_/, '')
        const parsedName = numberlessName.replace(/_/g, ' ')
        
        // console.log("folderResponse", folderResponse);
        // console.log("parsedName", parsedName);
        
        
        if (!projectFolder) {
            throw new Error(`No folder found containing project code: ${projectCode}`);
        }

        // Step 2: Fetch all files and subfolders within the project folder recursively
        const contents = await fetchGoogleDriveFolderContentsRecursively(gDrive, projectFolder.id);

        // Step 3: Structure the data to match the state.ts format
        const structuredData = {
            name: parsedName,
            comment: '',
            id: projectFolder.id,
            path: `/${projectFolder.name}`,
            files: contents.filter(entry => entry.tag === 'file'),
            folders: contents.filter(entry => entry.tag === 'folder')
        };

        return structuredData;
    } catch (error) {
        console.error('Error fetching Google Drive project folder:', error);
        throw error;
    }
}

async function fetchGoogleDriveFolderContentsRecursively(gDrive: any, folderId: string, path: string = '/'): Promise<ExtendedEntry[]> {
    try {
        const response = await gDrive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name, mimeType, modifiedTime)',
            spaces: 'drive'
        });

        const entries: ExtendedEntry[] = [];

        for (const file of response.data.files) {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const entry: ExtendedEntry = {
                tag: isFolder ? 'folder' : 'file',
                name: file.name,
                path_lower: `${path}${file.name}`,
                id: file.id,
                active: true,
                comment: '',
                extension: isFolder ? '' : file.name.split('.').pop() || '',
                children: []
            };

            if (isFolder) {
                entry.children = await fetchGoogleDriveFolderContentsRecursively(gDrive, file.id, `${path}${file.name}/`);
            }

            entries.push(entry);
        }

        return entries;
    } catch (error) {
        console.error('Error fetching Google Drive folder contents:', error);
        throw error;
    }
}















async function getArbolOG(path: string, depth: number = 2): Promise<ExtendedEntry[]> {
    const dbx    = await authManager.getAuthorizedDropboxInstance();
    
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
  export { getArbolOG, buildStructure, ObjRes, fetchChildProject, fetchGoogleDriveProjectFolder };