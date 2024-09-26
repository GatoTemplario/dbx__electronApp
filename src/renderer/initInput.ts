const { state } = require('../services/state');
const projectCodeInput = document.createElement('input');
const nameProject = document.createElement('label')
const inputContainer = document.createElement('div');

export function initInput() {
    projectCodeInput.type = 'text';
    projectCodeInput.placeholder = 'XXXXXX';
    projectCodeInput.classList.add('project-title-input');
    projectCodeInput.addEventListener('keydown', handleProjectCodeInput);
    projectCodeInput.addEventListener('input', validateProjectCode);

    
    inputContainer.classList.add('input-container');
    inputContainer.appendChild(projectCodeInput);

    const fullNombreProjecto = state.getState()?.name;
    if(fullNombreProjecto){
        const nombreProjecto = fullNombreProjecto.split('_').slice(1).join('-').trim();
        nombreProjecto
        nameProject.textContent = nombreProjecto;
        nameProject.classList.add('project-name');
        inputContainer.appendChild(nameProject);
    }

    document.body.appendChild(inputContainer);
}
function validateProjectCode(){
    const input = projectCodeInput.value;
    const isValid = /^\d{6}$/.test(input);

    if (isValid) {
        projectCodeInput.classList.remove('invalid');
        projectCodeInput.classList.add('valid');
    } else {
        projectCodeInput.classList.remove('valid');
        projectCodeInput.classList.add('invalid');
    }
}
function handleProjectCodeInput(event: KeyboardEvent){
    if (event.key === 'Enter') {
        const input = projectCodeInput.value;
        if (/^\d{6}$/.test(input)) {
            const currentState = state.getState()
            currentState.project = input
            state.setState(currentState)
        } else {
        }
    }
}