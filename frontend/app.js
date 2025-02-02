
// Frontend (App.js)
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (query) {
      fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setImages(data));
    }
  }, [query]);

  return (
    <div className="App">
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
            src={`http://localhost:5000/api/image/${img.filename}`}
            alt={img.filename}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
