# Backend (app.py)
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import os

from backend.clip_embedding_provider import ClipEmbeddingStoreSimple, Query
from backend.mobile_clip_model import MobileClipModel
from backend.thumbnail_provider import ThumbnailProvider
from backend.weaviate_client import WeaviateClient

from contextlib import asynccontextmanager
from fastapi import FastAPI

logging.basicConfig(level=logging.DEBUG,
                    format="%(asctime)s | %(levelname)-8s | "
                           "%(module)s:%(funcName)s:%(lineno)d - %(message)s")
logger = logging.getLogger(__name__)

embedding_store = ClipEmbeddingStoreSimple(clip_model=MobileClipModel().load_model(),
                                           store_file='dev_embedding_store_simple.pt')

thumbnail_provider = ThumbnailProvider()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/search")
async def search_images(q: str = ""):
    print(f'searching - "{q}"')
    query = Query.text_query(q)
    results = embedding_store.search_images(query=query)
    return [{
        'id': r.id,
        'path': r.path,
        'distance': r.distance,
        'tags': []
    } for r in results]

@app.get("/api/image/{file_path:path}")
async def serve_image(file_path: str):
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

class PopulateRequest(BaseModel):
    image_dir: str = "images"

@app.post("/api/populate")
async def populate_database(request: PopulateRequest):
    # Verify directory exists
    if not os.path.isdir(request.image_dir):
        raise HTTPException(
            status_code=400, 
            detail=f"Directory '{request.image_dir}' does not exist"
        )
    logger.info(f"populating database from directory {request.image_dir}")
    num_images_added = embedding_store.add_images_recursively(request.image_dir)
    logger.info(f"populating done returned")
    return {'message': f'added {num_images_added} images to embedding store'}

@app.get("/api/thumbnail/{filename:path}")
async def serve_thumbnail(filename: str):
    try:
        original_path = os.path.join('images', filename)
        if not os.path.isfile(original_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        thumbnail_path = thumbnail_provider.get_or_create_thumbnail(original_path)
        return FileResponse(thumbnail_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

