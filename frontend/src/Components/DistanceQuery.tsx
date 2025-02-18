import {useEffect, useState} from "react";
import {API_BASE_URL} from "@/Constants.tsx";
import Image from "@/Components/Image.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import EmbeddingInputs from "@/Components/EmbeddingInputs.tsx";
import EmbeddingInputData from "@/Datatypes/EmbeddingInputData.tsx";


type DistanceQueryProps = {

}


function DistanceQuery(props: DistanceQueryProps) {

    const [embeddingInput, setEmbeddingInput] = useState<EmbeddingInputData|undefined>(undefined)
    const [images, setImages] = useState<Image[]>([]);

    useEffect(() => {
        if (embeddingInput) {
            const query = embeddingInput.texts[0]
            fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => setImages(data));
        }
    }, [embeddingInput]);


    return <>
        <EmbeddingInputs setEmbeddingInput={setEmbeddingInput} />.
        <ImageResultsGrid images={images} />
    </>


}

export default DistanceQuery;