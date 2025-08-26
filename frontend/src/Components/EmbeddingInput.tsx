import {useEffect, useState} from "react";
import DebouncedTextField from "@/Components/DebouncedTextField.tsx";
import {EmbeddingInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import useTraceUpdate from "@/Components/TraceUpdate.tsx";
import { CorpusImage } from "./Image";


type EmbeddingInputProps = {
    embeddingInput: EmbeddingInputData;
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

    return <div className={'w-35'}>
        {(props.embeddingInput.mode === 'tags' || props.embeddingInput.mode === 'text') && (
            <div className={"border rounded-lg p-4"}>
                <DebouncedTextField
                    value={value}
                    placeholder={props.embeddingInput.mode === 'tags' ? 'Enter tags (comma separated)...' : 'Enter text...'}
                    setDebouncedValue={(v) => setValue(v)} />
            </div>
        )}
        {(props.embeddingInput.mode === 'image') && (
            <div className={"border rounded-lg p-4"}>
                <CorpusImage id={props.id} />
            </div>
        )}
    </div>
}

export default EmbeddingInput;