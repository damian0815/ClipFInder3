import {useState} from "react";

import {API_BASE_URL} from "../Constants.tsx";

function PopulateDatabase() {
      const [imageDir, setImageDir] = useState<string>('');

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
            onClick={() => {
                if (!imageDir) {
                    alert('Please enter a valid image directory path');
                    return;
                }
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
                    });
            }}
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
