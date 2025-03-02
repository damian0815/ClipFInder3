from dataclasses import dataclass

from pydantic import BaseModel


class EmbeddingRequest(BaseModel):
    id: str
    texts: list[str] = []
    images: list[str] = []

    @property
    def is_empty(self) -> bool:
        return (
                len(self.images) == 0 and
                all(len(t.strip()) == 0 for t in self.texts)
        )


class ZeroShotClassifyRequest(BaseModel):
    classes: list[EmbeddingRequest]

    @property
    def is_empty(self) -> bool:
        non_empty_classes = [c for c in self.classes if not c.is_empty]
        return len(non_empty_classes) < 2


@dataclass
class ImageResponse:
    id: str
    path: str
    distance: float|None = None
    tags: list[str]|None = None


@dataclass
class ZeroShotClassification:
    image: ImageResponse
    best_cls: str
    entropy: float


