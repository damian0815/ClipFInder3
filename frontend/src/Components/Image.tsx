import {API_BASE_URL} from "@/Constants.tsx";
import {useState} from "react";
import {useSelectable} from "react-selectable-box";
import * as ContextMenu from "@radix-ui/react-context-menu";
//import { ContextMenu } from "radix-ui";

export default interface Image {
  id: string;
  path: string;
  distance: number|undefined
  tags: string[]|undefined
  order_key: number|number[]|undefined
}

export type ResultImageProps = {
  image: Image
  onClick: (event?: React.MouseEvent) => void
  onAddToQuery: (img: Image) => void
  onRevealInFinder: (img: Image) => void
  isSelected: boolean
  className?: string
}


export function ResultImage(props: ResultImageProps) {
    const { setNodeRef, isSelected, isAdding, isRemoving } = useSelectable({
        value: props.image,
    });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return <div
      ref={setNodeRef}
      className={"p-2"}
      style={{
            border: isAdding ? '1px solid blue' : (isRemoving ? '1px solid red' : '1px solid transparent'), // Highlight selected images
            background: isSelected ? '#1677ff40' : 'transparent',
            zIndex: isHovered ? '100000' : '0',
          }}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger className="ContextMenuTrigger">
          <div
            onClick={(event) => props.onClick(props.image, event)} // Handle click event with event object
            className={props.className || ''}
            onMouseEnter={(_) => setIsHovered(true)}
            onMouseLeave={(_) => setIsHovered(false)}
          >
            <CorpusImage
              id={props.image.id}
              alt={props.image.path}
            />
          </div>
          <ContextMenu.Content>
            <ContextMenu.Item onClick={() => props.onAddToQuery(props.image)}>
              Add to Query
            </ContextMenu.Item>
            <ContextMenu.Item onClick={() => props.onRevealInFinder(props.image)}>
              Reveal in Finder
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
      src={`${API_BASE_URL}/api/thumbnail/${id}`}
      alt={alt}
    />
  )
}
