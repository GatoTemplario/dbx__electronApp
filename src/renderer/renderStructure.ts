const {shell}     = require('electron');
const {state}     = require('../services/state');
const {initInput} = require('../renderer/initInput');
const path        = require('path');
const { preserveUIState, getPreservedUIState, clearPreservedUIState, debouncedStateUpdate } = require('./uiStatePreservation'); 
import { isFolderCollapsed, toggleFolderState } from './folderUIState';


let selectedItems = [];

const DESKTOP_PATH = localStorage.getItem('localStoragePath');
// const DESKTOP_PATH = path.join(require('os').homedir(), 'Desktop');

function getFileIcon(type) {
  switch(type.toLowerCase()) {
    case 'folder': return '<span class="icon-folder material-symbols-outlined icon-folder">folder</span>';
    case 'html': return '📄';
    case 'skp': return '<span class="material-symbols-outlined">home_work</span>';
    case 'xls': return '<span class="material-symbols-outlined icon-xls">table</span>';
    case 'xlsx': return '<span class="material-symbols-outlined icon-xlsx">table</span>';
    case 'gsheet': return '<span class="material-symbols-outlined icon-gsheet">table</span>';
    case 'dwg': return '<span class="material-symbols-outlined icon-dwg">edit_square</span>';
    case 'pdf': return '<span class="material-symbols-outlined icon-pdf">picture_as_pdf</span>';
    case 'docx': return '<span class="material-symbols-outlined icon-doc">description</span>';
    default: return '<span class="material-symbols-outlined">draft</span>';
  }
}


