import { useState } from 'react';
import { SearchHistoryEntry } from '@/hooks/useSearchHistory';

interface SearchHistoryDropdownProps {
    history: SearchHistoryEntry[];
    onSelectEntry: (entry: SearchHistoryEntry) => void;
    onRemoveEntry: (id: string) => void;
    onClearHistory: () => void;
    className?: string;
}

export function SearchHistoryDropdown({
    history,
    onSelectEntry,
    onRemoveEntry,
    onClearHistory,
    className = ''
}: SearchHistoryDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getSearchSummary = (entry: SearchHistoryEntry) => {
        if (entry.name) {
            return entry.name;
        }

        const parts = [];
        
        // Add search method prefix if it's a direction search
        if (entry.searchMethod === 'direction') {
            parts.push('📐 Direction:');
        }
        
        // Add embedding inputs summary
        if (entry.embeddingInputs.length > 0) {
            const textInputs = entry.embeddingInputs.filter(input => input.text);
            const imageInputs = entry.embeddingInputs.filter(input => input.imageId);
            const tagInputs = entry.embeddingInputs.filter(input => input.tags);

            if (textInputs.length > 0) {
                parts.push(`${textInputs.length} text${textInputs.length > 1 ? 's' : ''}`);
            }
            if (imageInputs.length > 0) {
                parts.push(`${imageInputs.length} image${imageInputs.length > 1 ? 's' : ''}`);
            }
            if (tagInputs.length > 0) {
                parts.push(`${tagInputs.length} tag set${tagInputs.length > 1 ? 's' : ''}`);
            }
        }

        // Add filter summary
        const filters = [];
        if (entry.filterInput.positivePathContains) filters.push('path+');
        if (entry.filterInput.negativePathContains) filters.push('path-');
        if (entry.filterInput.positiveTags) filters.push('tags+');
        if (entry.filterInput.negativeTags) filters.push('tags-');
        
        if (filters.length > 0) {
            parts.push(`filters: ${filters.join(', ')}`);
        }

        return parts.length > 0 ? parts.join(', ') : 'Empty search';
    };

    /*if (history.length === 0) {
        return null;
    }*/

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md"
            >
                <span>Search History</span>
                <svg 
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-96 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Recent Searches</span>
                        <button
                            onClick={() => {
                                onClearHistory();
                                setIsOpen(false);
                            }}
                            className="text-xs text-red-600 hover:text-red-800"
                        >
                            Clear All
                        </button>
                    </div>
                    
                    {history.map((entry) => (
                        <div
                            key={entry.id}
                            className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                        >
                            <div className="flex justify-between items-start">
                                <button
                                    onClick={() => {
                                        onSelectEntry(entry);
                                        setIsOpen(false);
                                    }}
                                    className="flex-1 text-left"
                                >
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                        {getSearchSummary(entry)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatTimestamp(entry.timestamp)} • {entry.sortOrder}
                                    </div>
                                </button>
                                
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveEntry(entry.id);
                                    }}
                                    className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                    title="Remove from history"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Backdrop to close dropdown */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
