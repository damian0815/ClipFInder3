# Backend (app.py)
import logging
import traceback
from typing import List

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from clip_finder_backend.clip_modelling import AutoloadingClipModel

print("imported fastapi")

from pydantic import BaseModel
import os
from tags_wrangler import TagsWrangler

from clip_finder_backend.embedding_store import Query
print("imported backend.clip_embedding_store.Query")
from clip_finder_backend.embedding_store import SimpleClipEmbeddingStore
print("imported backend.simple_clip_embedding_store.SimpleClipEmbeddingStore")
from clip_finder_backend.thumbnail_provider import ThumbnailProvider

from fastapi import FastAPI, HTTPException

from clip_finder_backend.types import ZeroShotClassifyRequest, ImageResponse
from clip_finder_backend.zero_shot import do_zero_shot_classify

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

thumbnail_provider = ThumbnailProvider()
tags_wrangler = TagsWrangler()

print("making FastAPI")

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
async def search_images(q: str = "", pathContains: str = None):
    print(f'searching - "{q}"')
    try:
        query = Query.text_query(q)
        query.path_contains = pathContains
        results = embedding_store.search_images(query=query)
        return [ImageResponse(id=r.id, path=r.path, distance=1-r.similarity)
                for r in results]
    except Exception as e:
        traceback.print_exc()
        logging.error(f"error during search: {repr(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/image/{id}")
async def serve_image(id: str):
    file_path = embedding_store.get_image_path(id)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {file_path}")
    return FileResponse(file_path)


@app.post("/api/zero-shot-classify")
async def zero_shot_classify(request: ZeroShotClassifyRequest):
    logging.info(request)
    if request.is_empty:
        return
    return do_zero_shot_classify(request=request, embedding_provider=embedding_store)


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


class AddTagRequest(BaseModel):
    image_ids: list[str]
    tag_to_add: str


@app.post("/api/addTag")
async def add_tag(request: AddTagRequest):
    image_paths = [embedding_store.get_image_path(id) for id in request.image_ids]

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
    image_paths = [embedding_store.get_image_path(id) for id in request.image_ids]
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
    file_path = embedding_store.get_image_path(id)
    return {
        'image': id,
        'tags': tags_wrangler.get_tags(file_path)
    }


def _build_images_tags(image_ids: list[str]) -> dict[str, list[str]]:
    return [
        {'id': image_id, 'tags': tags_wrangler.get_tags(embedding_store.get_image_path(image_id))}
        for image_id in image_ids
    ]


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
