import {useState, useEffect} from "react";
import Image from "@/Components/Image.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import EmbeddingInput from "@/Components/EmbeddingInput";
import {EmbeddingInputData, FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {FilterInput} from "@/Components/FilterInput.tsx";
import {v4 as uuidv4} from 'uuid';
import {getImageIdsForTags} from "@/api/tags";
import {startSearch as startSearch, SearchParams} from "@/api/search";
import {useProgressWebSocket} from "@/hooks/useProgressWebSocket";


type DistanceQueryProps = {
    setSelectedImages: (images: Image[]) => void;
}


function DistanceQuery(props: DistanceQueryProps) {

    const [embeddingInputs, setEmbeddingInputs] = useState<EmbeddingInputData[]>([])
    const [filterInput, setFilterInput] = useState<FilterInputData>(new FilterInputData())
    const [images, setImages] = useState<Image[]>([]);
    const [queryInProgress, setQueryInProgress] = useState<boolean>(false);
    const [currentSearchTaskId, setCurrentSearchTaskId] = useState<string | null>(null);

    const { activeTasks } = useProgressWebSocket();

    // Listen for search completion
    useEffect(() => {
        if (currentSearchTaskId && activeTasks.has(currentSearchTaskId)) {
            const task = activeTasks.get(currentSearchTaskId)!;

            if (task.status === 'completed' && task.data) {
                console.log('Search completed:', task.data);
                setImages(task.data);
                setQueryInProgress(false);
                setCurrentSearchTaskId(null);
            } else if (task.status === 'failed') {
                console.error('Search failed:', task.message);
                setQueryInProgress(false);
                setCurrentSearchTaskId(null);
            }
        }
    }, [activeTasks, currentSearchTaskId]);

    const performSearch = async () => {
        if (embeddingInputs.length > 0) {
            try {
                setQueryInProgress(true);
                
                // Build the search payload with weights
                const textParts = embeddingInputs.filter(input => input.mode === 'text');
                const imageParts = embeddingInputs.filter(input => input.mode === 'image');
                const tagParts = embeddingInputs.filter(input => input.mode === 'tags');
                const weights = textParts.map(input => input.weight).concat(
                    imageParts.map(input => input.weight), 
                    tagParts.map(input => input.weight));
                
                let searchParams: SearchParams = {
                    texts: textParts.map(input => input.text).filter(Boolean) as string[],
                    image_ids: imageParts.map(input => input.imageId).filter(Boolean) as string[],
                    tags: tagParts.map(input => input.tags).filter(Boolean) as string[][],
                    weights: weights,
                    path_contains: undefined,
                    excluded_image_ids: undefined,
                    required_image_ids: undefined,
                };

                console.log("filters:", filterInput.pathContains, filterInput.positiveTags, filterInput.negativeTags)
                if ((filterInput.pathContains ?? "").trim().length > 0) {
                    searchParams.path_contains = filterInput.pathContains!;
                }
                
                // tag filtering
                if ((filterInput.negativeTags ?? "").trim().length > 0) {
                    searchParams.excluded_image_ids = await getImageIdsForTags(filterInput.negativeTags!.split(",").map(tag => tag.trim()));
                    console.log("excluded images:", searchParams.excluded_image_ids)
                }
                if ((filterInput.positiveTags ?? "").trim().length > 0) {
                    searchParams.required_image_ids = await getImageIdsForTags(filterInput.positiveTags!.split(",").map(tag => tag.trim()));
                    console.log("required images:", searchParams.required_image_ids)
                }
                
                console.log("query:", searchParams);

                // Start the search task
                const taskData = await startSearch(searchParams);
                setCurrentSearchTaskId(taskData.task_id);

                console.log('Search started with task ID:', taskData.task_id);
            } catch (error) {
                console.error('Search error:', error);
                setQueryInProgress(false);
                setCurrentSearchTaskId(null);
            }
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