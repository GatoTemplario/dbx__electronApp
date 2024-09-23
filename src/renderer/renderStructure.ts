// import { state } from '../services/state';

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

class TableRenderer {
    private table: HTMLTableElement;
    private tbody: HTMLTableSectionElement;

    constructor(private data: FolderData) {
        this.table = document.createElement('table');
        this.tbody = document.createElement('tbody');
        this.initializeTable();
    }

    private initializeTable() {
        this.table.classList.add('folder-table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Name', 'Type', 'Deprecated', 'Comment'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        this.table.appendChild(thead);
        this.table.appendChild(this.tbody);
    }

    public render() {
        this.renderStructure(this.data);
        document.body.appendChild(this.table);
    }

    private renderStructure(folder: FolderData, depth: number = 0) {
        this.addRow(folder, true, depth);
        folder.files?.forEach(file => this.addRow(file, false, depth + 1));
        folder.folders?.forEach(subFolder => this.renderStructure(subFolder, depth + 1));
    }

    private addRow(item: FolderData | FileData, isFolder: boolean, depth: number) {
        const row = this.tbody.insertRow();
        
        // Name column
        const nameCell = row.insertCell();
        nameCell.textContent = '  '.repeat(depth) + item.name;
        nameCell.style.paddingLeft = `${depth * 20}px`;

        // Type column
        const typeCell = row.insertCell();
        typeCell.textContent = isFolder ? 'Folder' : this.getFileExtension(item.name);

        // Deprecated column
        const deprecatedCell = row.insertCell();
        if (!isFolder) {
            const toggleInput = document.createElement('input');
            toggleInput.type = 'checkbox';
            toggleInput.checked = (item as FileData).deprecated || false;
            toggleInput.addEventListener('change', (e) => this.handleDeprecatedChange(item.id, (e.target as HTMLInputElement).checked));
            deprecatedCell.appendChild(toggleInput);
        }

        // Comment column
        const commentCell = row.insertCell();
        if (!isFolder) {
            const commentInput = document.createElement('input');
            commentInput.type = 'text';
            commentInput.value = (item as FileData).comment || '';
            commentInput.placeholder = 'Add comment...';
            commentInput.addEventListener('input', (e) => this.handleCommentChange(item.id, (e.target as HTMLInputElement).value));
            commentCell.appendChild(commentInput);
        }
    }

    private getFileExtension(fileName: string): string {
        const parts = fileName.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }

    private handleDeprecatedChange(id: string, deprecated: boolean) {
        // Here you would update the state. For now, we'll just log the change.
        console.log(`File ${id} deprecated status changed to: ${deprecated}`);
    }

    private handleCommentChange(id: string, comment: string) {
        // Here you would update the state. For now, we'll just log the change.
        console.log(`File ${id} comment changed to: ${comment}`);
    }
}

export function renderData(data: FolderData) {
    console.log('Rendering data:', data);
    new TableRenderer(data).render();
}