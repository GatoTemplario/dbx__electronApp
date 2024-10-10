// folderUIState.ts
const folderUIState: { [folderId: string]: boolean } = {};

export function setFolderCollapsed(folderId: string, isCollapsed: boolean): void {
  folderUIState[folderId] = isCollapsed;
}

export function isFolderCollapsed(folderId: string): boolean {
  return folderUIState[folderId] !== false; // Default to collapsed
}

export function toggleFolderState(folderId: string): void {
  folderUIState[folderId] = !isFolderCollapsed(folderId);
}