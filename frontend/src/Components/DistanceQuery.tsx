import {useState, useRef} from "react";
import Image from "@/Components/Image.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import EmbeddingInput from "@/Components/EmbeddingInput";
import {EmbeddingInputData, FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {FilterInput} from "@/Components/FilterInput.tsx";
import {v4 as uuidv4} from 'uuid';
import {startSearchWithTaskId, SearchParams} from "@/api/search";
import {useAsyncTaskManager} from "@/hooks/useAsyncTaskManager";
import {getImageIdsForTagsAsync} from "@/api";


type DistanceQueryProps = {
    setSelectedImages: (images: Image[]) => void;
}


function DistanceQuery(props: DistanceQueryProps) {

    const [embeddingInputs, setEmbeddingInputs] = useState<EmbeddingInputData[]>([])
    const [filterInput, setFilterInput] = useState<FilterInputData>(new FilterInputData())
    
    // Search state variables
    const [resultImages, setResultImages] = useState<Image[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchIsRunning, setSearchIsRunning] = useState(false);

    // Use ref to track cancellation state to avoid closure issues
    const searchCancelledRef = useRef(false);

    // Use the async task manager for all tasks
    const taskManager = useAsyncTaskManager();

    const cancelSearch = () => {
        if (searchIsRunning) {
            console.log("cancelling search task");
            searchCancelledRef.current = true;
            setSearchIsRunning(false);
            setSearchError("Search cancelled");
        }
    };

    const performSearch = async () => {
        if (embeddingInputs.length === 0) {
            console.log("can't perform search, no inputs")
        } else {
            console.log('starting search', embeddingInputs, filterInput)

            // Reset cancellation flag
            searchCancelledRef.current = false;
            setSearchIsRunning(true);
            setSearchError(null);

            var excludedImageIds: string[]|undefined = undefined
            var requiredImageIds: string[]|undefined = undefined
            // tag filtering
            if ((filterInput.negativeTags ?? "").trim().length > 0) {
                const taskResult = await taskManager.runTask(async (taskId, taskData) => {
                    console.log("running negative tags task, id=", taskId)
                    const negativeTags = filterInput.negativeTags!.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    await getImageIdsForTagsAsync(negativeTags, taskId, true);
                    console.log("taskData:", taskData)
                    while (taskData.isLoading || taskData.data === undefined) {
                        // Check for cancellation using ref
                        if (searchCancelledRef.current) {
                            throw new Error("Search cancelled");
                        }
                        //console.log('waiting for tag fetch task (negative tags) to complete...')
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    console.log("completed task:", taskData, taskData.data)
                    return taskData.data ?? []
                });
                console.log("taskResult:", taskResult)
                if (taskResult.error) {
                    console.error("Error fetching negative tags:", taskResult.error);
                    return;
                }
                excludedImageIds = taskResult.data as string[]
                console.log("excluded images:", excludedImageIds)
            }
            if ((filterInput.positiveTags ?? "").trim().length > 0) {
                const taskResult = await taskManager.runTask(async (taskId, taskData) => {
                    const positiveTags = filterInput.positiveTags!.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    await getImageIdsForTagsAsync(positiveTags, taskId, true);
                    console.log("taskData:", taskData)
                    while (taskData.isLoading || taskData.data === undefined) {
                        // Check for cancellation using ref
                        if (searchCancelledRef.current) {
                            throw new Error("Search cancelled");
                        }
                        //console.log('waiting for tag fetch task (positive tags) to complete...')
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    console.log("completed task:", taskData, taskData.data)
                    return taskData.data ?? []
                });
                if (taskResult.error) {
                    console.error("Error fetching positive tags:", taskResult.error);
                    return;
                }
                requiredImageIds = taskResult.data as string[]
                console.log("required images:", requiredImageIds)
            }


            try {
                const searchResult = await taskManager.runTask(async (taskId, taskData) => {
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

                    // Wait for the search to complete and get results from taskData
                    while (taskData.isLoading || taskData.data === undefined) {
                        // Check if search was cancelled using ref instead of state
                        if (searchCancelledRef.current) {
                            throw new Error("Search cancelled");
                        }
                        console.log('waiting for search task to complete...')
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    return taskData.data || [];
                });

                console.log("setSearchIsRunning false. searchResult:", searchResult);
                setSearchIsRunning(false);
                
                if (searchResult.error) {
                    setSearchError(searchResult.error);
                } else {
                    setResultImages(searchResult.data as Image[]);
                }
            } catch (error) {
                setSearchIsRunning(false);
                setSearchError(error instanceof Error ? error.message : 'Search failed');
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
            <FilterInput initialFilterInput={filterInput} setFilterInput={(d) => setFilterInput(d)} />
            <div className={"w-full flex flex-row justify-around"}>
                <button
                    className={"btn btn-primary border rounded w-1/3 h-10 mt-1"}
                    onClick={performSearch}
                    disabled={searchIsRunning || embeddingInputs.length === 0 || embeddingInputs.filter(input => input.value).length === 0}
                >
                    {searchIsRunning ? 'Searching...' : `Search (${embeddingInputs.filter(input => input.value).length} non-empty inputs)`}
                </button>
                <button
                    className={"btn btn-primary border rounded w-1/3 h-10 mt-1"}
                    onClick={cancelSearch}
                    disabled={!searchIsRunning}
                >Cancel search</button>
            </div>
            {searchError && (
                <div className="text-red-500 mt-2">Error: {searchError}</div>
            )}
        </div>
        <ImageResultsGrid images={resultImages} onSelect={props.setSelectedImages} onAddToQuery={handleAddToQuery} />
    </>


}

export default DistanceQuery;