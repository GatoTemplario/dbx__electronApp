// import { state } from './state';
const {state: state1} = require('../services/state');

let selectedItems = [];

function getFileIcon(type) {
  switch(type.toLowerCase()) {
    case 'folder': return '📁';
    case 'html': return '📄';
    case 'css': return '🎨';
    case 'javascript': return '📜';
    case 'svg': return '🖼️';
    default: return '📄';
  }
}

function populateFileList(structure, level = 0, parentPath = '') {
  const fileList = document.getElementById('fileList');
  if (!structure) return;

  if (structure.files) {
    structure.files.forEach(file => renderItem(file, 'file', level, parentPath));
  }
  if (structure.folders) {
    structure.folders.forEach(folder => {
      renderItem(folder, 'folder', level, parentPath);
      populateFileList(folder, level + 1, `${parentPath}/${folder.name}`);
    });
  }

  function renderItem(item, itemType, level, parentPath) {
    const row = document.createElement('tr');
    const indent = '&nbsp;'.repeat(level * 4);
    const folderToggle = itemType === 'folder' ? `<span class="folder-toggle" onclick="toggleFolder(this)">▼</span>` : '';
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;
    
    row.innerHTML = `
      <td>
        ${indent}
        ${folderToggle}
        <span class="file-icon">${getFileIcon(itemType)}</span>${item.name}
        <div class="resizer"></div>
      </td>
      <td>${itemType}<div class="resizer"></div></td>
      <td>${item.size || '-'}<div class="resizer"></div></td>
      <td>${item.modified || '-'}<div class="resizer"></div></td>
      <td><input type="text" class="comment-input" value="${item.comment || ''}" onchange="updateComment('${path}', this.value)"><div class="resizer"></div></td>
      <td><input type="checkbox" ${item.deprecated ? 'checked' : ''} onclick="toggleDeprecated(this, '${path}')"></td>
    `;
    
    if (item.deprecated) row.classList.add('deprecated');
    row.dataset.level = level;
    row.dataset.path = path;
    row.draggable = true;
    row.addEventListener('click', (e) => selectItem(e, row));
    row.addEventListener('contextmenu', (e) => showContextMenu(e, row));
    fileList.appendChild(row);
  }
}

function toggleFolder(element) {
  const row = element.closest('tr');
  const level = parseInt(row.dataset.level);
  let next = row.nextElementSibling;

  element.textContent = element.textContent === '▼' ? '▶' : '▼';

  while (next && parseInt(next.dataset.level) > level) {
    next.classList.toggle('hidden');
    if (next.classList.contains('hidden')) {
      const folderToggle = next.querySelector('.folder-toggle');
      if (folderToggle && folderToggle.textContent === '▼') {
        folderToggle.textContent = '▶';
      }
    }
    next = next.nextElementSibling;
  }
}

function toggleDeprecated(checkbox, path) {
  const row = checkbox.closest('tr');
  const isFolder = row.querySelector('.folder-toggle') !== null;
  row.classList.toggle('deprecated', checkbox.checked);

  if (isFolder) {
    let next = row.nextElementSibling;
    const level = parseInt(row.dataset.level);

    while (next && parseInt(next.dataset.level) > level) {
      const childCheckbox = next.querySelector('input[type="checkbox"]');
      childCheckbox.checked = checkbox.checked;
      next.classList.toggle('deprecated', checkbox.checked);
      next = next.nextElementSibling;
    }
  }

  updateDeprecatedStatus(path, checkbox.checked);
}

function updateDeprecatedStatus(path, isDeprecated) {
  const currentState = state.getState();
  const pathParts = path.split('/');
  let currentObj = currentState.tree;

  for (let i = 1; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (currentObj.folders) {
      currentObj = currentObj.folders.find(folder => folder.name === part);
    } else if (currentObj.files) {
      currentObj = currentObj.files.find(file => file.name === part);
    }
    if (!currentObj) break;
  }

  if (currentObj) {
    currentObj.deprecated = isDeprecated;
    if (currentObj.folders) {
      updateChildrenDeprecatedStatus(currentObj.folders, isDeprecated);
    }
  }

  state.setState(currentState);
}

