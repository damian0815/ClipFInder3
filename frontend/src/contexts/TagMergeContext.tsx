import { createContext, useContext, useState, ReactNode } from 'react';
import Image from '@/types/image';

interface TagMergeContextType {
    // Current merge source image
    mergeSource: Image | null;
    
    // Set the source image for tag merging
    setMergeSource: (image: Image | null) => void;
    
    // Perform merge from source to target
    mergeTagsTo: (targetImage: Image) => void;
    
    // Check if an image is the current merge source
    isMergeSource: (image: Image) => boolean;
    
    // Check if merge to this image is disabled (same as source)
    isMergeToDisabled: (image: Image) => boolean;
    
    // Get the tag count for the current merge source
    mergeSourceTagCount: number | undefined;
}

const TagMergeContext = createContext<TagMergeContextType | null>(null);

interface TagMergeProviderProps {
    children: ReactNode;
    onMergeComplete?: (sourceImage: Image, targetImage: Image) => void;
}

export function TagMergeProvider({ children, onMergeComplete }: TagMergeProviderProps) {
    const [mergeSource, setMergeSourceState] = useState<Image | null>(null);

    const setMergeSource = (image: Image | null) => {
        setMergeSourceState(image);
    };

    const mergeTagsTo = (targetImage: Image) => {
        if (!mergeSource) {
            console.warn('No merge source selected');
            return;
        }

        if (mergeSource.id === targetImage.id) {
            console.warn('Cannot merge tags to the same image');
            return;
        }

        // Call the completion callback if provided
        if (onMergeComplete) {
            onMergeComplete(mergeSource, targetImage);
        }

        // Clear the merge source after successful merge
        setMergeSourceState(null);
    };

    const isMergeSource = (image: Image): boolean => {
        return mergeSource?.id === image.id;
    };

    const isMergeToDisabled = (image: Image): boolean => {
        return mergeSource?.id === image.id;
    };

    const mergeSourceTagCount = mergeSource?.tags?.length;

    const contextValue: TagMergeContextType = {
        mergeSource,
        setMergeSource,
        mergeTagsTo,
        isMergeSource,
        isMergeToDisabled,
        mergeSourceTagCount,
    };

    return (
        <TagMergeContext.Provider value={contextValue}>
            {children}
        </TagMergeContext.Provider>
    );
}

export function useTagMerge(): TagMergeContextType {
    const context = useContext(TagMergeContext);
    if (!context) {
        throw new Error('useTagMerge must be used within a TagMergeProvider');
    }
    return context;
}
