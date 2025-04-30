# Backend (app.py)
import asyncio
import logging
from fastapi import FastAPI, HTTPException, WebSocket

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

from starlette.websockets import WebSocketDisconnect

from backend.progress_websocket.progress_broadcaster import ProgressBroadcaster
from tags_wrangler import TagsWrangler

print("imported fastapi")

from backend.embedding_store import Query
print("imported backend.embedding_store.Query")
from backend.simple_clip_embedding_store import SimpleClipEmbeddingStore
print("imported backend.simple_clip_embedding_store.SimpleClipEmbeddingStore")
from backend.thumbnail_provider import ThumbnailProvider
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

from backend.types import ZeroShotClassifyRequest, ImageResponse
from backend.zero_shot import do_zero_shot_classify

logging.basicConfig(level=logging.DEBUG,
                    format="%(asctime)s | %(levelname)-8s | "
                           "%(module)s:%(funcName)s:%(lineno)d - %(message)s")
logger = logging.getLogger(__name__)
loop = asyncio.get_event_loop()

print("making embedding store")

async def load_mobile_clip_model():
    progress_label = 'Loading CLIP model'
    ProgressBroadcaster.instance().send_progress(progress_label, 0)
    def lambda_like():
        ProgressBroadcaster.instance().send_progress(progress_label, 0.01)
        print('importing stuff')
        from backend.mobile_clip_model import MobileClipModel
        ProgressBroadcaster.instance().send_progress(progress_label, 0.2)
        print('loading model')
        return MobileClipModel().load_model(progress_label=progress_label)
        #from backend.mock_clip_model import MockClipModel
        #return MockClipModel()
    executor = ThreadPoolExecutor()
    model = await loop.run_in_executor(executor, lambda_like)
    ProgressBroadcaster.instance().send_progress(progress_label, 1)
    return model


def load_mock_model():
    from backend.mock_clip_model import MockClipModel
    return MockClipModel()

embedding_store = SimpleClipEmbeddingStore(load_model=load_mobile_clip_model,
                                           store_file='dev_embedding_store_simple.pt',
                                           repair_store_file_case=True)
print("making thumbnail provider")

thumbnail_provider = ThumbnailProvider()
tags_wrangler = TagsWrangler()
progress_broadcaster = ProgressBroadcaster()

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
    progress_broadcaster.send_progress('search', 0)
    query = Query.text_query(q, path_contains=pathContains)
    results = await embedding_store.search_images(query=query)
    return [ImageResponse(id=r.id, path=r.path, distance=r.distance)
            for r in results]



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

    async def lambda_like():
        return await embedding_store.add_images_recursively(
            request.image_dir
        )
    num_images_added = await lambda_like()
    #num_images_added = await loop.run_in_executor(executor, lambda_like)

    logger.info(f"populating database done")
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
    original_path = embedding_store.get_image_path(id)
    if not os.path.isfile(original_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {original_path}")

    thumbnail_path = thumbnail_provider.get_or_create_thumbnail(original_path)
    return FileResponse(thumbnail_path)


@app.get("/api/testwebsockets")
async def test_websockets():
    for c in range(100):
        ProgressBroadcaster.instance().send_progress("testwebsockets", c/100)
        await asyncio.sleep(0.2)


#@app.on_event("startup")
#async def startup_event():
#    # This spawns a background task that won't block the server
#    await asyncio.create_task(progress_broadcaster.run_broadcast_queue_loop())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logging.info("websocket endpoint hit")
    await progress_broadcaster.connect(websocket)
    try:
        # Keep connection open and wait for disconnect
        while True:
            logging.info("ws endpoint awaiting receive")
            # Optional: implement timeout for stale connections
            try:
                # Short timeout t   o check connection health periodically
                received_text = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                print(f"ws endpoint {websocket} received '{received_text.strip()}'")
                await asyncio.wait_for(websocket.send_text(f"hi you sent '{received_text.strip()}'"), timeout=30)
            except asyncio.TimeoutError:
                # Optional: send ping to verify connection
                await websocket.send_json({"type": "ping"})
                continue
    except WebSocketDisconnect:
        logging.info(f"ws endpoint {websocket} disconnect")
        progress_broadcaster.disconnect(websocket)
    finally:
        # Ensure cleanup happens
        logging.info(f"ws endpoint {websocket} finally (done)")
        if websocket in progress_broadcaster.active_connections:
            progress_broadcaster.disconnect(websocket)


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
