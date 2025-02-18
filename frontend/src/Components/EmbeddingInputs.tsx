import {useEffect, useState} from "react";
import DebouncedTextField from "@/Components/DebouncedTextField.tsx";
import EmbeddingInputData from "@/Datatypes/EmbeddingInputData.tsx";
import useTraceUpdate from "@/Components/TraceUpdate.tsx";


type EmbeddingInputsProps = {
    embeddingInput: EmbeddingInputData;
    setEmbeddingInput: (value: EmbeddingInputData) => void;
}


function EmbeddingInputs(props: EmbeddingInputsProps) {

    useTraceUpdate(props);

    const [text, setText] = useState<string>('')

    useEffect(() => {
        if (props.embeddingInput && text !== props.embeddingInput.texts[0]) {
            setText(props.embeddingInput.texts[0])
        }
    }, [props.embeddingInput]);

    useEffect(() => {
        const newData = new EmbeddingInputData(props.embeddingInput?.id ?? undefined);
        newData.texts = [text]
        props.setEmbeddingInput(newData)
    }, [text])

    //const [embeddingInputData, setEmbeddingInputData] = useState<EmbeddingInputData>(new EmbeddingInputData())

    return <>
        <DebouncedTextField value={text} setDebouncedValue={(v) => setText(v)} />
    </>
}

export default EmbeddingInputs;