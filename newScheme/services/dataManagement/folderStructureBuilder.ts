import { ObjRes, ExtendedEntry } from '../../models/folderStructure';

export function buildStructure(entries: ExtendedEntry[]): ObjRes {
    const root = new ObjRes("root", "/", "root-id");
    const pathMap = new Map<string, ObjRes>();

    // Initialize the root folder in the map
    pathMap.set(root.path, root);

    // Process each entry
    for (const entry of entries) {
        if (entry[".tag"] === "folder") {
            if (!pathMap.has(entry.path_lower)) {
                const folder = new ObjRes(entry.name, entry.path_lower, entry.id);
                folder.active = entry.active || false;
                folder.comment = entry.comment || "";
                pathMap.set(entry.path_lower, folder);

                // Determine parent path
                const parentPath = entry.path_lower.substring(0, entry.path_lower.lastIndexOf('/')) || "/";
                const parentFolder = pathMap.get(parentPath);

                if (parentFolder) {
                    parentFolder.folders.push(folder);
                }
            }
        } else if (entry[".tag"] === "file") {
            // Determine parent path
            const parentPath = entry.path_lower.substring(0, entry.path_lower.lastIndexOf('/')) || "/";
            const parentFolder = pathMap.get(parentPath);

            if (parentFolder) {
                if (!parentFolder.files.some(file => file.path_lower === entry.path_lower)) {
                    parentFolder.files.push({
                        ...entry,
                        active: entry.active || false,
                        comment: entry.comment || ""
                    });
                }
            }
        }
    }

    const aux = Array.from(pathMap.entries());
    const secondElement = aux[1][1];
    
    return secondElement;
}