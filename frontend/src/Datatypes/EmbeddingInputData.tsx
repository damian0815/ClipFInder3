import distanceQuery from "@/Components/DistanceQuery.tsx";

export default class EmbeddingInputData {
    id: string
    texts: string[];
    constructor(id: string, texts: string[]=[]) {
        this.id = id
        this.texts = texts
    }
}

