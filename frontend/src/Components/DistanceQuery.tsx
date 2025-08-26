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
        <div className={"flex flex-row gap-4 border"}>

            <div className={'w-full flex-row border'}>
                {embeddingInputs.map((input, i) => (
                    <div className={"w-40 border"}>
                        <EmbeddingInput key={input.id} embeddingInput={input} onDeleteRequested={() => {
                            setEmbeddingInputs(embeddingInputs.filter((_, index) => index !== i));
                        }} />
                    </div>
                ))}
                <div className={'w-40 flex-row flex-none border'}>
                    <button className={"btn btn-primary border rounded w-full"} onClick={() => setEmbeddingInputs([...embeddingInputs, 
                        new EmbeddingInputData({id:`distanceQuery-${uuidv4()}`, text:''})])}>
                        + Add Text Input
                    </button>
                    <button className={"btn btn-primary border rounded w-full"} onClick={() => setEmbeddingInputs([...embeddingInputs, 
                        new EmbeddingInputData({id:`distanceQuery-${uuidv4()}`, tags:[]})])}>
                        + Add Tags Input
                    </button>
                </div>
            </div>
        </div>
        <FilterInput initialFilterInput={filterInput} setFilterInput={(d) => setFilterInput(d)} />
        <ImageResultsGrid images={images} onSelect={props.setSelectedImages} onAddToQuery={(image) => {
            setEmbeddingInputs([...embeddingInputs, new EmbeddingInputData({id: `distanceQuery-${uuidv4()}`, imageId: image.id})]);
        }} />
    </>


}

export default DistanceQuery;