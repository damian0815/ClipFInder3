import {useEffect, useState} from 'react';
import { Plus, Trash2 } from 'lucide-react';
import CLIPEmbeddingInput from './CLIPEmbeddingInput.tsx';
import "../App.css"
import {EmbeddingInputData} from "@/Datatypes/EmbeddingInputData.tsx";
import { Button } from "@/Components/ui/Button.tsx";

export class ZeroShotClassificationInputData {
  classes: EmbeddingInputData[] = []
}

type ZeroShotClassificationInputProps = {
  initialQuery: ZeroShotClassificationInputData
  setQuery: (value: ZeroShotClassificationInputData) => void
}

export const ZeroShotClassificationInput = (props: ZeroShotClassificationInputProps) => {
  const [query, setQuery] = useState<ZeroShotClassificationInputData>(props.initialQuery);

  useEffect(() => {
    props.setQuery(query)
  }, [query]);

  const addClass = () => {
    setQuery({
      classes: [...query.classes, new EmbeddingInputData({
        id: getClassId(query.classes.length),
        text: ''
      })],
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
      <div className="space-y-4">
        {query.classes.map((clipInput, index) => (
          <div key={index} className="relative bg-white rounded-lg border border-slate-200 p-4">
            <Button
                onClick={() => removeClass(index)}
                variant="ghost"
                size="icon"
                className="absolute -right-2 -top-2 h-8 w-8 text-slate-400 hover:text-red-500"
            >
              <Trash2 size={16}/>
            </Button>
            <CLIPEmbeddingInput
                id={getClassId(index)}
                value={clipInput}
                onChange={(newValue) => updateClass(index, newValue)}
            />
          </div>
      ))}

        <Button
            onClick={addClass}
            variant="outline"
            className="w-full"
        >
          <Plus size={16} className="mr-2"/>
          Add Class
        </Button>
      </div>
  );
};

export default ZeroShotClassificationInput;
