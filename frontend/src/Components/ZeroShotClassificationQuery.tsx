import ZeroShotClassificationInput, {
    ZeroShotClassificationQueryInput
} from "@/Components/ZeroShotClassificationInput.tsx";
import ImageResultsGrid from "@/Components/ImageResultsGrid.tsx";
import {useEffect, useState} from "react";
import {API_BASE_URL} from "@/Constants.tsx";

type ZeroShotClassificationQueryProps = {

}


export function ZeroShotClassificationQuery(props: ZeroShotClassificationQueryProps) {

    const [queryInput, setQueryInput] = useState<ZeroShotClassificationQueryInput | undefined>(undefined)

    useEffect(() => {
        if (queryInput) {
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
                });
        }
    }, [queryInput]);

    return <>
        <ZeroShotClassificationInput setQuery={setQueryInput}/>
        {/*<!--<ImageResultsGrid images={images} onSelect={handleSelect}/>-->*/}
    </>
}


export default ZeroShotClassificationQuery;
