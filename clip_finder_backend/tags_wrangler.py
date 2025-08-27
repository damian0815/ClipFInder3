import json
import os
from typing import Callable

from tqdm.auto import tqdm

from osxmetadata import OSXMetaData, Tag, FINDER_COLOR_NONE

class TagsWrangler:

    def __init__(self, all_paths: list[str], progress_callback: Callable[[float], None]=None):
        self.known_tags = _load_known_tags()
        self.all_paths = all_paths
        self.tag_to_image_cache = None
        self.progress_callback = progress_callback

    def get_all_known_tags(self):
        return self.known_tags

    def get_tags_for_images(self, image_paths: list[str]) -> dict[str, list[str]]:
        return {p: self.get_tags(p) for p in image_paths}

    def get_images_for_tags(self, tags: list[str]) -> list[str]:
        if self.tag_to_image_cache is None:
            self._populate_tag_to_image_cache()
        paths = [p for p, file_tags in self.tag_to_image_cache.items()
                 if any(t in file_tags for t in tags)]
        return paths

    def get_tags(self, image_path: str) -> list[str]:
        md = OSXMetaData(image_path)
        return [t.name for t in md.tags]

    def add_tag(self, image_path, tag_name):
        md = OSXMetaData(image_path)
        if any(tag.name == tag_name for tag in md.tags):
            return False
        md.tags = md.tags + [Tag(name=tag_name, color=FINDER_COLOR_NONE)]
        return True

    def remove_tag(self, image_path, tag_name):
        md = OSXMetaData(image_path)
        md.tags = [t for t in md.tags if t.name != tag_name]

    def _populate_tag_to_image_cache(self):
        self.tag_to_image_cache = {}
        if self.progress_callback:
            self.progress_callback(0)
        for i, path in enumerate(tqdm(self.all_paths)):
            try:
                tags = self.get_tags(path)
                self.tag_to_image_cache[path] = tags
                if i%100 == 0 and self.progress_callback:
                    self.progress_callback(i / len(self.all_paths))
            except Exception as e:
                print(f"Error reading tags for {path}: {e}")
        if self.progress_callback:
            self.progress_callback(1)


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