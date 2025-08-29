import {API_BASE_URL} from "@/Constants.tsx";
import { SortOrder } from "@/types/searchResults";

export interface SearchParams {
    texts?: string[];
    image_ids?: string[];
    embeddings?: number[][];
    weights?: number[];
    required_path_contains?: string;
    excluded_path_contains?: string;
    required_image_ids?: string[];
    excluded_image_ids?: string[];
    // Pagination parameters
    offset?: number;
    limit?: number;
    sort_order?: SortOrder;
}

export interface SearchResult {
    id: string;
    path: string;
    distance: number | undefined;
    tags: string[] | undefined;
    order_key: number | number[] | undefined;
}

export interface SearchTaskResponse {
    task_id: string;
    message: string;
}

/**
 * Starts a background search task with a client-generated task ID
 * @param searchParams Search parameters including texts, images, tags, and filters
 * @param taskId Client-generated task ID to track progress
 * @returns Promise that resolves to search task information
 */
export async function startSearchWithTaskId(searchParams: SearchParams, taskId: string) {
    console.log("starting search with task ID:", taskId, searchParams)
    try {
        const response = await fetch(`${API_BASE_URL}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'query': searchParams,
                'task_id': taskId,
            }),
        });

        if (!response.ok) {
            const responseJson = await response.json()
            console.error("search failed: ", responseJson)
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("search started successfully:", data);
        return data;

    } catch (error) {
        console.error('Error starting search:', error);
        throw error;
    }
}

/**
 * Gets embeddings for texts/images using the backend
 * @param texts Optional array of texts to embed
 * @param image_ids Optional array of image IDs to embed  
 * @param reduction Reduction method (e.g., 'mean_norm')
 * @returns Promise that resolves to embedding array
 */
export async function getEmbeddings(texts?: string[], image_ids?: string[], reduction: string = 'mean_norm'): Promise<number[]> {
    try {
        const body: any = { reduction };
        if (texts && texts.length > 0) body.texts = texts;
        if (image_ids && image_ids.length > 0) body.image_ids = image_ids;

        //console.log("Requesting embeddings with body:", body);
        const response = await fetch(`${API_BASE_URL}/api/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, body: ${await response.text()}`);
        }

        const data = await response.json();
        return data.embedding;
    } catch (error) {
        console.error('Error fetching embeddings:', error);
        throw error;
    }
}
