import hashlib
import os
import uuid
from dataclasses import dataclass, field
from typing import Protocol, List, Literal, Callable, Optional
from tsp_solver.greedy import solve_tsp

import PIL
import torch
from PIL import Image
from tqdm.auto import tqdm
from pydantic import BaseModel, ConfigDict

from clip_finder_backend.clip_modelling import ClipModel


class Query(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    texts: List[str]|None = None
    image_ids: List[str]|None = None
    embeddings: List[list[float]]|None = None
    """1 weight for each text, image, and embedding in the query, in that order"""
    weights: List[float]

    reduce_method: Literal['sum', 'max'] = 'sum'
    required_path_contains: str = None
    excluded_path_contains: str = None
    required_image_ids: List[str] | None = None
    excluded_image_ids: List[str] | None = None

    # Pagination parameters
    offset: int = 0
    limit: int = 100
    sort_order: Literal['similarity', 'semantic_page'] = 'similarity'

    @staticmethod
    def text_query(text: str):
        return Query(texts=[text], weights=[1], image_ids=[], embeddings=[])

    @staticmethod
    def text_query_with_weights(texts: list[str], weights: list[float]):
        if len(texts) != len(weights):
            raise ValueError("there must be 1 weight for each text")
        return Query(texts=list(texts), weights=list(weights), image_ids=[], embeddings=[])

    @staticmethod
    def vector_query(embedding: list[float]):
        return Query(texts=[], weights=[1], image_ids=[], embeddings=[embedding])


@dataclass
class QueryResult:
    id: str
    path: str
    similarity: float


class EmbeddingStore(Protocol):
    def get_image_embeddings(self, path: list[str]) -> tuple[list[str], torch.Tensor]:
        ...

    def get_image_embedding(self, path: str) -> torch.Tensor:
        ...

    def get_text_embedding(self, text: str) -> torch.Tensor:
        ...

    def search_images(self, query: Query, limit=100, progress_callback: Optional[Callable[[float, str], None]]=None) -> List[QueryResult]:
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
                    images_to_add.append(os.path.abspath(path))
                except PIL.UnidentifiedImageError:
                    continue
        self.add_images(images_to_add)
        return len(images_to_add)

    def get_image_path_for_id(self, id: str):
        ...

    def get_image_ids_for_paths(self, image_paths: list[str]):
        ...


class ReadOnlyException(Exception):
    pass

class SimpleClipEmbeddingStore(EmbeddingStore):
    def __init__(self, clip_model: ClipModel, store_file: str = None, store_file_identifier = None, store_device='cpu', ignore_identifier_mismatch=False, bare_mode=False, readonly=False):
        self.store_file = store_file
        self.clip_model = clip_model
        self.store_device = store_device
        self.readonly = readonly
        if store_file_identifier is not None:
            self.store_file_identifier = store_file_identifier
        else:
            self.store_file_identifier = clip_model.distinct_identifier
        if bare_mode:
            assert clip_model is None
            assert store_file is None
            self.bare_mode = True
        else:
            self.bare_mode = False
            if store_file is not None and os.path.exists(store_file):
                self._load_from_store(ignore_identifier_mismatch=ignore_identifier_mismatch)
                print('loaded', len(self.image_paths), 'image embeddings from', store_file)
            else:
                self.text_embeddings = torch.empty([0, clip_model.embedding_dim]).to(self.store_device)
                self.texts: List[str] = []
                self.image_embeddings = torch.empty([0, clip_model.embedding_dim]).to(self.store_device)
                self.image_paths: List[str] = []
                self.image_ids: List[str] = []
                self.image_hashes: List[str] = []

    @property
    def is_readonly(self) -> bool:
        return self.readonly or (self.image_paths and not self.image_hashes)

    def make_non_bare_inplace(self, clip_model: ClipModel, store_file: str, readonly=False, store_file_identifier = None):
        """
        turn a "bare" store (i.e. shard) into a non-bare store, with clip_model and store_file set.
        if readonly is True, the store will not compute hashes for images, and will not be able to add new images.
        """
        assert self.bare_mode
        self.text_embeddings = torch.empty([0, clip_model.embedding_dim]).to(self.store_device)
        self.texts = []
        self.image_ids = str(uuid.uuid4() for _ in range(len(self.image_paths)))
        if readonly:
            self.image_hases = []
        else:
            self.image_hashes = [_compute_md5_hash(p) if os.path.exists(p) else 0
                                 for p in tqdm(self.image_paths, desc='Computing md5 hashes for images')
                                 ]
        self.store_file = store_file
        self.bare_mode = False

    def cleanup_missing_files(self, force=False):
        have_indices = [i for i, p in enumerate(tqdm(self.image_paths)) if os.path.exists(p)]
        if len(have_indices) < len(self.image_paths)*0.75 and not force:
            raise RuntimeError("cleanup_missing_files() would remove", len(self.image_paths) - len(have_indices), "out of", len(self.image_paths),
                  "images, but this is more than 25% of the dataset. Refusing to proceed with force=True")
        if len(have_indices) < len(self.image_paths):
            print(f'removing {len(self.image_paths) - len(have_indices)} embeddings from store because files are missing')
            self.image_paths = [self.image_paths[i] for i in have_indices]
            self.image_embeddings = self.image_embeddings[have_indices]
            if self.image_hashes:
                self.image_hashes = [self.image_hashes[i] for i in have_indices]
            if self.image_ids:
                self.image_ids = [self.image_ids[i] for i in have_indices]


    def get_image_path_for_id(self, image_id: str) -> str | None:
        try:
            index = self.image_ids.index(image_id)
            return self.image_paths[index]
        except ValueError:
            return None


    def get_image_embedding(self, path: str) -> torch.Tensor | None:
        try:
            index = self.image_paths.index(os.path.abspath(path))
            return self.image_embeddings[index]
        except ValueError:
            if self.is_readonly:
                return self.clip_model.get_image_features(path)
            else:
                image_embedding = self.add_image(path)
                return image_embedding

    def get_image_embeddings(self, paths: list[str], show_pbar=True) -> tuple[list[str], torch.Tensor]:
        if any([type(p) is list for p in paths]):
            raise ValueError(f"paths must be a list of strings, got {type(paths)}")
        paths = [os.path.abspath(path) for path in paths]
        missing = [p for p in paths if p not in self.image_paths]
        if any([type(p) is list for p in missing]):
            raise ValueError(f"(b) paths must be a list of strings, got {type(missing)}")
        if missing:
            try:
                to_add_paths, to_add_embeds = zip(*self.clip_model.get_image_features_batched(missing, show_pbar=show_pbar))
                if self.is_readonly:
                    # don't save
                    non_missing = [p for p in paths if p not in missing]
                    have_paths, have_embeds = self.get_image_embeddings(paths, show_pbar=False)
                    return have_paths + to_add_paths, torch.cat([have_embeds, to_add_embeds], dim=0)
                if to_add_paths:
                    to_add_embeds = torch.stack(to_add_embeds).to(self.store_device)
                    self.image_paths.extend(to_add_paths)
                    self.image_embeddings = torch.cat([self.image_embeddings, to_add_embeds], dim=0)
            except Exception as e:
                print(f'Caught exception adding {len(missing)} images to clip embeddings (just returning what we have): {repr(e)}')
                raise
        have_indices, have_paths = zip(*[(i, p) for i, p in enumerate(self.image_paths) if p in paths])
        have_indices = list(have_indices)
        return have_paths, self.image_embeddings[have_indices]

    def get_text_embedding(self, text: str) -> torch.Tensor:
        try:
            index = self.texts.index(text)
            return self.text_embeddings[index]
        except ValueError:
            text_embedding = self.add_text(text)
            return text_embedding

    def search_images(self, query: Query, progress_callback: Callable[[float, str], None] = None) -> List[QueryResult]:
        weights = list(query.weights)
        if progress_callback is not None:
            progress_callback(0, "Computing embeddings")
        all_query_embeddings = [
            self.get_text_embedding(t).unsqueeze(0)
            for t in query.texts
        ]
        if query.image_ids:
            weight_index_offset = len(all_query_embeddings)
            id_paths = [i for i in [self.get_image_path_for_id(i) for i in query.image_ids]
                            if i is not None]
            actual_paths, image_embeddings = self.get_image_embeddings(id_paths)
            missing_image_indices = [weight_index_offset + i
                                   for i, p in enumerate(id_paths)
                                   if p not in actual_paths]
            for index in reversed(missing_image_indices):
                del weights[index]
            all_query_embeddings.append(image_embeddings)

        if query.embeddings:
            all_query_embeddings.extend([torch.tensor(e) for e in query.embeddings])

        if any(len(t.shape) != 2 for t in all_query_embeddings):
            raise ValueError("all query embeddings must be of shape [1, embedding_dim]")
        if len(all_query_embeddings) == 0:
            print("Empty query, returning no results")
            return []
        all_query_embeddings = torch.cat(all_query_embeddings, dim=0).to(self.image_embeddings.device, dtype=self.image_embeddings.dtype)
        if all_query_embeddings.shape[0] != len(weights):
            raise ValueError(f"there must be 1 weight for every embedding, text, or image in the query (got {all_query_embeddings.shape[0]} embeddings and {len(weights)} weights)")
        all_query_embeddings /= all_query_embeddings.norm(dim=-1, keepdim=True)
        weights = torch.tensor(weights).to(all_query_embeddings.device, dtype=all_query_embeddings.dtype)

        filtered_corpus_paths: set[str]|None = None
        def intersect_corpus_paths(paths: list[str]):
            nonlocal filtered_corpus_paths
            if filtered_corpus_paths is None:
                filtered_corpus_paths = set(self.image_paths)
            filtered_corpus_paths.intersection_update(set(paths))

        def subtract_corpus_paths(paths: list[str]):
            nonlocal filtered_corpus_paths
            if filtered_corpus_paths is None:
                filtered_corpus_paths = set(self.image_paths)
            filtered_corpus_paths.difference_update(set(paths))

        if query.required_path_contains:
            matching_corpus_paths = [p for p in self.image_paths if query.required_path_contains in p]
            intersect_corpus_paths(matching_corpus_paths)
        if query.excluded_path_contains:
            matching_corpus_paths = [p for p in self.image_paths if query.excluded_path_contains not in p]
            intersect_corpus_paths(matching_corpus_paths)

        if query.required_image_ids:
            matching_corpus_indices = [self.image_ids.index(image_id)
                                       for image_id in query.required_image_ids]
            matching_corpus_paths = [self.image_paths[i] for i in matching_corpus_indices]
            intersect_corpus_paths(matching_corpus_paths)

        if query.excluded_image_ids:
            matching_corpus_indices = [self.image_ids.index(image_id)
                                       for image_id in query.excluded_image_ids]
            matching_corpus_paths = [self.image_paths[i] for i in matching_corpus_indices]
            subtract_corpus_paths(matching_corpus_paths)

        if filtered_corpus_paths is not None:
            corpus_indices = [self.image_paths.index(p) for p in sorted(filtered_corpus_paths)]
            corpus_paths = [self.image_paths[i] for i in corpus_indices]
            corpus_embeddings = self.image_embeddings[corpus_indices]
            corpus_image_ids = [self.image_ids[i] for i in corpus_indices]
        else:
            corpus_paths = self.image_paths
            corpus_embeddings = self.image_embeddings
            corpus_image_ids = self.image_ids

        if progress_callback is not None:
            progress_callback(0.25, "Computing similarities")

        similarities = torch.matmul(all_query_embeddings, corpus_embeddings.T)
        weighted_similarities = (similarities.T * weights).T
        if query.reduce_method == 'sum':
            summed_similarities = weighted_similarities.sum(dim=0)
        elif query.reduce_method == 'max':
            summed_similarities, _ = weighted_similarities.max(dim=0)
        else:
            raise ValueError(f"unknown reduction method {query.reduce_method}")
        ordered_indices = torch.argsort(summed_similarities, dim=0, descending=True)

        if progress_callback is not None:
            progress_callback(1, "Finished")

        # Apply pagination
        start_idx = query.offset
        end_idx = start_idx + query.limit
        paginated_indices = ordered_indices[start_idx:end_idx]

        if query.sort_order == 'semantic_page':
            # tsp
            page_embeddings = corpus_embeddings[paginated_indices]
            distance_matrix = 1 - torch.matmul(page_embeddings, page_embeddings.T)
            path = solve_tsp(distance_matrix, endpoints=(0, page_embeddings.shape[0]-1))
            paginated_indices = [paginated_indices[i] for i in path]

        return [QueryResult(similarity=summed_similarities[i].item(),
                            path=corpus_paths[i],
                            id=corpus_image_ids[i])
                for i in paginated_indices]

    def add_images_precomputed(self, paths: list[str], embeddings: torch.Tensor, save=False):
        new_indices = [i for i, p in enumerate(paths) if not self.has_image(p)]
        paths_to_add = [paths[i] for i in new_indices]
        embeddings_to_add = embeddings[new_indices].to(self.store_device)
        hashes_to_add = [_compute_md5_hash(p) for p in paths_to_add]
        self.image_embeddings = torch.cat([self.image_embeddings, embeddings_to_add])
        self.image_ids = self.image_ids + [str(uuid.uuid4()) for _ in range(len(paths_to_add))]
        self.image_paths.extend(paths_to_add)
        self.image_hashes = self.image_hashes + [_compute_md5_hash(p) for p in paths_to_add]
        assert len(self.image_paths) == len(self.image_hashes)
        assert len(self.image_ids) == len(self.image_hashes)
        assert self.image_embeddings.shape[0] == len(self.image_paths)
        if save:
            self._save_to_store()

    def add_images(self, paths_in: list[str], batch_size=10, save=False, show_pbar=True) -> tuple[list[str], torch.Tensor]:
        if self.is_readonly:
            raise ReadOnlyException("this store is read-only because it has no hashes")
        paths_in = [os.path.abspath(path) for path in paths_in]
        paths_missing = [p for p in paths_in if not self.has_image(p)]
        if len(paths_missing) == 0:
            empty = torch.empty((0, self.clip_model.embedding_dim)).to(self.store_device)
            return [],empty
        if self.clip_model is None:
            raise ReadOnlyException("this store is read-only because no clip_model was")
        paths_to_add, embeddings_to_add = zip(
            *self.clip_model.get_image_features_batched(paths_missing, batch_size=batch_size, show_pbar=show_pbar)
        )
        assert len(embeddings_to_add) == len(paths_to_add)
        self.add_images_precomputed(paths_to_add, torch.stack(embeddings_to_add))
        return paths_to_add, embeddings_to_add

    def add_image(self, path) -> torch.Tensor:
        _, e = self.add_images([path])
        return e[0]

    def add_text(self, text: str) -> torch.Tensor:
        embedding_to_add = self.clip_model.get_text_features(text)
        self.text_embeddings = torch.cat([self.text_embeddings, embedding_to_add])
        self.texts.append(text)
        self._save_to_store()
        return embedding_to_add[0]

    def has_image(self, path: str) -> bool:
        return path in self.image_paths

    def save(self, store_file_path=None):
        if store_file_path is None:
            if self.store_file is None:
                raise ValueError('No store_file_path provided at construct time or save time')
            self._save_to_store()
        else:
            self._save_to_store(store_file_path)

    def _load_from_store(self, ignore_identifier_mismatch=False):
        d = torch.load(self.store_file)
        version = d['version']
        if version >= 3:
            if not ignore_identifier_mismatch and d['identifier'] != self.store_file_identifier:
                raise ValueError(f'Store_file_identifier mismatch. expected: {self.store_file_identifier}, loaded: ' + d['identifier'])
        if version == 1:
            self.image_embeddings = d['embeddings'].to(self.store_device)
            self.image_paths = _recover_natural_case_from_lowercase_paths(d['paths'])
            self.image_ids = d['ids']
            self.text_embeddings = torch.empty([0, self.clip_model.embedding_dim]).to(self.store_device)
            self.texts = []
        elif version >= 2:
            self.image_embeddings = d['image_embeddings'].to(self.store_device)
            if version >= 5:
                self.image_paths = d['image_paths']
            else:
                self.image_paths = _recover_natural_case_from_lowercase_paths(d['image_paths'])
            self.image_ids = d['image_ids']
            self.text_embeddings = d['text_embeddings'].to(self.store_device)
            self.texts = d['texts']
        else:
            raise RuntimeError(f"unrecognized store version in {self.store_file}: {version}")
        if version >= 4:
            self.image_hashes = d['image_hashes']
        else:
            print(f'computing missing hashes for {len(self.image_paths)} images')
            self.image_hashes = [_compute_md5_hash(p) for p in tqdm(self.image_paths)]
        if self.image_ids is None or len(self.image_ids) != len(self.image_paths):
            print('generating new image ids for', len(self.image_paths), 'images')
            self.image_ids = [str(uuid.uuid4()) for _ in range(len(self.image_paths))]

    def _save_to_store(self, store_file_path=None):
        if self.is_readonly:
            print("Readonly, not saving")
            return
        path = self.store_file if store_file_path is None else store_file_path
        if path is None:
            return
        torch.save({
            'version': 5,
            'identifier': self.store_file_identifier,
            'image_embeddings': self.image_embeddings,
            'image_ids': self.image_ids,
            'image_paths': self.image_paths,
            'image_hashes': self.image_hashes,
            'text_embeddings': self.text_embeddings,
            'texts': self.texts,
        }, path)


    def get_image_ids_for_paths(self, image_paths):
        indices = [self.image_paths.index(p) for p in image_paths if p in self.image_paths]
        return [self.image_ids[i] for i in indices]


def _compute_md5_hash(path):
    with open(path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()



def load_chunk_paths(store_folder: str) -> List[str]:
    def make_chunk_path(index):
        return os.path.join(store_folder, f'part_{index:04d}.pt')

    num_chunks = 0
    print('finding chunks...')
    while os.path.exists(make_chunk_path(num_chunks)):
        num_chunks += 1

    all_paths = []
    for chunk_index in tqdm(range(num_chunks), desc='Loading chunks'):
        chunk = torch.load(make_chunk_path(chunk_index), weights_only=False)
        chunk_paths = [p['path'] for p in chunk['objects']]
        all_paths.extend(chunk_paths)
        chunk_index += 1
    return all_paths


def _load_chunked_store(store_folder: str, store_device='cpu', shard_size: int = 1e6) -> List[SimpleClipEmbeddingStore]:
    shards = []
    # eg part_0000.pt
    def make_chunk_path(index):
        return os.path.join(store_folder, f'part_{index:04d}.pt')

    def add_shard(paths, embeddings):
        shard = SimpleClipEmbeddingStore(clip_model=None, store_file=None, store_device=store_device, store_file_identifier='shard__', bare_mode=True)
        shard.image_embeddings = shard_embeddings
        shard.image_paths = shard_paths
        shard.image_ids = []
        shard.image_hashes = []
        shards.append(shard)

    shard_embeddings = None
    shard_paths = []

    num_chunks = 0
    print('finding chunks...')
    while os.path.exists(make_chunk_path(num_chunks)):
        num_chunks += 1

    for chunk_index in tqdm(range(num_chunks), desc='Loading chunks'):
        chunk = torch.load(make_chunk_path(chunk_index), weights_only=False)
        chunk_paths = [p['path'] for p in chunk['objects']]
        chunk_embeddings = chunk['vectors'].to(store_device)
        shard_paths.extend(chunk_paths)
        shard_embeddings = chunk_embeddings if shard_embeddings is None else torch.cat([shard_embeddings, chunk_embeddings])
        if len(shard_paths) >= shard_size:
            add_shard(shard_paths[:shard_size], shard_embeddings[:shard_size])
            shard_embeddings = shard_embeddings[shard_size:]
            shard_paths = shard_paths[shard_size:]
        chunk_index += 1
    if len(shard_paths) >= 0:
        add_shard(shard_paths, shard_embeddings)
    return shards


class ShardedEmbeddingStore(EmbeddingStore):

    @staticmethod
    def from_weaviate_dump_chunks(chunks_folder: str,
                                  clip_model: ClipModel=None,
                                  store_device='cpu',
                                  shard_size: int=1e6):
        shards = _load_chunked_store(chunks_folder, store_device=store_device, shard_size=shard_size)
        return ShardedEmbeddingStore(clip_model=clip_model, shards=shards)

    def __init__(self, clip_model: ClipModel, shards: list[SimpleClipEmbeddingStore]):
        self.clip_model = clip_model
        self.shards = shards

    def get_image_embeddings(self, paths: list[str]) -> tuple[list[str], torch.Tensor]:
        result_paths = []
        result_embeddings = []
        for shard in self.shards:
            paths, embeddings = shard.get_image_embeddings(paths)
            result_paths.extend(paths)
            result_embeddings.append(embeddings)

        return result_paths, torch.cat(result_embeddings, dim=0)

    def get_image_embedding(self, path: str) -> torch.Tensor:
        for shard in self.shards:
            embedding = shard.get_image_embedding(path)
            if embedding is not None:
                return embedding

    def get_text_embedding(self, text: str) -> torch.Tensor:
        return self.clip_model.get_text_features(text)

    def search_images(self, query: Query, limit=100) -> List[QueryResult]:
        results = []
        for shard in tqdm(self.shards, leave=False):
            results.extend(shard.search_images(query))
        return sorted(results, key=lambda r: r.distance)[:limit]

    def has_image(self, path: str) -> bool:
        for shard in self.shards:
            if shard.has_image(path):
                return True
        return False

    def add_images(self, paths: list[str]) -> torch.Tensor:
        raise NotImplementedError()


def ___recover_natural_case_from_lowercase_paths(paths: list[str]) -> list[str]:

    lookup = {}

    def find_sensitive_path(dir, insensitive_path):
        insensitive_path = insensitive_path.strip(os.path.sep)
        parts = insensitive_path.split(os.path.sep)
        next_name = parts[0]
        for name in os.listdir(dir):
            if next_name.lower() == name.lower():
                improved_path = os.path.join(dir, name)
                if len(parts) == 1:
                    return improved_path
                else:
                    return find_sensitive_path(improved_path, os.path.sep.join(parts[1:]))
        return None


def _recover_natural_case_from_lowercase_paths(lowercase_paths: list[str]) -> list[str]:

    lookup = {}

    def recover_case_sensitive_path(path: str) -> str|None:
        basename = os.path.basename(path)
        dirname = os.path.dirname(path)
        if dirname == '/':
            dirname_cased = dirname
        elif dirname in lookup:
            dirname_cased = lookup[dirname]
        else:
            dirname_cased = recover_case_sensitive_path(dirname)

        entries = os.listdir(dirname_cased)
        for entry_cased in entries:
            if entry_cased.lower() == basename.lower():
                return os.path.join(dirname_cased, entry_cased)

        print(f"Could not find case-sensitive path for {path} in {dirname_cased}")
        return None

    results = []
    for p in tqdm(lowercase_paths, desc='Recovering case-sensitive paths'):
        case_sensitive = recover_case_sensitive_path(p)
        if case_sensitive is None:
            results.append(p)
        else:
            results.append(case_sensitive)
    return results
