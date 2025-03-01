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


class EmbeddingStore(Protocol):

    @property
    def all_image_embeddings(self) -> torch.Tensor:
        ...

    def get_image_embedding(self, path: str) -> torch.Tensor:
        ...

    def get_text_embedding(self, text: str) -> torch.Tensor:
        ...

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


class SimpleClipEmbeddingStore(EmbeddingStore):
    def __init__(self, clip_model: ClipModel, store_file: str = None):
        self.store_file = store_file
        self.clip_model = clip_model
        if store_file is not None and os.path.exists(store_file):
            self._load_from_store()
        else:
            self.text_embeddings = torch.empty([0, clip_model.embedding_dim])
            self.texts = []
            self.image_embeddings = torch.empty([0, clip_model.embedding_dim])
            self.image_paths = []
            self.image_ids = []

    @property
    def all_image_embeddings(self) -> torch.Tensor:
        return self.image_embeddings

    def get_image_embedding(self, path: str) -> torch.Tensor:
        try:
            index = self.image_paths.index(path.lower())
            return self.image_embeddings[index]
        except ValueError:
            image_embedding = self.add_image(path)
            return image_embedding

    def get_text_embedding(self, text: str) -> torch.Tensor:
        try:
            index = self.texts.index(text.lower())
            return self.text_embeddings[index]
        except ValueError:
            text_embedding = self.add_text(text)
            return text_embedding

    def search_images(self, query: Query, limit=100) -> List[QueryResult]:
        query_embeddings = [
            self.get_text_embedding(t)
            for t in query.texts
        ] + [
            self.get_image_embedding(i)
            for i in query.images
        ]

        similarities = [torch.cosine_similarity(self.image_embeddings, q)
                        for q in query_embeddings]
        summed_similarities = torch.stack(similarities).sum(dim=0)
        _, ordered_indices = torch.sort(summed_similarities, descending=True)
        return [QueryResult(distance=summed_similarities[i],
                            path=self.image_paths[i],
                            id=self.image_ids[i])
                for i in ordered_indices[:limit]]

    def add_images(self, paths: list[str]) -> torch.Tensor:
        paths = [p for p in paths if not self.has_image(p)]
        embeddings_to_add = list(self.clip_model.get_image_features_batched(paths, batch_size=8))
        assert len(embeddings_to_add) == len(paths)
        self.image_embeddings = torch.cat([self.image_embeddings, torch.stack(embeddings_to_add)])
        self.image_ids = self.image_ids + [str(uuid.uuid4()) for _ in range(len(paths))]
        self.image_paths = self.image_paths + [p.lower() for p in paths]
        self._save_to_store()
        return embeddings_to_add

    def add_image(self, path) -> torch.Tensor:
        return self.add_images([path])[0]

    def add_text(self, text: str) -> torch.Tensor:
        embedding_to_add = self.clip_model.get_text_features(text.lower())
        self.text_embeddings = torch.cat([self.text_embeddings, embedding_to_add.unsqueeze(dim=0)])
        self.texts.append(text)
        self._save_to_store()
        return embedding_to_add

    def has_image(self, path: str) -> bool:
        return path.lower() in self.image_paths

    def _load_from_store(self):
        d = torch.load(self.store_file)
        version = d['version']
        if version == 2:
            self.image_embeddings = d['image_embeddings']
            self.image_paths = d['image_paths']
            self.image_ids = d['image_ids']
            self.text_embeddings = d['text_embeddings']
            self.texts = d['texts']
        elif version == 1:
            self.image_embeddings = d['embeddings']
            self.image_paths = d['paths']
            self.image_ids = d['ids']
            self.texts = []
            self.text_embeddings = torch.empty([0, self.clip_model.embedding_dim])
        else:
            raise RuntimeError(f"unrecognized store version in {self.store_file}: {version}")

    def _save_to_store(self):
        if self.store_file is None:
            return
        torch.save({
            'version': 2,
            'image_embeddings': self.image_embeddings,
            'image_ids': self.image_ids,
            'image_paths': self.image_paths,
            'text_embeddings': self.text_embeddings,
            'texts': self.texts,
        }, self.store_file)
