import logging
from typing import List

import torch
from PIL import Image
import open_clip
from mobileclip.modules.common.mobileone import reparameterize_model

from backend.clip_model import ClipModel
from PIL import ImageOps

logger = logging.getLogger(__name__)

class MobileClipModel(ClipModel):
    def __init__(self):
        """Initialize the MobileCLIP model."""
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        pass

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

    def get_image_features(self, image: Image) -> List[float]:
        """Extract feature vector from image using MobileCLIP.

        Args:
            image: PIL Image to process

        Returns:
            List of floats representing the image embedding
        """
        if self.model is None:
            self.load_model()
        image = self.preprocess(image.convert('RGB')).unsqueeze(0)
        image = ImageOps.exif_transpose(image)
        with torch.no_grad(), torch.cuda.amp.autocast():
            image_features = self.model.encode_image(image)
            image_features /= image_features.norm(dim=-1, keepdim=True)
        return image_features[0].cpu().tolist()

    def get_text_features(self, text: str) -> List[float]:
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
            text_features = self.model.encode_text(text)
            text_features /= text_features.norm(dim=-1, keepdim=True)
        return text_features[0].cpu().tolist()
