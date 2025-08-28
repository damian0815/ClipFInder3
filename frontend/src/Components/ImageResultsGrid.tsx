import {useEffect, useState} from "react";
import Image from "@/types/image";
import { ResultImage } from "@/Components/ResultImage";
import Selectable from 'react-selectable-box';
import { API_BASE_URL } from "@/Constants";
import { QuickLookOverlay } from "@/Components/QuickLookOverlay";

type ImageResultsGridProps = {
    images: Array<Image>;
    onSelect: (selectedImages: Array<Image>) => void; // Callback to pass selected images to parent
    onAddToQuery: (image: Image) => void;
}

function ImageResultsGrid(props: ImageResultsGridProps) {
    const [selectedImages, setSelectedImages] = useState<Array<Image>>([]);
    const [mode, setMode] = useState<'add' | 'remove' | 'replace' | 'reverse'>('replace');
    const [mouseIsOver, setMouseIsOver] = useState<boolean>(false);
    const [quickLookVisible, setQuickLookVisible] = useState<boolean>(false);
    const [gridHasFocus, setGridHasFocus] = useState<boolean>(false);
    const [thumbnailSizeIndex, setThumbnailSizeIndex] = useState<number>(2); // Default to medium (index 2)

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

    useEffect(() => {
        
        const updateMode = (e: KeyboardEvent) => {
            const shiftIsDown = e.shiftKey || (e.type === 'keydown' && e.key === 'Shift');
            const metaIsDown = e.metaKey || (e.type === 'keydown' && e.key === 'Meta');
            const ctrlIsDown = e.ctrlKey || (e.type === 'keydown' && e.key === 'Control');
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

    return (
        <div>
            {/* Thumbnail size slider at top right */}
            <div className="flex justify-between items-center mb-4">
                <div></div> {/* Empty div to push slider to the right */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Size:</span>
                    <input
                        type="range"
                        min="0"
                        max="7"
                        step="1"
                        value={thumbnailSizeIndex}
                        onChange={(e) => setThumbnailSizeIndex(Number(e.target.value))}
                        className="w-24 accent-blue-500"
                    />
                    <span className="text-sm text-gray-600 min-w-[3rem]">{currentSize.name}</span>
                </div>
            </div>
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

                    {props.images.map((img, index) => (
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
    );
}

export default ImageResultsGrid;
