import {useEffect, useState} from "react";
import Image, {ResultImage} from "@/Components/Image.tsx";
import Selectable, { useSelectable } from 'react-selectable-box';

type ImageResultsGridProps = {
    images: Array<Image>;
    onSelect: (selectedImages: Array<Image>) => void; // Callback to pass selected images to parent
}

function ImageResultsGrid(props: ImageResultsGridProps) {
    const [selectedImages, setSelectedImages] = useState<Array<Image>>([]);
    const [mode, setMode] = useState<'add' | 'remove' | 'replace' | 'reverse'>('replace');
    const [mouseIsOver, setMouseIsOver] = useState<boolean>(false);

    const handleImageClick = (img: Image) => {
        switch (mode) {
            case 'replace': setSelectedImages([img]); break;
            default:
                const isSelected = selectedImages.includes(img);
                const newSelectedImages = isSelected
                    ? selectedImages.filter(selectedImg => selectedImg !== img) // Deselect if already selected
                    : [...selectedImages, img]; // Select the image
                setSelectedImages(newSelectedImages);
        }
    };

    useEffect(() => {
        console.log("passing up:", selectedImages);
        props.onSelect(selectedImages); // Pass the selected images to the parent
    }, [selectedImages])

    useEffect(() => {

        const updateMode = (e: KeyboardEvent) => {
            if (e.metaKey == e.shiftKey) {
                setMode('replace')
            } else if (e.shiftKey) {
                setMode('add')
            } else if (e.metaKey) {
                setMode('remove')
            }
        };

        document.addEventListener('keydown', updateMode);
        document.addEventListener('keyup', updateMode);

        return () => {
            document.removeEventListener('keydown', updateMode);
            document.removeEventListener('keyup', updateMode);
        };
    }, []);

    return (
        <div className={"image-grid border-1 p-4"}
             onMouseEnter={(e) => setMouseIsOver(true)}
             onMouseLeave={(e) => setMouseIsOver(false)}
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
                        key={index}
                        image={img}
                        isSelected={selectedImages.includes(img)}
                        onClick={handleImageClick}
                    />
                ))}

            </Selectable>

        </div>
    );
}

export default ImageResultsGrid;
