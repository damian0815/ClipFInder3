import {useEffect, useRef, useState} from "react";

import {API_BASE_URL} from "../Constants.tsx";
import {longestCommonPrefix} from "@/Utils.tsx";

function PopulateDatabase() {
    const [imageDir, setImageDir] = useState<string>('');
    const [isPopulating, setIsPopulating] = useState<boolean>(false)

    // 1. declare your ref
    const directoryRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (directoryRef.current !== null) {
            // 2. set attribute as JS does
            directoryRef.current.setAttribute("directory", "");
            directoryRef.current.setAttribute("webkitdirectory", "");
        }
    // 3. monitor change of your ref with useEffect
    }, [directoryRef]);

    function populateDatabase() {
        (async () => {
            if (!imageDir) {
                alert('Please enter a valid image directory path');
                return;
            }
            setIsPopulating(true);
            fetch(`${API_BASE_URL}/api/populate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image_dir: imageDir
                })
            })
                .then(res => res.json())
                .then(data => {
                    alert(`${data.message}`);
                })
                .catch(err => {
                    alert(`Error populating database: ${err}`);
                })
                .finally(() => {
                    setIsPopulating(false);
                })
        })()
    }

    return <>
        <input
            type="text"
            placeholder="Image directory path..."
            value={imageDir}
            onChange={(e) => setImageDir(e.target.value)}
            style={{
                padding: '8px',
                marginBottom: '10px',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                width: '100%'
            }}
        />

        <button
            onClick={populateDatabase}
            disabled={isPopulating}
            style={{
                padding: '8px 16px',
                marginBottom: '20px',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                cursor: 'pointer'
            }}
        >
            Populate Database
        </button>
    </>


}

export default PopulateDatabase
