import {FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {useEffect, useState} from "react";

type FilterInputProps = {
    initialFilterInput: FilterInputData
    setFilterInput: (input: FilterInputData) => void
}

export function FilterInput(props: FilterInputProps) {
    const [pathContains, setPathContains] = useState<string|undefined>(props.initialFilterInput.pathContains)
    const [negativeTags, setNegativeTags] = useState<string|undefined>(props.initialFilterInput.negativeTags)
    const [positiveTags, setPositiveTags] = useState<string|undefined>(props.initialFilterInput.positiveTags)

    useEffect(() => {
        const data = new FilterInputData()
        data.pathContains = pathContains
        data.negativeTags = negativeTags
        data.positiveTags = positiveTags
        props.setFilterInput(data)
    }, [pathContains, negativeTags, positiveTags])

    return <>
        <div className={"p-1 w-full grid grid-cols-3 gap-2"}>
            <label>
                Path contains
                <input
                    type="text"
                    placeholder="Path contains"
                    value={pathContains}
                    onChange={(e) => setPathContains(e.target.value)}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
            <label>
                -ve Tags
                <input
                    type="text"
                    placeholder="Tags (positive, comma-separated)"
                    value={negativeTags}
                    onChange={(e) => setNegativeTags(e.target.value)}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
            <label>
                +ve Tags
                <input
                    type="text"
                    placeholder="Tags (negative, comma-separated)"
                    value={positiveTags}
                    onChange={(e) => setPositiveTags(e.target.value)}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
        </div>
    </>

}