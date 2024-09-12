const Dropbox = require('dropbox').Dropbox;
const { getArbolOG, buildStructure, checkForUpdatesAndRender } = require('./services/fetch');
const { renderData } = require('./renderer/renderStructure');
// const { uploadJson } = require('./jsonPopulate'); // Ensure this is correct
const { ipcRenderer } = require('electron');

async function uploadJson(data: any, fileName: string, dbx: any) {
    
    try {
        // Convert JSON data to a Buffer
        const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));

        // Upload the buffer to Dropbox
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
        const token = await ipcRenderer.invoke('get-dropbox-token');
        const dbx = new Dropbox({ accessToken: token });

        const allEntries = await getArbolOG('/folder', dbx);
        const rootFolder = buildStructure(allEntries);
        console.log("rootFolder: ", rootFolder);

        // Uncomment and use this line if needed
        await uploadJson(rootFolder, "rootfolder", dbx);

        renderData(rootFolder);

        setInterval(async () => {
            console.log("nuevoUpdate!");
            
            await checkForUpdatesAndRender();
        }, 25000); // Check every 60 seconds
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
