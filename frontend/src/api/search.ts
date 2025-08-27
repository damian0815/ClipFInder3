import {API_BASE_URL} from "@/Constants.tsx";

export interface SearchParams {
    texts?: string[];
    image_ids?: string[];
    tags?: string[][];
    weights?: number[];
    path_contains?: string;
    excluded_image_ids?: string[];
    required_image_ids?: string[];
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
export async function startSearchWithTaskId(searchParams: SearchParams, taskId: string): Promise<SearchTaskResponse> {
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
            throw new Error(`HTTP error! status: ${response.status}, body: ${JSON.stringify(responseJson)}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error starting search:', error);
        throw error;
    }
}

/**
 * Starts a background search task
 * @param searchParams Search parameters including texts, images, tags, and filters
 * @param taskId Procumputed task ID to track progress
 * @returns Promise that resolves to search task information
 * @deprecated Use startSearchWithTaskId for better race condition handling
 */
export async function startSearch(searchParams: SearchParams, taskId: string): Promise<SearchTaskResponse> {
    console.log("starting search: ", searchParams)
    try {
        const response = await fetch(`${API_BASE_URL}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({'task_id': taskId, 'query': searchParams}),
        });

        if (!response.ok) {
            const responseJson = await response.json()
            console.error("search failed: ", responseJson)
            throw new Error(`HTTP error! status: ${response.status}, body: ${JSON.stringify(responseJson)}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error starting search:', error);
        throw error;
    }
}
