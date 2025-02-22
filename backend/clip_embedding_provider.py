from dataclasses import dataclass
from typing import Protocol, List

import torch
from PIL import Image

from backend.clip_model import ClipModel


@dataclass
class Query:
    texts: List[str]
    images: List[str]


@dataclass
class QueryResult:
    path: str
    distance: float


class ClipEmbeddingStore(Protocol):
    def search_images(self, query: Query) -> [QueryResult]:
        ...

    def has_image(self, path: str) -> bool:
        ...

    def add_images(self, paths: list[str]):
        ...

class ClipEmbeddingStoreSimple(ClipEmbeddingStore):
    def __init__(self, clip_model: ClipModel, store_file: str):
        self.store_file = store_file
        self.clip_model = clip_model
        if store_file is not None:
            self._load_from_store()
        else:
            self.paths = []
            self.embeddings = torch.tensor([0, clip_model.embedding_dim])


    def search_images(self, query: Query, limit=100) -> [QueryResult]:
        query_embeddings = [
            self.clip_model.get_text_features(t)
            for t in query.texts
        ] + [
            self.clip_model.get_image_features(Image.open(i))
            for i in query.images
        ]

        similarities = [torch.cosine_similarity(self.embeddings, q)
                    for q in query_embeddings]
        _, ordered_indices = torch.sort(similarities, descending=True)
        return [QueryResult(distance=similarities[i], path=self.paths[i])
                for i in ordered_indices[:limit]]

    def add_images(self, paths: list[str]):
        paths = [p for p in paths if not self.has_image(p)]
        embeddings = self.clip_model.get_image_features(paths)
        self.embeddings = torch.cat(self.embeddings, embeddings)
        self.paths = self.paths + [p.lower() for p in paths]
        self._save_to_store()

    def has_image(self, path: str) -> bool:
        return path.lower() in self.paths

    def _load_from_store(self):
        raise NotImplementedError

    def _save_to_store(self):
        if self.store_file is None:
            return
        raise NotImplementedError

