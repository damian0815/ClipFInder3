import { API_BASE_URL } from "@/Constants.tsx";

export interface TagsTaskResponse {
    task_id: string;
    message: string;
}

/**
 * Starts a background task to fetch image IDs for tags
 * @param tags Array of tag names to search for
 * @param taskId Client-generated task ID to track progress
 * @param matchAll Whether to require ALL tags (true) or ANY tags (false)
 * @returns Promise that resolves to task information
 */
export async function getImageIdsForTagsAsync(tags: string[], taskId: string, matchAll: boolean = true) {
    if (!tags || tags.length === 0) {
        throw new Error("No tags provided");
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/images/by-tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tags: tags,
                match_all: matchAll,
                task_id: taskId
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, body: ${await response.text()}`);
        }
        console.log("images by tag fetch started:", await response.json());

    } catch (error) {
        console.error('Error starting tags task:', error);
        throw error;
    }
}

/**
 * Fetches image IDs that have ALL of the specified tags
 * @param tags Array of tag names to search for
 * @returns Promise that resolves to an array of image IDs
 * @deprecated Use getImageIdsForTagsAsync with useAsyncTask hook for better performance
 */
export async function getImageIdsForTags(tags: string[]): Promise<string[]> {
    if (!tags || tags.length === 0) {
        return [];
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/images/by-tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tags: tags,
                match_all: true // Require ALL tags to be present
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, body: ${await response.text()}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching image IDs for tags:', error);
        throw error;
    }
}

/**
 * Fetches image IDs that have ANY of the specified tags
 * @param tags Array of tag names to search for
 * @returns Promise that resolves to an array of image IDs
 */
export async function getImageIdsForTagsOr(tags: string[]): Promise<string[]> {
    if (!tags || tags.length === 0) {
        return [];
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/images/by-tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tags: tags,
                match_all: false // Match ANY of the tags
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.image_ids || [];
    } catch (error) {
        console.error('Error fetching image IDs for tags (OR):', error);
        throw error;
    }
}

/**
 * Fetches all available tags in the system
 * @returns Promise that resolves to an array of tag names
 */
export async function getAllTags(): Promise<string[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/allKnownTags`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.all_known_tags || data || [];
    } catch (error) {
        console.error('Error fetching all tags:', error);
        throw error;
    }
}

/**
 * Fetches tags for a specific image
 * @param imageId The ID of the image to get tags for
 * @returns Promise that resolves to an array of tag names
 */
export async function getTagsForImage(imageId: string): Promise<string[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tags/${imageId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.tags || [];
    } catch (error) {
        console.error(`Error fetching tags for image ${imageId}:`, error);
        throw error;
    }
}
