const {initInput} = require('./initInput');
const {initResizers} = require('./initResizer');
const {toggleFolder, initDragAndDrop} = require('./folderInteraction');
const {createTableRenderer } = require('./tableRenderer');
import { FolderData } from "./tableRenderer";


export function renderData(data: FolderData) {
    document.body.innerHTML = '';
    console.log('Rendering data:', data);
    
    initInput();
    
    const tableRenderer = createTableRenderer(data);
    tableRenderer.initializeTable();
    tableRenderer.render();
    
    // Initialize drag and drop after the table is rendered
    initDragAndDrop(() => {
        tableRenderer.render();
    });
    
    initResizers();
}