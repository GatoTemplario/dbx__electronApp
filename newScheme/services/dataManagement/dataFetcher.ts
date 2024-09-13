const fs = require('fs');
import { DropboxClient } from '../dropbox/dropboxClient';
import { LocalFileManager } from '../fileSystem/localFileManager';
import { buildStructure } from './folderStructureBuilder';
import { StateManager } from './stateManager';
import { renderData, FileData } from '../../renderer/renderStructure';
import { deepEqual } from '../../utils/compareUtils';
import { FolderData } from '../../models/folderStructure';
import path from 'path';

let currentData: FolderData | null = null;
let stateManager: StateManager | null = null;

export class DataFetcher {
  private dropboxClient: DropboxClient;
  private stateManager: StateManager;

  constructor() {
    this.dropboxClient = new DropboxClient();
  }

  async fetchAndProcessData(path: string): Promise<void> {
    const entries = await this.dropboxClient.listFolder(path);
    const structure = buildStructure(entries);
    
    if (!this.stateManager) {
      this.stateManager = new StateManager(structure);
    } else if (this.stateManager.hasChanges()) {
      this.stateManager.mergeWithFetchedData(structure);
    } else {
      this.stateManager = new StateManager(structure);
    }

    renderData(structure);
  }

  
  async checkForUpdatesAndRender(): Promise<void> {
    if (this.stateManager){

      const filePath = '/folder/yourData.json';
      const localFilePath = path.join(__dirname, 'yourData.json');
      const lastModified = await this.dropboxClient.getFileMetadata(filePath);
      
      let localLastModified = 0;
      
      if (fs.existsSync(localFilePath)) {
        const stats = fs.statSync(localFilePath);
        localLastModified = stats.mtime.getTime();
      }
      
      if (lastModified > localLastModified) {
        const fetchedData = await this.dropboxClient.downloadFile(filePath);
        
        // Check if the fetched data is different from the current data
        if (!currentData || !deepEqual(fetchedData, currentData)) {
          if (this.stateManager && this.stateManager.hasChanges()) {
            // Merge fetched data with local changes
            this.stateManager.mergeWithFetchedData(fetchedData);
          } else {
            // Initialize new state manager with fetched data
            this.stateManager = new StateManager(fetchedData);
          }
          
          currentData = fetchedData;
          fs.writeFileSync(localFilePath, JSON.stringify(fetchedData, null, 2));
          renderData(fetchedData);
          console.log("Data updated and rendered");
        } else {
          console.log("Fetched data is the same as current data. No render needed.");
        }
        } else if (this.stateManager && this.stateManager.hasChanges()) {
          // If there are local changes but no updates from Dropbox, consider syncing local changes
          const changes = this.stateManager.getChanges();
          // Implement logic to send changes to Dropbox
          // await sendChangesToDropbox(changes);
        } else {
          console.log("No updates from Dropbox and no local changes.");
        }
      }
      
      // Implementation of checkForUpdatesAndRender from fetch.ts
    }

}