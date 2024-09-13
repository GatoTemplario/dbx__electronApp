import { DataFetcher } from './services/dataManagement/dataFetcher';
import { StateManager } from './services/dataManagement/stateManager';
import { DropboxClient } from './services/dropbox/dropboxClient';

async function main() {
//   const stateManager = new StateManager();
  const dataFetcher = new DataFetcher();
  const dropboxClient = new DropboxClient();

  const initialStructure = await dataFetcher.fetchAndProcessData('/folder');
    await dropboxClient.uploadFile('/folder/rootfolder.json', Buffer.from(JSON.stringify(initialStructure)));


//   await dataFetcher.fetchAndProcessData('/folder');

  // Upload initial data
//   const rootFolder = stateManager.getCurrentState();
//   await dropboxClient.uploadFile('/folder/rootfolder.json', Buffer.from(JSON.stringify(rootFolder)));

  setInterval(async () => {
    console.log("Checking for updates...");
    await dataFetcher.checkForUpdatesAndRender();
  }, 25000);
}

main();