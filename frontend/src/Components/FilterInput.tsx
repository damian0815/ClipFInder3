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
        <div>
            <input
                type="text"
                placeholder="Path contains"
                value={pathContains}
                onChange={(e) => setPathContains(e.target.value)}
                style={{
                    padding: '8px',
                    marginBottom: '10px',
                    fontSize: '16px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '100%'
                }}
            />
        </div>
    </>

}