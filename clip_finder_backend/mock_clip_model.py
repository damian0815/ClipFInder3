from typing import List, Generator

import torch


class MockClipModel:

    @property
    def embedding_dim(self):
        return 512

    def _get_mock_features(self) -> torch.Tensor:
        return torch.randn([self.embedding_dim])

    def get_text_features(self, text: str) -> torch.Tensor:
        return self._get_mock_features()

    def get_image_features(self, image: str) -> torch.Tensor:
        return self._get_mock_features()

    def get_image_features_batched(self, images: List[str], batch_size: int = 8) -> Generator[torch.Tensor, None, None]:
        for i in range(0, len(images), batch_size):
            yield [self._get_mock_features() for _ in range(batch_size)]
