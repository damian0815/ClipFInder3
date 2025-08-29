import Image from "@/types/image";

interface MainStatusBarProps {
  selectedImages: Image[];
  thumbnailSizeIndex?: number;
  onThumbnailSizeChange?: (index: number) => void;
  gridHasFocus?: boolean;
  currentOffset?: number;
}

export default function MainStatusBar(props: MainStatusBarProps) {

  // Define Tailwind size options
  const sizeOptions = [
    { name: 'XS', class: 'w-16 h-16', minWidth: '4rem' },
    { name: 'SM', class: 'w-20 h-20', minWidth: '5rem' },
    { name: 'MD', class: 'w-32 h-32', minWidth: '8rem' },
    { name: 'LG', class: 'w-48 h-48', minWidth: '12rem' },
    { name: 'XL', class: 'w-64 h-64', minWidth: '16rem' },
    { name: '2XL', class: 'w-88 h-88', minWidth: '22rem' },
    { name: '3XL', class: 'w-112 h-112', minWidth: '28rem' },
    { name: '4XL', class: 'w-136 h-136', minWidth: '34rem' }
  ];

  const currentSize = sizeOptions[props.thumbnailSizeIndex ?? 2];


    function longestCommonPrefix(strs: string[]) {
     if (strs.length === 0) {
       return "";
     }
     let prefix = strs[0];
     for (let i = 1; i < strs.length; i++) {
       while (strs[i].indexOf(prefix) !== 0) {
         prefix = prefix.substring(0, prefix.length - 1);
         if (prefix === "") {
           return "";
         }
       }
     }
     return prefix;
   }

   function wrangleCommonPaths(images: Image[]) {
       const allPaths = images.map((i) => i.path);
       let commonRoot = longestCommonPrefix(allPaths);
       console.log('commonRoot is ', commonRoot, 'of allPaths', allPaths)
       const lastSlash = commonRoot.lastIndexOf("/");
       if (lastSlash == 0) {
           commonRoot = "/"
       } else if (lastSlash != -1) {
           commonRoot = commonRoot.substring(0, lastSlash);
       }
       return <div className={"common-paths"}>
           <div className={"filenames-list text-sm"}>{allPaths.map((p) => p.substring(commonRoot.length + 1)).join(", ")}</div>
           <div className={"text-xs"}>{allPaths.length} files selected in {commonRoot}</div>
       </div>
   }

    return <div className="status-bar flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-200">
        {/* Left side - selection info */}
        <div className="flex-1">
            {props.selectedImages.length > 0 && wrangleCommonPaths(props.selectedImages)}
        </div>
        
        {/* Right side - controls and status */}
        <div className="flex items-center gap-6 text-sm">
            {/* Grid focus status */}
            <div className="text-xs text-slate-500">
                {props.gridHasFocus ? (
                    <span className="text-blue-600">
                        Grid focused • Use arrow keys to navigate • Space for QuickLook
                    </span>
                ) : (
                    'Click on the grid to enable keyboard navigation'
                )}
            </div>
            
            {/* Current offset */}
            {props.currentOffset !== undefined && (
                <div className="text-xs text-slate-600">
                    Current offset: {props.currentOffset}
                </div>
            )}
            
            {/* Thumbnail size control */}
            {props.onThumbnailSizeChange && (
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-700">Size:</label>
                    <input
                        type="range"
                        min="0"
                        max={sizeOptions.length - 1}
                        value={props.thumbnailSizeIndex ?? 2}
                        onChange={(e) => props.onThumbnailSizeChange?.(Number(e.target.value))}
                        className="w-24"
                    />
                    <span className="text-xs text-slate-600 min-w-[2rem]">{currentSize.name}</span>
                </div>
            )}
        </div>
    </div>
}