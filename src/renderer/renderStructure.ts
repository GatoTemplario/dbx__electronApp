export interface FileData {
    id: string;
    name: string;
}

export interface FolderData {
    id: string;
    name: string;
    files?: FileData[];
    folders?: FolderData[];
}

interface StateData {
    active?: boolean;
    comment?: string;
}

class FolderRenderer {
    private stateMap = new Map<string, StateData>();
    private container: HTMLDivElement;
    private folderStructure: HTMLDivElement;
    private extensionColumn: HTMLDivElement;
    private booleanColumn: HTMLDivElement;
    private commentsColumn: HTMLDivElement;

    constructor(private data: FolderData) {
        this.container = document.createElement('div');
        this.folderStructure = document.createElement('div');
        this.extensionColumn = document.createElement('div');
        this.booleanColumn = document.createElement('div');
        this.commentsColumn = document.createElement('div');
        this.initializeContainer();
    }

    private initializeContainer() {
        this.container.classList.add('folder-container');
        this.folderStructure.classList.add('folder-structure');
        this.extensionColumn.classList.add('extension-column');
        this.booleanColumn.classList.add('boolean-column');
        this.commentsColumn.classList.add('comments-column');
    }

    public render() {
        const folderList = this.createStructure(this.data);
        this.folderStructure.appendChild(folderList);

        const columnsContainer = document.createElement('div');
        columnsContainer.classList.add('columns-container');
        [this.extensionColumn, this.booleanColumn, this.commentsColumn].forEach(col => columnsContainer.appendChild(col));

        this.container.appendChild(this.folderStructure);
        this.container.appendChild(columnsContainer);
        document.body.appendChild(this.container);
    }

    private createStructure(folder: FolderData, depth: number = 0): HTMLUListElement {
        const ul = document.createElement('ul');
        ul.classList.add('folder-list');
        
        this.appendItem(ul, folder, true);
        // console.log("item", folder.name);
        folder.files?.forEach(file => this.appendItem(ul, file, false));
        folder.folders?.forEach(subFolder => ul.appendChild(this.createStructure(subFolder, depth + 1)));

        return ul;
    }

    private appendItem(ul: HTMLUListElement, item: FolderData | FileData, isFolder: boolean) {
        const li = document.createElement('li');
        // console.log("item", item.name);

        
        li.textContent = item.name;
        li.classList.add(isFolder ? 'folder-item' : 'file-item');
        ul.appendChild(li);

        this.appendColumns(item, isFolder);
    }

    private appendColumns(item: FolderData | FileData, isFolder: boolean) {
        const { name, extension } = this.splitFileName(item.name);

        this.appendColumn(this.extensionColumn, isFolder ? '' : extension, 'extension-item');
        this.appendColumn(this.booleanColumn, this.createToggle(item.id, 'active', isFolder), 'boolean-item');
        this.appendColumn(this.commentsColumn, this.createToggle(item.id, 'comment'), 'comments-item');
    }

    private appendColumn(column: HTMLDivElement, content: string | HTMLElement, className: string) {
        const item = document.createElement('div');
        item.classList.add(className);
        if (typeof content === 'string') {
            item.textContent = content;
        } else {
            item.appendChild(content);
        }
        column.appendChild(item);
    }

    private createToggle(id: string, type: 'active' | 'comment', isFolder: boolean = false): HTMLElement {
        if (isFolder && type === 'active') return document.createElement('div');

        const input = document.createElement('input');
        input.type = type === 'active' ? 'checkbox' : 'text';
        input.placeholder = type === 'comment' ? 'Add comment...' : '';
        input.dataset.id = id;

        const currentState = this.stateMap.get(id) || {};
        if (type === 'active') {
            (input as HTMLInputElement).checked = currentState.active || false;
        } else {
            input.value = currentState.comment || '';
        }

        input.addEventListener(type === 'active' ? 'change' : 'input', (e) => {
            const target = e.target as HTMLInputElement;
            // this.updateState(id, { [type]: type === 'active' ? target.checked : target.value });
        });

        return input;
    }

    // private updateState(id: string, newState: Partial<StateData>) {
    //     const currentState = this.stateMap.get(id) || {};
    //     this.stateMap.set(id, { ...currentState, ...newState });
    //     console.log('Updated state:', id, this.stateMap.get(id));
    // }

    private splitFileName(fileName: string): { name: string; extension: string } {
        const lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex === -1 
            ? { name: fileName, extension: '' }
            : { name: fileName.substring(0, lastDotIndex), extension: fileName.substring(lastDotIndex + 1) };
    }
}

export function renderData(data: FolderData) {
    new FolderRenderer(data).render();
}