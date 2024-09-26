const { state } = require('../services/state');
// folderInteraction.ts
export function toggleFolder(folderElement: HTMLElement): void {
    // Implement the folder toggling logic here
    folderElement.classList.toggle('open');
    const content = folderElement.querySelector('.folder-content') as HTMLElement;
    if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
}

export function initDragAndDrop(renderData: any) {
    console.log('initDragAndDrop');
    
    let selectedItems = [];
    const currentState =state.getState()
    const fileList = document.getElementById('fileList');
    console.log('fileList', fileList);
    
    let draggedItems = [];
  
    fileList.addEventListener('dragstart', (e) => {
      if ((e.target as HTMLElement).tagName === 'TR') {
        draggedItems = selectedItems.length > 0 ? selectedItems : [e.target];
        draggedItems.forEach(item => item.classList.add('dragging'));
        e.dataTransfer.setData('text/plain', '');
      }
    });
  
    fileList.addEventListener('dragover', (e : any) => {
      e.preventDefault();
      const targetRow = e.target.closest('tr');
      if (targetRow && !draggedItems.includes(targetRow)) {
        targetRow.classList.add('drop-target');
      }
    });
  
    fileList.addEventListener('dragleave', (e : any) => {
      const targetRow = e.target.closest('tr');
      if (targetRow) {
        targetRow.classList.remove('drop-target');
      }
    });
   
  
    fileList.addEventListener('drop', (e : any) => {
      e.preventDefault();
      const targetRow = e.target.closest('tr');
      if (targetRow && !draggedItems.includes(targetRow)) {
        const targetPath = targetRow.dataset.path;
        draggedItems.forEach(item => {
          const sourcePath = item.dataset.path;
          moveItemInTree(sourcePath, targetPath, currentState);
        });
        // refreshFileList();
        renderData()
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
//   function refreshFileList() {
//     const fileList = document.getElementById('fileList');
//     fileList.innerHTML = '';
//     populateFileList(fileStructure);
//     initDragAndDrop();
// }
  function moveItemInTree(sourcePath: string, targetPath: string, data: any) {
    // Find the source and target items
    const sourceItem = findItemByPathInTree(data.tree, sourcePath.split('/').slice(1));
    const targetItem = findItemByPathInTree(data.tree, targetPath.split('/').slice(1));
  
    if (sourceItem && targetItem && targetItem.folders) {
      // Remove source item from its parent
      removeItemFromParentInTree(data.tree, sourcePath.split('/').slice(1));

      // Add source item to the target folder
      targetItem.folders = targetItem.folders || [];
      targetItem.folders.push(sourceItem);
    }
    
    // Helper function to find an item by its path in the new tree structure
    function findItemByPathInTree(tree: any, path: string[]): any {
        let currentItem = tree;
        
        for (const segment of path) {
            if (!currentItem) return null;
            
            // Check if the segment matches a folder name
            currentItem = currentItem.folders?.find((folder: any) => folder.name === segment) || 
            currentItem.files?.find((file: any) => file.name === segment);
        }
        return currentItem;
    }
    
    // Helper function to remove an item from its parent in the new tree structure
    function removeItemFromParentInTree(tree: any, path: string[]): void {
        const parentPath = path.slice(0, -1);
        const itemName = path[path.length - 1];
        const parentItem = findItemByPathInTree(tree, parentPath);
        
        if (parentItem && parentItem.folders) {
            parentItem.folders = parentItem.folders.filter((folder: any) => folder.name !== itemName);
        }
        if (parentItem && parentItem.files) {
            parentItem.files = parentItem.files.filter((file: any) => file.name !== itemName);
        }
    }
}
    