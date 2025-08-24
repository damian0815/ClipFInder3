

from typing import List, Generator

from PIL import Image
import torch

import logging

import open_clip
from mobileclip.modules.common.mobileone import reparameterize_model

from PIL import ImageOps
from tqdm.auto import tqdm

logger = logging.getLogger(__name__)

class AutoloadingClipModel:

    def __init__(self, load_model):
        self.load_model = load_model
        self.model = None

    def __getattr__(self, item):
        if self.model is None:
            self.model = self.load_model()
        return getattr(self.model, item)

class ClipModel:

    @staticmethod
    def convnext_xxlarge(device='mps', weights_pt_path=None):
        return ClipModel(device=device, clip_name='convnext_xxlarge', pretrained='laion2b_s34b_b82k_augreg_rewind', weights_pt_path=weights_pt_path)

    @staticmethod
    def mobileclips1(device='mps', weights_pt_path=None):
        return ClipModel(device=device, clip_name='MobileCLIP-S1', pretrained='datacompdr', weights_pt_path=weights_pt_path)

    def __init__(self,
                 clip_name='MobileCLIP-S1',
                 pretrained='datacompdr',
                 device='mps',
                 weights_pt_path=None,
                 embedding_dim=None
                 ):
        """Initialize the MobileCLIP model."""
        self.model = None
        self.clip_name = clip_name
        self.clip_pretrained = pretrained
        self.clip_weights_pt_path = weights_pt_path
        self.preprocess = None
        self.tokenizer = None
        if self.clip_name == 'MobileCLIP-S1':
            self.embedding_dim = 512
        elif self.clip_name == 'convnext_xxlarge':
            self.embedding_dim = 1024
        else:
            if embedding_dim is None:
                raise ValueError(f'unknown clip model name {self.clip_name}, please specify embedding dim')
            self.embedding_dim = embedding_dim
        self.device = device


    @property
    def distinct_identifier(self):
        return f'{self.clip_name}_{self.clip_pretrained}' + (
            '' if self.clip_weights_pt_path is None else ('_' + self.clip_weights_pt_path.replace('/', '__'))
        )


    def load_model(self):
        """Load the MobileCLIP model weights and prepare for inference."""
        logger.info(f"loading {self.clip_name}/{self.clip_pretrained}, weights {self.clip_weights_pt_path}...")
        model, _, preprocess = open_clip.create_model_and_transforms(
            self.clip_name,
            pretrained=self.clip_pretrained,
            device=self.device,
            output_dict=True
        )
        if self.clip_weights_pt_path is not None:
            weights = torch.load(self.clip_weights_pt_path)
            model.load_state_dict(weights)
            del weights
        tokenizer = open_clip.get_tokenizer(self.clip_name)
        logger.info("loaded.")

        # For inference/model exporting purposes, please reparameterize first
        model.eval()
        model = reparameterize_model(model)
        self.model = model
        self.preprocess = preprocess
        self.tokenizer = tokenizer
        return self


    def get_image_features(self, image: str|Image.Image) -> torch.Tensor:
        i, e = next(self.get_image_features_batched([image]))
        return e.unsqueeze(0)


    def get_image_features_batched(self, images: List[str|Image.Image], batch_size: int=10, show_pbar=True) -> Generator[tuple[str|Image.Image, torch.Tensor], None, None]:
        if type(images) is not list:
            raise ValueError(f"images must be a list, got {type(images)}")
        types = set([type(i) for i in images])
        if not types.issubset(set([str])):
            raise ValueError(f"images must be a list of str or PIL.Image, got {types}")
        if self.model is None:
            self.load_model()
        image_chunks = [images[i:i+batch_size]
                        for i in range(0, len(images), batch_size)]
        with tqdm(total=len(image_chunks), disable=not show_pbar, desc="computing CLIP embeddings") as pbar:
            for chunk_input in image_chunks:
                chunk_preprocessed = list(self._preprocess_images(chunk_input))
                # we may have to drop images during preprocessing - so chunk_images may be different from input
                chunk_images = [p[0] for p in chunk_preprocessed]
                chunk_features = torch.stack([p[1] for p in chunk_preprocessed])
                with torch.no_grad():
                    image_features = self.model.encode_image(chunk_features, normalize=True)
                    image_features /= image_features.norm(dim=-1, keepdim=True)
                    pbar.update(len(chunk_input))
                    for i in range(image_features.shape[0]):
                        yield chunk_images[i], image_features[i]


    def _preprocess_images(self, images: List[str|Image.Image]) -> Generator[tuple[str|Image.Image, torch.Tensor], None, None]:
        for path_or_img in images:
            img = None
            img_needs_close = False
            try:
                if type(path_or_img) is list:
                    raise RuntimeError("list of lists passed to _preprocess_images")
                if type(path_or_img) is str:
                    img = Image.open(path_or_img)
                    img_needs_close = True
                else:
                    img = path_or_img
                if not img:
                    raise RuntimeError(f"Couldn't load image from {path_or_img}")
                yield path_or_img, self.preprocess(ImageOps.exif_transpose(
                    img.convert('RGB')
                )).to(self.device)
            except Exception as e:
                print("caught exception:", e, "loading image from ", path_or_img)
                raise
            finally:
                if img_needs_close:
                    img.close()


    def get_text_features(self, text: str|list[str]) -> torch.Tensor:
        """Extract feature vector from text using MobileCLIP.

        Args:
            text: Input text to encode

        Returns:
            List of floats representing the text embedding
        """
        if self.model is None:
            self.load_model()
        if isinstance(text, str):
            text = [text]
        tokens = self.tokenizer(text).to(self.device)
        with torch.no_grad():
            text_features = self.model.encode_text(tokens, normalize=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)
        return text_features
