import {useEffect, useState} from "react";
import Image from "@/types/image";
import { ResultImage } from "@/Components/ResultImage";
import Selectable from 'react-selectable-box';
import { API_BASE_URL } from "@/Constants";
import { QuickLookOverlay } from "@/Components/QuickLookOverlay";
import { TagMergeProvider } from "@/contexts/TagMergeContext";

type ImageResultsGridProps = {
    images: Array<Image>;
    onSelect: (selectedImages: Array<Image>) => void; // Callback to pass selected images to parent
    onAddToQuery: (image: Image) => void;
    onImageDeleted?: (imageId: string) => void;
    thumbnailSizeIndex?: number;
    onThumbnailSizeChange?: (index: number) => void;
    onGridFocusChange?: (focused: boolean) => void;
}

function ImageResultsGrid(props: ImageResultsGridProps) {
    const [selectedImages, setSelectedImages] = useState<Array<Image>>([]);
    const [mode, setMode] = useState<'add' | 'remove' | 'replace' | 'reverse'>('replace');
    const [mouseIsOver, setMouseIsOver] = useState<boolean>(false);
    const [quickLookVisible, setQuickLookVisible] = useState<boolean>(false);
    const [gridHasFocus, setGridHasFocus] = useState<boolean>(false);
    
    // Use prop or default value for thumbnail size
    const thumbnailSizeIndex = props.thumbnailSizeIndex ?? 2;

    // Define Tailwind size options - expanded to 8 steps
    const sizeOptions = [
        { name: 'XS', class: 'w-16 h-16', minWidth: '4rem' },
        { name: 'SM', class: 'w-20 h-20', minWidth: '5rem' },
        { name: 'MD', class: 'w-32 h-32', minWidth: '8rem' },
        { name: 'LG', class: 'w-48 h-48', minWidth: '12rem' },
        { name: 'XL', class: 'w-64 h-64', minWidth: '16rem' },
        { name: '2XL', class: 'w-88 h-88', minWidth: '22rem' },
        { name: '3XL', class: 'w-112 h-112', minWidth: '28rem' },
        { name: '4XL', class: 'w-136 h-136', minWidth: '34rem' }
    ];

    const currentSize = sizeOptions[thumbnailSizeIndex];

    // Get the last selected image for Quick Look
    const lastSelectedImage = selectedImages.length > 0 ? selectedImages[selectedImages.length - 1] : null;

    const handleImageClick = (ev: React.MouseEvent, img: Image) => {
        if (ev.shiftKey || ev.metaKey) {
            const isSelected = selectedImages.includes(img);
            if (!isSelected) {
                setSelectedImages([...selectedImages, img]);
            } else {
                setSelectedImages(selectedImages.filter(selectedImg => selectedImg !== img));
            }
        } else {
            // Default behavior: replace selection
            setSelectedImages([img]);
        }
    };

    const handleRevealInFinder = (img: Image) => {
        console.log("reveal in finder for image", img);
        fetch(`${API_BASE_URL}/api/revealInFinder/${img.id}`);
    };

    useEffect(() => {
        console.log("passing up:", selectedImages);
        props.onSelect(selectedImages); // Pass the selected images to the parent
    }, [selectedImages])

    // Notify parent of grid focus changes
    useEffect(() => {
        props.onGridFocusChange?.(gridHasFocus);
    }, [gridHasFocus, props.onGridFocusChange]);

    useEffect(() => {
        
        const updateMode = (e: KeyboardEvent) => {
            const shiftIsDown = e.shiftKey || (e.type === 'keydown' && e.key === 'Shift');
            const metaIsDown = e.metaKey || (e.type === 'keydown' && e.key === 'Meta');
            const altIsDown = e.altKey || (e.type === 'keydown' && e.key === 'Alt');

            // Handle Space key for Quick Look
            if (e.type === 'keydown' && e.key === ' ' && gridHasFocus) {
                console.log("caught space key, lastSelectedImage:", lastSelectedImage, "quickLookVisible:", quickLookVisible);
                if (lastSelectedImage && !quickLookVisible) {
                    console.log("showing QuickLook for", lastSelectedImage)
                    e.preventDefault();
                    setQuickLookVisible(true);
                    return;
                }
            }

            if (shiftIsDown || metaIsDown) {
                setMode('add')
                console.log('mode was', mode, 'now add')
            } else if (altIsDown) {
                setMode('remove')
                console.log('mode was', mode, 'now remove')
            } else {
                console.log('mode was', mode, 'now replace')
                setMode('replace')
            }
        };

        document.addEventListener('keydown', updateMode);
        document.addEventListener('keyup', updateMode);

        return () => {
            document.removeEventListener('keydown', updateMode);
            document.removeEventListener('keyup', updateMode);
        };
    }, [mode, lastSelectedImage, quickLookVisible, gridHasFocus]);

    const handleMergeComplete = async (sourceImage: Image, targetImage: Image) => {
        console.log("Merging tags to:", targetImage.path, "From source tags:", sourceImage.tags);

        try {
            // Get current tags of target image to avoid duplicates
            const currentTags = targetImage.tags || [];
            const sourceTags = sourceImage.tags || [];
            const tagsToAdd = sourceTags.filter((tag: string) => !currentTags.includes(tag));

            if (tagsToAdd.length === 0) {
                console.log("No new tags to add - all source tags already exist on target image");
                // Still delete source image even if no tags were added
            } else {
                // Add each new tag to the target image
                for (const tag of tagsToAdd) {
                    await fetch(`${API_BASE_URL}/api/addTag`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            image_ids: [targetImage.id],
                            tag_to_add: tag
                        })
                    });
                }

                console.log(`Successfully merged ${tagsToAdd.length} tags to ${targetImage.path}`);
            }

            // Delete the source image via API
            const deleteResult = await fetch(`${API_BASE_URL}/api/image/${sourceImage.id}`, {
                method: 'DELETE'
            });
            if (!deleteResult.ok) {
                console.error("Error deleting source image:", deleteResult.statusText, await deleteResult.text());
            } else {
                // Remove the source image from local state
                if (props.onImageDeleted) {
                    props.onImageDeleted(sourceImage.id);
                }
            }

        } catch (error) {
            console.error("Error merging tags:", error);
        }
    };

    return (
        <TagMergeProvider onMergeComplete={handleMergeComplete}>
            <div>
                <div
                    className="grid gap-5 mt-5 p-4 border border-gray-300"
                    style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(${currentSize.minWidth}, 1fr))`
                    }}
                    tabIndex={0}
                    onMouseEnter={() => setMouseIsOver(true)}
                    onMouseLeave={() => setMouseIsOver(false)}
                    onFocus={() => setGridHasFocus(true)}
                    onBlur={() => setGridHasFocus(false)}
                    onClick={() => setGridHasFocus(true)}
                >
                    <Selectable
                        disabled={!mouseIsOver}
                        mode={mode === 'replace' ? 'reverse' : mode}
                        value={selectedImages}
                        onEnd={(newSelectedImages, { added, removed }) => {
                            switch (mode) {
                                case 'add':
                                case 'remove':
                                case 'reverse':
                                    setSelectedImages(selectedImages.concat(added).filter((i) => !removed.includes(i)));
                                    break;
                                case 'replace':
                                    setSelectedImages(newSelectedImages)
                                    break
                            }
                        }}
                    >

                        {props.images.map((img) => (
                            <ResultImage
                                key={img.id}
                                image={img}
                                isSelected={selectedImages.includes(img)}
                                onClick={(ev) => handleImageClick(ev, img)}
                                onAddToQuery={() => props.onAddToQuery(img)}
                                onRevealInFinder={() => handleRevealInFinder(img)}
                                className={currentSize.class}
                            />
                        ))}

                    </Selectable>

                    {quickLookVisible && lastSelectedImage && (
                        <QuickLookOverlay
                            image={lastSelectedImage}
                            onClose={() => setQuickLookVisible(false)}
                        />
                    )}

                </div>
            </div>
        </TagMergeProvider>
    );
}

export default ImageResultsGrid;
