const path1 = require('path');
const serviceAccount = require(path1.resolve(__dirname, '../key.json'));
const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set } = require("firebase/database");
const { getFirestore } = require("firebase/firestore");
const { getArbolOG, buildStructure, checkForUpdatesAndRender } = require('./services/fetch');
const { renderData } = require('./renderer/renderStructure');
const { ipcRenderer } = require('electron');
const { authManager } = require('./services/dropboxAuthManager');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const firebaseConfig = {
  apiKey: "AIzaSyAMl2_JMIscL1IzPsJ2pO8jPGTznRZjE1I",
  authDomain: "fdm-electronapp.firebaseapp.com",
  projectId: "fdm-electronapp",
  storageBucket: "fdm-electronapp.appspot.com",
  messagingSenderId: "764422242581",
  appId: "1:764422242581:web:dfa7b4037a57ed9347691c",
  measurementId: "G-8VJ2BNBGLH",
  databaseURL: "https://fdm-electronapp.firebaseio.com"
};

const dbApp = initializeApp(firebaseConfig);
const rtdb  = getDatabase(dbApp);
const fs    = admin.firestore()
const db    = getFirestore(dbApp)

fs.settings({ignoreUndefinedProperties: true})

// 
async function uploadJson(data: any, fileName: string) {
    try {
        const dbx = await authManager.getAuthorizedDropboxInstance();
        const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));
        console.log("data: ",data);
        
        await dbx.filesUpload({
            path: `/folder/${fileName}`,
            contents: jsonBuffer,
            mode: { '.tag': 'overwrite' }
        });
        const dbRef = ref(rtdb, `fileStructure/${fileName}`);
        await set(dbRef, data);

        console.log(`Successfully uploaded ${fileName} to Dropbox and updated Firebase`);
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

        // setInterval(async () => {
        //     console.log("nuevoUpdate!");
        //     await checkForUpdatesAndRender();
        // }, 25000); // Check every 25 seconds
    } catch (error) {
        console.error("Error:", error);
    }
}

main();