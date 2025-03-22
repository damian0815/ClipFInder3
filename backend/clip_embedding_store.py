import os
from dataclasses import dataclass
from typing import Protocol, List

import PIL
import torch
from PIL import Image


@dataclass
class Query:
    texts: List[str]
    images: List[str]
    path_contains: str

    @staticmethod
    def text_query(text: str, path_contains: str):
        return Query(texts=[text], images=[], path_contains=path_contains)


@dataclass
class QueryResult:
    id: str
    path: str
    distance: float


class EmbeddingStore(Protocol):

    @property
    def all_image_embeddings(self) -> torch.Tensor:
        ...

    @property
    def all_image_ids(self) -> list[str]:
        ...

    @property
    def all_image_paths(self) -> list[str]:
        ...

    def get_image_embedding(self, path: str) -> torch.Tensor:
        ...

    def get_text_embedding(self, text: str) -> torch.Tensor:
        ...

    def get_image_path(self, id: str) -> str:
        index = self.all_image_ids.index(id)
        return self.all_image_paths[index]

    def search_images(self, query: Query, limit=100) -> List[QueryResult]:
        ...

    def has_image(self, path: str) -> bool:
        ...

    def add_images(self, paths: list[str]) -> torch.Tensor:
        ...

    def add_images_recursively(self, root_dir: str) -> int:
        images_to_add = []
        for directory, _, files in os.walk(root_dir):
            for f in files:
                path = os.path.join(directory, f)
                if self.has_image(path):
                    continue
                try:
                    _ = Image.open(path)
                    images_to_add.append(path)
                except PIL.UnidentifiedImageError:
                    continue
        self.add_images(images_to_add)
        return len(images_to_add)


