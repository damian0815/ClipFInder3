import {API_BASE_URL} from "@/Constants.tsx";
import {useSelectable} from "react-selectable-box";
import * as ContextMenu from "@radix-ui/react-context-menu";
import Image from "@/types/image";
import { useTagMerge } from "@/contexts/TagMergeContext";

export type ResultImageProps = {
  image: Image;
  onClick: (event: React.MouseEvent, image: Image) => void;
  onAddToQuery: (img: Image) => void;
  onRevealInFinder: (img: Image) => void;
  isSelected: boolean;
  className?: string;
};

export function ResultImage(props: ResultImageProps) {
  const { setNodeRef, isSelected, isAdding, isRemoving } = useSelectable({
      value: props.image,
  });

  const { 
    setMergeSource, 
    mergeTagsTo, 
    isMergeSource, 
    isMergeToDisabled, 
    mergeSourceTagCount 
  } = useTagMerge();

  const handleMergeTagsFrom = () => {
    setMergeSource(props.image);
  };

  const handleMergeTagsTo = () => {
    mergeTagsTo(props.image);
  };

  return <div
      ref={setNodeRef}
      className={"p-2"}
      style={{
            border: isAdding ? '1px solid blue' : (isRemoving ? '1px solid red' : '1px solid transparent'), // Highlight selected images
            background: isSelected ? '#1677ff40' : 'transparent'
      }}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger className="ContextMenuTrigger">
          <div
            onClick={(event) => props.onClick(event, props.image)} // Handle click event with event object
            className={props.className || ''}
          >
            <CorpusImage
              id={props.image.id}
              alt={props.image.path}
            />
          </div>
          <ContextMenu.Content className="bg-gray-100 border border-gray-300 rounded-md shadow-lg p-1 min-w-[140px]">
            <ContextMenu.Item
              className="px-3 py-2 text-sm hover:bg-blue-100 rounded cursor-pointer"
              onClick={() => props.onAddToQuery(props.image)}
            >
              Add to Query
            </ContextMenu.Item>
            <ContextMenu.Item
              className="px-3 py-2 text-sm hover:bg-blue-100 rounded cursor-pointer"
              onClick={() => props.onRevealInFinder(props.image)}
            >
              Reveal in Finder
            </ContextMenu.Item>
            <ContextMenu.Separator className="h-px bg-gray-300 my-1" />
            <ContextMenu.Item
              className="px-3 py-2 text-sm hover:bg-blue-100 rounded cursor-pointer"
              onClick={handleMergeTagsFrom}
            >
              Merge Tags From
              {isMergeSource(props.image) && (
                <span className="ml-2 text-xs text-blue-600">✓</span>
              )}
            </ContextMenu.Item>
            <ContextMenu.Item
              className={`px-3 py-2 text-sm rounded ${
                isMergeToDisabled(props.image) 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'hover:bg-blue-100 cursor-pointer'
              }`}
              onClick={handleMergeTagsTo}
              disabled={isMergeToDisabled(props.image)}
            >
              Merge Tags To & delete From
              {mergeSourceTagCount !== undefined && (
                <span className="ml-2 text-xs text-gray-500">({mergeSourceTagCount} tags)</span>
              )}
            </ContextMenu.Item>
          </ContextMenu.Content>
			  </ContextMenu.Trigger>
		  </ContextMenu.Root>

  </div>
}

export function CorpusImage({id, alt=''}: {
  id: string,
  alt?: string
} ) {
  return (
    <img
        className={"h-full w-full"}
      src={`${API_BASE_URL}/api/thumbnail/${id}`}
      alt={alt}
    />
  )
}
