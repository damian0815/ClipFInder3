import React, { useState } from 'react';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/Card';
import { useTagShortcuts } from '@/contexts/TagShortcutContext';

interface TagShortcutConfigDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TagShortcutConfigDialog({ isOpen, onClose }: TagShortcutConfigDialogProps) {
    const { shortcuts, updateShortcut, isLoaded } = useTagShortcuts();
    const [tempShortcuts, setTempShortcuts] = useState(shortcuts);

    React.useEffect(() => {
        if (isOpen && isLoaded) {
            setTempShortcuts(shortcuts);
        }
    }, [isOpen, shortcuts, isLoaded]);

    const handleSave = () => {
        Object.entries(tempShortcuts).forEach(([key, tag]) => {
            updateShortcut(key, tag);
        });
        onClose();
    };

    const handleCancel = () => {
        setTempShortcuts(shortcuts);
        onClose();
    };

    const handleShortcutChange = (key: string, value: string) => {
        setTempShortcuts(prev => ({
            ...prev,
            [key]: value
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 max-h-[80vh] overflow-auto">
                <CardHeader>
                    <CardTitle>Configure Tag Shortcuts</CardTitle>
                    <CardDescription>
                        Assign tags to Ctrl+number shortcuts. Press Ctrl+1, Ctrl+2, etc. to toggle these tags on selected images.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Object.entries(tempShortcuts).map(([key, tag]) => (
                        <div key={key} className="flex items-center space-x-2">
                            <span className="w-16 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                Ctrl+{key}
                            </span>
                            <Input
                                value={tag}
                                onChange={(e) => handleShortcutChange(key, e.target.value)}
                                placeholder="Enter tag name..."
                                className="flex-1"
                            />
                        </div>
                    ))}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
