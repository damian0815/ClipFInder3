import { useState, useEffect, useCallback } from 'react';
import { EmbeddingInputData, FilterInputData } from '@/Datatypes/EmbeddingInputData';

export interface SearchHistoryEntry {
    id: string;
    timestamp: number;
    embeddingInputs: EmbeddingInputData[];
    filterInput: FilterInputData;
    sortOrder: 'similarity' | 'semantic_page';
    name?: string; // Optional user-friendly name
}

const STORAGE_KEY = 'clipfinder_search_history';
const MAX_HISTORY_SIZE = 10;

export function useSearchHistory() {
    const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsedHistory = JSON.parse(saved);
                // Validate and reconstruct the objects with proper prototypes
                const validHistory = parsedHistory.map((entry: any) => ({
                    ...entry,
                    embeddingInputs: entry.embeddingInputs.map((input: any) => 
                        new EmbeddingInputData({
                            id: input.id,
                            text: input.text,
                            imageId: input.imageId,
                            tags: input.tags,
                            weight: input.weight
                        })
                    ),
                    filterInput: Object.assign(new FilterInputData(), entry.filterInput)
                }));
                setHistory(validHistory);
            }
        } catch (error) {
            console.error('Error loading search history:', error);
            setHistory([]);
        }
        setIsLoaded(true);
    }, []);

    // Save history to localStorage whenever it changes (but only after initial load)
    useEffect(() => {
        if (!isLoaded) return; // Don't save until we've loaded from localStorage
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }, [history, isLoaded]);

    const addToHistory = useCallback((
        embeddingInputs: EmbeddingInputData[],
        filterInput: FilterInputData,
        sortOrder: 'similarity' | 'semantic_page',
        name?: string
    ) => {
        // Don't save empty searches
        if (embeddingInputs.length === 0) {
            return;
        }

        const newEntry: SearchHistoryEntry = {
            id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            embeddingInputs: embeddingInputs.map(input => 
                new EmbeddingInputData({
                    id: input.id,
                    text: input.text,
                    imageId: input.imageId,
                    tags: input.tags ? [...input.tags] : undefined,
                    weight: input.weight
                })
            ),
            filterInput: Object.assign(new FilterInputData(), filterInput),
            sortOrder,
            name
        };

        setHistory(prev => {
            // Check if this search is already in history (by comparing content)
            const isDuplicate = prev.some(entry => 
                JSON.stringify({
                    embeddingInputs: entry.embeddingInputs,
                    filterInput: entry.filterInput,
                    sortOrder: entry.sortOrder
                }) === JSON.stringify({
                    embeddingInputs: newEntry.embeddingInputs,
                    filterInput: newEntry.filterInput,
                    sortOrder: newEntry.sortOrder
                })
            );

            if (isDuplicate) {
                return prev; // Don't add duplicates
            }

            // Add to beginning and keep only the most recent MAX_HISTORY_SIZE entries
            const newHistory = [newEntry, ...prev].slice(0, MAX_HISTORY_SIZE);
            return newHistory;
        });
    }, []);

    const removeFromHistory = useCallback((id: string) => {
        setHistory(prev => prev.filter(entry => entry.id !== id));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    const updateEntryName = useCallback((id: string, name: string) => {
        setHistory(prev => prev.map(entry => 
            entry.id === id ? { ...entry, name } : entry
        ));
    }, []);

    return {
        history,
        addToHistory,
        removeFromHistory,
        clearHistory,
        updateEntryName
    };
}
