import { fetchChildProject, fetchGoogleDriveProjectFolder  } from './fetch';
import { state } from './state';
import { ref, set } from 'firebase/database';
import { rtdb } from '../logic/db';

const MIN_SYNC_INTERVAL = 30000; // 30 seconds
const MAX_SYNC_INTERVAL = 300000; // 5 minutes

let nextSyncTime = 0;
let syncTimeoutId: NodeJS.Timeout | null = null;

async function simplifiedSync() {
  const currentTime = Date.now();
  if (currentTime < nextSyncTime) {
    scheduleSyncAfterInterval();
    return;
  }

  console.log("Starting sync...");

  try {
    const currentState = state.getState();
    const projectId = currentState.project;
    const projectPath = currentState.tree.path

    // console.log("projectPath: ", projectPath);
    
    if (!projectId || projectPath == "") {
      console.log("No project ID set. Skipping sync.");
      return;
    }
    
    // const newDropboxEntries = await fetchChildProject(projectId, currentState.tree);
    const newGDriveEntries = await fetchGoogleDriveProjectFolder(projectId);
    // console.log("newGDriveEntries", newGDriveEntries);
    // console.log("newDropboxEntries", newDropboxEntries);
    
    
    // Merge the new structure with the existing one
    // const mergedStructure = mergeStructures(newDropboxEntries.tree, currentState.tree);
    const mergedStructure = mergeStructures(newGDriveEntries, currentState.tree);

    // Update RTDB
    const dbRef = ref(rtdb, `fileStructure/${projectId}`);
    await set(dbRef, mergedStructure);

    // Update local state
    state.setState({ ...currentState, tree: mergedStructure });

    console.log("Sync completed successfully");
    nextSyncTime = currentTime + MIN_SYNC_INTERVAL;
  } catch (error) {
    console.error("Error during sync:", error);
    nextSyncTime = currentTime + MAX_SYNC_INTERVAL;
  } finally {
    scheduleSyncAfterInterval();
  }
}

function scheduleSyncAfterInterval() {
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
  }
  const currentTime = Date.now();
  const delay = Math.max(0, nextSyncTime - currentTime);
  syncTimeoutId = setTimeout(simplifiedSync, delay);
}

function mergeStructures(dropboxStructure: any, rtdbStructure: any): any {
  if (!rtdbStructure) return dropboxStructure;

  const mergedStructure = { ...dropboxStructure };

  // Merge comments and active status
  mergeProperties(mergedStructure, rtdbStructure);

  // Recursively merge folders
  mergedStructure.folders? mergedStructure.folders.map((dropboxFolder: any) => {
    const rtdbFolder = rtdbStructure.folders.find((f: any) => f.id === dropboxFolder.id);
    return rtdbFolder ? mergeStructures(dropboxFolder, rtdbFolder) : dropboxFolder;
  }) : null;

  // Merge files
  mergedStructure.files? mergedStructure.files.map((dropboxFile: any) => {
    const rtdbFile = rtdbStructure.files.find((f: any) => f.id === dropboxFile.id);
    return rtdbFile ? { ...dropboxFile, comment: rtdbFile.comment, active: rtdbFile.active } : dropboxFile;
  }) : null;

  return mergedStructure;
}

function mergeProperties(target: any, source: any) {
  if (source.comment) target.comment = source.comment;
  if (typeof source.active === 'boolean') target.active = source.active;
}

export function startSimplifiedSync() {
  simplifiedSync();
}
