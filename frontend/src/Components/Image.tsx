import {API_BASE_URL} from "@/Constants.tsx";
import {useState} from "react";

export default interface Image {
  id: string;
  path: string;
  distance: number|undefined
  tags: string[]|undefined
  order_key: number|number[]|undefined
}

export type ResultImageProps = {
  image: Image
  onClick: (image: Image) => void
  isSelected: boolean
    className?: string
}


export function ResultImage(props: ResultImageProps) {

  const [isHovered, setIsHovered] = useState<boolean>(false);

  return <img
      src={`${API_BASE_URL}/api/thumbnail/${props.image.id}`}
      alt={props.image.path}
      onClick={() => props.onClick(props.image)} // Handle click event
      style={{
        border: props.isSelected ? '2px solid blue' : 'none', // Highlight selected images
        //cursor: 'pointer'
        zIndex: isHovered ? '100000' : '0'
      }}
      className={props.className || ''}
      onMouseEnter={(_) => setIsHovered(true)}
      onMouseLeave={(_) => setIsHovered(false)}
  />
}

