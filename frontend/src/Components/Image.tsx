import {API_BASE_URL} from "@/Constants.tsx";
import {useState} from "react";
import {useSelectable} from "react-selectable-box";

export default interface Image {
  id: string;
  path: string;
  distance: number|undefined
  tags: string[]|undefined
  order_key: number|number[]|undefined
}

export type ResultImageProps = {
  image: Image
  onClick: (image: Image, event?: React.MouseEvent) => void
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
            background: isSelected ? '#1677ff40' : 'transparent', // More saturated blue with increased opacity
            zIndex: isHovered ? '100000' : '0',
          }}
    >
        <img
          src={`${API_BASE_URL}/api/thumbnail/${props.image.id}`}
          alt={props.image.path}
          onClick={(event) => props.onClick(props.image, event)} // Handle click event with event object
          className={props.className || ''}
          onMouseEnter={(_) => setIsHovered(true)}
          onMouseLeave={(_) => setIsHovered(false)}
      />
  </div>
}

