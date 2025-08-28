import {useState, useRef, useCallback, useEffect} from "react";
import Image from "@/types/image";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import EmbeddingInput from "@/Components/EmbeddingInput";
import {EmbeddingInputData, FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {FilterInput} from "@/Components/FilterInput.tsx";
import {v4 as uuidv4} from 'uuid';
import {startSearchWithTaskId, SearchParams} from "@/api/search";
import {useAsyncTaskManager} from "@/hooks/useAsyncTaskManager";
import {getImageIdsForTagsAsync as startGetImageIdsForTagsAsync} from "@/api";


type DistanceQueryProps = {
    setSelectedImages: (images: Image[]) => void;
}


function DistanceQuery(props: DistanceQueryProps) {

    const [embeddingInputs, setEmbeddingInputs] = useState<EmbeddingInputData[]>([])
    const [filterInput, setFilterInput] = useState<FilterInputData>(new FilterInputData())
    const pageSize = 50;
    const [sortOrder, setSortOrder] = useState<'similarity' | 'semantic_page'>('similarity')

    // Search state variables
    const [resultImages, setResultImages] = useState<Image[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searchIsRunning, setSearchIsRunning] = useState(false);

    // Infinite scroll state
    const [currentOffset, setCurrentOffset] = useState(0);
    const [hasMoreResults, setHasMoreResults] = useState(true);

    // Store filter state to preserve for pagination
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
    const performSearchPage = async (
        offset: number, 
        searchParams: SearchParams,
        append: boolean = false): Promise<Image[]> => {

        try {
            setSearchIsRunning(true)

            const searchResult = await taskManager.runTask(async (taskId, taskData) => {
                console.log(`Starting search with offset ${offset}, taskId:`, taskId);

                // Start the search with the task ID
                await startSearchWithTaskId(searchParams, taskId);

                // Wait for the search to complete and get results from taskData
                while (!taskData.data) {
                    // Check if search was cancelled using ref instead of state
                    if (searchCancelledRef.current) {
                        throw new Error("Search cancelled");
                    }
                    console.log(`Waiting for search with offset ${offset} to complete...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                console.log('search completed, got results:', taskData);
                return taskData.data;
            });

            if (searchResult.error) {
                throw new Error(searchResult.error);
            }

            const newImages = searchResult.data as Image[];
            if (!newImages) {
                console.error("newImages is undefined. searchResult:", searchResult);
            }

            // Check if we have more results (if we got a full page, there might be more)
            const gotFullPage = newImages.length === (searchParams.limit || pageSize);
            if (!append) {
                setHasMoreResults(gotFullPage);
            } else {
                setHasMoreResults(gotFullPage);
            }

            return newImages;
        } finally {
            setSearchIsRunning(false);
        }
    };

    const getImageIdsForTags = async (tags: string[]): Promise<string[]> => {
        const taskResult = await taskManager.runTask(async (taskId, taskData) => {
            console.log("running image ids for tags task, id=", taskId)
            await startGetImageIdsForTagsAsync(tags, taskId, true);
            while (taskData.data === undefined) {
                if (searchCancelledRef.current) {
                    throw new Error("Search cancelled");
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            return taskData.data ?? []
        });
        if (taskResult.error) {
            throw new Error("Error fetching negative tags: " + taskResult.error);
        }
        return taskResult.data as string[];
    }

    const performPage0Search = async () => {
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
                excludedImageIds = await getImageIdsForTags(filterInput.negativeTags!.split(',').map(t => t.trim()).filter(t => t.length > 0));
            }

            if ((filterInput.positiveTags ?? "").trim().length > 0) {
                requiredImageIds = await getImageIdsForTags(filterInput.positiveTags!.split(',').map(t => t.trim()).filter(t => t.length > 0));
            }

            // Prepare inputs + weights
            const textInputs = embeddingInputs.filter(input => input.mode === 'text' && input.text && input.text.trim().length > 0);
            const texts = textInputs.map(input => input.text!);
            const textWeights = textInputs.map(input => input.weight);

            const imageInputs = embeddingInputs.filter(input => input.mode === 'image' && input.imageId);
            const imageIds = imageInputs.map(input => input.imageId) as string[]
            const imageWeights = imageInputs.map(input => input.weight) as number[]

            const tagInputs = embeddingInputs.filter(input => input.mode === 'tags' && input.tags && input.tags.length > 0);
            // For tags, we need to fetch image IDs for each tag input
            for (const input of tagInputs) {
                const tagImageIds = await getImageIdsForTags(input.tags!);
                imageIds.push(...tagImageIds);
                // weight should be spread across all images for this tag
                imageWeights.push(...Array(tagImageIds.length).fill(input.weight/tagImageIds.length));
            }

            const weights = [...textWeights, ...imageWeights];

            // Build and store search params for pagination
            const searchParams: SearchParams = {
                texts: texts,
                image_ids: imageIds,
                weights: weights,
                required_path_contains: filterInput.positivePathContains,
                excluded_path_contains: filterInput.negativePathContains,
                excluded_image_ids: excludedImageIds,
                required_image_ids: requiredImageIds,
                offset: 0,
                limit: pageSize,
                sort_order: sortOrder
            };
            setCurrentSearchParams(searchParams);

            // Perform initial search (page 0)
            const initialResults = await performSearchPage(0, searchParams, false);
            setResultImages(initialResults);
            setSearchIsRunning(false);

        } catch (error) {
            setSearchIsRunning(false);
            setSearchError(error instanceof Error ? error.message : 'Search failed');
        }
    };

    // Function to load more results
    const loadMoreResults = useCallback(async () => {
        if (!hasMoreResults || searchIsRunning || !currentSearchParams) {
            return;
        }

        try {
            const nextOffset = (currentSearchParams.offset ?? 0) + pageSize;
            currentSearchParams.offset = nextOffset;
            const moreResults = await performSearchPage(nextOffset, currentSearchParams, true);
            const moreResultsFiltered = [...moreResults].filter(image => !resultImages.some(existing => existing.id === image.id));

            setResultImages(prev => [...prev, ...moreResultsFiltered]);
            setCurrentOffset(nextOffset);

        } catch (error) {
            console.error('Error loading more results:', error);
            setSearchError(error instanceof Error ? error.message : 'Failed to load more results');
        }
    }, [currentOffset, hasMoreResults, searchIsRunning, currentSearchParams]);

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
        <div className={"gap-4"}>

            <div className={'flex flex-wrap gap-4 w-full'}>
                {embeddingInputs.map((input) => (
                    <div key={input.id} className={"w-40 flex-shrink-0"}>
                        <EmbeddingInput 
                            embeddingInput={input} 
                            onDeleteClicked={(_) => handleDeleteEmbeddingInput(input.id)}
                            onQueryRequested={performPage0Search} />
                    </div>
                ))}
                <div className={'w-40 flex-shrink-0 inline-block'}>
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
                    onClick={performPage0Search}
                    disabled={searchIsRunning || embeddingInputs.length === 0 || embeddingInputs.filter(input => input.value).length === 0}
                >
                    {searchIsRunning ? 'Searching...' : `Search (${embeddingInputs.filter(input => input.value).length} non-empty inputs)`}
                </button>
                <button
                    className={"btn btn-primary border rounded w-1/3 h-10 mt-1"}
                    onClick={cancelSearch}
                    disabled={!searchIsRunning}
                >Cancel search</button>
                <select
                    className={"border rounded px-2 py-1"}
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value as 'similarity' | 'semantic_page')}
                >
                    <option value="similarity">Similarity</option>
                    <option value="semantic_page">Semantic (by page)</option>
                </select>
            </div>
            {searchError && (
                <div className="text-red-500 mt-2">Error: {searchError}</div>
            )}
        </div>
        <div>Current offset: {currentSearchParams?.offset ?? "<undefined>"}</div>
        <ImageResultsGrid
            images={resultImages}
            onSelect={props.setSelectedImages}
            onAddToQuery={handleAddToQuery}
            //hasMoreResults={hasMoreResults}
        />
        {searchIsRunning && (
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
