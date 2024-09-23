const path1 = require('path');
const { getDatabase, ref, set } = require("firebase/database");
const { getArbolOG, buildStructure, checkForUpdatesAndRender } = require('./services/fetch');
const { renderData } = require('./renderer/renderStructure');
// const { ipcRenderer } = require('electron');
// const { authManager } = require('./services/dropboxAuthManager');
const { rtdb, db } = require(path1.resolve(__dirname, './logic/db'))
const { state } = require('./services/state')

// index.ts
async function uploadJson(data : any, fileName : string) {
    try {
        // const dbx = await authManager.getAuthorizedDropboxInstance();
        // const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));
        // console.log("data: ", data);
        
        // await dbx.filesUpload({
        //     path: `/folder/${fileName}`,
        //     contents: jsonBuffer,
        //     mode: { '.tag': 'overwrite' }
        // });

        const dbRef = ref(rtdb, `fileStructure/${fileName}`);
        await set(dbRef, data);

        console.log(`Successfully uploaded ${fileName} to Dropbox and updated Firebase`);
    } catch (error: any) {
        console.error("Error in uploadJson:", error);
        throw error;
    }
}

async function main() {
    try {
        state.initState()
        const currentState = state.getState();
        var currentProjectID = currentState.project;

        const allEntries = await getArbolOG('/folder');
        const rootFolder = buildStructure(allEntries);
        console.log("rootFolder: ", rootFolder);
        
        state.suscribe( async () =>{
            const newProjectID = state.getState().project;
            // console.log("newProjectID: ", newProjectID);
            // console.log("currentProjectID: ", currentProjectID);

            if (newProjectID && newProjectID !== currentProjectID) {
                console.log("New project ID detected. Updating...");
                currentProjectID = newProjectID;
                const folders = rootFolder.folders;
                const result = folders.find(item => item.name.includes(newProjectID));

                if (result) {
                    console.log("Target folder found: ", result);
                    const particularEntry = await getArbolOG(result.path);
                    const particularFolder = buildStructure(particularEntry);

                    // Here you would make the call to the Dropbox API
                    // For now, we'll just upload to Firebase
                    await uploadJson(particularFolder, newProjectID);
                    console.log("Project data uploaded for new project ID: ", newProjectID);
                } else {
                    console.log("No matching folder found for project ID: ", newProjectID);
                }
            } else {
                console.log("No changes in project ID or project ID is null/undefined");
            }
        })


        renderData(rootFolder);

        // setInterval(async () => {
        //     console.log("nuevoUpdate!");
        //     await checkForUpdatesAndRender();
        // }, 25000); // Check every 25 seconds
    } catch (error) {
        console.error("Error:", error);
    }
}

main();