
export class EmbeddingInputData {
    id: string
    texts: string[];
    constructor(id: string, texts: string[]=[]) {
        this.id = id
        this.texts = texts
    }
}

export class FilterInputData {
    pathContains: string[] = []
    pathNotContains: string[] = []
    required_tags_and: string[] = []
    required_tags_or: string[] = []
    excluded_tags: string[] = []
}
