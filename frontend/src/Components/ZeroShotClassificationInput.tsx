import {useEffect, useState} from 'react';
import { Plus, Trash2 } from 'lucide-react';
import CLIPEmbeddingInput from './CLIPEmbeddingInput.tsx';
import "../App.css"
import EmbeddingInputData from "@/Datatypes/EmbeddingInputData.tsx";

export class ZeroShotClassificationQueryInput {
  classes: EmbeddingInputData[] = []
}

type ZeroShotClassificationInputProps = {
  initialQuery: ZeroShotClassificationQueryInput
  setQuery: (value: ZeroShotClassificationQueryInput) => void
}

export const ZeroShotClassificationInput = (props: ZeroShotClassificationInputProps) => {
  const [query, setQuery] = useState<ZeroShotClassificationQueryInput>(props.initialQuery);

  useEffect(() => {
    props.setQuery(query)
  }, [query]);

  const addClass = () => {
    setQuery({
      classes: [...query.classes, {
        id: getClassId(query.classes.length),
        texts: ['']
      }]
    });
  };

  function getClassId(index: number): string {
    return "cls_" + index.toString().padStart(2, "0")
  }

  const removeClass = (index: number) => {
    const newClasses = query.classes.filter((_, i) => i !== index);
    for (var i=index; i<newClasses.length; i++) {
      newClasses[i].id = getClassId(i)
    }
    setQuery({
      classes: newClasses
    });
  };

  const updateClass = (index: number, newValue: EmbeddingInputData) => {
    setQuery({
      classes: query.classes.map((cls, i) =>
        i === index ? newValue : cls
      )
    });
  };

  return (
      <div className="space-y-4 w-19/20">
        {query.classes.map((clipInput, index) => (
          <div key={index} className="relative">
            <button
                onClick={() => removeClass(index)}
                className="absolute -right-10 top-2 p-2 text-gray-400 hover:text-red-500"
            >
              <Trash2 size={20}/>
            </button>
            <CLIPEmbeddingInput
                id={getClassId(index)}
                value={clipInput}
                onChange={(newValue) => updateClass(index, newValue)}
            />
          </div>
      ))}

        <button
            onClick={addClass}
            className="w-full px-4 py-2 border rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <Plus size={20} className="mr-2"/>
          Add Class
        </button>
      </div>
  );
};

export default ZeroShotClassificationInput;
