import {v4 as uuidv4} from 'uuid';

export default class EmbeddingInputData {
    id: string = uuidv4();
    texts: string[] = [];

    constructor(id: string|undefined = undefined) {
        this.id = id || uuidv4();
    }

}

