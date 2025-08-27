import Image from "@/types/image";


export default function MainStatusBar(props: { selectedImages: Image[] }) {


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

    return <div className={"status-bar"}>
        {props.selectedImages.length > 0 && wrangleCommonPaths(props.selectedImages)}
    </div>
}