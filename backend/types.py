from dataclasses import dataclass
from enum import Enum
from backend.util import get_tags

from pydantic import BaseModel
from pydantic.alias_generators import to_camel


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


class ResultFilters(BaseModel):
    path_contains: list[str] = []
    path_not_contains: list[str] = []
    required_tags_and: list[str] = []
    required_tags_or: list[str] = []
    excluded_tags: list[str] = []

    class Config:
        alias_generator = to_camel


class ZeroShotClassifyRequest(BaseModel):
    classes: list[EmbeddingRequest]
    filters: ResultFilters

    @property
    def is_empty(self) -> bool:
        non_empty_classes = [c for c in self.classes if not c.is_empty]
        return len(non_empty_classes) < 2


@dataclass
class ImageResponse:
    id: str
    path: str
    distance: float
    tags: list[str]

    def __init__(self, id, path, distance=None, tags=None):
        self.id = id
        self.path = path
        self.distance = distance or 0
        self.tags = tags or get_tags(path)
        if self.tags:
            print('tags:', self.tags, 'path:', path)


@dataclass
class ZeroShotClassification:
    image: ImageResponse
    best_cls: str
    entropy: float
    order_key: float|list[float]


