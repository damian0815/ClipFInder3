import {FilterInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import {useEffect, useState} from "react";
import DebouncedTextField from "@/Components/DebouncedTextField.tsx";

type FilterInputProps = {
    initialFilterInput: FilterInputData
    setFilterInput: (input: FilterInputData) => void
    onEnterPressed?: () => void
}

export function FilterInput(props: FilterInputProps) {
    const [negativePathContains, setNegativePathContains] = useState<string|undefined>(props.initialFilterInput.negativePathContains)
    const [positivePathContains, setPositivePathContains] = useState<string|undefined>(props.initialFilterInput.positivePathContains)
    const [negativeTags, setNegativeTags] = useState<string|undefined>(props.initialFilterInput.negativeTags)
    const [positiveTags, setPositiveTags] = useState<string|undefined>(props.initialFilterInput.positiveTags)

    // Update internal state when initialFilterInput prop changes (e.g., from history restore)
    useEffect(() => {
        setNegativePathContains(props.initialFilterInput.negativePathContains)
        setPositivePathContains(props.initialFilterInput.positivePathContains)
        setNegativeTags(props.initialFilterInput.negativeTags)
        setPositiveTags(props.initialFilterInput.positiveTags)
    }, [props.initialFilterInput])

    useEffect(() => {
        const data = new FilterInputData()
        data.positivePathContains = positivePathContains
        data.negativePathContains = negativePathContains
        data.negativeTags = negativeTags
        data.positiveTags = positiveTags
        props.setFilterInput(data)
    }, [negativePathContains, positivePathContains, negativeTags, positiveTags])

    return <>
        <div className={"p-1 w-full grid grid-cols-4 gap-2"}>
            <label>
                Required path (partial)
                <DebouncedTextField
                    type="text"
                    placeholder="Path contains"
                    value={positivePathContains}
                    setDebouncedValue={setPositivePathContains}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            props.onEnterPressed && props.onEnterPressed();
                        }
                    }}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
            <label>
                Excluded path (partial)
                <DebouncedTextField
                    type="text"
                    placeholder="Not path contains"
                    value={negativePathContains}
                    setDebouncedValue={setNegativePathContains}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            props.onEnterPressed && props.onEnterPressed();
                        }
                    }}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
            <label>
                Required Tags
                <DebouncedTextField
                    type="text"
                    placeholder="Tags (positive, comma-separated)"
                    value={positiveTags}
                    setDebouncedValue={setPositiveTags}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            props.onEnterPressed && props.onEnterPressed();
                        }
                    }}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
            <label>
                Excluded Tags
                <DebouncedTextField
                    type="text"
                    placeholder="Tags (negative, comma-separated)"
                    value={negativeTags}
                    setDebouncedValue={setNegativeTags}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            props.onEnterPressed && props.onEnterPressed();
                        }
                    }}
                    className="border rounded-lg p-1 w-full"
                />
            </label>
        </div>
    </>

}