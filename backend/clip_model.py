from typing import Protocol, List

from PIL import Image


class ClipModel(Protocol):

    @property
    def embedding_dim(self):
        ...

    def get_image_features(self, image: Image) -> List[float]:
        ...

    def get_text_features(self, text: str) -> List[float]:
        ...
