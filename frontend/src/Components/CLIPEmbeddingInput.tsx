import { EmbeddingInputData } from "@/Datatypes/EmbeddingInputData.tsx";
import { Input } from "@/Components/ui/Input.tsx";

interface CLIPEmbeddingInputProps {
  id: string
  value: EmbeddingInputData;
  onChange: (value: EmbeddingInputData) => void;
  className?: string;
}

const CLIPEmbeddingInput = ({ id, value, onChange, className = '' }: CLIPEmbeddingInputProps) => {
  const handleValueChange = (newValue: string) => {
    const updatedValue = new EmbeddingInputData({
      id: value.id,
      text: value.mode === 'text' ? newValue : value.text,
      imageId: value.mode === 'image' ? newValue : value.imageId,
      tags: value.mode === 'tags' ? newValue.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : value.tags,
      weight: value.weight
    });
    onChange(updatedValue);
  };

  const getPlaceholder = () => {
    switch (value.mode) {
      case 'text':
        return 'Enter text...';
      case 'image':
        return 'Enter image ID...';
      case 'tags':
        return 'Enter tags (comma separated)...';
      default:
        return 'Enter value...';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={value.value}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={getPlaceholder()}
          className="flex-1"
        />
        <span className="text-xs text-slate-500 min-w-fit">
          Mode: {value.mode}
        </span>
      </div>
      
      {value.mode === 'text' && (
        <div className="text-xs text-slate-600">
          💡 Enter text to search for similar content
        </div>
      )}
      
      {value.mode === 'image' && (
        <div className="text-xs text-slate-600">
          💡 Enter an image ID to find similar images
        </div>
      )}
      
      {value.mode === 'tags' && (
        <div className="text-xs text-slate-600">
          💡 Enter tags separated by commas (e.g., "nature, landscape, mountains")
        </div>
      )}
    </div>
  );
};

export default CLIPEmbeddingInput;
