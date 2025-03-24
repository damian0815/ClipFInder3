import torch
from backend.embedding_store import EmbeddingStore
from backend.types import ZeroShotClassifyRequest, ZeroShotClassification, ImageResponse
from MulticoreTSNE import MulticoreTSNE as TSNE
import logging
from backend.filtering import get_included_path_indices

def do_zero_shot_classify(embedding_provider: EmbeddingStore,
                          request: ZeroShotClassifyRequest):

    cls_results = []

    indices = get_included_path_indices(filters=request.filters, image_paths=embedding_provider.all_image_paths)
    image_ids = [embedding_provider.all_image_ids[i] for i in indices]
    image_paths = [embedding_provider.all_image_paths[i] for i in indices]
    image_embeddings = embedding_provider.all_image_embeddings[indices]

    for cls in request.classes:
        cls_text_embeddings = torch.stack([embedding_provider.get_text_embedding(t) for t in cls.texts])
        if cls.images:
            raise NotImplementedError
        similarities = image_embeddings @ cls_text_embeddings.T
        cls_results.append(similarities.mean(dim=1))

    probs = torch.stack(cls_results, dim=1).softmax(dim=1)
    entropy = -torch.sum(probs * torch.log(probs), dim=1)
    cls_selections = probs.argmax(dim=1)

    logging.info("running tsne...")
    order_key = _order_tsne_2d(probs, normalize=True)
    logging.info("ran tsne")

    return [
        ZeroShotClassification(image=ImageResponse(id=image_ids[i],
                                                   path=image_paths[i]),
                               best_cls=request.classes[cls_selections[i].item()].id,
                               entropy=entropy[i].item(),
                               order_key=order_key[i].cpu().tolist())
        for i in range(probs.shape[0])]


def _order_tsne_2d(probs: torch.Tensor, normalize: bool=False) -> torch.Tensor:
    tsne = TSNE(n_jobs=4)
    order = torch.Tensor(tsne.fit_transform(probs.cpu().numpy()))
    if not normalize:
        return order

    min_val = torch.min(order)
    max_val = torch.max(order)
    return (order - min_val) / (max_val - min_val)

