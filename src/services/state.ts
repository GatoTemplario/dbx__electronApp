import { ObjRes } from "./fetch";
const {renderData} = require("../renderer/renderStructure")

const state = {
    data : {
        project: "",
        tree: {
            name: "",
            active: true,
            comment: "",
            id: "",
            path: "",
            files: [],
            folders: [],
        }
    },
    listeners: [],
    initState(){
        console.log("initstate");
        renderData(this.data.tree)
    },
    getState(){
        return this.data
    },
    setState(newState : any){
        this.data = newState;
        for (const cb of this.listeners) {
            cb(newState)
        }
        localStorage.setItem("saved-state", JSON.stringify(newState))
        console.log("state cambio!", this.data);
    },
    suscribe( callback: ()=> any){
        this.listeners.push(callback)
    },
    
}

export {state}