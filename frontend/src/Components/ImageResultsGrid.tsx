import { useState } from "react";
import {API_BASE_URL} from "@/Constants.tsx";
import Image from "@/Components/Image.tsx";

type ImageResultsGridProps = {
    images: Array<Image>;
    onSelect: (selectedImages: Array<Image>) => void; // Callback to pass selected images to parent
}


function ImageResultsGrid(props: ImageResultsGridProps) {
    const [selectedImages, setSelectedImages] = useState<Array<Image>>([]);

    const handleImageClick = (img: Image) => {
        const isSelected = selectedImages.includes(img);
        const newSelectedImages = isSelected
            ? selectedImages.filter(selectedImg => selectedImg !== img) // Deselect if already selected
            : [...selectedImages, img]; // Select the image

        setSelectedImages(newSelectedImages);
        props.onSelect(newSelectedImages); // Pass the selected images to the parent
    };

    return (
        <div className="image-grid">
            {props.images.map((img, index) => (
                <img
                    key={index}
                    src={`${API_BASE_URL}/api/thumbnail/${img.path}`}
                    alt={img.path}
                    onClick={() => handleImageClick(img)} // Handle click event
                    style={{
                        border: selectedImages.includes(img) ? '2px solid blue' : 'none', // Highlight selected images
                        cursor: 'pointer'
                    }}
                />
            ))}
        </div>
    );
}

export default ImageResultsGrid;
