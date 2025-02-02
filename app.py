# Backend (app.py)
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import os

from backend.mobile_clip_model import MobileClipModel
from backend.thumbnail_provider import ThumbnailProvider
from backend.weaviate_client import WeaviateClient

from contextlib import asynccontextmanager
from fastapi import FastAPI

logger = logging.getLogger(__name__)

weaviate_client = WeaviateClient(
            persistence_data_path="weaviate_data",
            clip_model=MobileClipModel()
        )
thumbnail_provider = ThumbnailProvider()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("connecting to weaviate client")
    await weaviate_client.client.connect()
    yield
    logger.info("closing weaviate client")
    await weaviate_client.client.close()

app = FastAPI(lifespan=lifespan)

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
    results = weaviate_client.search_images(q)
    return results

@app.get("/api/image/{filename:path}")
async def serve_image(filename: str):
    file_path = f"images/{filename}"
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
    
    result = weaviate_client.populate_from_directory(request.image_dir)
    return result

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
    uvicorn.run(app, host="0.0.0.0", port=5000)

