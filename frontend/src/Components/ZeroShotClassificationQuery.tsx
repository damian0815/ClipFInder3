import ZeroShotClassificationInput, {
    ZeroShotClassificationInputData
} from "@/Components/ZeroShotClassificationInput.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import {useEffect, useState} from "react";
import {API_BASE_URL} from "@/Constants.tsx";
import MultiColumn from "@/Components/MultiColumn.tsx";
import Image from "@/types/image";
import {FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {FilterInput} from "@/Components/FilterInput.tsx";
import { Button } from "@/Components/ui/Button.tsx";

type ZeroShotClassificationQueryProps = {
    setSelectedImages: (images: Image[]) => void;
    thumbnailSizeIndex?: number;
    onThumbnailSizeChange?: (index: number) => void;
    onGridFocusChange: (focused: boolean) => void;
}

type ZeroShotClassification = {
    image: Image
    best_cls: string
    entropy: number
    order_key: number|number[]
}

let zeroShotResultsCache: ZeroShotClassification[] = []
function setZeroShotResults(results: ZeroShotClassification[]) { zeroShotResultsCache = results }

function getLastQuery(): ZeroShotClassificationInputData {
    const lastQueryJson = localStorage.getItem('zeroShot.lastQuery')
    //console.log(typeof(lastQueryJson), lastQueryJson)
    if (!lastQueryJson) {
        return new ZeroShotClassificationInputData()
    }
    return JSON.parse(lastQueryJson);
}

function getLastFilter(): FilterInputData {
    const lastFilterJson = localStorage.getItem('zeroShot.lastFilter')
    //console.log(typeof(lastQueryJson), lastQueryJson)
    if (!lastFilterJson) {
        return new FilterInputData()
    }
    return JSON.parse(lastFilterJson);
}

function ZeroShotClassificationQuery(props: ZeroShotClassificationQueryProps) {
    const [queryResults, setQueryResults] = useState<ZeroShotClassification[]>([])
    const [queryInput, setQueryInput] = useState<ZeroShotClassificationInputData>(getLastQuery())
    const [filterInput, setFilterInput] = useState<FilterInputData>(getLastFilter())
    const [queryInProgress, setQueryInProgress] = useState<boolean>(false)

    const [selectedImagesPerClass, setSelectedImagesPerClass] = useState<Record<string, Image[]>>({})

    //console.log("queryResults", getZeroShotResults())

    useEffect(() => {
        if (!queryInput) {
            return
        }
        localStorage.setItem('zeroShot.lastQuery', JSON.stringify(queryInput))
    }, [queryInput]);

    useEffect(() => {
        if (!filterInput) {
            return
        }
        localStorage.setItem('zeroShot.lastFilter', JSON.stringify(filterInput))
    }, [filterInput]);

    function doSearch() {
        //console.log("searching, queryInput is", queryInput)
        if (queryInput) {
            setQueryInProgress(true);
            const queryBody = JSON.stringify({'classes': queryInput.classes, 'filters': filterInput})
            console.log(queryInput, queryBody)
            fetch(`${API_BASE_URL}/api/zero-shot-classify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: queryBody
            })
                .then(res => res.json())
                .then(data => {
                    //setImages(data)
                    //console.log(data)
                    setQueryResults(data)
                    setZeroShotResults(data)
                })
                .finally(() => {
                    setQueryInProgress(false);
                })
        }
    }

    let resultClasses: string[] = []
    if (queryResults) {
        console.log(queryResults)
        resultClasses = [...new Set(queryResults.map((qr) => qr.best_cls)).values()]
        resultClasses.sort()
    }

    function selectedImagesUpdated(clsId: string, images: Image[]) {
        selectedImagesPerClass[clsId] = images;
        const allSelectedImages = Object.values(selectedImagesPerClass).flatMap((si) => si);
        props.setSelectedImages(allSelectedImages);
        setSelectedImagesPerClass({...selectedImagesPerClass})
        console.log("all selected images:", allSelectedImages);
    }

    function handleAddToQuery(_: Image): void {
        throw new Error("Function not implemented.");
    }

    return (
        <div className="space-y-6">
            <ZeroShotClassificationInput initialQuery={getLastQuery()} setQuery={setQueryInput}/>
            <FilterInput initialFilterInput={getLastFilter()} setFilterInput={setFilterInput} />
            <div className="flex justify-center">
                <Button
                    onClick={() => {doSearch()}}
                    disabled={queryInProgress}
                    className="px-8"
                >
                    {queryInProgress ? "⏳ Searching..." : "🔎 Search"}
                </Button>
            </div>
            {/*<!--<ImageResultsGrid images={images} onSelect={handleSelect}/>-->*/}
            <pre className="text-xs bg-slate-100 p-2 rounded">{JSON.stringify(queryInput?.classes)}</pre>
        {queryInput && (queryResults.length > 0) && <>
            <MultiColumn columns={resultClasses.length} >
                    {resultClasses.map((clsId) => {
                        const thisClsResults = queryResults.filter((qr) => qr.best_cls === clsId);
                        //return <div>{JSON.stringify(thisClsResults)}</div>
                        thisClsResults.sort((a, b) => a.entropy - b.entropy);
                        const thisClsImages = thisClsResults.map((qr) => qr.image)

                        return <>
                         <pre>{clsId}</pre>
                        <ImageResultsGrid 
                            images={thisClsImages} 
                            onAddToQuery={(i) => handleAddToQuery(i)}
                            onSelect={(si) => selectedImagesUpdated(clsId, si)}
                            thumbnailSizeIndex={props.thumbnailSizeIndex}
                            onThumbnailSizeChange={props.onThumbnailSizeChange}
                            onGridFocusChange={props.onGridFocusChange}
                        />
                        </>
                    })}
                </MultiColumn>
            {/*<ImageResults2D images={queryResults.map((qr) => qr.image)}
                                positions={queryResults.map((qr) => qr.order_key as number[])} />
                                */}
            </>
        }
        </div>
    );
}


export default ZeroShotClassificationQuery;
