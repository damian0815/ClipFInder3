from typing import Protocol, List, Generator

from PIL import Image
import torch


class ClipModel(Protocol):

    @property
    def embedding_dim(self):
        ...

    def get_image_features(self, image: Image) -> torch.Tensor:
        ...

    def get_image_features_batched(self, images: List[str], batch_size: int = 8) -> Generator[torch.Tensor, None, None]:
       ...

    def get_text_features(self, text: str) -> torch.Tensor:
        ...
