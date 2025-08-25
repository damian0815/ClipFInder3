
export class EmbeddingInputData {
    id: string
    text: string|undefined;
    imageId: string|undefined;
    tags: string[]|undefined;
    weight: number = 1.0;
    constructor({ id, text=undefined, imageId: imageId=undefined, tags=undefined, weight=1.0 }: { 
        id: string,
        text?: string,
        imageId?: string,
        tags?: string[], 
        weight?: number }) {
        this.id = id
        this.text = text
        this.imageId = imageId
        this.tags = tags
        this.weight = weight
    }
    get mode(): 'text' | 'image' | 'tags' {
        if (this.text !== undefined) return 'text';
        if (this.imageId !== undefined) return 'image';
        if (this.tags !== undefined) return 'tags';
        throw new Error('Invalid EmbeddingInputData');
    }
}

export class FilterInputData {
    pathContains: string[] = []
    pathNotContains: string[] = []
    required_tags_and: string[] = []
    required_tags_or: string[] = []
    excluded_tags: string[] = []
}
