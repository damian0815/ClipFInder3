import {useEffect, useState} from "react";
import DebouncedTextField from "@/Components/DebouncedTextField.tsx";
import EmbeddingInputData from "@/Datatypes/EmbeddingInputData.tsx";
import useTraceUpdate from "@/Components/TraceUpdate.tsx";


type EmbeddingInputsProps = {
    id: string
    setEmbeddingInput: (value: EmbeddingInputData) => void;
}


function EmbeddingInputs(props: EmbeddingInputsProps) {

    useTraceUpdate(props);

    const [text, setText] = useState<string>('')

    useEffect(() => {
        const newData = new EmbeddingInputData(props.id);
        newData.texts = [text]
        props.setEmbeddingInput(newData)
    }, [text])

    //const [embeddingInputData, setEmbeddingInputData] = useState<EmbeddingInputData>(new EmbeddingInputData())

    return <>
        <div className={"border rounded-lg p-4"}>
            <DebouncedTextField value={text} setDebouncedValue={(v) => setText(v)} />
        </div>
    </>
}

export default EmbeddingInputs;