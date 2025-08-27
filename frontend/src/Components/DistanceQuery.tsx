import {useState, useRef, useCallback, useEffect} from "react";
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
    const pageSize = 50;

    // Search state variables
    const [resultImages, setResultImages] = useState<Image[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchIsRunning, setSearchIsRunning] = useState(false);

    // Infinite scroll state
    const [currentOffset, setCurrentOffset] = useState(0);
    const [hasMoreResults, setHasMoreResults] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Store filter state to preserve for pagination
    const [currentExcludedImageIds, setCurrentExcludedImageIds] = useState<string[] | undefined>(undefined);
    const [currentRequiredImageIds, setCurrentRequiredImageIds] = useState<string[] | undefined>(undefined);
    const [currentSearchParams, setCurrentSearchParams] = useState<SearchParams | null>(null);

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

    // Function to perform search for a specific page
    const performSearchPage = async (offset: number, append: boolean = false): Promise<Image[]> => {
        const searchParams: SearchParams = currentSearchParams || {
            texts: embeddingInputs.filter(input => input.mode === 'text').map(input => input.text).filter(Boolean) as string[],
            image_ids: embeddingInputs.filter(input => input.mode === 'image').map(input => input.imageId).filter(Boolean) as string[],
            tags: embeddingInputs.filter(input => input.mode === 'tags').map(input => input.tags).filter(Boolean) as string[][],
            weights: embeddingInputs.map(input => input.weight),
            path_contains: (filterInput.pathContains ?? "").trim().length > 0 ? filterInput.pathContains : undefined,
            excluded_image_ids: currentExcludedImageIds,
            required_image_ids: currentRequiredImageIds,
            offset: offset,
            limit: pageSize // Smaller page size for better UX
        };

        const searchResult = await taskManager.runTask(async (taskId, taskData) => {
            console.log(`Starting search with offset ${offset}, taskId:`, taskId);

            // Start the search with the task ID
            await startSearchWithTaskId(searchParams, taskId);

            // Wait for the search to complete and get results from taskData
            while (taskData.isLoading || taskData.data === undefined) {
                // Check if search was cancelled using ref instead of state
                if (searchCancelledRef.current) {
                    throw new Error("Search cancelled");
                }
                console.log(`Waiting for search with offset ${offset} to complete...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return taskData.data || [];
        });

        if (searchResult.error) {
            throw new Error(searchResult.error);
        }

        const newImages = searchResult.data as Image[];

        // Check if we have more results (if we got a full page, there might be more)
        const gotFullPage = newImages.length === (searchParams.limit || pageSize);
        if (!append) {
            setHasMoreResults(gotFullPage);
        } else {
            setHasMoreResults(gotFullPage);
        }

        return newImages;
    };

    const performSearch = async () => {
        if (embeddingInputs.length === 0) {
            console.log("can't perform search, no inputs")
            return;
        }

        console.log('starting search', embeddingInputs, filterInput)

        // Reset pagination state for new search
        setCurrentOffset(0);
        setHasMoreResults(true);
        searchCancelledRef.current = false;
        setSearchIsRunning(true);
        setSearchError(null);
        setResultImages([]);

        try {
            // Get fresh filter state for tag filtering
            var excludedImageIds: string[] | undefined = undefined;
            var requiredImageIds: string[] | undefined = undefined;

            // Tag filtering logic (same as before)
            if ((filterInput.negativeTags ?? "").trim().length > 0) {
                const taskResult = await taskManager.runTask(async (taskId, taskData) => {
                    console.log("running negative tags task, id=", taskId)
                    const negativeTags = filterInput.negativeTags!.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    await getImageIdsForTagsAsync(negativeTags, taskId, true);
                    while (taskData.isLoading || taskData.data === undefined) {
                        if (searchCancelledRef.current) {
                            throw new Error("Search cancelled");
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    return taskData.data ?? []
                });
                if (taskResult.error) {
                    console.error("Error fetching negative tags:", taskResult.error);
                    return;
                }
                excludedImageIds = taskResult.data as string[]
            }

            if ((filterInput.positiveTags ?? "").trim().length > 0) {
                const taskResult = await taskManager.runTask(async (taskId, taskData) => {
                    const positiveTags = filterInput.positiveTags!.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    await getImageIdsForTagsAsync(positiveTags, taskId, true);
                    while (taskData.isLoading || taskData.data === undefined) {
                        if (searchCancelledRef.current) {
                            throw new Error("Search cancelled");
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    return taskData.data ?? []
                });
                if (taskResult.error) {
                    console.error("Error fetching positive tags:", taskResult.error);
                    return;
                }
                requiredImageIds = taskResult.data as string[]
            }

            // Store filter state for pagination
            setCurrentExcludedImageIds(excludedImageIds);
            setCurrentRequiredImageIds(requiredImageIds);

            // Build and store search params for pagination
            const searchParams: SearchParams = {
                texts: embeddingInputs.filter(input => input.mode === 'text').map(input => input.text).filter(Boolean) as string[],
                image_ids: embeddingInputs.filter(input => input.mode === 'image').map(input => input.imageId).filter(Boolean) as string[],
                tags: embeddingInputs.filter(input => input.mode === 'tags').map(input => input.tags).filter(Boolean) as string[][],
                weights: embeddingInputs.map(input => input.weight),
                path_contains: (filterInput.pathContains ?? "").trim().length > 0 ? filterInput.pathContains : undefined,
                excluded_image_ids: excludedImageIds,
                required_image_ids: requiredImageIds,
                offset: 0,
                limit: pageSize
            };
            setCurrentSearchParams(searchParams);

            // Perform initial search (page 0)
            const initialResults = await performSearchPage(0, false);
            setResultImages(initialResults);
            setSearchIsRunning(false);

        } catch (error) {
            setSearchIsRunning(false);
            setSearchError(error instanceof Error ? error.message : 'Search failed');
        }
    };

    // Function to load more results
    const loadMoreResults = useCallback(async () => {
        if (!hasMoreResults || isLoadingMore || !currentSearchParams) {
            return;
        }

        setIsLoadingMore(true);
        try {
            const nextPage = currentOffset + pageSize;
            const moreResults = await performSearchPage(nextPage, true);

            setResultImages(prev => [...prev, ...moreResults]);
            setCurrentOffset(nextPage);

        } catch (error) {
            console.error('Error loading more results:', error);
            setSearchError(error instanceof Error ? error.message : 'Failed to load more results');
        } finally {
            setIsLoadingMore(false);
        }
    }, [currentOffset, hasMoreResults, isLoadingMore, currentSearchParams]);

    useEffect(() => {
        // Attach scroll event listener for infinite scroll
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                // Near bottom of the page, load more results
                loadMoreResults();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [loadMoreResults]);

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
        <ImageResultsGrid
            images={resultImages}
            onSelect={props.setSelectedImages}
            onAddToQuery={handleAddToQuery}
            hasMoreResults={hasMoreResults}
        />
        {isLoadingMore && (
            <div className="text-center py-4">
                <div className="text-gray-600">Loading more results...</div>
            </div>
        )}
        {!hasMoreResults && resultImages.length > 0 && (
            <div className="text-center py-4">
                <div className="text-gray-500 text-sm">No more results</div>
            </div>
        )}
    </>


}

export default DistanceQuery;
