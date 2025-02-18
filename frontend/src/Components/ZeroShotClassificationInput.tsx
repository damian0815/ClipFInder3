import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import CLIPEmbeddingInput from './CLIPEmbeddingInput.tsx';
import "../App.css"

type ZeroShotClassificationQueryInput = {
  classes: CLIPEmbeddingInput[];
};

const ZeroShotClassificationInput = () => {
  const [query, setQuery] = useState<ZeroShotClassificationQueryInput>({
    classes: [{ texts: [''] }]
  });

  const addClass = () => {
    setQuery({
      classes: [...query.classes, { texts: [''] }]
    });
  };

  const removeClass = (index: number) => {
    setQuery({
      classes: query.classes.filter((_, i) => i !== index)
    });
  };

  const updateClass = (index: number, newValue: CLIPEmbeddingInput) => {
    setQuery({
      classes: query.classes.map((cls, i) =>
        i === index ? newValue : cls
      )
    });
  };

  return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold underline">
          Hello world!
        </h1>
        {query.classes.map((clipInput, index) => (
          <div key={index} className="relative">

            <button
                onClick={() => removeClass(index)}
                className="absolute -right-10 top-2 p-2 text-gray-400 hover:text-red-500"
            >
              <Trash2 size={20}/>
            </button>
            <CLIPEmbeddingInput
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
