const pathDb = require('path');
const serviceAccount = require(pathDb.resolve(__dirname, '../key.json'));
const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const { getDatabase } = require("firebase/database");
const { getFirestore } = require("firebase/firestore");
// const { app } = require("firebase-admin");
console.log("serviceAccount: ", serviceAccount);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fdm-electronapp-default-rtdb.firebaseio.com"
})

const firebaseConfig = {
  apiKey: "AIzaSyAMl2_JMIscL1IzPsJ2pO8jPGTznRZjE1I",
  authDomain: "fdm-electronapp.firebaseapp.com",
  projectId: "fdm-electronapp",
  storageBucket: "fdm-electronapp.appspot.com",
  messagingSenderId: "764422242581",
  appId: "1:764422242581:web:dfa7b4037a57ed9347691c",
  measurementId: "G-8VJ2BNBGLH",
  databaseURL: "https://fdm-electronapp-default-rtdb.firebaseio.com"
};

const dbApp = initializeApp(firebaseConfig);
const rtdb  = getDatabase(dbApp);
const fs    = admin.firestore()
const db    = getFirestore(dbApp)

fs.settings({ignoreUndefinedProperties: true})

export { dbApp, rtdb, fs, db }