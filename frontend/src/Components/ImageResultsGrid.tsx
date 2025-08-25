import {useEffect, useState} from "react";
import Image, {ResultImage} from "@/Components/Image.tsx";
import Selectable from 'react-selectable-box';
import { c } from "node_modules/vite/dist/node/types.d-aGj9QkWt";

type ImageResultsGridProps = {
    images: Array<Image>;
    onSelect: (selectedImages: Array<Image>) => void; // Callback to pass selected images to parent
}

function ImageResultsGrid(props: ImageResultsGridProps) {
    const [selectedImages, setSelectedImages] = useState<Array<Image>>([]);
    const [mode, setMode] = useState<'add' | 'remove' | 'replace' | 'reverse'>('replace');
    const [mouseIsOver, setMouseIsOver] = useState<boolean>(false);

    const handleImageClick = (img: Image) => {
        if (mode === 'add' || mode === 'remove') {
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
    }, []);

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
                        key={index}
                        image={img}
                        isSelected={selectedImages.includes(img)}
                        onClick={(image, event) => handleImageClick(image, event)}
                    />
                ))}

            </Selectable>

        </div>
    );
}

export default ImageResultsGrid;
