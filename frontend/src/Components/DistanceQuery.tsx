import {useState} from "react";
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
    const [queryInProgress, setQueryInProgress] = useState<boolean>(false);

    const performSearch = () => {
        if (embeddingInputs.length > 0) {
            // Build the search payload with weights
            const textParts = embeddingInputs.filter(input => input.mode === 'text');
            const imageParts = embeddingInputs.filter(input => input.mode === 'image');
            const tagParts = embeddingInputs.filter(input => input.mode === 'tags');
            const weights = textParts.map(input => input.weight).concat(
                imageParts.map(input => input.weight), 
                tagParts.map(input => input.weight));
            let searchData: Record<string, any> = {
                'texts': textParts.map(input => input.text),
                'image_ids': imageParts.map(input => input.imageId),
                'tags': tagParts.map(input => input.tags),
                'weights': weights
            };
            if (filterInput.pathContains.length > 0) {
                // Only include pathContains if it's non-empty
                searchData['path_contains'] = filterInput.pathContains;
            }
            if (filterInput.excluded_tags.length > 0) {
                // Only include excluded_tags if it's non-empty
                searchData['excluded_image_ids'] = getImageIdsForTags(filterInput.excluded_tags);
            }
            if (filterInput.required_tags_and.length > 0) {
                // Only include required_tags_and if it's non-empty
                searchData['required_image_ids'] = getImageIdsForTags(filterInput.required_tags_and);
            }
            console.log("query:", searchData)
            setQueryInProgress(true)

            fetch(`${API_BASE_URL}/api/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchData),
            })
                .then(res => res.json())
                .then(data => {
                    console.log(data);
                    setImages(data)
                })
                .catch(error => {
                    console.error('Search error:', error);
                })
                .finally(() => {
                    setQueryInProgress(false);
                });
        }
    };

    const handleDeleteEmbeddingInput = (id: string) => {
        const newEmbeddingInputs = embeddingInputs.filter(input => input.id !== id);
        console.log("embeddings inputs:", newEmbeddingInputs.map(input => [input.id, input.text ?? 'undefined']));
        setEmbeddingInputs(newEmbeddingInputs);
    }

    const handleAddToQuery = (image: Image) => {
        console.log("adding image to query:", image);
        setEmbeddingInputs([...embeddingInputs, new EmbeddingInputData({id: `distanceQuery-${uuidv4()}`, imageId: image.id})]);
    }

    return <>
        <div className={"gap-4 border"}>

            <div className={'flex flex-wrap gap-4 w-full border'}>
                {embeddingInputs.map((input) => (
                    <div key={input.id} className={"w-40 flex-shrink-0 border"}>
                        <EmbeddingInput 
                            embeddingInput={input} 
                            onDeleteClicked={(_) => handleDeleteEmbeddingInput(input.id)}
                            onQueryRequested={performSearch} />
                    </div>
                ))}
                <div className={'w-40 flex-shrink-0 border inline-block'}>
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
            <button 
                className={"btn btn-primary border rounded w-full mt-1"}
                onClick={performSearch}
                disabled={queryInProgress || embeddingInputs.length === 0 || embeddingInputs.filter(input => input.value).length === 0}
            >
                {queryInProgress ? 'Searching...' : 'Search'}
            </button>
        </div>
        <FilterInput initialFilterInput={filterInput} setFilterInput={(d) => setFilterInput(d)} />
        <ImageResultsGrid images={images} onSelect={props.setSelectedImages} onAddToQuery={handleAddToQuery} />
    </>


}

export default DistanceQuery;