export function populateFileList(structure, level = 0, parentPath = '') {

    const fileList = document.getElementById('fileList');
    if (!structure) return;

    // Helper function to sort items
    const sortItems = (items) => {
      return items.sort((a, b) => {
        // Put folders first
        if (a.folders && !b.folders) return -1;
        if (!a.folders && b.folders) return 1;
        
        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      });
    };

    // Combine and sort folders and files
    const allItems = [
      ...(structure.folders || []).map(folder => ({ ...folder, type: 'folder' })),
      ...(structure.files || []).map(file => ({ ...file, type: 'file' }))
    ];

    const sortedItems = sortItems(allItems);

    sortedItems.forEach(item => {
  renderItem(item, item.type, level, parentPath);
    if (item.type === 'folder' && !isFolderCollapsed(item.id)) {
      populateFileList(item, level + 1, `${parentPath}/${item.name}`);
    }
  });

  function renderItem(item, itemType, level, parentPath) {
    const row  = document.createElement('tr');
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;
    var nameWithoutExtension = item.name;
    row.dataset.itemType = itemType;
    row.dataset.folderId = item.id;  

    if (itemType !== 'folder') {
      nameWithoutExtension = item.name.split('.').slice(0, -1).join('.');
    }
    
    const indentClass = `indent-level-${level}`;
    const fileIndentClass = itemType !== 'folder' ? 'file-indent' : '';
    
    const folderToggle = document.createElement('span');

    if (itemType === 'folder') {
      folderToggle.textContent = isFolderCollapsed(item.id) ? '▶ ' : '▼ ';
      folderToggle.addEventListener('click', function () {
        toggleFolder(this);
        refreshFileList();
      });
    }


    // Create the icon
    const icon = document.createElement('span');
    icon.classList.add('file-icon');
    icon.innerHTML = getFileIcon(itemType);

    const bytesToMb = item.size ? (item.size / 1024 / 1024).toFixed(2) + " MB" : "-";
  
    // Create the clickable name
    const nameLink = document.createElement('a');
    nameLink.href = '#';
    nameLink.textContent = nameWithoutExtension;
    nameLink.classList.add(`${itemType === 'folder' ? 'folder-style' : 'file-style'}`);
    nameLink.style.textDecoration = 'none';
    nameLink.style.color = 'inherit';
    
    let clickTimer = null;

    nameLink.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default link behavior
      if (clickTimer === null) {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          // Single click action (select item)
          selectItem(e, row);
        }, 200);
      } else {
        clearTimeout(clickTimer);
        clickTimer = null;
        // Double click action
        openFileOrFolder(item);
      }
    });

    row.innerHTML = `
    <td class="name-cell ${indentClass} ${fileIndentClass}"></td>
    <td>${itemType}</td>
    <td class="size-cell">${(bytesToMb)|| '-'}</td>
    <td></td>
    <td class="deprecated-cell">
      <label class="checkbox-container">
        <input type="checkbox" ${item.deprecated ? 'checked' : ''}>
        <span class="checkmark"></span>
      </label>
    </td>
  `;


    // se agrega codigo para cambiar el type input comment for a textarea
  function replaceCommentInput() {
      
    const commentTextarea = document.createElement('textarea');
    commentTextarea.className = 'comment-textarea';
    commentTextarea.value = getPreservedUIState(item.id)?.comment || item.comment || '';
    commentTextarea.rows = 1; // Start with 1 row
    commentTextarea.placeholder = "Deja un comentario..."

    commentTextarea.addEventListener('input', function() {
      preserveUIState(item.id, { comment: this.value });
    });

    commentTextarea.addEventListener('blur', function() {
      debouncedStateUpdate({ 
          tree: updateItemInTree(state.getState().tree, item.id, { comment: this.value }) 
      });
      clearPreservedUIState(item.id);
    });
    // Add event listeners
    commentTextarea.addEventListener('focus', function() {
      this.rows = 3; // Expand to 3 rows when focused
    });

    commentTextarea.addEventListener('blur', function() {
      this.rows = 1; // Collapse to 1 row when losing focus
    });

    commentTextarea.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent default to avoid newline
        this.blur(); // Remove focus
        updateComment(path, this.value);
      }
    });
    
    function updateItemInTree(tree, itemId, updates) {
      if (tree.id === itemId) {
        return { ...tree, ...updates };
      }
      if (tree.folders) {
        tree.folders = tree.folders.map(folder => updateItemInTree(folder, itemId, updates));
      }
      if (tree.files) {
        tree.files = tree.files.map(file => file.id === itemId ? { ...file, ...updates } : file);
      }
      return tree;
    }
  

    // Replace the existing td innerHTML for comments with:
    const commentTd = row.querySelector('td:nth-child(4)');
    commentTd.innerHTML = ''; // Clear existing content
    commentTd.appendChild(commentTextarea);
    }
  replaceCommentInput();


     // Insert the folder toggle (if folder), icon, and name into the first td
  const firstTd = row.querySelector('td');
  if (itemType === 'folder') {
    firstTd.insertBefore(folderToggle, firstTd.firstChild);
  }
  firstTd.insertBefore(icon, firstTd.firstChild);
  firstTd.insertBefore(nameLink, firstTd.querySelector('.resizer'));

    // Handling folder toggle
    if (itemType === 'folder') {
      firstTd.insertBefore(folderToggle, firstTd.firstChild);
    }
  
    // Add an event listener for comment input
    const commentInput = row.querySelector('.comment-textarea');
    commentInput.addEventListener('change', function () {
      updateComment(path, this.value);
    });
  
    // Handling the deprecated checkbox
    const deprecatedCheckbox = row.querySelector('input[type="checkbox"]');
    deprecatedCheckbox.addEventListener('change', function () {
      toggleDeprecated(deprecatedCheckbox, path);
    });
  
    if (item.deprecated) row.classList.add('deprecated');
    row.dataset.level = level;
    row.dataset.path = path;
    row.draggable = true;
    row.addEventListener('click', (e) => selectItem(e, row));
    row.addEventListener('contextmenu', (e) => showContextMenu(e, row));
    document.getElementById('fileList').appendChild(row);
  }

}


