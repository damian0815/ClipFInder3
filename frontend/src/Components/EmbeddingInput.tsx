import DebouncedTextField from "@/Components/DebouncedTextField.tsx";
import { CorpusImage } from "./ResultImage";


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
    return <div className={'w-full'}>
        <div className={"text-center"}>
            <div className={"inline-block h-6 mr-1"}>Weight:</div>
            <input 
                type='number'
                className="inline-block border rounded-lg pl-1 pr-1 mt-0 w-10"
                value={props.weight}
                onChange={(e) => props.onWeightChange(Number(e.target.value))}
                min={-5} max={5} step={0.1} 
                onKeyUp={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        props.onQueryRequested();
                    }
                }}
            />
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