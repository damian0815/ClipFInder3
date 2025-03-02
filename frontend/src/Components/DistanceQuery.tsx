import {useEffect, useState} from "react";
import {API_BASE_URL} from "@/Constants.tsx";
import Image from "@/Components/Image.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import EmbeddingInputs from "@/Components/EmbeddingInputs.tsx";
import {EmbeddingInputData, FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {FilterInput} from "@/Components/FilterInput.tsx";


type DistanceQueryProps = {

}


function DistanceQuery(props: DistanceQueryProps) {

    const [embeddingInput, setEmbeddingInput] = useState<EmbeddingInputData|undefined>(undefined)
    const [filterInput, setFilterInput] = useState<FilterInputData>(new FilterInputData())
    const [images, setImages] = useState<Image[]>([]);
    const [selectedImages, setSelectedImages] = useState([]);

    const handleSelect = (images) => {
        setSelectedImages(images);
        console.log("Selected Images:", images);
    };


    useEffect(() => {
        if (embeddingInput) {
            const query = embeddingInput.texts[0]
            fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => setImages(data));
        }
    }, [embeddingInput]);


    return <>
        <EmbeddingInputs id='distance_query' setEmbeddingInput={setEmbeddingInput} />
        <FilterInput initialFilterInput={filterInput} setFilterInput={(d) => setFilterInput(d)} />
        <ImageResultsGrid images={images} onSelect={handleSelect}/>
    </>


}

export default DistanceQuery;