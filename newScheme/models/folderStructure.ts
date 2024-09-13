export interface FolderData {
    id: string;
    name: string;
    path: string;
    files?: FileData[];
    folders?: FolderData[];
  }
  
  export interface FileData {
    id: string;
    name: string;
    path_lower: string;
    // ... other properties
  }

export interface ExtendedEntry {
    ".tag": string;
    name: string;
    path_lower: string;
    id: string;
    active?: boolean;
    comment?: string;
}

export class ObjRes {
    name: string;
    path: string;
    id: string;
    active: boolean;
    comment: string;
    folders: ObjRes[];
    files: ExtendedEntry[];

    constructor(name: string, path: string, id: string) {
        this.name = name;
        this.path = path;
        this.id = id;
        this.active = false;
        this.comment = "";
        this.folders = [];
        this.files = [];
    }
}