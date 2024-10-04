// import { ObjRes } from "./fetch";
const { populateFileList } = require("../renderer/renderStructure");
const { ref, set, onValue } = require("firebase/database");
const { rtdb } = require('../logic/db');

interface StateData {
    project: string;
    tree: {
        name: string;
        comment: string;
        id: string;
        path: string;
        files: any[];
        folders: any[];
    };
    initialLoadComplete: boolean;
    projectsFolderPath: string;
    localStoragePath: string;
    // syncReady: boolean;
}

let isUpdatingFromRTDB = false;
const state = {
    data: {
        project: "",
        tree: {
            name: "",
            comment: "",
            id: "",
            path: "",
            files: [],
            folders: [],
        },
        initialLoadComplete: false,
        projectsFolderPath: "",
        localStoragePath: "",
    } as StateData,
    
    listeners: [],
    rtdbListener: null as null | (() => void),


    initState() {
        const storedProjectId   = localStorage.getItem('projectId');
        const storedProjectPath = localStorage.getItem('projectPath');
        const localStoragePath  = localStorage.getItem('localStoragePath');
        console.log("initstate: ", storedProjectId);
        if (storedProjectId) {
            this.data.project = storedProjectId;
        }

        if (storedProjectPath) {
            this.data.projectsFolderPath = storedProjectPath;
        }
        if (localStoragePath) {
            this.data.localStoragePath = localStoragePath;
        }
        populateFileList(this.data.tree, 0, "/");
    },

    getState() {
        return this.data;
    },

    setState(newState: Partial<StateData>) {
        localStorage.setItem("projectId", newState.project);
        if (newState.projectsFolderPath) {
            localStorage.setItem("projectPath", newState.projectsFolderPath);
        }
        if (newState.localStoragePath) {
            localStorage.setItem("localStoragePath", newState.localStoragePath);
        }

        const oldState = { ...this.data };
        this.data = {...this.data, ...newState};

        for (const cb of this.listeners) {
            cb(this.data);
        }

        console.log("state changed!", this.data);
    },

    subscribe(callback: () => any) {
        this.listeners.push(callback);
    },

};

export { state };