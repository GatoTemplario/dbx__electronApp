const { state } = require('../services/state');
const projectCodeInput = document.createElement('input');
// const projectCodeFeedback = document.createElement('div');
const nameProject =document.createElement('label')
const inputContainer = document.createElement('div');

function initializeInputProject() {
    projectCodeInput.type = 'text';
    projectCodeInput.placeholder = 'XXXXXX';
    projectCodeInput.classList.add('project-title-input');
    projectCodeInput.addEventListener('keydown', handleProjectCodeInput);
    projectCodeInput.addEventListener('input', validateProjectCode);

    // projectCodeFeedback.classList.add('project-code-feedback');
    
    inputContainer.classList.add('input-container');
    inputContainer.appendChild(projectCodeInput);

    const fullNombreProjecto = state.getState()?.name;
    if(fullNombreProjecto){
        const nombreProjecto = fullNombreProjecto.split('-').slice(1).join('-').trim();
        nameProject.textContent = nombreProjecto;
        nameProject.classList.add('project-name');
        inputContainer.appendChild(nameProject);
    }

    // inputContainer.appendChild(projectCodeFeedback);
    document.body.appendChild(inputContainer);
}
function validateProjectCode(){
    const input = projectCodeInput.value;
    const isValid = /^\d{6}$/.test(input);

    if (isValid) {
        projectCodeInput.classList.remove('invalid');
        projectCodeInput.classList.add('valid');
        // projectCodeFeedback.textContent = 'Código válido';
        // projectCodeFeedback.classList.remove('error');
        // projectCodeFeedback.classList.add('success');
    } else {
        projectCodeInput.classList.remove('valid');
        projectCodeInput.classList.add('invalid');
        // projectCodeFeedback.textContent = 'El código debe ser un número de 6 dígitos';
        // projectCodeFeedback.classList.remove('success');
        // projectCodeFeedback.classList.add('error');
    }
}
function handleProjectCodeInput(event: KeyboardEvent){
    if (event.key === 'Enter') {
        const input = projectCodeInput.value;
        if (/^\d{6}$/.test(input)) {
            const currentState = state.getState()
            currentState.project = input
            state.setState(currentState)
            
            // You can add more logic here to handle the valid project code
            // projectCodeFeedback.textContent = 'Código aceptado';
            // projectCodeFeedback.classList.remove('error');
            // projectCodeFeedback.classList.add('success');
        } else {
            // projectCodeInput.classList.remove('invalid');
            // projectCodeInput.classList.add('error');
            // this.projectCodeFeedback.textContent = 'Código inválido. Por favor, ingrese un número de 6 dígitos.';
            // this.projectCodeFeedback.classList.remove('success');
            // this.projectCodeFeedback.classList.add('error');
        }
    }
}


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
    private tableContainer: HTMLDivElement;

    constructor(private data: FolderData) {
        this.table = document.createElement('table');
        this.tbody = document.createElement('tbody');
        this.tableContainer = document.createElement('div');
        // this.initializeTable();
    }

    initializeTable() {
        this.table.classList.add('folder-table');
        
        this.tableContainer.classList.add('table-container');
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Name', 'Type', 'Deprecated', 'Comment'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });

        this.tableContainer.appendChild(this.table);
        document.body.appendChild(this.tableContainer);

        thead.appendChild(headerRow);
        this.table.appendChild(thead);
        this.table.appendChild(this.tbody);
    }

    public render() {
        this.tableContainer.innerHTML = '';
        this.renderStructure(this.data, 0, true);
        this.tableContainer.appendChild(this.table);
    }

    private renderStructure(folder: FolderData, depth: number = 0, isRoot: boolean = false) {
        if (!isRoot) {
            this.addRow(folder, true, depth);
        }
        folder.files?.forEach(file => this.addRow(file, false, isRoot ? 0 : depth + 1));
        folder.folders?.forEach(subFolder => this.renderStructure(subFolder, isRoot ? 0 : depth + 1));
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
    document.body.innerHTML = '';
    console.log('Rendering data:', data);
    initializeInputProject()
    // initializeNameProject()   
    const tableRenderer = new TableRenderer(data)
    tableRenderer.initializeTable();
    tableRenderer.render()   
}