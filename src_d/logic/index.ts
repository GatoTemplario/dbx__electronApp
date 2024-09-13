// const Dropbox = require('dropbox').Dropbox;
const { getArbolOG, buildStructure, checkForUpdatesAndRender } = require('./services/fetch');
const { renderData } = require('./renderer/renderStructure');
const { ipcRenderer } = require('electron');
const { authManager } = require('./services/dropboxAuthManager');

async function uploadJson(data: any, fileName: string) {
    try {
        const dbx = await authManager.getAuthorizedDropboxInstance();
        const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));

        await dbx.filesUpload({
            path: `/folder/${fileName}`,
            contents: jsonBuffer,
            mode: { '.tag': 'overwrite' }
        });

        console.log(`Successfully uploaded ${fileName}`);
    } catch (error) {
        console.error("Error uploading JSON to Dropbox:", error);
        throw error;
    }
}

async function main() {
    try {
        const allEntries = await getArbolOG('/folder');
        const rootFolder = buildStructure(allEntries);
        console.log("rootFolder: ", rootFolder);

        await uploadJson(rootFolder, "rootfolder");

        renderData(rootFolder);

        setInterval(async () => {
            console.log("nuevoUpdate!");
            await checkForUpdatesAndRender();
        }, 25000); // Check every 25 seconds
    } catch (error) {
        console.error("Error:", error);
    }
}

main();