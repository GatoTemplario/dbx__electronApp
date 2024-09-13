// dropboxClient.ts
import { Dropbox } from 'dropbox';
const { DropboxAuthManager } = require('./dropboxAuthManager');
import { ExtendedEntry } from '../../models/folderStructure';


export class DropboxClient {
  private dbx: Dropbox;

  constructor() {
    this.dbx = new Dropbox({
      accessToken: DropboxAuthManager.getAccessToken(),
    });
  }

  async listFolder(path: string): Promise<ExtendedEntry[]> {
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

  async downloadFile(filePath: string): Promise<any> {
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

  async getFileMetadata(filePath: string): Promise<number> {
    const dbx = await authManager.getAuthorizedDropboxInstance()
    const response = (await dbx.filesGetMetadata({ path: filePath })).result as any;
    const timestamp = new Date (response.server_modified)
    const getTime = timestamp.getTime()

    return getTime; // Convert to timestamp
  }

  async uploadFile(path: string, contents: string | Buffer): Promise<void> {
    try {
      await this.dbx.filesUpload({
        path: path,
        contents: contents,
        mode: { '.tag': 'overwrite' }
      });
      console.log(`Successfully uploaded file to ${path}`);
    } catch (error) {
      console.error("Error uploading file to Dropbox:", error);
      throw error;
    }
  }

}
