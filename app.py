# Backend (app.py)
import asyncio
import logging
import traceback
import threading
import uuid
import os
from math import floor
from typing import List, Literal, Optional
import send2trash

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel
import torch

from clip_finder_backend.clip_modelling import AutoloadingClipModel
from clip_finder_backend.progress_manager import ProgressManager
from clip_finder_backend.embedding_store import Query, SimpleClipEmbeddingStore
from clip_finder_backend.tasks import perform_search_task, perform_get_images_by_tags_task
from clip_finder_backend.thumbnail_provider import ThumbnailProvider
from clip_finder_backend.types import ZeroShotClassifyRequest, ImageResponse
from clip_finder_backend.zero_shot import do_zero_shot_classify
from clip_finder_backend.tags_wrangler import TagsWrangler

import torch.nn.functional as F

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
    progress_manager.add_connection(websocket, loop)

    try:
        # Keep the connection alive and handle any incoming messages
        while True:
            # You can add message handling here if needed
            #await websocket.receive_text()
            await asyncio.sleep(1)  # Keep the connection but don't block
    except WebSocketDisconnect:
        progress_manager.remove_connection(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        progress_manager.remove_connection(websocket)

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
    print(f'starting search - texts {query.texts}, {len(query.image_ids or [])} image ids, {len(query.embeddings or [])} raw embeddings, {query.sort_order}')

    def perform_search_task_from_thread():
        asyncio.run(
            perform_search_task(
                task_id, query,
                progress_manager=progress_manager,
                embedding_store=embedding_store)
        )
    await asyncio.to_thread(
        perform_search_task_from_thread
    )

    return TaskResponse(
        task_id=task_id,
        message="Search started. Use WebSocket to receive progress updates."
    )

@app.get("/api/moveToTrash/{id}")
async def move_image_to_trash(id: str):
    file_path = embedding_store.get_image_path_for_id(id)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {file_path}")
    try:
        send2trash.send2trash(file_path)
        embedding_store.remove_image(id)
        return {"message": f"Image {id} moved to trash successfully", "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move image to trash: {str(e)}")

@app.get("/api/image/{id}")
async def serve_image(id: str):
    file_path = embedding_store.get_image_path_for_id(id)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {file_path}")
    return FileResponse(file_path)

@app.delete("/api/image/{id}")
async def delete_image(id: str):
    """Delete an image from the filesystem"""
    try:
        # Get the file path for the image
        file_path = embedding_store.get_image_path_for_id(id)
        if not file_path:
            raise HTTPException(status_code=404, detail=f"Image with id {id} not found")

        # Check if the file exists
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail=f"Image file not found: {file_path}")

        embedding_store.remove_image(id)

        # Delete the file
        print("not deleting image because dry run:", file_path)
        # os.remove(file_path)

        return {"message": f"Image {id} deleted successfully", "path": file_path}

    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


class ImagesByTagsInput(BaseModel):
    tags: List[str]
    match_all: bool = False
    task_id: Optional[str] = None

@app.post("/api/images/by-tags")
async def get_images_by_tags(input: ImagesByTagsInput, background_tasks: BackgroundTasks):
    task_id = input.task_id or str(f'tags-by-images-{uuid.uuid4()}')
    def perform_get_images_by_tags_task_from_thread():
        asyncio.run(
            perform_get_images_by_tags_task(task_id=task_id, tags=input.tags,
            progress_manager=progress_manager, embedding_store=embedding_store, tags_wrangler=tags_wrangler)
        )
    await asyncio.to_thread(
        perform_get_images_by_tags_task_from_thread
    )
    return TaskResponse(
        task_id=task_id,
        message="Images by tags fetch started. Use WebSocket to receive progress updates."
    )

class GetEmbeddingsRequest(BaseModel):
    texts: list[str]|None = None
    image_ids: list[str] = None
    reduction: Literal['mean_norm', 'geometric_mean', 'mean_no_outliers', 'none'] = 'mean_norm'

@app.post("/api/embeddings")
async def get_embeddings(request: GetEmbeddingsRequest):
    all_embeddings = []
    if request.texts:
        text_embeddings = [embedding_store.get_text_embedding(t).unsqueeze(0) for t in request.texts]
        all_embeddings.extend(text_embeddings)
    if request.image_ids:
        paths = [embedding_store.get_image_path_for_id(id) for id in request.image_ids]
        _, image_embeddings = embedding_store.get_image_embeddings(paths)
        all_embeddings.append(image_embeddings)
    all_embeddings = torch.cat(all_embeddings, dim=0) if all_embeddings else torch.empty(0)

    if all_embeddings.shape[0] < 2 or request.reduction == 'none':
        result = all_embeddings
    elif request.reduction == 'mean_norm':
        mean = all_embeddings.mean(dim=0, keepdim=False) # shape: [emb_dim]
        result = mean / torch.norm(mean)
    #elif request.reduction == 'geometric_mean':
    #    mean = all_embeddings.log().mean(dim=0, keepdim=False).exp()
    #    result = mean / torch.norm(mean)
    elif request.reduction == 'mean_no_outliers':
        distance_matrix = all_embeddings @ all_embeddings.T
        coherence = distance_matrix.sum(dim=1)
        mean_coherence = coherence.mean()
        std_coherence = coherence.std()
        filtered = all_embeddings[coherence > (mean_coherence - std_coherence)]
        if len(filtered) == 0:
            # whoops, all were outliers
            coherence_sorted = torch.argsort(coherence)
            midpoint = floor(coherence_sorted.shape[0]/2)
            filtered = all_embeddings[midpoint:midpoint+1]
            mean = filtered.mean(dim=0, keepdim=False)
        else:
            mean = filtered.mean(dim=0, keepdim=False)
        result = mean / torch.norm(mean)
    elif request.reduction == 'none':
        result = all_embeddings
    else:
        raise HTTPException(status_code=400, detail=f"Unknown reduction method: {request.reduction}")
    
    return { 'embedding': result.cpu().tolist() }

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

@app.get("/api/cleanupMissing")
async def cleanup_missing_images():
    try:
        embedding_store.cleanup_missing_files()
        embedding_store.save()
    except Exception as e:
        logging.error(f"Error during cleanup: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