function openFileOrFolder(item) {
  console.log("openFileOrFolder:", item);
  
  const currentState = state.getState();
  // const projectPath = currentState.tree.path;
  console.log("item:", item);
  
  if (item.folders || item.files) {
    let fullPath = path.join(DESKTOP_PATH, `${item.path}` || '');
    // It's a folder
    shell.openPath(fullPath).then((error) => {
      if (error) {
        console.error('Error opening folder:', error);
      }
    });
  } else {
    // It's a file
    // console.log("fullPath:", fullPath);
    
    
    
    let fileFullPath = path.join(DESKTOP_PATH, `${item.path_lower}`);
    console.log("fullPath:", fileFullPath);
    
    shell.openPath(fileFullPath)
      .then((error) => {
        if (error) {
          console.error('Error opening file:', error);
          // If file doesn't exist, open the parent folder
          const parentFolder = path.dirname(fileFullPath);
          shell.openPath(parentFolder).then((folderError) => {
            if (folderError) {
              console.error('Error opening parent folder:', folderError);
            }
          });
        }
      });
  }
}


function toggleFolder(element) {
  const row = element.closest('tr');
  const folderId = row.dataset.folderId; // Ensure you add this data attribute when rendering
  toggleFolderState(folderId);
  refreshFileList();
}

function toggleDeprecated(checkbox, path) {
  const row = checkbox.closest('tr');
  const isFolder = row.querySelector('.folder-toggle') !== null;
  const isDeprecated = checkbox.checked;

  // Toggle the current folder/file in the DOM
  row.classList.toggle('deprecated', isDeprecated);

  // If it's a folder, toggle all its descendants (files and subfolders)
  let next = row.nextElementSibling;
  const level = parseInt(row.dataset.level);

  while (next && parseInt(next.dataset.level) > level) {
    const childCheckbox = next.querySelector('.checkbox-container input[type="checkbox"]');
    if (childCheckbox) {
      childCheckbox.checked = isDeprecated;
      next.classList.toggle('deprecated', isDeprecated);
    }
    next = next.nextElementSibling;
  }

  // Update the actual data structure for the state
  updateDeprecatedStatus(path, isDeprecated);
}

function updateDeprecatedStatus(path, isDeprecated) {
  const currentState = state.getState();
  const pathParts = path.split('/').filter(part => part !== '');
  let currentObj = currentState.tree;

  // Navigate to the correct folder or file in the tree
  for (const part of pathParts) {
    if (currentObj.folders) {
      const folder = currentObj.folders.find(f => f.name === part);
      if (folder) {
        currentObj = folder;
        continue;
      }
    }
    if (currentObj.files) {
      const file = currentObj.files.find(f => f.name === part);
      if (file) {
        currentObj = file;
        break;
      }
    }
    break; // Path not found
  }

  if (currentObj) {
    // Set the current item as deprecated
    currentObj.deprecated = isDeprecated;
    delete currentObj.active; // Remove active property if necessary

    // Recursively set all folders and files inside it as deprecated
    if (currentObj.folders) {
      recursivelyUpdateDeprecated(currentObj.folders, isDeprecated);
    }
    if (currentObj.files) {
      recursivelyUpdateDeprecated(currentObj.files, isDeprecated);
    }
  }

  state.setState(currentState);
}

function recursivelyUpdateDeprecated(items, isDeprecated) {
  items.forEach(item => {
    item.deprecated = isDeprecated;
    delete item.active; // Remove the active property

    // Recursively update folders and files within each folder
    if (item.folders) {
      recursivelyUpdateDeprecated(item.folders, isDeprecated);
    }
    if (item.files) {
      recursivelyUpdateDeprecated(item.files, isDeprecated);
    }
  });
}


