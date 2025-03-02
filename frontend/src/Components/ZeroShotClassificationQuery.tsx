import ZeroShotClassificationInput, {
    ZeroShotClassificationQueryInput
} from "@/Components/ZeroShotClassificationInput.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import {useEffect, useState} from "react";
import {API_BASE_URL} from "@/Constants.tsx";
import MultiColumn from "@/Components/MultiColumn.tsx";
import Image from "@/Components/Image.tsx";

type ZeroShotClassificationQueryProps = {

}

type ZeroShotClassification = {
    image: Image
    best_cls: string
    entropy: number
}

let zeroShotResultsCache: ZeroShotClassification[] = []
function getZeroShotResults() { return zeroShotResultsCache }
function setZeroShotResults(results: ZeroShotClassification[]) { zeroShotResultsCache = results }

function getLastQuery(): ZeroShotClassificationQueryInput {
    const lastQueryJson = localStorage.getItem('zeroShot.lastQuery')
    console.log(typeof(lastQueryJson), lastQueryJson)
    if (!lastQueryJson) {
        return new ZeroShotClassificationQueryInput()
    }
    return JSON.parse(lastQueryJson);
}


function ZeroShotClassificationQuery(props: ZeroShotClassificationQueryProps) {
    const [queryResults, setQueryResults] = useState<ZeroShotClassification[]>([])
    const [queryInput, setQueryInput] = useState<ZeroShotClassificationQueryInput | undefined>(getLastQuery())
    const [queryInProgress, setQueryInProgress] = useState<boolean>(false)

    console.log("queryResults", getZeroShotResults())

    useEffect(() => {
        if (!queryInput) {
            return
        }
        localStorage.setItem('zeroShot.lastQuery', JSON.stringify(queryInput))
    }, [queryInput]);

    function doSearch() {
        console.log("searching, queryInput is", queryInput)
        if (queryInput) {
            setQueryInProgress(true);
            const queryBody = JSON.stringify(queryInput)
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
                    console.log(data)
                    setQueryResults(data)
                    setZeroShotResults(data)
                })
                .finally(() => {
                    setQueryInProgress(false);
                })
        }
    }

    const resultClasses = [... new Set(queryResults.map((qr) => qr.best_cls)).values()]
    resultClasses.sort()

    return <>
        <ZeroShotClassificationInput initialQuery={getLastQuery()} setQuery={setQueryInput}/>
        <button
            onClick={() => {doSearch()}}
            disabled={queryInProgress}
            >{queryInProgress ? "⏳ Searching..." : "🔎 Search"}</button>
        {/*<!--<ImageResultsGrid images={images} onSelect={handleSelect}/>-->*/}
        <pre>{JSON.stringify(queryInput?.classes)}</pre>
        {queryInput && (queryResults.length > 0) &&
            <MultiColumn columns={resultClasses.length} >
                {resultClasses.map((cls_id) => {
                    const thisClsResults = queryResults.filter((qr) => qr.best_cls === cls_id);
                    //return <div>{JSON.stringify(thisClsResults)}</div>
                    thisClsResults.sort((a, b) => a.entropy - b.entropy);
                    const thisClsImages = thisClsResults.map((qr) => qr.image)
                    return <>
                     <pre>{cls_id}</pre>
                    <ImageResultsGrid images={thisClsImages} onSelect={() => {}} />
                    </>
                })}
            </MultiColumn>
        }


    </>
}


export default ZeroShotClassificationQuery;
