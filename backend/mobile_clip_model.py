import logging
from typing import List, Generator

import torch
from PIL import Image
import open_clip
from mobileclip.modules.common.mobileone import reparameterize_model

from backend.clip_model import ClipModel
from PIL import ImageOps
from tqdm.auto import tqdm

logger = logging.getLogger(__name__)

class MobileClipModel(ClipModel):
    def __init__(self):
        """Initialize the MobileCLIP model."""
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        pass

    @property
    def embedding_dim(self):
        return 512

    def load_model(self):
        """Load the MobileCLIP model weights and prepare for inference."""
        logger.info("loading MobileCLIP-S2...")
        model, _, preprocess = open_clip.create_model_and_transforms('MobileCLIP-S2', pretrained='datacompdr')
        tokenizer = open_clip.get_tokenizer('MobileCLIP-S2')
        logger.info("loaded.")

        # For inference/model exporting purposes, please reparameterize first
        model.eval() 
        model = reparameterize_model(model)
        self.model = model
        self.preprocess = preprocess
        self.tokenizer = tokenizer
        return self

    def get_image_features(self, image: str) -> torch.Tensor:
        return self.get_image_features_batched([image])

    def get_image_features_batched(self, images: List[str], batch_size: int=8) -> Generator[torch.Tensor, None, None]:
        if self.model is None:
            self.load_model()
        image_chunks = [images[i:i+batch_size]
                        for i in range(0, len(images), batch_size)]
        for chunk in tqdm(image_chunks):
            def load_images(chunk) -> Generator[Image, None, None]:
                for path in chunk:
                    try:
                        with Image.open(path) as img:
                            yield ImageOps.exif_transpose(
                                img.convert('RGB')
                            )
                    except Exception as e:
                        print("caught exception:", e, "loading image", path)
                        continue

            chunk = torch.stack([self.preprocess(i) for i in load_images(chunk) if i is not None])
            with torch.no_grad():
                image_features = self.model.encode_image(chunk, normalize=True)
                for i in range(image_features.shape[0]):
                    yield image_features[i]


    def get_text_features(self, text: str) -> torch.Tensor:
        """Extract feature vector from text using MobileCLIP.
        
        Args:
            text: Input text to encode
            
        Returns:
            List of floats representing the text embedding
        """
        if self.model is None:
            self.load_model()
        text = self.tokenizer([text])
        with torch.no_grad(), torch.cuda.amp.autocast():
            text_features = self.model.encode_text(text, normalize=True)
        return text_features[0]
