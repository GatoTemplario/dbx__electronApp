import { state } from '../services/state';

const DEBOUNCE_DELAY = 500; // 500ms debounce delay
let debounceTimer: NodeJS.Timeout | null = null;
let uiState: { [key: string]: any } = {};

export function preserveUIState(key: string, value: any) {
    uiState[key] = value;
}

export function getPreservedUIState(key: string) {
    return uiState[key];
}

export function clearPreservedUIState(key: string) {
    delete uiState[key];
}

export function debouncedStateUpdate(newState: Partial<typeof state.data>) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
        state.setState({
            ...state.getState(),
            ...newState,
        });
    }, DEBOUNCE_DELAY);
}

export function initUIStatePreservation() {
    const originalSetState = state.setState;
    state.setState = function(newState: Partial<typeof state.data>) {
        const mergedState = {
            ...newState,
            tree: preserveTreeUIState(newState.tree),
        };
        originalSetState.call(state, mergedState);
    };
}

function preserveTreeUIState(newTree: any): any {
    if (!newTree) return newTree;

    function preserveNodeState(node: any) {
        const preservedNode = { ...node };
        if (uiState[node.id]) {
            preservedNode.comment = uiState[node.id].comment || preservedNode.comment;
        }
        if (preservedNode.folders) {
            preservedNode.folders = preservedNode.folders.map(preserveNodeState);
        }
        if (preservedNode.files) {
            preservedNode.files = preservedNode.files.map(preserveNodeState);
        }
        return preservedNode;
    }

    return preserveNodeState(newTree);
}