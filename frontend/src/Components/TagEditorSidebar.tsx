import Image from "@/types/image";
import {useEffect, useState} from "react";
import {API_BASE_URL} from "@/Constants.tsx";
import {TagTextInput} from "@/Components/TagTextInput.tsx";
import {useKnownTags} from "@/contexts/KnownTagsContext";
import {TagShortcutConfigDialog} from "@/Components/TagShortcutConfigDialog";
import {useTagShortcutKeys} from "@/hooks/useTagShortcutKeys";
import {useTagManagement} from "@/hooks/useTagManagement";
import {useTagShortcuts} from "@/contexts/TagShortcutContext";

type TagProps = {
    name: string
    deleteButtonDisabled: boolean
    deleteRequested: () => void
    onAll: boolean
}

function Tag(props: TagProps) {

    const bgColor = props.onAll ? 'bg-slate-200' : 'bg-white';
    const textColor = props.onAll ? 'text-black' : 'text-gray-400';

    return <div className={`tagpill ${bgColor}`}>
        <span className={"text-xs " + textColor}>{props.name}</span>
        <button className={"px-0 py-0"}
                disabled={props.deleteButtonDisabled}
                onClick={() => props.deleteRequested()}>
            <span className={"pl-1 text-xs"}>❌</span>
        </button>
    </div>
}

type TagEditorSidebarProps = {
    images: Image[]
}

async function getTags(id: String) {
    return fetch(`${API_BASE_URL}/api/tags/${id}`)
                .then(res => res.json())
                .then(data => {
                    //console.log(data)
                    return data.tags
                })
                .catch(err => {
                    console.error(`error fetching tags for ${id}: ${err}`)
                })
}

export function TagEditorSidebar(props: TagEditorSidebarProps) {

    const [tags, setTags] = useState<Set<string>>(new Set());
    const [newTag, setNewTag] = useState("");
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const { refetchTags } = useKnownTags();
    const { toggleTag, addTag, removeTag } = useTagManagement();
    const { shortcuts } = useTagShortcuts();

    async function updateDisplayedTags() {

        await Promise.all(props.images.map(async (i) => {
            const tags = await getTags(i.id)
            i.tags = tags
        }));
        const allTags = props.images.flatMap((i) => (i.tags ?? []))
        setTags(new Set(allTags));
    }

    async function updateImagesTags(imagesTags: Record<string, string[]>) {
        Object.entries(imagesTags).forEach(([imageId, tags]) => {
            const matchingImage = props.images.find((v) => v.id === imageId);
            if (matchingImage) {
                matchingImage.tags = tags ?? [];
            }
        })
    }

    useEffect(() => {
        updateDisplayedTags()
    }, [props.images]);

    // Handle keyboard shortcuts for tagging
    const handleShortcutPressed = async (_key: string, tag: string) => {
        if (props.images.length === 0) return;
        
        setIsBusy(true);
        try {
            const updatedImages = await toggleTag(props.images, tag);
            updateImagesTags(updatedImages);
            updateDisplayedTags();
            refetchTags(); // Update the global tags list
        } catch (error) {
            console.error('Failed to toggle tag:', error);
        } finally {
            setIsBusy(false);
        }
    };

    // Enable keyboard shortcuts only when images are selected
    useTagShortcutKeys({
        onShortcutPressed: handleShortcutPressed,
        enabled: props.images.length > 0
    });

    const handleAddTag = async (images: Image[], tagToAdd: string) => {
        setIsBusy(true);
        try {
            const updatedImagesTags = await addTag(images, tagToAdd);
            updateImagesTags(updatedImagesTags);
            updateDisplayedTags();
            setNewTag(""); // Clear the input after successful add
            refetchTags(); // Refresh the known tags list in case a new tag was added
        } catch (error) {
            console.error("error adding tag:", error);
        } finally {
            setIsBusy(false);
        }
    };

    const handleDeleteTag = async (images: Image[], tagToDelete: string) => {
        setIsBusy(true);
        try {
            const updatedImagesTags = await removeTag(images, tagToDelete);
            updateImagesTags(updatedImagesTags);
            updateDisplayedTags();
            refetchTags(); // Refresh the known tags list
        } catch (error) {
            console.error("error deleting tag:", error);
            alert(`Error deleting tag: ${error}`);
        } finally {
            setIsBusy(false);
        }
    };

    function isOnAll(tag: string) {
        const onAll = props.images.every((i) => (i.tags ?? []).includes(tag));
        //console.log(`tag '${tag}' on all ${props.images.length} images: ${onAll}`)
        //console.log('proof:', props.images.map((i) => i.tags ?? []))
        return onAll;
    }

    return (
        <>
            <div className="sidebar-content mb-12">
                {props.images.length === 0 ? (
                    <p>No images selected</p>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span>Tags:</span>
                            <button
                                onClick={() => setIsConfigDialogOpen(true)}
                                className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                                title="Configure keyboard shortcuts (Ctrl+1, Ctrl+2, etc.)"
                            >
                                ⚙️ Shortcuts
                            </button>
                        </div>
                        <div>
                        {Array.from(tags.values()).map((t, index) => {
                            const shortcutKey = Object.entries(shortcuts).find(([_, tag]) => tag.trim() === t)?.[0];
                            return (
                                <div key={index} className="inline-block relative">
                                    <Tag
                                        name={t}
                                        deleteRequested={() => handleDeleteTag(props.images, t)}
                                        deleteButtonDisabled={isBusy}
                                        onAll={isOnAll(t)}
                                    />
                                    {shortcutKey && (
                                        <span className="absolute -top-1 -right-1 text-xs bg-blue-500 text-white rounded px-1 opacity-75">
                                            {shortcutKey}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        </div>

                        <TagTextInput
                            value={newTag}
                            onChange={setNewTag}
                            onSubmit={(tag) => handleAddTag(props.images, tag)}
                            placeholder="new tag name..."
                            id="newTagNameInput"
                            label="New tag name:"
                            className="border-1 border-solid border-gray w-48"
                            disabled={isBusy}
                            showSubmitButton={true}
                            submitButtonText="Add tag"
                            submitButtonDisabled={isBusy}
                        />
                    </div>
                )}
            </div>

            <TagShortcutConfigDialog
                isOpen={isConfigDialogOpen}
                onClose={() => setIsConfigDialogOpen(false)}
            />
        </>
    );
}
