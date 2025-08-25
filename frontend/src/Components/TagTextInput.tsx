import { useState, useEffect, useRef } from "react";
import { useKnownTags } from "@/contexts/KnownTagsContext";

export type TagTextInputProps = {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: (value: string) => void;
    placeholder?: string;
    id?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
    showSubmitButton?: boolean;
    submitButtonText?: string;
    submitButtonDisabled?: boolean;
}

export function TagTextInput(props: TagTextInputProps) {
    const { knownTags, isLoading } = useKnownTags();
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
            suggestionRefs.current[selectedIndex]?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }, [selectedIndex]);

    const handleChange = (value: string) => {
        props.onChange(value);
        
        if (value.trim().length > 0 && !isLoading) {
            const filtered = knownTags
                .filter(tag => tag.toLowerCase().includes(value.toLowerCase()))
                .filter(tag => tag !== value) // Don't show exact matches
                .slice(0, 10); // Limit to 10 suggestions
            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
            setSelectedIndex(-1); // Reset selection when suggestions change
            suggestionRefs.current = []; // Reset refs array
        } else {
            setShowSuggestions(false);
            setSelectedIndex(-1);
            suggestionRefs.current = [];
        }
    };

    const selectSuggestion = (suggestion: string) => {
        props.onChange(suggestion);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    };

    const handleSubmit = () => {
        if (props.onSubmit && props.value.trim().length > 0) {
            props.onSubmit(props.value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions && filteredSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                );
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
                    selectSuggestion(filteredSuggestions[selectedIndex]);
                } else if (filteredSuggestions.length > 0) {
                    selectSuggestion(filteredSuggestions[0]);
                }
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        } else {
            if (e.key === 'Enter') {
                if (props.value.trim().length > 0 && props.onSubmit) {
                    e.preventDefault();
                    handleSubmit();
                }
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        }
    };

    return (
        <div className="relative">
            {props.label && (
                <label htmlFor={props.id}>{props.label}</label>
            )}
            <input
                type="text"
                id={props.id}
                placeholder={props.placeholder || ""}
                readOnly={false}
                disabled={props.disabled}
                value={props.value}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (props.value.trim().length > 0 && filteredSuggestions.length > 0 && !isLoading) {
                        setShowSuggestions(true);
                    }
                }}
                onBlur={() => {
                    // Delay hiding suggestions to allow clicking on them
                    setTimeout(() => setShowSuggestions(false), 150);
                }}
                className={props.className || "border-1 border-solid border-gray w-48"}
            />
            {showSuggestions && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            ref={(el) => { suggestionRefs.current[index] = el; }}
                            className={`px-3 py-2 cursor-pointer text-sm ${
                                index === selectedIndex 
                                    ? 'bg-blue-100 text-blue-900' 
                                    : 'hover:bg-gray-100'
                            }`}
                            onMouseDown={() => selectSuggestion(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
            {props.showSubmitButton && (
                <button 
                    onClick={handleSubmit}
                    disabled={props.submitButtonDisabled || props.value.trim().length === 0}
                    className={"border ml-2"}
                >
                    {props.submitButtonText || "Submit"}
                </button>
            )}
        </div>
    );
}
