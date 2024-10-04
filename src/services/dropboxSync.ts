import { getArbolOG, buildStructure, ObjRes } from './fetch';
import { state } from './state';
import { ref, set, get } from 'firebase/database';
import { rtdb } from '../logic/db';

const SYNC_INTERVAL = 600*1000; // 5 minutes in milliseconds
let syncTimeoutId: NodeJS.Timeout | null = null;
let isSyncInitialized = false;


async function syncDropboxWithRTDB() {
    console.log("Starting sync...");
    
    const currentState = state.getState();
    const projectNameAndId = currentState.tree.name;
    const projectId = currentState.project;

    if (!projectNameAndId) {
        console.log("No project ID set. Skipping sync.");
        scheduleSyncAfterInterval();
        return;
    }

    try {
        // Step 1: Fetch the latest data from Dropbox
        const dropboxEntries    = await getArbolOG(`/folder/${projectNameAndId}`);
        const dropboxStructure  = buildStructure(dropboxEntries);

        // Step 2: Fetch the current structure from RTDB
        const dbRef             = ref(rtdb, `fileStructure/${projectId}`);
        const snapshot          = await get(dbRef);
        const rtdbStructure     = snapshot.exists() ? snapshot.val() : null;

        // Step 3: Merge Dropbox and RTDB structures
        const mergedStructure   = mergeStructures(dropboxStructure, rtdbStructure);
        console.log("Merged structure: ", mergedStructure);
        

        // Step 4: Update RTDB with the merged structure
        await set(dbRef, mergedStructure);

        // Step 5: Update local state
        state.setState({ ...currentState, tree: mergedStructure });

        console.log("Sync completed successfully");
    } catch (error) {
        console.error("Error during sync:", error);
    } finally {
        scheduleSyncAfterInterval();
    }
}

function scheduleSyncAfterInterval() {
    if (syncTimeoutId) {
        clearTimeout(syncTimeoutId);
    }
    syncTimeoutId = setTimeout(syncDropboxWithRTDB, SYNC_INTERVAL);
}

function mergeStructures(dropboxStructure: ObjRes, rtdbStructure: ObjRes | null): ObjRes {
    if (!rtdbStructure) return dropboxStructure;

    const mergedStructure = { ...dropboxStructure };

    // Merge comments and active status
    mergeProperties(mergedStructure, rtdbStructure);

    // Recursively merge folders
    mergedStructure.folders = mergedStructure.folders.map(dropboxFolder => {
        const rtdbFolder = rtdbStructure.folders.find(f => f.id === dropboxFolder.id);
        return rtdbFolder ? mergeStructures(dropboxFolder, rtdbFolder) : dropboxFolder;
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