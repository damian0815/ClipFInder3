from typing import Protocol, List, Generator

from PIL import Image
import torch

from backend.progress_websocket.progress_broadcaster import ProgressBroadcaster


class ClipModel(Protocol):

    @property
    def embedding_dim(self):
        ...

    async def get_image_features(self, image: Image) -> torch.Tensor:
        ...

    async def get_image_features_batched(self, images: List[str], batch_size: int = 8
                                   ) -> Generator[torch.Tensor, None, None]:
       ...

    async def get_text_features(self, text: str) -> torch.Tensor:
        ...
