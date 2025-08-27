import {useState} from "react";
import Image from "@/Components/Image.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import EmbeddingInput from "@/Components/EmbeddingInput";
import {EmbeddingInputData, FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {FilterInput} from "@/Components/FilterInput.tsx";
import {v4 as uuidv4} from 'uuid';
import {startSearchWithTaskId, SearchParams} from "@/api/search";
import {useAsyncTask} from "@/hooks/useAsyncTask";
import {getImageIdsForTagsAsync} from "@/api";


type DistanceQueryProps = {
    setSelectedImages: (images: Image[]) => void;
}


function DistanceQuery(props: DistanceQueryProps) {

    const [embeddingInputs, setEmbeddingInputs] = useState<EmbeddingInputData[]>([])
    const [filterInput, setFilterInput] = useState<FilterInputData>(new FilterInputData())

    // Use the new async task hook instead of manual state management
    const searchTask = useAsyncTask<Image[]>();
    const tagFetchTask = useAsyncTask<string[]>();

    const cancelSearch = () => {
        if (searchTask.isLoading && searchTask.taskId) {
            console.log("cancelling search task:", searchTask.taskId);
            searchTask.reset();
        }
    };

    const performSearch = async () => {
        if (embeddingInputs.length === 0) {
            console.log("can't perform search, no inputs")
        } else {
            console.log('starting search', embeddingInputs, filterInput)
            var excludedImageIds: string[]|undefined = undefined
            var requiredImageIds: string[]|undefined = undefined
            // tag filtering
            if ((filterInput.negativeTags ?? "").trim().length > 0) {
                const taskResult = await tagFetchTask.runTask(async (taskId) => {
                    const negativeTags = filterInput.negativeTags!.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    await getImageIdsForTagsAsync(negativeTags, taskId, true);
                    console.log("tagFetchTask:", tagFetchTask)
                    while (tagFetchTask.isLoading || tagFetchTask.data === undefined) {
                        console.log('waiting for tag fetch task to complete...')
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    console.log("completed tagFetchTask:", tagFetchTask, tagFetchTask.data)
                    return [...tagFetchTask.data ?? []]
                });
                console.log("taskResult:", taskResult)
                excludedImageIds = taskResult
                console.log("excluded images:", excludedImageIds)
            }
            if ((filterInput.positiveTags ?? "").trim().length > 0) {
                requiredImageIds = await tagFetchTask.runTask(async (taskId) => {
                    const positiveTags = filterInput.positiveTags!.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    await getImageIdsForTagsAsync(positiveTags, taskId, true);
                    while (tagFetchTask.isLoading || tagFetchTask.data === undefined) {
                        console.log('waiting for tag fetch task to complete...')
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    return [...tagFetchTask.data ?? []]
                });
                console.log("required images:", requiredImageIds)
            }


            await searchTask.runTask(async (taskId) => {

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
                    excluded_image_ids: excludedImageIds,
                    required_image_ids: requiredImageIds,
                };

                console.log("filters:", filterInput.pathContains, filterInput.positiveTags, filterInput.negativeTags)
                if ((filterInput.pathContains ?? "").trim().length > 0) {
                    searchParams.path_contains = filterInput.pathContains!;
                }
                
                console.log("query:", searchParams);

                // Start the search with the task ID
                await startSearchWithTaskId(searchParams, taskId);
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
            <FilterInput initialFilterInput={filterInput} setFilterInput={(d) => setFilterInput(d)} />
            <div className={"w-full flex flex-row justify-around"}>
                <button
                    className={"btn btn-primary border rounded w-1/3 h-10 mt-1"}
                    onClick={performSearch}
                    disabled={searchTask.isLoading || embeddingInputs.length === 0 || embeddingInputs.filter(input => input.value).length === 0}
                >
                    {searchTask.isLoading ? 'Searching...' : `Search (${embeddingInputs.filter(input => input.value).length} non-empty inputs)`}
                </button>
                <button
                    className={"btn btn-primary border rounded w-1/3 h-10 mt-1"}
                    onClick={cancelSearch}
                    disabled={!searchTask.isLoading}
                >Cancel search</button>
            </div>
            {searchTask.error && (
                <div className="text-red-500 mt-2">Error: {searchTask.error}</div>
            )}
        </div>
        <ImageResultsGrid images={searchTask.data || []} onSelect={props.setSelectedImages} onAddToQuery={handleAddToQuery} />
    </>


}

export default DistanceQuery;