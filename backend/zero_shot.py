import torch
from backend.clip_embedding_store import EmbeddingStore
from backend.types import ZeroShotClassifyRequest, ZeroShotClassification, ImageResponse


def do_zero_shot_classify(embedding_provider: EmbeddingStore,
                          request: ZeroShotClassifyRequest):

    cls_results = []
    for cls in request.classes:
        cls_text_embeddings = torch.stack([embedding_provider.get_text_embedding(t) for t in cls.texts])
        if cls.images:
            raise NotImplementedError
        similarities = embedding_provider.all_image_embeddings @ cls_text_embeddings.T
        cls_results.append(similarities.mean(dim=1))

    probs = torch.stack(cls_results, dim=1).softmax(dim=1)
    entropy = -torch.sum(probs * torch.log(probs), dim=1)
    cls_selections = probs.argmax(dim=1)
    return [
        ZeroShotClassification(image=ImageResponse(id=embedding_provider.all_image_ids[i],
                                                   path=embedding_provider.all_image_paths[i]),
                               best_cls=request.classes[cls_selections[i].item()].id,
                               entropy=entropy[i].item())
        for i in range(probs.shape[0])]




