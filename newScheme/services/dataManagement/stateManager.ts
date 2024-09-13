import { FolderData} from '../../models/folderStructure';

interface StateData {
    active?: boolean;
    comment?: string;
}

export class StateManager {
    private stateMap: Map<string, StateData> = new Map();
    private originalData: FolderData;

    constructor(data: FolderData) {
        this.originalData = data;
        this.initializeState(data);
    }

    private initializeState(folder: FolderData) {
        this.stateMap.set(folder.id, { active: false, comment: '' });
        folder.files?.forEach((file : any) => {
            this.stateMap.set(file.id, { active: false, comment: '' });
        });
        folder.folders?.forEach(this.initializeState.bind(this));
    }

    updateState(id: string, newState: Partial<StateData>) {
        const currentState = this.stateMap.get(id) || {};
        this.stateMap.set(id, { ...currentState, ...newState });
    }

    getState(id: string): StateData {
        return this.stateMap.get(id) || { active: false, comment: '' };
    }

    hasChanges(): boolean {
        return Array.from(this.stateMap.entries()).some(([id, state]) => {
            return state.active || state.comment !== '';
        });
    }

    getChanges(): { [id: string]: StateData } {
        const changes: { [id: string]: StateData } = {};
        this.stateMap.forEach((state, id) => {
            if (state.active || state.comment !== '') {
                changes[id] = state;
            }
        });
        return changes;
    }

    mergeWithFetchedData(fetchedData: FolderData) {
        // Implement logic to merge fetched data with local state
        // This could involve comparing timestamps, prompting user for conflict resolution, etc.
    }
}
