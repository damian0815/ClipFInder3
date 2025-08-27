# Backend (app.py)
import asyncio
import logging
import traceback
import threading
import uuid
import os
from typing import List, Optional

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel

from clip_finder_backend.clip_modelling import AutoloadingClipModel
from clip_finder_backend.progress_manager import ProgressManager
from clip_finder_backend.embedding_store import Query, SimpleClipEmbeddingStore
from clip_finder_backend.tasks import perform_search_task, perform_get_images_by_tags_task
from clip_finder_backend.thumbnail_provider import ThumbnailProvider
from clip_finder_backend.types import ZeroShotClassifyRequest, ImageResponse
from clip_finder_backend.zero_shot import do_zero_shot_classify
from clip_finder_backend.tags_wrangler import TagsWrangler

logging.basicConfig(level=logging.DEBUG,
                    format="%(asctime)s | %(levelname)-8s | "
                           "%(module)s:%(funcName)s:%(lineno)d - %(message)s")
logger = logging.getLogger(__name__)

print("making embedding store")

def load_model():
    if os.environ.get("CLIPFINDER_USE_MOCK_CLIP_MODEL", "0") == "1":
        print("using mock clip model because CLIPFINDER_USE_MOCK_CLIP_MODEL=1")
        from clip_finder_backend.mock_clip_model import MockClipModel
        return MockClipModel()

    model_type = os.environ.get("CLIPFINDER_CLIP_MODEL_TYPE", "MobileCLIP-S1")
    pretrained = os.environ.get("CLIPFINDER_CLIP_MODEL_PRETRAINED", "datacompdr")
    weights_pt_path = os.environ.get("CLIPFINDER_CLIP_MODEL_WEIGHTS_PT_PATH", None)
    print("loading model:", model_type, "pretrained:", pretrained, "custom weights:", weights_pt_path)
    print("Set env vars CLIPFINDER_CLIP_MODEL_TYPE, CLIPFINDER_CLIP_MODEL_PRETRAINED, CLIPFINDER_CLIP_MODEL_WEIGHTS_PT_PATH to change")
    from clip_finder_backend.clip_modelling import ClipModel
    return ClipModel(clip_name=model_type, pretrained=pretrained, weights_pt_path=weights_pt_path).load_model()


def load_embedding_store():
    store_file = os.environ.get("CLIPFINDER_CLIP_MODEL_STORE_FILE", None)
    if store_file is None:
        raise RuntimeError("env var CLIPFINDER_CLIP_MODEL_STORE_FILE must point to a path to load the embedding store")

    print(f"loading existing embedding store from {store_file}")
    clip_model = AutoloadingClipModel(load_model=load_model)
    return SimpleClipEmbeddingStore(clip_model=clip_model, store_file=store_file, store_device='mps')
embedding_store = load_embedding_store()

print("making thumbnail provider")

progress_manager = ProgressManager()
thumbnail_provider = ThumbnailProvider()
tags_wrangler = TagsWrangler(embedding_store.image_paths)

