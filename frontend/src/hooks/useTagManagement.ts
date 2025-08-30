import { useCallback } from 'react';
import Image from '@/types/image';
import { API_BASE_URL } from '@/Constants';

export function useTagManagement() {
    const addTag = useCallback(async (images: Image[], tagToAdd: string): Promise<Record<string, string[]>> => {
        const response = await fetch(`${API_BASE_URL}/api/addTag`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_ids: images.map((i) => i.id),
                tag_to_add: tagToAdd
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        return data.images_tags;
    }, []);

    const removeTag = useCallback(async (images: Image[], tagToRemove: string): Promise<Record<string, string[]>> => {
        const response = await fetch(`${API_BASE_URL}/api/deleteTag`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_ids: images.map((i) => i.id),
                tag_to_delete: tagToRemove
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        return data.images_tags;
    }, []);

    const toggleTag = useCallback(async (images: Image[], tag: string): Promise<Record<string, string[]>> => {
        if (images.length === 0) return {};

        // Check if all selected images have the tag
        const allHaveTag = images.every(image => 
            image.tags && image.tags.includes(tag)
        );

        if (allHaveTag) {
            // If all have the tag, remove it
            return await removeTag(images, tag);
        } else {
            // If not all have the tag, add it to all
            return await addTag(images, tag);
        }
    }, [addTag, removeTag]);

    return {
        addTag,
        removeTag,
        toggleTag
    };
}
