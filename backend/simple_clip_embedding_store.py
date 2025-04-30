import os
import uuid
from asyncio import Lock
from collections.abc import Callable
from typing import Awaitable, Any

import torch

from backend.embedding_store import EmbeddingStore, Query, QueryResult
from backend.clip_model import ClipModel
from backend.progress_websocket.progress_broadcaster import ProgressBroadcaster, ProgressAccumulator
from backend.util import acquire_lock


class SimpleClipEmbeddingStore(EmbeddingStore):
    def __init__(self, load_model: Callable[[], Awaitable[ClipModel]],
                 embedding_dim=512,
                 store_file: str = None,
                 repair_store_file_case: bool=False):
        self.store_file = store_file
        self.load_model = load_model
        self._clip_model = None
        self.lock = Lock()
        self.embedding_dim = embedding_dim
        if store_file is not None and os.path.exists(store_file):
            self._load_from_store()
            if repair_store_file_case:
                self.image_paths = _repair_image_paths_case(self.all_image_paths)
            assert len(self.image_paths) == len(self.image_ids), f"store file {store_file} is corrupt"
            assert len(self.image_paths) == self.image_embeddings.shape[0], f"store file {store_file} is corrupt"

        else:
            self.text_embeddings = torch.empty([0, self.embedding_dim])
            self.texts = []
            self.image_embeddings = torch.empty([0, self.embedding_dim])
            self.image_paths = []
            self.image_ids = []

    async def get_clip_model(self) -> ClipModel:
        await self.lock.acquire()
        clip_model = self._clip_model
        if clip_model is None:
            print('no model, loading')
            clip_model = await self.load_model()
            self._clip_model = clip_model
        else:
            print('have clip model, no need to load')
        self.lock.release()
        return clip_model

    @property
    def all_image_embeddings(self) -> torch.Tensor:
        return self.image_embeddings

    @property
    def all_image_ids(self) -> list[str]:
        return self.image_ids

    @property
    def all_image_paths(self) -> list[str]:
        return self.image_paths

    async def get_image_embedding(self, path: str) -> torch.Tensor:
        try:
            await self.lock.acquire()
            index = self.image_paths.index(path)
            embedding = self.image_embeddings[index]
            self.lock.release()
            return embedding
        except ValueError:
            image_embedding = await self.add_image(path)
            return image_embedding

    async def get_text_embedding(self, text: str) -> torch.Tensor:
        try:
            await self.lock.acquire()
            index = self.texts.index(text.lower())
            embedding = self.text_embeddings[index]
            self.lock.release()
            return embedding
        except ValueError:
            text_embedding = await self.add_text(text)
            return text_embedding

    async def search_images(self, query: Query, limit=100) -> list[QueryResult]:

        progress_accumulator = ProgressBroadcaster.instance().make_helper(
            total=2*(len(query.texts) + len(query.images)) + 1,
            label='search'
        )

        query_embeddings = [
            await progress_accumulator.update() or await self.get_text_embedding(t)
            for i, t in enumerate(query.texts)
        ] + [
            await progress_accumulator.update() or await self.get_image_embedding(i)
            for i, t in enumerate(query.images)
        ]

        image_paths, image_ids, image_embeddings = await self._filter_images_by_path_maybe(query.path_contains)

        similarities = [await progress_accumulator.update() or torch.cosine_similarity(image_embeddings, q)
                        for q in query_embeddings]
        summed_similarities = torch.stack(similarities).sum(dim=0)
        _, ordered_indices = torch.sort(summed_similarities, descending=True)
        await progress_accumulator.finish()
        return [QueryResult(distance=summed_similarities[i],
                            path=image_paths[i],
                            id=image_ids[i])
                for i in ordered_indices[:limit]]

    async def _filter_images_by_path_maybe(self, path_contains: str = None) -> tuple[list[str], list[str], torch.Tensor]:
        await self.lock.acquire()
        if path_contains:
            path_contains = path_contains.lower()
            indices = [i for i, path in enumerate(self.image_paths) if path_contains in path.lower()]
            image_paths = [self.image_paths[i] for i in indices]
            image_ids = [self.image_ids[i] for i in indices]
            image_embeddings = self.image_embeddings[torch.tensor(indices)].clone()
        else:
            image_paths = list(self.image_paths)
            image_ids = list(self.image_ids)
            image_embeddings = self.image_embeddings.clone()
        self.lock.release()
        return image_paths, image_ids, image_embeddings


    async def add_images(self, paths: list[str]) -> torch.Tensor:
        paths = [p for p in paths if not self.has_image(p)]
        if len(paths) == 0:
            return torch.empty([0, self.embedding_dim])
        clip_model = await self.get_clip_model()
        progress_accumulator = ProgressBroadcaster.instance().make_helper(
            total=len(paths) + 1,
            label="add images")
        embeddings_to_add = list([await progress_accumulator.update() or f
                                  async for f in clip_model.get_image_features_batched(
            paths, batch_size=8)
        ])
        assert len(embeddings_to_add) == len(paths)
        await self.lock.acquire()
        self.image_embeddings = torch.cat([self.image_embeddings, torch.stack(embeddings_to_add)])
        self.image_ids = self.image_ids + [str(uuid.uuid4()) for _ in range(len(paths))]
        self.image_paths.extend(paths)
        self.lock.release()
        await self._save_to_store()
        await progress_accumulator.finish()
        return embeddings_to_add

    async def add_image(self, path) -> torch.Tensor:
        return (await self.add_images([path]))[0]

    async def add_text(self, text: str) -> torch.Tensor:
        clip_model = await self.get_clip_model()
        embedding_to_add = await clip_model.get_text_features(text.lower())
        await self.lock.acquire()
        self.text_embeddings = torch.cat([self.text_embeddings, embedding_to_add.unsqueeze(dim=0)])
        self.texts.append(text)
        self.lock.release()
        await self._save_to_store()
        return embedding_to_add

    def has_image(self, path: str) -> bool:
        return path in self.image_paths

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
            self.text_embeddings = torch.empty([0, self.embedding_dim])
        else:
            raise RuntimeError(f"unrecognized store version in {self.store_file}: {version}")

    async def _save_to_store(self):
        if self.store_file is None:
            return
        await self.lock.acquire()
        torch.save({
            'version': 2,
            'image_embeddings': self.image_embeddings,
            'image_ids': self.image_ids,
            'image_paths': self.image_paths,
            'text_embeddings': self.text_embeddings,
            'texts': self.texts,
        }, self.store_file)
        self.lock.release()


def _repair_image_paths_case(paths: list[str]) -> list[str]:
    parent_contents = {}

    def get_case_correct_path(path):
        if path is None or path == "/" or path == "":
            return path
        parent = os.path.dirname(path).lower()
        case_correct_parent = get_case_correct_path(parent)
        if parent not in parent_contents.keys():
            parent_contents[parent] = os.listdir(case_correct_parent)

        filename = os.path.basename(path).lower()
        try:
            case_correct_filename = next(fn for fn in parent_contents[parent]
                                     if fn.lower() == filename)
            return os.path.join(case_correct_parent, case_correct_filename)
        except StopIteration:
            return None

    return [get_case_correct_path(p) for p in paths]
