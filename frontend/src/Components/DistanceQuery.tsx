import {useEffect, useState} from "react";
import {API_BASE_URL} from "@/Constants.tsx";
import Image from "@/Components/Image.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import EmbeddingInput from "@/Components/EmbeddingInput";
import {EmbeddingInputData, FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {FilterInput} from "@/Components/FilterInput.tsx";
import {v4 as uuidv4} from 'uuid';


type DistanceQueryProps = {
    setSelectedImages: (images: Image[]) => void;
}


function DistanceQuery(props: DistanceQueryProps) {

    const [embeddingInputs, setEmbeddingInputs] = useState<EmbeddingInputData[]>([])
    const [filterInput, setFilterInput] = useState<FilterInputData>(new FilterInputData())
    const [images, setImages] = useState<Image[]>([]);

    useEffect(() => {
        if (embeddingInputs.length > 0) {
            const query = embeddingInputs[0].text || "";
            fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => {
                    console.log(data);
                    setImages(data)
                });
        }
    }, [embeddingInputs]);


    return <>
        <div className={"flex flex-col gap-4"}>

            <div>
                {embeddingInputs.map((input, i) => (
                    <EmbeddingInput key={input.id} embeddingInput={input} onDeleteRequested={() => {
                        setEmbeddingInputs(embeddingInputs.filter((_, index) => index !== i));
                    }} />
                ))}
            </div>
            <button onClick={() => setEmbeddingInputs([...embeddingInputs, 
                new EmbeddingInputData({id:`distanceQuery-${uuidv4()}`, text:''})])}>
                + Add Text Input
            </button>
            <button onClick={() => setEmbeddingInputs([...embeddingInputs, 
                new EmbeddingInputData({id:`distanceQuery-${uuidv4()}`, tags:[]})])}>
                + Add Tags Input
            </button>
        </div>
        <FilterInput initialFilterInput={filterInput} setFilterInput={(d) => setFilterInput(d)} />
        <ImageResultsGrid images={images} onSelect={props.setSelectedImages} onAddToQuery={(image) => {
            setEmbeddingInputs([...embeddingInputs, new EmbeddingInputData({id: `distanceQuery-${uuidv4()}`, imageId: image.id})]);
        }} />
    </>


}

export default DistanceQuery;