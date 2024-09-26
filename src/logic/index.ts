const path1 = require('path');
const { getDatabase, ref, set, get } = require("firebase/database");
const { getArbolOG, buildStructure, checkForUpdatesAndRender } = require('./services/fetch');
const { renderData } = require('./renderer/renderStructure');
const { rtdb, db } = require(path1.resolve(__dirname, './logic/db'))
const { state } = require('./services/state')

async function uploadJson(data : any, fileName : string) {
    try {
        const dbRef = ref(rtdb, `fileStructure/${fileName}`);
        await set(dbRef, data);

        console.log(`Successfully uploaded ${fileName} to Dropbox and updated Firebase`);
    } catch (error: any) {
        console.error("Error in uploadJson:", error);
        throw error;
    }
}

// function que chequea primero si el ID es el mismo que el state, si es así, no hace nada.
// Si el ID es diferente, primero busca el arbol del proyecto y luego se fija si existe en rtdb
// Si existe, no hace nada. Si no existe, sube el arbol (sería la primera vez ever)
async function projectIDChecker(currentProjectID : string, rootFolder : any){
    const currentState = state.getState();
    const newProjectID = currentState.project;

    if (newProjectID && newProjectID !== currentProjectID) {
        console.log("New project ID detected. Checking if update is needed...");
        currentProjectID = newProjectID;

        // First, check if the project structure already exists in the database
        const dbRef = ref(rtdb, `fileStructure/${newProjectID}`);
        const snapshot = await get(dbRef);

        if (!snapshot.exists()) {
            console.log("Project structure not found in database. Updating...");
            const folders = rootFolder.folders;
            const result = folders.find(item => item.name.includes(newProjectID));

            if (result) {
                console.log("Target folder found: ", result);
                const particularEntry = await getArbolOG(result.path);
                const particularFolder = buildStructure(particularEntry);

                await uploadJson(particularFolder, newProjectID);
                state.setState({ tree: particularFolder });
                console.log("path 1:");
                
                renderData(state.getState().tree);
                console.log("Project data uploaded for new project ID: ", newProjectID);
            } else {
                console.log("No matching folder found for project ID: ", newProjectID);
            }
        } else {
            console.log("Project structure already exists in database. Fetching and updating state...");
            const existingStructure = snapshot.val();
            console.log("Existing structure: ", existingStructure);
            
            // Update state with the existing structure from the database
            state.setState( existingStructure );
            console.log("path 2:");
            renderData(existingStructure);
        }
    } else {
        console.log("No changes in project ID or project ID is null/undefined");
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
        
        state.suscribe( async () => {
            await projectIDChecker(currentProjectID, rootFolder);
        })
    } catch (error) {
        console.error("Error:", error);
    }
}


main();