const fileStructure = [
  { name: "project", 
    type: "folder", 
    children: [
    { name: "src", 
      type: "folder",
      children: [
      { name: "index.html",
        type: "HTML", 
        size: "10 KB", 
        modified: "2023-05-15", 
        comments: "Main landing page", 
        deprecated: false },
      { name: "css", 
        type: "folder", 
        children: [
        { name: "styles.css", 
          type: "CSS", 
          size: "5 KB", 
          modified: "2023-05-14", 
          comments: "Global styles", 
          deprecated: false }
      ]},
      { name: "js", type: "folder", children: [
        { name: "app.js", type: "JavaScript", size: "15 KB", modified: "2023-05-13", comments: "Application logic", deprecated: false },
        { name: "old-script.js", type: "JavaScript", size: "8 KB", modified: "2023-03-01", comments: "Outdated scripts", deprecated: true }
      ]}
    ]},
    { name: "assets", type: "folder", children: [
      { name: "logo.svg", type: "SVG", size: "2 KB", modified: "2023-05-10", comments: "Company logo", deprecated: false }
    ]}
  ]}
];

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
  structure.forEach(item => {
    const row = document.createElement('tr');
    const indent = '&nbsp;'.repeat(level * 4);
    const folderToggle = item.type === 'folder' ? `<span class="folder-toggle" onclick="toggleFolder(this)">▼</span>` : '';
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;
    
    row.innerHTML = `
      <td>
        ${indent}
        ${folderToggle}
        <span class="file-icon">${getFileIcon(item.type)}</span>${item.name}
        <div class="resizer"></div>
      </td>
      <td>${item.type}<div class="resizer"></div></td>
      <td>${item.size || '-'}<div class="resizer"></div></td>
      <td>${item.modified || '-'}<div class="resizer"></div></td>
      <td><input type="text" class="comment-input" value="${item.comments || ''}" onchange="updateComment('${path}', this.value)"><div class="resizer"></div></td>
      <td><input type="checkbox" ${item.deprecated ? 'checked' : ''} onclick="toggleDeprecated(this, '${path}')"></td>
    `;
    
    if (item.deprecated) row.classList.add('deprecated');
    row.dataset.level = level;
    row.dataset.path = path;
    row.draggable = true;
    row.addEventListener('click', (e) => selectItem(e, row));
    row.addEventListener('contextmenu', (e) => showContextMenu(e, row));
    fileList.appendChild(row);

    if (item.children) {
      populateFileList(item.children, level + 1, path);
    }
  });
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
  const pathParts = path.split('/');
  let currentObj = fileStructure[0];

  for (let i = 1; i < pathParts.length; i++) {
    const part = pathParts[i];
    if (currentObj.children) {
      currentObj = currentObj.children.find(child => child.name === part);
    } else {
      break;
    }
  }

  if (currentObj) {
    currentObj.deprecated = isDeprecated;
    if (currentObj.children) {
      updateChildrenDeprecatedStatus(currentObj.children, isDeprecated);
    }
  }
}

function updateChildrenDeprecatedStatus(children, isDeprecated) {
  children.forEach(child => {
    child.deprecated = isDeprecated;
    if (child.children) {
      updateChildrenDeprecatedStatus(child.children, isDeprecated);
    }
  });
}

function updateComment(path, newComment) {
  console.log(`Updated comment for ${path}: ${newComment}`);
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
  selectedItems.forEach(item => {
    const path = item.dataset.path;
    deleteItemFromStructure(path);
    item.remove();
  });
  selectedItems = [];
  hideContextMenu();
}

function deleteItemFromStructure(path) {
  const pathParts = path.split('/');
  let currentObj = fileStructure[0];
  let parent = null;

  for (let i = 1; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    parent = currentObj;
    currentObj = currentObj.children.find(child => child.name === part);
  }

  if (parent && parent.children) {
    const index = parent.children.findIndex(child => child.name === pathParts[pathParts.length - 1]);
    if (index !== -1) {
      parent.children.splice(index, 1);
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

  fileList.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'TR') {
      draggedItems = selectedItems.length > 0 ? selectedItems : [e.target];
      draggedItems.forEach(item => item.classList.add('dragging'));
      e.dataTransfer.setData('text/plain', '');
    }
  });

  fileList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const targetRow = e.target.closest('tr');
    if (targetRow && !draggedItems.includes(targetRow)) {
      targetRow.classList.add('drop-target');
    }
  });

  fileList.addEventListener('dragleave', (e) => {
    const targetRow = e.target.closest('tr');
    if (targetRow) {
      targetRow.classList.remove('drop-target');
    }
  });

  fileList.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetRow = e.target.closest('tr');
    if (targetRow && !draggedItems.includes(targetRow)) {
      const targetPath = targetRow.dataset.path;
      draggedItems.forEach(item => {
        const sourcePath = item.dataset.path;
        moveItem(sourcePath, targetPath);
      });
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
  
  function moveItem(sourcePath, targetPath) {
  const sourceItem = findItemByPath(fileStructure[0], sourcePath.split('/').slice(1));
  const targetItem = findItemByPath(fileStructure[0], targetPath.split('/').slice(1));
  
  if (sourceItem && targetItem && targetItem.type === 'folder') {
    removeItemFromParent(fileStructure[0], sourcePath.split('/').slice(1));
    targetItem.children = targetItem.children || [];
    targetItem.children.push(sourceItem);
  }
}

function findItemByPath(item, pathParts) {
  if (pathParts.length === 0) return item;
  const [current, ...rest] = pathParts;
  const child = item.children ? item.children.find(c => c.name === current) : null;
  return child ? findItemByPath(child, rest) : null;
}

function removeItemFromParent(item, pathParts) {
  if (pathParts.length === 1) {
    item.children = item.children.filter(child => child.name !== pathParts[0]);
  } else {
    const [current, ...rest] = pathParts;
    const child = item.children.find(c => c.name === current);
    if (child) removeItemFromParent(child, rest);
  }
}
}

function refreshFileList() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  populateFileList(fileStructure);
  initDragAndDrop();
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
  populateFileList(fileStructure);
  initResizers();
  initDragAndDrop();

  const explorerNameInput = document.getElementById('explorerName');
  const titleDisplay = document.getElementById('titleDisplay');

  explorerNameInput.addEventListener('input', (e) => {
    titleDisplay.textContent = e.target.value;
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
  titleDisplay.textContent = explorerNameInput.value;
});