print("making FastAPI")

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8080",
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket endpoint for progress updates
@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    loop = asyncio.get_event_loop()
    await progress_manager.add_connection(websocket, loop)

    try:
        # Keep the connection alive and handle any incoming messages
        while True:
            # You can add message handling here if needed
            #await websocket.receive_text()
            await asyncio.sleep(1)  # Keep the connection but don't block
    except WebSocketDisconnect:
        await progress_manager.remove_connection(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await progress_manager.remove_connection(websocket)

@app.on_event("startup")
async def startup_event():
    """Start the progress manager when the FastAPI app starts"""
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop the progress manager when the FastAPI app shuts down"""
    logger.info("Application shutdown complete")


class TaskResponse(BaseModel):
    task_id: str
    message: str

class SearchRequest(BaseModel):
    task_id: str
    query: Query

@app.post("/api/search", response_model=TaskResponse)
async def search_images(search_params: SearchRequest, background_tasks: BackgroundTasks):
    query = search_params.query
    task_id = search_params.task_id
    print(f'starting search - "{query}"')

    # Add the search task to background tasks
    background_tasks.add_task(perform_search_task, task_id, query,
                              progress_manager=progress_manager, embedding_store=embedding_store)

    return TaskResponse(
        task_id=task_id,
        message="Search started. Use WebSocket to receive progress updates."
    )


@app.get("/api/image/{id}")
async def serve_image(id: str):
    file_path = embedding_store.get_image_path_for_id(id)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {file_path}")
    return FileResponse(file_path)

class ImagesByTagsInput(BaseModel):
    tags: List[str]
    match_all: bool = False
    task_id: Optional[str] = None

@app.post("/api/images/by-tags")
async def get_images_by_tags(input: ImagesByTagsInput, background_tasks: BackgroundTasks):
    task_id = input.task_id or str(f'tags-by-images-{uuid.uuid4()}')
    background_tasks.add_task(
        perform_get_images_by_tags_task, task_id=task_id, tags=input.tags,
        progress_manager=progress_manager, embedding_store=embedding_store, tags_wrangler=tags_wrangler
    )
    return TaskResponse(
        task_id=task_id,
        message="Images by tags fetch started. Use WebSocket to receive progress updates."
    )

@app.post("/api/zero-shot-classify")
async def zero_shot_classify(request: ZeroShotClassifyRequest):
    logging.info(request)
    if request.is_empty:
        return
    return do_zero_shot_classify(request=request, embedding_provider=embedding_store)


class AddTagRequest(BaseModel):
    image_ids: list[str]
    tag_to_add: str


@app.post("/api/addTag")
async def add_tag(request: AddTagRequest):
    image_paths = [embedding_store.get_image_path_for_id(id) for id in request.image_ids]

    errors = []
    for image_path in image_paths:
        try:
            tags_wrangler.add_tag(image_path, request.tag_to_add)
        except Exception as e:
            errors.append(e)
    return {
        'images_tags': _build_images_tags(request.image_ids),
        'errors': [str(e) for e in errors],
        'message': f'added {request.tag_to_add}' + (f' ({len(errors)} errors)' if errors else '')}


class DeleteTagRequest(BaseModel):
    image_ids: list[str]
    tag_to_delete: str


@app.post("/api/deleteTag")
async def delete_tag(request: DeleteTagRequest):
    image_paths = [embedding_store.get_image_path_for_id(id) for id in request.image_ids]
    errors = []
    for image_path in image_paths:
        try:
            tags_wrangler.remove_tag(image_path, request.tag_to_delete)
        except Exception as e:
            errors.append(e)
    return {
        'images_tags': _build_images_tags(request.image_ids),
        'errors': errors,
        'message': f'deleted {request.tag_to_delete}' + (f' ({len(errors)} errors)' if errors else '')}


@app.get("/api/tags/{id}")
async def serve_tags(id: str):
    logging.info(f"fetching tags for {id}")
    file_path = embedding_store.get_image_path_for_id(id)
    return {
        'image': id,
        'tags': tags_wrangler.get_tags(file_path)
    }

@app.get("/api/allKnownTags")
async def serve_all_known_tags():
    return {
        'all_known_tags': tags_wrangler.get_all_known_tags()
    }

@app.get('/api/revealInFinder/{id}')
async def handle_reveal_in_finder(id: str):
    import subprocess
    file_path = embedding_store.get_image_path_for_id(id)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {file_path}")

    try:
        subprocess.run(['open', '-R', file_path], check=True)
    except subprocess.CalledProcessError as e:
        logging.error(f"Error revealing file in Finder: {e}")
        raise HTTPException(status_code=500, detail="Failed to reveal file in Finder")

    return {'message': f'Revealed {file_path} in Finder'}


def _build_images_tags(image_ids: list[str]) -> dict[str, list[str]]:
    return {
        image_id: tags_wrangler.get_tags(embedding_store.get_image_path_for_id(image_id))
        for image_id in image_ids
    }

@app.get("api/allKnownTags")
async def serve_all_known_tags():
    return {
        'all_known_tags': tags_wrangler.get_all_known_tags()
    }

@app.get("/api/thumbnail/{id}")
async def serve_thumbnail(id: str):
    original_path = embedding_store.get_image_path_for_id(id)
    if not os.path.isfile(original_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {original_path}")

    thumbnail_path = thumbnail_provider.get_or_create_thumbnail(original_path)
    return FileResponse(thumbnail_path)


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
