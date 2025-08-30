import { useEffect, useCallback } from 'react';
import { useTagShortcuts } from '@/contexts/TagShortcutContext';

interface UseTagShortcutKeysProps {
    onShortcutPressed: (key: string, tag: string) => void;
    enabled?: boolean;
}

export function useTagShortcutKeys({ onShortcutPressed, enabled = true }: UseTagShortcutKeysProps) {
    const { getTagForKey } = useTagShortcuts();

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;
        
        // Check for Ctrl+number combinations
        if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
            const key = event.key;
            
            // Check if it's a number key (0-9)
            if (/^[0-9]$/.test(key)) {
                event.preventDefault();
                event.stopPropagation();
                
                const tag = getTagForKey(key);
                if (tag) {
                    onShortcutPressed(key, tag);
                }
            }
        }
    }, [enabled, getTagForKey, onShortcutPressed]);

    useEffect(() => {
        if (enabled) {
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [enabled, handleKeyDown]);
}