function updateComment(path, newComment) {
  console.log(`Updated comment for ${path}: ${newComment}`);
  
  const currentState = state.getState();
  const pathParts = path.split('/').filter(part => part !== '');
  let currentObj = currentState.tree;

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (i === pathParts.length - 1) {
      // We've reached the last part of the path
      if (currentObj.folders) {
        const folder = currentObj.folders.find(folder => folder.name === part);
        if (folder) {
          folder.comment = newComment;
          break;
        }
      }
      if (currentObj.files) {
        const file = currentObj.files.find(file => file.name === part);
        if (file) {
          file.comment = newComment;
          break;
        }
      }
    } else {
      // We're still navigating through folders
      if (currentObj.folders) {
        currentObj = currentObj.folders.find(folder => folder.name === part);
        if (!currentObj) break;
      } else {
        break;
      }
    }
  }

  state.setState(currentState);
}

function selectItem(event, row) {
  if (!event.ctrlKey && !event.shiftKey) {
    selectedItems.forEach(item => item.classList.remove('selected'));
    selectedItems = [];
  }

  if (event.shiftKey && selectedItems.length > 0) {
    const lastSelected = selectedItems[selectedItems.length - 1];
    const start = Math.min(lastSelected.rowIndex, row.rowIndex);
    const end = Math.max(lastSelected.rowIndex, row.rowIndex);
    const rows = Array.from(document.querySelectorAll('#fileList tr'));
    rows.slice(start - 1, end).forEach(r => {
      r.classList.add('selected');
      if (!selectedItems.includes(r)) selectedItems.push(r);
    });
  } else {
    row.classList.toggle('selected');
    if (row.classList.contains('selected')) {
      selectedItems.push(row);
    } else {
      selectedItems = selectedItems.filter(item => item !== row);
    }
  }
}

function showContextMenu(event, row) {
  event.preventDefault();
  const contextMenu = document.getElementById('contextMenu');
  contextMenu.style.display = 'block';
  contextMenu.style.left = `${event.pageX}px`;
  contextMenu.style.top = `${event.pageY}px`;

  const deleteOption = document.getElementById('deleteOption');
  const moveOption = document.getElementById('moveOption');

  deleteOption.onclick = () => deleteSelectedItems();
  moveOption.onclick = () => moveSelectedItems();

  document.addEventListener('click', hideContextMenu);
}

function hideContextMenu() {
  const contextMenu = document.getElementById('contextMenu');
  contextMenu.style.display = 'none';
  document.removeEventListener('click', hideContextMenu);
}

function deleteSelectedItems() {
  const currentState = state.getState();
  selectedItems.forEach(item => {
    const path = item.dataset.path;
    deleteItemFromStructure(currentState.tree, path.split('/').slice(1));
    item.remove();
  });
  selectedItems = [];
  hideContextMenu();
  state.setState(currentState);
}

function deleteItemFromStructure(currentObj, pathParts) {
  if (pathParts.length === 1) {
    if (currentObj.folders) {
      currentObj.folders = currentObj.folders.filter(folder => folder.name !== pathParts[0]);
    }
    if (currentObj.files) {
      currentObj.files = currentObj.files.filter(file => file.name !== pathParts[0]);
    }
  } else {
    const [current, ...rest] = pathParts;
    const nextObj = currentObj.folders?.find(folder => folder.name === current);
    if (nextObj) {
      deleteItemFromStructure(nextObj, rest);
    }
  }
}

function moveSelectedItems() {
  console.log('Move functionality not implemented yet');
  hideContextMenu();
}


function refreshFileList() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  const currentState = state.getState();
  populateFileList(currentState.tree);
  initResizers();
  setTitle();
}



function initResizers() {
  const table = document.getElementById('fileTable');
  const cols = table.querySelectorAll('th, td');
  const resizers = table.querySelectorAll('.resizer');

  let currentResizer;
  let nextCol;
  let x = 0;
  let w = 0;
  let nw = 0;

  function mouseDownHandler(e) {
    currentResizer = e.target;
    const parent = currentResizer.parentElement;
    nextCol = parent.nextElementSibling;
    x = e.clientX;
    w = parent.offsetWidth;
    if (nextCol) nw = nextCol.offsetWidth;

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);

    currentResizer.classList.add('resizing');
  }

  function mouseMoveHandler(e ) {
    const dx = e.clientX - x;
    const col = currentResizer.parentElement;
    const newWidth = w + dx;
    const minWidth = 50; // Minimum width for a column

    if (newWidth > minWidth && nextCol && nw - dx > minWidth) {
      col.style.width = `${newWidth}px`;
      if (nextCol) nextCol.style.width = `${nw - dx}px`;
    }
  }

  function mouseUpHandler() {
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    currentResizer.classList.remove('resizing');
  }

  resizers.forEach((resizer) => {
    resizer.addEventListener('mousedown', mouseDownHandler);
  });
}


