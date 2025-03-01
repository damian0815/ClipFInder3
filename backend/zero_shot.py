from pydantic import BaseModel

from backend.clip_embedding_provider import EmbeddingStore, Query


class EmbeddingRequest(BaseModel):
    texts: list[str] = []
    images: list[str] = []


class ZeroShotClassifyRequest(BaseModel):
    classes: list[EmbeddingRequest]


def do_zero_shot_classify(embedding_provider: EmbeddingStore,
                          request: ZeroShotClassifyRequest):

    cls_results = []
    for cls in request.classes:
        cls_text_embeddings = [embedding_provider.get_text_embedding(t) for t in cls.texts]
        if cls.images:
            raise NotImplementedError
        similarities = cls_text_embeddings @ embedding_provider.all_image_embeddings


        results = embedding_provider.search_images(query, limit=None)
        cls_results.append(results)




