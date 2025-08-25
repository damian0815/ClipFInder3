import Image from "@/Components/Image.tsx";
import {useEffect, useState} from "react";
import {API_BASE_URL} from "@/Constants.tsx";
import {TagTextInput} from "@/Components/TagTextInput.tsx";
import {useKnownTags} from "@/contexts/KnownTagsContext";

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
    requestAddTag: (images: Image[], tagToAdd: string) => void;
    requestDeleteTag: (images: Image[], tagToDelete: string) => void;

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
    const { refetchTags } = useKnownTags();

    async function updateTags() {

        await Promise.all(props.images.map(async (i) => {
            const tags = await getTags(i.id)
            i.tags = tags
        }));
        const allTags = props.images.flatMap((i) => (i.tags ?? []))
        setTags(new Set(allTags));
    }

    useEffect(() => {
        updateTags()
    }, [props.images]);

    async function addTag(images: Image[], tagToAdd: string) {
        setIsBusy(true);
        fetch(`${API_BASE_URL}/api/addTag`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_ids: images.map((i) => i.id),
                tag_to_add: tagToAdd
            })
        })
            .then(res => {
              console.log("Response status:", res.status);
              if (!res.ok) throw new Error(`HTTP error ${res.status}`);
              return res.text();
            })
            .then(text => {
              console.log("Raw response:", text);
              return JSON.parse(text);
            })
        //.then(res => res.json())
        .then(data => {
            console.log(data);
            Object.entries(data['images_tags']).forEach(([imageId, tags]) => {
                const matchingImage = props.images.find((v) => v.id === imageId);
                if (matchingImage) {
                    matchingImage.tags = tags as string[];
                }
            })
            updateTags();
            setNewTag(""); // Clear the input after successful add
            // Refresh the known tags list in case a new tag was added
            refetchTags();
            //alert(`${data.message}`);
        })
        .catch(err => {
            if (err.name === 'AbortError') {
                console.error("Abort error")
            } else {
                console.error("error adding tag:", err)
                //alert(`Error adding tag: ${err}`);
            }
        })
        .finally(() => {
            setIsBusy(false);
        })
    }

    async function deleteTag(images: Image[], tagToDelete: string) {
        setIsBusy(true);
        fetch(`${API_BASE_URL}/api/deleteTag`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_ids: images.map((i) => i.id),
                tag_to_delete: tagToDelete
            })
        })
        .then(res => res.json())
        .then(data => {
            console.log(data);
            Object.entries(data['images_tags']).forEach(([imageId, tags]) => {
                const matchingImage = props.images.find((v) => v.id === imageId);
                if (matchingImage) {
                    matchingImage.tags = tags as string[];
                }
            })
            updateTags()
        })
        .catch(err => {
            console.error("error deleting tag:", err)
            alert(`Error deleting tag: ${err}`);
        })
        .finally(() => {
            setIsBusy(false);
        })
    }

    function isOnAll(tag: string) {
        const onAll = props.images.every((i) => (i.tags ?? []).includes(tag));
        //console.log(`tag '${tag}' on all ${props.images.length} images: ${onAll}`)
        //console.log('proof:', props.images.map((i) => i.tags ?? []))
        return onAll;
    }

    return <div className="sidebar-content">
        {props.images.length === 0 ? (
            <p>No images selected</p>
        ) : (
            <div>
                <div>
                Tags:
                {Array.from(tags.values()).map((t, index) =>
                    <Tag
                        key={index}
                        name={t}
                        deleteRequested={() => deleteTag(props.images, t)}
                        deleteButtonDisabled={isBusy}
                        onAll={isOnAll(t)}
                    />
                )}
                </div>

                <TagTextInput
                    value={newTag}
                    onChange={setNewTag}
                    onSubmit={(tag) => addTag(props.images, tag)}
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
}
