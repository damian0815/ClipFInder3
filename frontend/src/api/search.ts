import { API_BASE_URL } from "@/Constants.tsx";

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

/**
 * Performs a semantic search with multiple embedding inputs
 * @param searchParams Search parameters including texts, images, tags, and filters
 * @returns Promise that resolves to an array of search results
 */
export async function performSearch(searchParams: SearchParams): Promise<SearchResult[]> {
    console.log("searching: ", searchParams)
    try {
        const response = await fetch(`${API_BASE_URL}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchParams),
        });

        if (!response.ok) {
            console.error("search failed: ", await response.json())
            throw new Error(`HTTP error! nono status: ${response.status}, body: ${await response.text()}`);
        }

        const data = await response.json();
        return data || [];
    } catch (error) {
        console.error('Error performing search:', error);
        throw error;
    }
}
