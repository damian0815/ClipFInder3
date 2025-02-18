import {API_BASE_URL} from "@/Constants.tsx";
import Image from "@/Components/Image.tsx";

type ImageResultsGridProps = {
    images: Array<Image>
}


function ImageResultsGrid(props: ImageResultsGridProps) {

    return <div className="image-grid">
        {props.images.map((img, index) => (
            <img
                key={index}
                src={`${API_BASE_URL}/api/thumbnail/${img.path}`}
                alt={img.path}
            />
        ))}
    </div>
}

export default ImageResultsGrid;
