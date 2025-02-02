import { useState, useEffect } from 'react';
import './App.css';

interface Image {
  id: string;
  path: string;
  tags: string[];
}

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [query, setQuery] = useState<string>('');
  const [images, setImages] = useState<Image[]>([]);
  const [imageDir, setImageDir] = useState<string>('');

  useEffect(() => {
    if (query) {
      fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setImages(data));
    }
  }, [query]);

  return (
    <div className="App">
      <h1>Image Search</h1>
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
      <input
        type="text"
        placeholder="Search images..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="image-grid">
        {images.map((img, index) => (
          <img
            key={index}
            src={`${API_BASE_URL}/api/thumbnail/${img.path}`}
            alt={img.path}
          />
        ))}
      </div>
    </div>
  );
}

export default App; 