function updateChildrenDeprecatedStatus(items, isDeprecated) {
  items.forEach(item => {
    item.deprecated = isDeprecated;
    if (item.folders) {
      updateChildrenDeprecatedStatus(item.folders, isDeprecated);
    }
  });
}

function updateComment(path, newComment) {
  const currentState = state.getState();
  const pathParts = path.split('/');
  let currentObj = currentState.tree;

  for (let i = 1; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (currentObj.folders) {
      currentObj = currentObj.folders.find(folder => folder.name === part);
    } else if (currentObj.files) {
      currentObj = currentObj.files.find(file => file.name === part);
    }
    if (!currentObj) break;
  }

  if (currentObj) {
    currentObj.comment = newComment;
  }

  state.setState(currentState);
}

function selectItem(event, row) {
  // ... (keep the existing selectItem function)
}

function showContextMenu(event, row) {
  // ... (keep the existing showContextMenu function)
}

function hideContextMenu() {
  // ... (keep the existing hideContextMenu function)
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

function initDragAndDrop() {
  const fileList = document.getElementById('fileList');
  let draggedItems = [];

  fileList.addEventListener('dragstart', (e : any) => {
    if (e.target.tagName === 'TR') {
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
      const currentState = state.getState();
      draggedItems.forEach(item => {
        const sourcePath = item.dataset.path;
        moveItem(currentState.tree, sourcePath.split('/').slice(1), targetPath.split('/').slice(1));
      });
      state.setState(currentState);
      refreshFileList();
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

function moveItem(tree, sourcePath, targetPath) {
  const sourceItem = findItemByPath(tree, sourcePath);
  const targetItem = findItemByPath(tree, targetPath);
  
  if (sourceItem && targetItem && targetItem.folders) {
    removeItemFromParent(tree, sourcePath);
    targetItem.folders.push(sourceItem);
  }
}

function findItemByPath(item, pathParts) {
  if (pathParts.length === 0) return item;
  const [current, ...rest] = pathParts;
  const child = item.folders?.find(f => f.name === current) || item.files?.find(f => f.name === current);
  return child ? findItemByPath(child, rest) : null;
}

function removeItemFromParent(item, pathParts) {
  if (pathParts.length === 1) {
    if (item.folders) {
      item.folders = item.folders.filter(folder => folder.name !== pathParts[0]);
    }
    if (item.files) {
      item.files = item.files.filter(file => file.name !== pathParts[0]);
    }
  } else {
    const [current, ...rest] = pathParts;
    const child = item.folders?.find(f => f.name === current);
    if (child) removeItemFromParent(child, rest);
  }
}

function refreshFileList() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  const currentState = state.getState();
  populateFileList(currentState.tree);
  initDragAndDrop();
}

function initResizers() {
  // ... (keep the existing initResizers function)
}

document.addEventListener('DOMContentLoaded', () => {
  const currentState = state.getState();
  populateFileList(currentState.tree);
  initResizers();
  initDragAndDrop();

  const explorerNameInput = document.getElementById('explorerName') as any;
  const titleDisplay = document.getElementById('titleDisplay');

  explorerNameInput.addEventListener('input', (e : any) => {
    titleDisplay.textContent = e.target.value;
    currentState.tree.name = e.target.value;
    state.setState(currentState);
  });

  const showModalBtn = document.getElementById('showModalBtn');
  const modal = document.getElementById('modal');

  showModalBtn.addEventListener('click', () => {
    modal.style.display = 'block';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Initialize the title display
  titleDisplay.textContent = currentState.tree.name;
  explorerNameInput.value = currentState.tree.name;

  // Subscribe to state changes
  state.suscribe(() => {
    refreshFileList();
  });
});