import { getArbolOG, buildStructure, ObjRes, fetchChildProject } from './fetch';
import { state } from './state';
import { ref, set, get } from 'firebase/database';
import { rtdb } from '../logic/db';
import { isFolderCollapsed } from '../renderer/folderUIState';

// const SYNC_INTERVAL = 30000; // 5 minutes in milliseconds
// let syncTimeoutId: NodeJS.Timeout | null = null;
// let isSyncInitialized = false;
// let isSyncInProgress = false;

const MIN_SYNC_INTERVAL = 30000; // 30 seconds in milliseconds
const MAX_SYNC_INTERVAL = 300000; // 5 minutes in milliseconds
let syncTimeoutId: NodeJS.Timeout | null = null;
let isSyncInitialized = false;
let isSyncInProgress = false;
let lastSyncTime = 0;
let currentSyncInterval = MIN_SYNC_INTERVAL;











async function syncDropboxWithRTDB() {
    if (isSyncInProgress) {
        console.log("Sync already in progress. Adjusting next sync time.");
        increaseSyncInterval();
        scheduleSyncAfterInterval();
        return;
    }

    console.log("Starting sync...");
    isSyncInProgress = true;
    lastSyncTime = Date.now();

    const currentState = state.getState();
    const projectId = currentState.project;

    if (!projectId) {
        console.log("No project ID set. Skipping sync.");
        isSyncInProgress = false;
        scheduleSyncAfterInterval();
        return;
    }

    try {
        const newDropboxEntries = await fetchChildProjectWithTimeout(projectId, currentState.tree) as any;
        const dbRef = ref(rtdb, `fileStructure/${projectId}`);
        const snapshot = await get(dbRef);
        const rtdbStructure = snapshot.exists() ? snapshot.val() : null;

        const mergedStructure = mergeStructures(newDropboxEntries.tree, rtdbStructure);

        await set(dbRef, mergedStructure);

        state.setState({ ...currentState, tree: mergedStructure });

        console.log("Sync completed successfully");
        decreaseSyncInterval();
    } catch (error) {
        console.error("Error during sync:", error);
        increaseSyncInterval();
    } finally {
        isSyncInProgress = false;
        scheduleSyncAfterInterval();
    }
}

async function fetchChildProjectWithTimeout(projectId: string, projectFolder: any, timeout = 60000) {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error("Fetch operation timed out"));
        }, timeout);

        try {
            const result = await fetchChildProject(projectId, projectFolder);
            clearTimeout(timeoutId);
            resolve(result);
        } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
        }
    });
}

function scheduleSyncAfterInterval() {
    if (syncTimeoutId) {
        clearTimeout(syncTimeoutId);
    }
    syncTimeoutId = setTimeout(syncDropboxWithRTDB, currentSyncInterval);
}

function increaseSyncInterval() {
    currentSyncInterval = Math.min(currentSyncInterval * 2, MAX_SYNC_INTERVAL);
    console.log(`Increased sync interval to ${currentSyncInterval}ms`);
}

function decreaseSyncInterval() {
    currentSyncInterval = Math.max(currentSyncInterval / 2, MIN_SYNC_INTERVAL);
    console.log(`Decreased sync interval to ${currentSyncInterval}ms`);
}

// async function syncDropboxWithRTDB() {
//     if (isSyncInProgress) {
//         console.log("Sync already in progress. Skipping this cycle.");
//         return;
//     }


//     console.log("Starting sync...");
//     isSyncInProgress = true;



//     const currentState = state.getState();
//     const projectNameAndId = currentState.tree.name;
//     const projectId = currentState.project;
//     // const parentPath = currentState.projectsFolderPath;

//     if (!projectNameAndId) {
//         console.log("No project ID set. Skipping sync.");
//         isSyncInProgress = false;
//         scheduleSyncAfterInterval();
//         return;
//     }

//     try {
//         // Step 1: Fetch the latest data from Dropbox
//         // const currentState = state.getState();
//         // const projectID = currentState.project;
//         const newDropboxEntries  = await fetchChildProject(projectId, currentState.tree)

//         // Step 2: Fetch the current structure from RTDB
//         const dbRef             = ref(rtdb, `fileStructure/${projectId}`);
//         const snapshot          = await get(dbRef);
//         const rtdbStructure     = snapshot.exists() ? snapshot.val() : null;

//         // Step 3: Merge Dropbox and RTDB structures
//         const mergedStructure   = mergeStructures(newDropboxEntries.tree, rtdbStructure)

//         // Step 4: Update RTDB with the merged structure
//         await set(dbRef, mergedStructure);

//         // Step 5: Update local state
//         state.setState({ ...currentState, tree: mergedStructure });

//         console.log("Sync completed successfully");
//     } catch (error) {
//         console.error("Error during sync:", error);
//     } finally {
//         isSyncInProgress = false;
//         scheduleSyncAfterInterval();
//     }
    
// }



function mergeStructures(dropboxStructure: any, rtdbStructure: ObjRes | null): ObjRes {
    if (!rtdbStructure) return dropboxStructure;

    const mergedStructure = { ...dropboxStructure };

    // Merge comments and active status
    mergeProperties(mergedStructure, rtdbStructure);

    // Recursively merge folders
    mergedStructure.folders = mergedStructure.folders.map(dropboxFolder => {
        const rtdbFolder = rtdbStructure.folders.find(f => f.id === dropboxFolder.id);
        const mergedFolder = rtdbFolder ? mergeStructures(dropboxFolder, rtdbFolder) : dropboxFolder;
        
        // Preserve the collapsed state
        if (isFolderCollapsed(mergedFolder.id)) {
            mergedFolder.isCollapsed = true;
        }
       return mergedFolder 
    });
    

    // Merge files
    mergedStructure.files = mergedStructure.files.map(dropboxFile => {
        const rtdbFile = rtdbStructure.files.find(f => f.id === dropboxFile.id);
        return rtdbFile ? { ...dropboxFile, comment: rtdbFile.comment, active: rtdbFile.active } : dropboxFile;
    });

    return mergedStructure;
}

function mergeProperties(target: ObjRes, source: ObjRes) {
    if (source.comment) target.comment = source.comment;
    if (typeof source.active === 'boolean') target.active = source.active;
}

function startPeriodicSync() {
    if (!isSyncInitialized) {
        isSyncInitialized = true;
        syncDropboxWithRTDB(); // Initial sync
    }
}

export { startPeriodicSync };