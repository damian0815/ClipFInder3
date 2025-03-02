import { useState } from "react";
import Image, {ResultImage} from "@/Components/Image.tsx";

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
                <ResultImage
                    image={img}
                    key={index}
                    isSelected={selectedImages.includes(img)}
                    onClick={(img) => handleImageClick(img)}
                />
            ))}
        </div>
    );
}

export default ImageResultsGrid;
