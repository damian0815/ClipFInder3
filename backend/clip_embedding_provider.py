import os
import uuid
from dataclasses import dataclass
from typing import Protocol, List

import PIL
import torch
from PIL import Image

from backend.clip_model import ClipModel


@dataclass
class Query:
    texts: List[str]
    images: List[str]

    @staticmethod
    def text_query(text: str):
        return Query(texts=[text], images=[])


@dataclass
class QueryResult:
    id: str
    path: str
    distance: float


class ClipEmbeddingStore(Protocol):
    def search_images(self, query: Query) -> [QueryResult]:
        ...

    def has_image(self, path: str) -> bool:
        ...

    def add_images(self, paths: list[str]):
        ...

    def add_images_recursively(self, root_dir: str) -> int:
        images_to_add = []
        for directory, _, files in os.walk(root_dir):
            for f in files:
                path = os.path.join(directory, f)
                if self.has_image(path):
                    continue
                try:
                    with Image.open(path) as im:
                        #im.verify()
                        images_to_add.append(path)
                except PIL.UnidentifiedImageError:
                    continue
        self.add_images(images_to_add)
        return len(images_to_add)


class ClipEmbeddingStoreSimple(ClipEmbeddingStore):
    def __init__(self, clip_model: ClipModel, store_file: str=None):
        self.store_file = store_file
        self.clip_model = clip_model
        if store_file is not None and os.path.exists(store_file):
            self._load_from_store()
        else:
            self.paths = []
            self.ids = []
            self.embeddings = torch.empty([0, clip_model.embedding_dim])

    def search_images(self, query: Query, limit=100) -> List[QueryResult]:
        query_embeddings = [
            self.clip_model.get_text_features(t)
            for t in query.texts
        ] + [
            self.clip_model.get_image_features(Image.open(i))
            for i in query.images
        ]

        #print(query_embeddings)
        similarities = [torch.cosine_similarity(self.embeddings, q)
                    for q in query_embeddings]
        summed_similarities = torch.stack(similarities).sum(dim=0)
        _, ordered_indices = torch.sort(summed_similarities, descending=True)
        return [QueryResult(distance=summed_similarities[i], path=self.paths[i], id=self.ids[i])
                for i in ordered_indices[:limit]]

    def add_images(self, paths: list[str]):
        paths = [p for p in paths if not self.has_image(p)]
        embeddings_to_add = list(self.clip_model.get_image_features_batched(paths, batch_size=8))
        assert len(embeddings_to_add) == len(paths)
        self.embeddings = torch.cat([self.embeddings, torch.stack(embeddings_to_add)])
        self.ids = self.ids + [str(uuid.uuid4()) for _ in range(len(paths))]
        self.paths = self.paths + [p.lower() for p in paths]
        self._save_to_store()


    def has_image(self, path: str) -> bool:
        return path.lower() in self.paths

    def _load_from_store(self):
        d = torch.load(self.store_file)
        version = d['version']
        assert version <= 1
        self.embeddings = d['embeddings']
        self.ids = d['ids']
        self.paths = d['paths']

    def _save_to_store(self):
        if self.store_file is None:
            return
        torch.save({
            'version': 1,
            'embeddings': self.embeddings,
            'ids': self.ids,
            'paths': self.paths
        }, self.store_file)

