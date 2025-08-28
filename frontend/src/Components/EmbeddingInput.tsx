import {useEffect, useState} from "react";
import DebouncedTextField from "@/Components/DebouncedTextField.tsx";
import {EmbeddingInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import useTraceUpdate from "@/Components/TraceUpdate.tsx";
import { CorpusImage } from "./ResultImage";
import InputNumber from 'react-input-number';


type EmbeddingInputProps = {
    embeddingInput: EmbeddingInputData;
    onDeleteClicked: (_: any) => void;
    onQueryRequested: () => void;
}

function EmbeddingInput(props: EmbeddingInputProps) {

    //useTraceUpdate(props);

    const [value, setValue] = useState<string>(props.embeddingInput.value)

    useEffect(() => {
        props.embeddingInput.value = value
    }, [value])

    return <div className={'w-full'}>
        {(props.embeddingInput.mode === 'tags' || props.embeddingInput.mode === 'text') && (
            <div className={"border rounded-lg p-1 w-full"}>
                <DebouncedTextField
                    value={value}
                    placeholder={props.embeddingInput.mode === 'tags' ? 'Enter tags (comma separated)...' : 'Enter text...'}
                    setDebouncedValue={(v) => setValue(v)}
                    onEnterPressed={props.onQueryRequested} />
            </div>
        )}
        {(props.embeddingInput.mode === 'image') && (
            <div className={"border rounded-lg p-4"}>
                <CorpusImage id={props.embeddingInput.imageId || ''} />
            </div>
        )}
        <div className={"text-right"}>
            <div className={"inline-block h-6 mr-1"}>Weight:</div>
            <InputNumber
                className="inline-block border rounded-lg pl-1 pr-1 mt-0 w-10"
                value={props.embeddingInput.weight}
                onChange={(value: number) => props.embeddingInput.weight = value}
                min={-5} max={5} step={0.1} 
                onKeyUp={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        props.onQueryRequested();
                    }
                }}
            />
            <button className={"inline-block pl-10"} onClick={(_) => props.onDeleteClicked(props.embeddingInput.id)}>❌</button>
        </div>
    </div>
}

export default EmbeddingInput;