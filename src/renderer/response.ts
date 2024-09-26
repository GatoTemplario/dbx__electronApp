// // comment ´
// I understand you're having issues with the drag and drop functionality not working properly in your rendered page. Let's analyze the code and make some adjustments to ensure the initDragAndDrop function is properly integrated into your render function.
// The main issue appears to be in how the initDragAndDrop function is being called. Let's modify the renderData function in renderStructure.ts to correctly initialize the drag and drop functionality.
// Here's an updated version of the renderData function:
// Updated renderStructure.tsClick to open code
// Here are the key changes and explanations:

// We've moved the initDragAndDrop call after tableRenderer.render() to ensure the table is fully rendered before initializing drag and drop.
// We're passing a callback function to initDragAndDrop that calls tableRenderer.render(). This allows the drag and drop functionality to trigger a re-render of the table when needed.
// We've added initResizers() at the end to ensure the column resizing functionality is initialized.
// We've updated the imports to use ES6 import syntax for consistency.

// Now, let's make sure the initDragAndDrop function in folderInteraction.ts is correctly implemented to work with this new structure:
// Updated folderInteraction.tsClick to open code
// The main changes in the initDragAndDrop function are:

// It now accepts a renderCallback parameter, which it calls after moving items in the tree structure.
// We've added a check to ensure the fileList element exists before attaching event listeners.
// We've updated the type annotations to be more specific (e.g., using DragEvent instead of any).
// We've simplified the draggedItems selection to only include the dragged element, as the selectedItems array was not defined in the provided code.

// These changes should help integrate the drag and drop functionality with your rendering process. The drag and drop operations will now trigger a re-render of the table, ensuring that the UI stays in sync with the data structure.
// To make this work, ensure that you're setting the data-path attribute on your table rows when rendering them. You may need to update your tableRenderer.ts file to include this. Here's a quick example of how you might modify the addRow function in tableRenderer.ts:
// typescriptCopyfunction addRow(item: FolderData | FileData, isFolder: boolean, depth: number) {
//     const row = tbody.insertRow();
//     row.dataset.path = item.id; // Add this line to set the data-path attribute

//     // ... rest of the function remains the same
// }
// With these changes, your drag and drop functionality should now work properly within your rendered page. The table will re-render after each drag and drop operation, reflecting the updated structure of your data.
´

// updated renderStructure.ts
import { initInput } from './initInput';
import { initResizers } from './initResizer';
import { toggleFolder, initDragAndDrop } from './folderInteraction';
import { createTableRenderer, FolderData } from "./tableRenderer";

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




// updated folderInteraction.ts
import { state } from '../services/state';

// ... (keep the toggleFolder function as is)

export function initDragAndDrop(renderCallback: () => void) {
    console.log('initDragAndDrop');
    
    const fileList = document.getElementById('fileList');
    if (!fileList) {
        console.error('File list element not found');
        return;
    }
    
    let draggedItems: HTMLElement[] = [];
    
    fileList.addEventListener('dragstart', (e: DragEvent) => {
        if ((e.target as HTMLElement).tagName === 'TR') {
            draggedItems = [(e.target as HTMLElement)];
            draggedItems.forEach(item => item.classList.add('dragging'));
            e.dataTransfer?.setData('text/plain', '');
        }
    });
    
    fileList.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        const targetRow = (e.target as HTMLElement).closest('tr');
        if (targetRow && !draggedItems.includes(targetRow)) {
            targetRow.classList.add('drop-target');
        }
    });
    
    fileList.addEventListener('dragleave', (e: DragEvent) => {
        const targetRow = (e.target as HTMLElement).closest('tr');
        if (targetRow) {
            targetRow.classList.remove('drop-target');
        }
    });
    
    fileList.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        const targetRow = (e.target as HTMLElement).closest('tr');
        if (targetRow && !draggedItems.includes(targetRow)) {
            const targetPath = targetRow.dataset.path;
            draggedItems.forEach(item => {
                const sourcePath = item.dataset.path;
                if (sourcePath && targetPath) {
                    moveItemInTree(sourcePath, targetPath, state.getState());
                }
            });
            renderCallback();
        }
        draggedItems.forEach(item => item.classList.remove('dragging'));
        if (targetRow) {
            targetRow.classList.remove('drop-target');
        }
    });
    
    fileList.addEventListener('dragend', () => {
        draggedItems.forEach(item => item.classList.remove('dragging'));
        const dropTargets = fileList.querySelectorAll('.drop-target');
        dropTargets.forEach(target => target.classList.remove('drop-target'));
    });
}

// ... (keep the moveItemInTree function and its helpers as they are)







// I see. Thank you for clarifying about the selected items feature. Let's modify the initDragAndDrop function to incorporate this functionality. We'll need to implement a way to select multiple items and then drag them together.
// Let's update the folderInteraction.ts file to include this feature:
// Updated folderInteraction.ts with multi-selectClick to open code
// Here's a breakdown of the changes and new features:

// We've added a selectedItems array to keep track of the currently selected items.
// A new click event listener handles item selection:

// Single click selects a single item
// Ctrl/Cmd + click toggles selection of an item
// Shift + click selects a range of items


// The dragstart event now checks if the dragged item is in the selection. If not, it clears the selection and selects only the dragged item.
// We've added helper functions for managing the selection:

