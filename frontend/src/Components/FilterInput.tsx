import {FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {useEffect, useState} from "react";

type FilterInputProps = {
    initialFilterInput: FilterInputData
    setFilterInput: (input: FilterInputData) => void
}

export function FilterInput(props: FilterInputProps) {
    const [pathContains, setPathContains] = useState<string>(props.initialFilterInput.pathContains[0])

    useEffect(() => {
        const data = new FilterInputData()
        data.pathContains = [pathContains]
        props.setFilterInput(data)
    }, [pathContains])

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
                    value={pathContains}
                    onChange={(e) => setPathContains(e.target.value)}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
            <label>
                +ve Tags
                <input
                    type="text"
                    placeholder="Tags (negative, comma-separated)"
                    value={pathContains}
                    onChange={(e) => setPathContains(e.target.value)}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
        </div>
    </>

}