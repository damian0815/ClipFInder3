import EmbeddingInputData from "@/Datatypes/EmbeddingInputData.tsx";
import React, {useState} from "react";
import EmbeddingInputs from "@/Components/EmbeddingInputs.tsx";


type ZeroShotClassificationQueryProps = {

}


function ZeroShotClassificationQuery(props: ZeroShotClassificationQueryProps) {

    const [classes, setClasses] = useState<EmbeddingInputData[]>([])

    const [, forceUpdate] = React.useReducer(x => x+1, 0)

    function setClassDefinition(index: number, input: EmbeddingInputData) {
        if (JSON.stringify(classes[index]) != JSON.stringify(input)) {
            classes[index] = input;
            console.log("updating class at ", index, "to", input);
        }
    }

    function addClass() {
        setClasses(classes.concat([new EmbeddingInputData()]));
    }

    function deleteClass(index: number) {
        setClasses(classes.slice(0, index).concat(classes.slice(index+1)))
    }

    return <>
        <ul>
            {classes.map((d, index) =>
                <li key={d.id}>
                    <p>{index}: {d.id} {d.texts}</p>
                    <EmbeddingInputs embeddingInput={d} setEmbeddingInput={v => {
                        setClassDefinition(index, v);
                    }}/>
                    <button onClick={() => deleteClass(index)}>x</button>
                </li>
            )}
        </ul>
        <button onClick={() => addClass()}>+</button>
        <p>zero shot classification goes here</p>
    </>


}

export default ZeroShotClassificationQuery;