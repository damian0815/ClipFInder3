import json
import os
import asyncio
import concurrent.futures
import time
from typing import Callable, Optional

from tqdm.auto import tqdm

from osxmetadata import OSXMetaData, Tag, FINDER_COLOR_NONE

class TagsWrangler:

    def __init__(self, all_paths: list[str]):
        self.known_tags = _load_known_tags()
        self.all_paths = all_paths
        self.tag_to_image_cache: Optional[dict[str, list[str]]] = None

    def get_all_known_tags(self):
        return self.known_tags

    def get_tags_for_images(self, image_paths: list[str]) -> dict[str, list[str]]:
        return {p: self.get_tags(p) for p in image_paths}

    def get_images_for_tags(self, tags: list[str], progress_callback: Optional[Callable[[float, str], None]] = None) -> list[str]:
        if self.tag_to_image_cache is None:
            self._populate_tag_to_image_cache(progress_callback=lambda p: progress_callback(p, "Loading tags...") if progress_callback else None)
        paths = [p for p, file_tags in self.tag_to_image_cache.items()
                 if any(t in file_tags for t in tags)]
        if progress_callback is not None:
            progress_callback(1)
        return paths

    def get_tags(self, image_path: str) -> list[str]:
        md = OSXMetaData(image_path)
        return [t.name for t in md.tags]

    def add_tag(self, image_path, tag_name):
        md = OSXMetaData(image_path)
        if any(tag.name == tag_name for tag in md.tags):
            return False
        md.tags = md.tags + [Tag(name=tag_name, color=FINDER_COLOR_NONE)]
        if self.tag_to_image_cache is not None:
            self.tag_to_image_cache[image_path] = [t.name for t in md.tags]
        return True


    def remove_tag(self, image_path, tag_name):
        md = OSXMetaData(image_path)
        md.tags = [t for t in md.tags if t.name != tag_name]
        if self.tag_to_image_cache is not None:
            self.tag_to_image_cache[image_path] = [t.name for t in md.tags]


    def _populate_tag_to_image_cache(self, progress_callback: Optional[Callable[[float], None]] = None):
        self.tag_to_image_cache = {}
        if progress_callback:
            progress_callback(0)
        progress_interval = max(1, len(self.all_paths) // 100)
        for i, path in enumerate(tqdm(self.all_paths)):
            try:
                if os.path.exists(path):
                    tags = self.get_tags(path)
                    self.tag_to_image_cache[path] = tags
                    if i % progress_interval == 0 and progress_callback:
                        progress_callback(i / len(self.all_paths))
                        # Add a small delay to allow WebSocket messages to be sent
                        time.sleep(0.01)  # 10ms delay every 100 files
            except Exception as e:
                print(f"Error reading tags for {path}: {e}")
        if progress_callback:
            progress_callback(1)


def _load_known_tags() -> list[str]:
    known_tags_json = os.environ.get("CLIPFINDER_KNOWN_TAGS_JSON", None)
    if known_tags_json is None:
        raise RuntimeError("CLIPFINDER_KNOWN_TAGS_JSON is not set")
    if known_tags_json and os.path.exists(known_tags_json):
        try:
            with open(known_tags_json, 'r') as f:
                tags = json.load(f)
                return tags
        except Exception as e:
            print(f"Error loading known tags from {known_tags_json}: {e}")
    else:
        raise RuntimeError(f"No known tags JSON file found at {known_tags_json}")
    return []