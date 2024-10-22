const dotenv = require('dotenv');
import { driveAuthManager } from './googleAuthManager';

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
    size: number;
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
    size: number;

    constructor(name: string, path: string, id: string) {
        this.name = name;
        this.path = path;
        this.id = id;
        this.active = true;
        this.comment = "";
        this.folders = [];
        this.files = [];
        this.extension = "";
        this.size = 0;
    }
}





function mapGoogleDriveToStateStructure(driveData: any): ObjRes {
    const root = new ObjRes(
      driveData.name,
      driveData.path,
      driveData.id
    );
    root.comment = driveData.comment || '';
    root.active = true;
  
    function processEntry(entry: ExtendedEntry, parentFolder: ObjRes): void {
      if (entry.tag === 'folder') {
        const folder = new ObjRes(entry.name, entry.path_lower, entry.id);
        folder.active = entry.active || false;
        folder.comment = entry.comment || '';
        folder.size = 0;
        
        parentFolder.folders.push(folder);
  
        // Process children recursively
        if (entry.children && entry.children.length > 0) {
          entry.children.forEach(child => {
            if (child.tag === 'folder') {
              processEntry(child, folder);  // Pass the current folder as parent
            } else {
              folder.files.push({
                ...child,
                active: child.active || false,
                comment: child.comment || '',
                extension: child.extension || '',
                size: child.size
              });
            }
          });
        }
      } else {
        parentFolder.files.push({
          ...entry,
          active: entry.active || false,
          comment: entry.comment || '',
          extension: entry.extension || '',
          size: entry.size !== undefined ? entry.size : 0
        });
      }
    }
  
    // Process top-level entries
    driveData.folders.forEach(entry => processEntry(entry, root));
    driveData.files.forEach(entry => {
      root.files.push({
        ...entry,
        active: entry.active || false,
        comment: entry.comment || '',
        extension: entry.extension || '',
        size: entry.size
      });
    });
  
    return root;
}








async function fetchGoogleDriveProjectFolder( projectCode: string ): Promise<any> {
    const gDrive = await driveAuthManager.getAuthorizedDriveInstance();

    try {
        // Step 1: Search for the folder containing the project code
        const folderResponse = await gDrive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name contains '${projectCode}'`,
            fields: 'files(id, name, size)',
            spaces: 'drive'
        });

        const projectFolder = folderResponse.data.files[0];

        const numberlessName = projectFolder.name.replace(/^\d{6}_/, '')
        const parsedName = numberlessName.replace(/_/g, ' ')
        
        
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
        
          // Map the structured data to the state structure
          const mappedData = mapGoogleDriveToStateStructure(structuredData);
        
        return mappedData;
    } catch (error) {
        console.error('Error fetching Google Drive project folder:', error);
        throw error;
    }
}

async function fetchGoogleDriveFolderContentsRecursively(gDrive: any, folderId: string, path: string = '/'): Promise<ExtendedEntry[]> {
    try {
        const response = await gDrive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name, mimeType, modifiedTime, size)',
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
                children: [],
                size: isFolder ? undefined : Number(file.size) || undefined
            };

            if (isFolder) {
                entry.children = await fetchGoogleDriveFolderContentsRecursively(gDrive, file.id, `${path}${file.name}/`);
                // Calculate folder size as the sum of its contents
                // entry.size = entry.children.reduce((sum, child) => sum + (child.size || 0), 0);
            }

            entries.push(entry);
        }

        return entries;
    } catch (error) {
        console.error('Error fetching Google Drive folder contents:', error);
        throw error;
    }
}

  
  // Update the export statement
  export { ObjRes, fetchGoogleDriveProjectFolder };