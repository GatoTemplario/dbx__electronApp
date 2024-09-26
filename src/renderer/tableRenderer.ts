const {initResizers} = require('./initResizer');
export interface FileData {
    id: string;
    name: string;
    deprecated?: boolean;
    comment?: string;
}

export interface FolderData {
    id: string;
    name: string;
    files?: FileData[];
    folders?: FolderData[];
}

export function createTableRenderer(data: FolderData) {
    let table: HTMLTableElement;
    let tbody: HTMLTableSectionElement;
    let tableContainer: HTMLDivElement;

    function initializeTable() {
        table = document.createElement('table');
        table.id = 'fileTable';
        tbody = document.createElement('tbody');
        tbody.id = 'fileList';
        tableContainer = document.createElement('div');

        table.classList.add('folder-table');
        tableContainer.classList.add('table-container');
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Name', 'Type', 'Deprecated', 'Comment'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            const divResizer = document.createElement('div');
            divResizer.classList.add('resizer');
            th.appendChild(divResizer);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        document.body.appendChild(tableContainer);
    }

    function render() {
        tableContainer.innerHTML = '';
        renderStructure(data, 0, true);
        tableContainer.appendChild(table);

        initResizers();
    }

    function renderStructure(folder: FolderData, depth: number = 0, isRoot: boolean = false) {
        if (!isRoot) {
            addRow(folder, true, depth);
        }
        folder.files?.forEach(file => addRow(file, false, isRoot ? 0 : depth + 1));
        folder.folders?.forEach(subFolder => renderStructure(subFolder, isRoot ? 0 : depth + 1));
    }

    function addRow(item: FolderData | FileData, isFolder: boolean, depth: number) {
        const row = tbody.insertRow();
        
        // Name column
        const nameCell = row.insertCell();
        nameCell.textContent = '  '.repeat(depth) + item.name;
        nameCell.style.paddingLeft = `${depth * 20}px`;

        // Type column
        const typeCell = row.insertCell();
        typeCell.textContent = isFolder ? 'Folder' : getFileExtension(item.name);

        // Deprecated column
        const deprecatedCell = row.insertCell();
        if (!isFolder) {
            const toggleInput = document.createElement('input');
            toggleInput.type = 'checkbox';
            toggleInput.checked = (item as FileData).deprecated || false;
            toggleInput.addEventListener('change', (e) => handleDeprecatedChange(item.id, (e.target as HTMLInputElement).checked));
            deprecatedCell.appendChild(toggleInput);
        }

        // Comment column
        const commentCell = row.insertCell();
        if (!isFolder) {
            const commentInput = document.createElement('input');
            commentInput.type = 'text';
            commentInput.value = (item as FileData).comment || '';
            commentInput.placeholder = 'Add comment...';
            commentInput.addEventListener('input', (e) => handleCommentChange(item.id, (e.target as HTMLInputElement).value));
            commentCell.appendChild(commentInput);
        }
    }

    function getFileExtension(fileName: string): string {
        const parts = fileName.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }

    function handleDeprecatedChange(id: string, deprecated: boolean) {
        console.log(`File ${id} deprecated status changed to: ${deprecated}`);
    }

    function handleCommentChange(id: string, comment: string) {
        console.log(`File ${id} comment changed to: ${comment}`);
    }

    return {
        initializeTable,
        render
    };
}