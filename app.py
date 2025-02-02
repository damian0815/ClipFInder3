# Backend (app.py)
from flask import Flask, jsonify, send_file, request
from flask_cors import CORS
import os

from backend.mobile_clip_model import MobileClipModel
from backend.thumbnail_provider import ThumbnailProvider
from backend.weaviate_client import WeaviateClient

app = Flask(__name__)
CORS(app)

# Global variables for clients/providers
weaviate_client: WeaviateClient = None
thumbnail_provider: ThumbnailProvider = None

def init_app():
    global weaviate_client, thumbnail_provider
    if weaviate_client is not None:
        print('weaviate_client is already initialized')
        return
    try:
        weaviate_client = WeaviateClient(
            persistence_data_path="weaviate_data",
            clip_model=MobileClipModel()
        )
        thumbnail_provider = ThumbnailProvider()
    except Exception as e:
        print(f"Error initializing services: {e}")
        raise

# Initialize services
init_app()

@app.route('/api/search', methods=['GET'])
def search_images():
    query = request.args.get('q', '')
    results = weaviate_client.search_images(query)
    return jsonify(results)

@app.route('/api/image/<path:filename>')
def serve_image(filename):
    return send_file(f"images/{filename}")

@app.route('/api/populate', methods=['POST'])
def populate_database():
    image_dir = request.json.get('image_dir', 'images')
    
    # Verify directory exists
    if not os.path.isdir(image_dir):
        return jsonify({
            "error": f"Directory '{image_dir}' does not exist"
        }), 400
    
    result = weaviate_client.populate_from_directory(image_dir)
    return jsonify(result)

@app.route('/api/thumbnail/<path:filename>')
def serve_thumbnail(filename):
    try:
        original_path = os.path.join('images', filename)
        if not os.path.isfile(original_path):
            return jsonify({"error": "Image not found"}), 404
        
        thumbnail_path = thumbnail_provider.get_or_create_thumbnail(original_path)
        return send_file(thumbnail_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