document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded");
  
  // lógica para obtener el nombre del proyecto de localStorage
  const localStorageProjectName = localStorage.getItem('projectName');
  const titleDisplay = document.getElementById('titleDisplay');
  titleDisplay.textContent = localStorageProjectName;

  // Initialize the settings dialog
  initSettingsDialog();
  
  // Initialize the input for project ID
  initInput();
  
  // Subscribe to state changes
  state.subscribe(() => {
    refreshFileList();
    initResizers();
    // Aqui iba initDragAndDrop();
    // initDragAndDrop();
    setTitle();
  })
});

function setTitle() {
  const currentState = state.getState();
  const titleDisplay = document.getElementById('titleDisplay');
  const fullNombreProjecto = currentState.tree.name;
  var nombreProjecto = ""
  
  if(fullNombreProjecto){
    // nombreProjecto = " - " + fullNombreProjecto.split('_').slice(1).join('-').trim();
  }
  // localStorage.setItem('projectName', fullNombreProjecto);

  if(titleDisplay.textContent !== nombreProjecto) {
    titleDisplay.textContent = nombreProjecto;
  }else{
    // console.log("vamos siempre por aqui??");
    // console.log(currentState.tree.name);
    
    titleDisplay.textContent = " - " + fullNombreProjecto;
  }
}

function initSettingsDialog() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsDialog = document.getElementById('settingsDialog');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const projectPathInput = document.getElementById('projectPathInput') as HTMLInputElement;

  settingsBtn.addEventListener('click', () => {
    settingsDialog.style.display = 'block';
    projectPathInput.value = state.getState().projectPath || '';
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsDialog.style.display = 'none';
  });

  saveSettingsBtn.addEventListener('click', () => {
    const newProjectsFolderPath = projectPathInput.value.trim();


    if (newProjectsFolderPath) {
      // const originalPath = localStorage.getItem("projectPath");
      const processedPaths = processPath(newProjectsFolderPath);
      state.setState({ 
        projectsFolderPath: processedPaths.projectsFolderPath,
        localStoragePath: processedPaths.localStorage
      });
      settingsDialog.style.display = 'none';
      // You might want to trigger a reload of the file structure here
      // loadFileStructure(newProjectPath);
    }
  });

  // Close the dialog if clicking outside of it
  window.addEventListener('click', (event) => {
    if (event.target === settingsDialog) {
      settingsDialog.style.display = 'none';
    }
  });
  
  
  function processPath(originalPath) {
    const dropboxKeyword = "Dropbox";
    
    // Busca la posición de la palabra "Dropbox" en la cadena
    const dropboxIndex = originalPath.indexOf(dropboxKeyword);
    
    if (dropboxIndex !== -1) {
      // Asignar localStorage: Todo lo que está antes de "Dropbox"
      const localStorage = originalPath.slice(0, dropboxIndex + dropboxKeyword.length + 1); // Incluye hasta el final de "Dropbox\\"
      
      // Asignar projectsFolderPath: Todo lo que está después de "Dropbox"
      const projectsFolderPath = originalPath
      .slice(dropboxIndex + dropboxKeyword.length) // Desde "Dropbox" en adelante
      .replace(/\\/g, '/');  // Reemplaza "\\" por "/"
      
      return {
        localStorage: localStorage,
        projectsFolderPath: projectsFolderPath
      };
    } else {
      throw new Error("'Dropbox' not found in the path");
    }
  }


}