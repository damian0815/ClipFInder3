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
            if (e.type === 'keydown' && e.key === ' ') {
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
    }, [mode, lastSelectedImage, quickLookVisible]);

    return (
        <div className={"image-grid border-1 p-4"}
             onMouseEnter={() => setMouseIsOver(true)}
             onMouseLeave={() => setMouseIsOver(false)}
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
                        className={"h-60"}
                        key={img.id}
                        image={img}
                        isSelected={selectedImages.includes(img)}
                        onClick={(ev) => handleImageClick(ev, img)}
                        onAddToQuery={() => props.onAddToQuery(img)}
                        onRevealInFinder={() => handleRevealInFinder(img)}
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
    );
}

export default ImageResultsGrid;
