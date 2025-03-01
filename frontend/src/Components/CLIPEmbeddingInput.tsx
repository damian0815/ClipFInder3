import { Plus, Trash2 } from 'lucide-react';
import EmbeddingInputData from "@/Datatypes/EmbeddingInputData.tsx";

interface CLIPEmbeddingInputProps {
  value: EmbeddingInputData;
  onChange: (value: EmbeddingInputData) => void;
  className?: string;
}

const CLIPEmbeddingInput = ({ value, onChange, className = '' }: CLIPEmbeddingInputProps) => {
  const addText = () => {
    onChange({
      texts: [...value.texts, '']
    });
  };

  const removeText = (index: number) => {
    const newTexts = value.texts.filter((_, i) => i !== index);
    onChange({ texts: newTexts });
  };

  const updateText = (index: number, newText: string) => {
    const newTexts = value.texts.map((text, i) =>
      i === index ? newText : text
    );
    onChange({ texts: newTexts });
  };

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <div className="flex space-y-0">
        {value.texts.map((text, index) => (
          <div key={index} className="flex items-center gap-0">
            {/*<GripVertical className="text-gray-400" size={20} />*/}
            <input
              type="text"
              value={text}
              onChange={(e) => updateText(index, e.target.value)}
              placeholder="Enter text..."
              className="flex-1 h-11 px-3 py-2 border rounded-md"
            />
            <button
              onClick={() => removeText(index)}
              className="p-2 mr-3 text-gray-400 hover:text-red-500"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}

        <button
          onClick={addText}
          className="px-4 h-11 py-2 border rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <Plus size={20} className="mr-2" />
          Add Text
        </button>
      </div>
    </div>
  );
};

export default CLIPEmbeddingInput;
