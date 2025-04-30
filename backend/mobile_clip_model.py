import asyncio
import logging
from typing import List, Generator, Awaitable

import torch
from PIL import Image
import open_clip
from mobileclip.modules.common.mobileone import reparameterize_model

from backend.clip_model import ClipModel
from PIL import ImageOps
from tqdm.auto import tqdm

from backend.progress_websocket.progress_broadcaster import ProgressBroadcaster

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

    def load_model(self, progress_label: str = 'Loading CLIP model'):
        """Load the MobileCLIP model weights and prepare for inference."""
        logger.info("loading MobileCLIP-S2...")
        model, _, preprocess = open_clip.create_model_and_transforms('MobileCLIP-S2', pretrained='datacompdr')
        ProgressBroadcaster.instance().send_progress(progress_label, 0.98)
        tokenizer = open_clip.get_tokenizer('MobileCLIP-S2')
        logger.info("loaded.")
        ProgressBroadcaster.instance().send_progress(progress_label, 0.99)

        # For inference/model exporting purposes, please reparameterize first
        model.eval() 
        model = reparameterize_model(model)
        self.model = model
        self.preprocess = preprocess
        self.tokenizer = tokenizer
        ProgressBroadcaster.instance().send_progress(progress_label, 1)

        return self

    async def get_image_features(self, image: str) -> torch.Tensor:
        return self.get_image_features_batched([image])

    async def get_image_features_batched(self, images: List[str], batch_size: int = 8
                                   ) -> Generator[torch.Tensor, None, None]:

        if self.model is None:
            await self.load_model()
        image_chunks = [images[i:i+batch_size]
                        for i in range(0, len(images), batch_size)]
        for chunk_index, chunk in enumerate(tqdm(image_chunks)):
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


    async def get_text_features(self, text: str) -> torch.Tensor:
        """Extract feature vector from text using MobileCLIP.
        
        Args:
            text: Input text to encode
            
        Returns:
            List of floats representing the text embedding
        """
        if self.model is None:
            await self.load_model()
        text = self.tokenizer([text])
        with torch.no_grad(), torch.cuda.amp.autocast():
            text_features = self.model.encode_text(text, normalize=True)
        return text_features[0]
