import fs from 'fs';
import path from 'path';

export class LocalFileManager {
  static readLocalFile(filePath: string): any {
    // Read local file
  }

  static writeLocalFile(filePath: string, data: any): void {
    // Write to local file
  }

  static async getLocalFileTimestamp(filePath: string): Promise<number> {
    const dbx = await authManager.getAuthorizedDropboxInstance()
    const response = (await dbx.filesGetMetadata({ path: filePath })).result as any;
    const timestamp = new Date (response.server_modified)
    const getTime = timestamp.getTime()

    return getTime; // Convert to timestamp
  }
}