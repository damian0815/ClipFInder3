import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAllTags } from "@/api/tags";

interface KnownTagsContextType {
    knownTags: string[];
    isLoading: boolean;
    error: string | null;
    refetchTags: () => Promise<void>;
}

const KnownTagsContext = createContext<KnownTagsContextType | undefined>(undefined);

export interface KnownTagsProviderProps {
    children: ReactNode;
}

export function KnownTagsProvider({ children }: KnownTagsProviderProps) {
    const [knownTags, setKnownTags] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadTags = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const tags = await getAllTags();
            setKnownTags(tags);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tags');
            console.error('Error loading known tags:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTags();
    }, []);

    const contextValue: KnownTagsContextType = {
        knownTags,
        isLoading,
        error,
        refetchTags: loadTags
    };

    return (
        <KnownTagsContext.Provider value={contextValue}>
            {children}
        </KnownTagsContext.Provider>
    );
}

export function useKnownTags(): KnownTagsContextType {
    const context = useContext(KnownTagsContext);
    if (context === undefined) {
        throw new Error('useKnownTags must be used within a KnownTagsProvider');
    }
    return context;
}
