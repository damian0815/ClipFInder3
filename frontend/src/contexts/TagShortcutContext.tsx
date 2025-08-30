import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface TagShortcutConfig {
    [key: string]: string; // key: "1", "2", etc. -> value: tag name
}

const STORAGE_KEY = 'clipfinder_tag_shortcuts';
const DEFAULT_SHORTCUTS: TagShortcutConfig = {
    '1': '',
    '2': '',
    '3': '',
    '4': '',
    '5': '',
    '6': '',
    '7': '',
    '8': '',
    '9': '',
    '0': ''
};

interface TagShortcutContextType {
    shortcuts: TagShortcutConfig;
    updateShortcut: (key: string, tag: string) => void;
    getTagForKey: (key: string) => string | undefined;
    getKeyForTag: (tag: string) => string | undefined;
    isLoaded: boolean;
}

const TagShortcutContext = createContext<TagShortcutContextType | null>(null);

interface TagShortcutProviderProps {
    children: ReactNode;
}

export function TagShortcutProvider({ children }: TagShortcutProviderProps) {
    const [shortcuts, setShortcuts] = useState<TagShortcutConfig>(DEFAULT_SHORTCUTS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load shortcuts from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsedShortcuts = JSON.parse(saved);
                // Merge with defaults to ensure all keys exist
                setShortcuts({ ...DEFAULT_SHORTCUTS, ...parsedShortcuts });
            }
        } catch (error) {
            console.error('Failed to load tag shortcuts from localStorage:', error);
        }
        setIsLoaded(true);
    }, []);

    // Save shortcuts to localStorage whenever they change
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
            } catch (error) {
                console.error('Failed to save tag shortcuts to localStorage:', error);
            }
        }
    }, [shortcuts, isLoaded]);

    const updateShortcut = useCallback((key: string, tag: string) => {
        setShortcuts(prev => ({
            ...prev,
            [key]: tag
        }));
    }, []);

    const getTagForKey = useCallback((key: string): string | undefined => {
        const tag = shortcuts[key];
        return tag && tag.trim() ? tag.trim() : undefined;
    }, [shortcuts]);

    const getKeyForTag = useCallback((tag: string): string | undefined => {
        const trimmedTag = tag.trim();
        for (const [key, value] of Object.entries(shortcuts)) {
            if (value.trim() === trimmedTag) {
                return key;
            }
        }
        return undefined;
    }, [shortcuts]);

    const contextValue: TagShortcutContextType = {
        shortcuts,
        updateShortcut,
        getTagForKey,
        getKeyForTag,
        isLoaded
    };

    return (
        <TagShortcutContext.Provider value={contextValue}>
            {children}
        </TagShortcutContext.Provider>
    );
}

export function useTagShortcuts(): TagShortcutContextType {
    const context = useContext(TagShortcutContext);
    if (!context) {
        throw new Error('useTagShortcuts must be used within a TagShortcutProvider');
    }
    return context;
}
