import {useState} from "react";
import {API_BASE_URL} from "../Constants.tsx";
import TestProgress from "./TestProgress.tsx";
import { Button } from "@/Components/ui/Button.tsx";
import { Input } from "@/Components/ui/Input.tsx";

function PopulateDatabase() {
    const [imageDir, setImageDir] = useState<string>('');
    const [isPopulating, setIsPopulating] = useState<boolean>(false)

    function populateDatabase() {
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
    }

    return (
        <div className="space-y-4">
            <Input
                type="text"
                placeholder="Image directory path..."
                value={imageDir}
                onChange={(e) => setImageDir(e.target.value)}
                className="w-full"
            />
            <Button
                onClick={populateDatabase}
                disabled={isPopulating}
                className="w-full"
            >
                {isPopulating ? 'Populating...' : 'Populate Database'}
            </Button>
            <TestProgress />
        </div>
    );


}

export default PopulateDatabase
