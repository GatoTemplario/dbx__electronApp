import { DataFetcher } from './services/dataManagement/dataFetcher';
import { DropboxClient } from './services/dropbox/dropboxClient';

async function main() {
  const dataFetcher = new DataFetcher();
  const dropboxClient = new DropboxClient();

  const initialStructure = await dataFetcher.fetchAndProcessData('/folder');
  
  // Convert the structure to a JSON string
  const jsonString = JSON.stringify(initialStructure);
  
  // Upload the JSON string directly
  await dropboxClient.uploadFile('/folder/rootfolder.json', jsonString);

  setInterval(async () => {
    console.log("Checking for updates...");
    await dataFetcher.checkForUpdatesAndRender();
  }, 25000);
}

main();