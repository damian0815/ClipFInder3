import logging
import traceback

from clip_finder_backend.embedding_store import EmbeddingStore, Query
from clip_finder_backend.progress_manager import ProgressManager
from clip_finder_backend.tags_wrangler import TagsWrangler
from clip_finder_backend.types import ImageResponse


async def perform_search_task(task_id: str, query: Query, progress_manager: ProgressManager, embedding_store: EmbeddingStore):
    """Background task that performs the actual search and sends progress updates"""
    try:
        progress_manager.start_task(task_id, "Searching images...")

        # Perform the actual search
        def on_search_progress(progress: float, message: str=None):
            progress_manager.update_task_progress(task_id, progress*100, message=message)
        results = embedding_store.search_images(query=query, progress_callback=on_search_progress)

        # Validate results as before
        for r in results:
            if r.path != embedding_store.get_image_path_for_id(r.id):
                logging.warning(f"found image {r.path} doesn't match id {r.id} path {embedding_store.get_image_path_for_id(r.id)}")

        # Convert to response format
        search_results = [ImageResponse(id=r.id, path=r.path, distance=1-r.similarity)
                         for r in results]

        progress_manager.complete_task(task_id, "Search completed", data=search_results)

    except Exception as e:
        traceback.print_exc()
        logging.error(f"error during search: {repr(e)}")
        progress_manager.fail_task(task_id, f"Search failed", error_details=repr(e))



async def perform_get_images_by_tags_task(task_id: str, tags: list[str], progress_manager: ProgressManager, embedding_store: EmbeddingStore, tags_wrangler: TagsWrangler):
    """Background task that performs the actual images fetch and sends progress updates"""
    try:
        progress_manager.start_task(task_id, "Getting images by tags...")

        # Perform the actual search
        def on_get_images_progress(progress: float, message: str=None):
            progress_manager.update_task_progress(task_id, progress*100, message=message)

        image_paths = tags_wrangler.get_images_for_tags(tags, progress_callback=on_get_images_progress)
        image_ids = embedding_store.get_image_ids_for_paths(image_paths)

        progress_manager.complete_task(task_id, "Get images by tags complete", data=image_ids)

    except Exception as e:
        traceback.print_exc()
        logging.error(f"error during images by tags fetch: {repr(e)}")
        progress_manager.fail_task(task_id, f"Get images by tags failed", error_details=repr(e))

