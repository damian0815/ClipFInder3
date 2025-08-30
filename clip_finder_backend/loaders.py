import os
from typing import Any

from clip_finder_backend.clip_modelling import ClipModel, AutoloadingClipModel
from clip_finder_backend.embedding_store import EmbeddingStore, SimpleClipEmbeddingStore, ShardedEmbeddingStore


def load_model():
    if os.environ.get("CLIPFINDER_USE_MOCK_CLIP_MODEL", "0") == "1":
        print("using mock clip model because CLIPFINDER_USE_MOCK_CLIP_MODEL=1")
        from clip_finder_backend.mock_clip_model import MockClipModel
        return MockClipModel()

    model_type = os.environ.get("CLIPFINDER_CLIP_MODEL_TYPE", "MobileCLIP-S1")
    pretrained = os.environ.get("CLIPFINDER_CLIP_MODEL_PRETRAINED", "datacompdr")
    weights_pt_path = os.environ.get("CLIPFINDER_CLIP_MODEL_WEIGHTS_PT_PATH", None)
    print("loading model:", model_type, "pretrained:", pretrained, "custom weights:", weights_pt_path)
    print("Set env vars CLIPFINDER_CLIP_MODEL_TYPE, CLIPFINDER_CLIP_MODEL_PRETRAINED, CLIPFINDER_CLIP_MODEL_WEIGHTS_PT_PATH to change")
    from clip_finder_backend.clip_modelling import ClipModel
    return ClipModel(clip_name=model_type, pretrained=pretrained, weights_pt_path=weights_pt_path).load_model()


def load_simple_embedding_store(clip_model: ClipModel) -> EmbeddingStore:
    base_store_file = os.environ.get("CLIPFINDER_EMBEDDING_STORE_FILE", None)
    if base_store_file is None:
        raise RuntimeError("env var CLIPFINDER_EMBEDDING_STORE_FILE must point to a path to load the base embedding store")
    print(f"loading embedding store from {base_store_file}")
    return SimpleClipEmbeddingStore(clip_model=clip_model, store_file=base_store_file, store_device='mps')

def load_embedding_store():
    clip_model: Any = AutoloadingClipModel(load_model=load_model)
    if os.environ.get("CLIPFINDER_USE_SHARDS", "0") == "1":
        print("using sharded embedding store because CLIPFINDER_USE_SHARDS=1")
        root = os.environ.get("CLIPFINDER_SHARDS_ROOT", None)
        if root is None:
            raise ValueError("env var CLIPFINDER_SHARDS_ROOT must be set to use sharded embedding store")
        print("loading sharded embedding store from", root)
        sharded_embedding_store = ShardedEmbeddingStore.from_weaviate_dump_chunks(clip_model=None, chunks_folder=root,
                                                    shard_size=5 * 100_000, store_device='mps')
        if os.environ.get("CLIPFINDER_SHARDS_ADD_BASE", "0") == "1":
            base_shard = load_simple_embedding_store(clip_model=clip_model)
            sharded_embedding_store.add_shard(base_shard, editable=True)
        return sharded_embedding_store
    else:
        return load_simple_embedding_store(clip_model=clip_model)