// toggleItemSelection
// addItemToSelection
// removeItemFromSelection
// clearSelection
// getRowIndex (for range selection)


// The drop event now clears the selection after the drag operation is complete.

// To make this work, you'll need to add some CSS to visually indicate selected items. Add this to your stylesheet:
// cssCopy.selected {
//   background-color: #e0e0e0;
// }

// .dragging {
//   opacity: 0.5;
// }

// .drop-target {
//   border-top: 2px solid #007bff;
// }
// Also, make sure that your tableRenderer.ts is setting the data-path attribute on the table rows, as mentioned in the previous response.
// With these changes, users will be able to:

// Select a single item by clicking on it
// Select multiple items by holding Ctrl/Cmd and clicking
// Select a range of items by clicking the first item, then holding Shift and clicking the last item
// Drag either a single item or multiple selected items

// The drag and drop operation will apply to all selected items, moving them to the new location in the tree structure. After each drag and drop operation, the table will re-render to reflect the updated structure.
// This implementation provides a more flexible and user-friendly way to interact with your file structure, allowing for efficient manipulation of multiple items at once.

import { state } from '../services/state';

export function toggleFolder(folderElement: HTMLElement): void {
    // Keep the existing toggleFolder implementation
}

export function initDragAndDrop(renderCallback: () => void) {
    console.log('initDragAndDrop');
    
    const fileList = document.getElementById('fileList');
    if (!fileList) {
        console.error('File list element not found');
        return;
    }
    
    let selectedItems: HTMLElement[] = [];
    let draggedItems: HTMLElement[] = [];
    
    // Add click event listener for item selection
    fileList.addEventListener('click', (e: MouseEvent) => {
        const clickedRow = (e.target as HTMLElement).closest('tr');
        if (!clickedRow) return;
        
        if (e.ctrlKey || e.metaKey) {
            // Toggle selection with Ctrl/Cmd key
            toggleItemSelection(clickedRow);
        } else if (e.shiftKey && selectedItems.length > 0) {
            // Range selection with Shift key
            const lastSelected = selectedItems[selectedItems.length - 1];
            const start = Math.min(getRowIndex(lastSelected), getRowIndex(clickedRow));
            const end = Math.max(getRowIndex(lastSelected), getRowIndex(clickedRow));
            const rowsInRange = Array.from(fileList.querySelectorAll('tr')).slice(start, end + 1);
            rowsInRange.forEach(row => addItemToSelection(row as HTMLElement));
        } else {
            // Single selection
            clearSelection();
            addItemToSelection(clickedRow);
        }
    });

    fileList.addEventListener('dragstart', (e: DragEvent) => {
        const draggedRow = (e.target as HTMLElement).closest('tr');
        if (!draggedRow) return;

        if (!selectedItems.includes(draggedRow)) {
            clearSelection();
            addItemToSelection(draggedRow);
        }

        draggedItems = selectedItems;
        draggedItems.forEach(item => item.classList.add('dragging'));
        e.dataTransfer?.setData('text/plain', '');
    });
    
    fileList.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        const targetRow = (e.target as HTMLElement).closest('tr');
        if (targetRow && !draggedItems.includes(targetRow)) {
            targetRow.classList.add('drop-target');
        }
    });
    
    fileList.addEventListener('dragleave', (e: DragEvent) => {
        const targetRow = (e.target as HTMLElement).closest('tr');
        if (targetRow) {
            targetRow.classList.remove('drop-target');
        }
    });
    
    fileList.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        const targetRow = (e.target as HTMLElement).closest('tr');
        if (targetRow && !draggedItems.includes(targetRow)) {
            const targetPath = targetRow.dataset.path;
            draggedItems.forEach(item => {
                const sourcePath = item.dataset.path;
                if (sourcePath && targetPath) {
                    moveItemInTree(sourcePath, targetPath, state.getState());
                }
            });
            renderCallback();
        }
        draggedItems.forEach(item => item.classList.remove('dragging'));
        if (targetRow) {
            targetRow.classList.remove('drop-target');
        }
        clearSelection();
    });
    
    fileList.addEventListener('dragend', () => {
        draggedItems.forEach(item => item.classList.remove('dragging'));
        const dropTargets = fileList.querySelectorAll('.drop-target');
        dropTargets.forEach(target => target.classList.remove('drop-target'));
    });

    function toggleItemSelection(item: HTMLElement) {
        const index = selectedItems.indexOf(item);
        if (index === -1) {
            addItemToSelection(item);
        } else {
            removeItemFromSelection(item);
        }
    }

    function addItemToSelection(item: HTMLElement) {
        if (!selectedItems.includes(item)) {
            selectedItems.push(item);
            item.classList.add('selected');
        }
    }

    function removeItemFromSelection(item: HTMLElement) {
        const index = selectedItems.indexOf(item);
        if (index !== -1) {
            selectedItems.splice(index, 1);
            item.classList.remove('selected');
        }
    }

    function clearSelection() {
        selectedItems.forEach(item => item.classList.remove('selected'));
        selectedItems = [];
    }

    function getRowIndex(row: HTMLElement): number {
        return Array.from(fileList.querySelectorAll('tr')).indexOf(row);
    }
}

// Keep the existing moveItemInTree function and its helpers

