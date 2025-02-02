# Backend (app.py)
from flask import Flask, jsonify, send_file, request
import weaviate
from flask_cors import CORS
import os
from PIL import Image
import base64
from io import BytesIO

app = Flask(__name__)
CORS(app)

# Initialize Weaviate client
client = weaviate.connect_to_embedded(
    version="v1.26.5",
    persistence_data_path="weaviate_data",
    binary_path="weaviate"
)

@app.route('/api/search', methods=['GET'])
def search_images():
    query = request.args.get('q', '')
    
    # Search Weaviate for images matching query
    results = client.query.get(
        "Image", ["filename", "path"]
    ).with_near_text({
        "concepts": [query]
    }).do()

    return jsonify(results['data']['Get']['Image'])

@app.route('/api/image/<path:filename>')
def serve_image(filename):
    return send_file(f"images/{filename}")

@app.route('/api/populate', methods=['POST'])
def populate_database():
    # Check if Image class exists, if not create it
    if not client.schema.exists("Image"):
        class_obj = {
            "class": "Image",
            "vectorizer": "img2vec-neural",
            "moduleConfig": {
                "img2vec-neural": {
                    "imageFields": ["image"]
                }
            },
            "properties": [
                {
                    "name": "image",
                    "dataType": ["blob"]
                },
                {
                    "name": "filename",
                    "dataType": ["string"]
                },
                {
                    "name": "path",
                    "dataType": ["string"]
                }
            ]
        }
        client.schema.create_class(class_obj)

    # Get image directory from POST data, default to "images" if not provided
    image_dir = request.json.get('image_dir', 'images')
    added_count = 0
    
    # Verify directory exists
    if not os.path.isdir(image_dir):
        return jsonify({
            "error": f"Directory '{image_dir}' does not exist"
        }), 400
    
    # Supported image formats
    supported_formats = {'.jpg', '.jpeg', '.png', '.gif'}
    
    for filename in os.listdir(image_dir):
        if any(filename.lower().endswith(fmt) for fmt in supported_formats):
            file_path = os.path.join(image_dir, filename)
            
            try:
                # Check if image already exists in database
                existing = client.query.get(
                    "Image", ["filename"]
                ).with_where({
                    "path": ["path"],
                    "operator": "Equal",
                    "valueString": file_path
                }).do()

                if existing['data']['Get']['Image']:
                    continue

                # Open and convert image to base64
                with Image.open(file_path) as img:
                    buffer = BytesIO()
                    img.save(buffer, format=img.format)
                    image_base64 = base64.b64encode(buffer.getvalue()).decode()

                # Add to Weaviate
                client.data_object.create(
                    "Image",
                    {
                        "image": image_base64,
                        "filename": filename,
                        "path": file_path
                    }
                )
                added_count += 1
                
            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")
                continue

    return jsonify({
        "message": f"Successfully added {added_count} images to the database",
        "count": added_count
    })

if __name__ == '__main__':
    app.run(debug=True)

