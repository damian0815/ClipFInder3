
export class EmbeddingInputData {
    id: string
    text: string|undefined;
    imagePaths: string[]|undefined;
    tags: string|undefined;
    weight: number = 1.0;
    constructor({ id, text=undefined, imagePaths=[], tags=undefined, weight=1.0 }: { 
        id: string,
        text?: string,
        imagePaths?: string[],
        tags?: string, 
        weight?: number }) {
        this.id = id
        this.text = text
        this.imagePaths = imagePaths
        this.tags = tags
        this.weight = weight
    }
}

export class FilterInputData {
    pathContains: string[] = []
    pathNotContains: string[] = []
    required_tags_and: string[] = []
    required_tags_or: string[] = []
    excluded_tags: string[] = []
}
