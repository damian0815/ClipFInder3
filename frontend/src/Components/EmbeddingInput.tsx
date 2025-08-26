import {useEffect, useState} from "react";
import DebouncedTextField from "@/Components/DebouncedTextField.tsx";
import {EmbeddingInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import useTraceUpdate from "@/Components/TraceUpdate.tsx";
import { CorpusImage } from "./Image";
import InputNumber from 'react-input-number';


type EmbeddingInputProps = {
    embeddingInput: EmbeddingInputData;
    onDeleteClicked: (_: any) => void;
    onQueryRequested: () => void;
}

function EmbeddingInput(props: EmbeddingInputProps) {

    useTraceUpdate(props);

    const [value, setValue] = useState<string>(props.embeddingInput.value)

    useEffect(() => {
        switch (props.embeddingInput.mode) {
            case 'text':
                props.embeddingInput.text = value;
                break;
            case 'image':
                props.embeddingInput.imageId = value;
                break;
            case 'tags':
                props.embeddingInput.tags = value.split(',');
                break;
        }
    }, [value])

    return <div className={'w-45'}>
        {(props.embeddingInput.mode === 'tags' || props.embeddingInput.mode === 'text') && (
            <div className={"border rounded-lg p-1 w-40"}>
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
                <button 
                    className={"btn btn-primary border rounded w-full mt-1"}
                    onClick={props.onQueryRequested}
                >
                    Query
                </button>
            </div>
        )}
        <div className="grid grid-flow-col grid-rows-1 grid-cols-3 items-center">
            <div className={"border h-6 mr-1"}>Weight:</div>
            <InputNumber
                className="border rounded-lg pr-1 mt-0"
                value={props.embeddingInput.weight}
                onChange={(value: number) => props.embeddingInput.weight = value}
                min={-5} max={5} step={0.1} />
            <button className={""} onClick={(_) => props.onDeleteClicked(props.embeddingInput.id)}>❌</button>
        </div>
    </div>
}

export default EmbeddingInput;