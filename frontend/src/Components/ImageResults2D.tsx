import Image, {ResultImage} from "@/Components/Image.tsx";


type ImageResults2DProps = {
    images: Array<Image>
    positions: Array<number[]>
    //onSelect: (selectedImages: Array<Image>) => void; // Callback to pass selected images to parent
}


function ImageResults2D(props: ImageResults2DProps) {


    return <div className="image-2d relative w-full aspect-square border border-gray-400">
        {props.images.map((img, index) =>
            <div key={index}
                 className={"absolute w-12 h-12 rounded transform -translate-x-1/2 -translate-y-1/2"}
                 style={{
                        left: `${props.positions[index][0] * 100}%`,
                        top: `${props.positions[index][1] * 100}%`,
                }}
            >
                <ResultImage
                    image={img}
                    isSelected={false}
                    onClick={(_) => {}}
                />
            </div>
        )}
    </div>

}


export default ImageResults2D