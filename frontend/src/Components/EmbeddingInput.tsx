import DebouncedTextField from "@/Components/DebouncedTextField.tsx";
import { CorpusImage } from "./ResultImage";
import { useEffect, useState } from "react";


type EmbeddingInputProps = {
    id: string;
    mode: 'text' | 'image' | 'tags';
    value: string;
    weight: number;
    imageId?: string;
    onValueChange: (value: string) => void;
    onWeightChange: (weight: number) => void;
    onDeleteClicked: (id: string) => void;
    onQueryRequested: () => void;
}

function EmbeddingInput(props: EmbeddingInputProps) {

    const [weightString, setWeightString] = useState<string>(props.weight.toString());

    function handleWeightChange(ev: React.ChangeEvent<HTMLInputElement>) {
        const newWeightString = (ev.target.value.match(/-?[0-9]*(\.[0-9]*)?$/))
        if (newWeightString) {
            setWeightString(ev.target.value);
            const newValue = Number(ev.target.value);
            if (!isNaN(newValue)) {
                props.onWeightChange(newValue);
            }
        }
    }

    useEffect(() => {
        setWeightString(props.weight.toString());
    }, [props.weight]);

    return <div className={'w-full'}>
        <div className={"text-center"}>
            <div className={"inline-block h-6 mr-1"}>Weight:</div>
            <input 
                type="text"
                inputMode="numeric"
                pattern="-?[0-9]*(\.[0-9]*)?"
                className="inline-block border rounded-lg pl-1 pr-1 mt-0 w-15"
                value={weightString}
                onChange={handleWeightChange}
                min={-5} max={5} step={0.1} 
                onKeyUp={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        props.onQueryRequested();
                    }
                }}
            />
            {props.weight}
            <div className={"inline-block ml-10 mr-2"}>{props.mode}</div>
            <button className={"inline-block"} 
                onClick={(_) => props.onDeleteClicked(props.id)}>❌</button>
        </div>
        {(props.mode === 'tags' || props.mode === 'text') && (
            <div className={"border rounded-lg p-1 w-full"}>
                <DebouncedTextField
                    value={props.value}
                    placeholder={props.mode === 'tags' ? 'Enter tags (comma separated)...' : 'Enter text...'}
                    setDebouncedValue={props.onValueChange}
                    onEnterPressed={props.onQueryRequested} />
            </div>
        )}
        {(props.mode === 'image') && (
            <div className={"border rounded-lg p-4"}>
                <CorpusImage id={props.imageId || ''} />
            </div>
        )}
    </div>
}

export default EmbeddingInput;