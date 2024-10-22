const { state } = require('../services/state');
const projectCodeInput = document.querySelector('.explorer-name-input') as HTMLInputElement;
// const nameProject = document.getElementById('titleDisplay') as HTMLElement;

export function initInput() {
    // console.log("Init input");
    if (localStorage.getItem('projectId')) {
        projectCodeInput.value = localStorage.getItem('projectId');
    }
    projectCodeInput.addEventListener('keydown', handleProjectCodeInput);
    projectCodeInput.addEventListener('input', validateProjectCode);
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
            if (currentState.project !== input || !currentState.initialLoadComplete) {
                currentState.project = input
                currentState.initialLoadComplete = false  // Reset this flag
                localStorage.setItem('projectId', state.getState().project);
                state.setState(currentState)
            }
        } else {
            console.log("Invalid project code");
        }
    }
}
