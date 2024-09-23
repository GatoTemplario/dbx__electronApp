const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set } = require("firebase/database");
const { getFirestore } = require("firebase/firestore");
const path1 = require('path');

// Admin SDK initialization
const serviceAccount = require(path1.resolve(__dirname, '../../key.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://fdm-electronapp-default-rtdb.firebaseio.com" // Add this line
});

// Client SDK initialization
const firebaseConfig = {
  apiKey: "AIzaSyAMl2_JMIscL1IzPsJ2pO8jPGTznRZjE1I",
  authDomain: "fdm-electronapp.firebaseapp.com",
  projectId: "fdm-electronapp",
  storageBucket: "fdm-electronapp.appspot.com",
  messagingSenderId: "764422242581",
  appId: "1:764422242581:web:dfa7b4037a57ed9347691c",
  measurementId: "G-8VJ2BNBGLH",
  databaseURL: "https://fdm-electronapp-default-rtdb.firebaseio.com" // Add this line
};

const clientApp = initializeApp(firebaseConfig);
const rtdb = getDatabase(clientApp);
const db = getFirestore(clientApp);

// Admin Firestore
const adminFirestore = admin.firestore();
adminFirestore.settings({ignoreUndefinedProperties: true});

export {rtdb , db}