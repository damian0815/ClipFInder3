import Image, {ResultImage} from "@/Components/Image.tsx";
import {
    TransformWrapper,
    TransformComponent,
    useTransformContext,
    useTransformComponent,
    KeepScale
} from "react-zoom-pan-pinch";
import {useState} from "react";


type ImageResults2DProps = {
    images: Array<Image>
    positions: Array<number[]>
    //onSelect: (selectedImages: Array<Image>) => void; // Callback to pass selected images to parent
}


function ImageResults2D(props: ImageResults2DProps) {

    return <div className="image-2d relative w-full aspect-square border border-gray-400">
        <TransformWrapper initialScale={0.5}>
            <TransformComponent
                wrapperStyle={{width: "100%", height: "100%"}}
                contentStyle={{width: "100%", height: "100%"}}
            >
                <ImageResults2DImages images={props.images} positions={props.positions} />
            </TransformComponent>
        </TransformWrapper>
    </div>

}

function ImageResults2DImages(props: ImageResults2DProps) {
    const [imageScale, setImageScale] = useState<number>(1)

    useTransformComponent(({state}) => {
        if (state.scale != imageScale) {
            setImageScale(state.scale)
            console.log("scale:", state.scale)
        }
    })

    return props.images.map((img, index) =>
        <div key={index}
                    className={"absolute rounded transform -translate-x-1/2 -translate-y-1/2"}
                    style={{
                        left: `${props.positions[index][0] * 100}%`,
                        top: `${props.positions[index][1] * 100}%`
                    }}
        >
            <KeepScale >
                <ResultImage
                    image={img}
                    isSelected={false}
                    onClick={(_) => {
                    }}
                />
            </KeepScale>
        </div>
    )
}


export default ImageResults2D