import logging

import weaviate
import os
from PIL import Image
import base64
from io import BytesIO
from typing import Dict, List, Any

import weaviate.classes as wvc
from weaviate.collections.classes.config import Property, DataType
from weaviate.collections.classes.filters import Filter
from weaviate.collections.classes.grpc import MetadataQuery

from backend.clip_model import ClipModel
from osxmetadata import OSXMetaData

logger = logging.getLogger(__name__)


class WeaviateClient:
    def __init__(self, clip_model: ClipModel, persistence_data_path: str=None, host=None, port=None, grpc_port=None):
        """Initialize the Weaviate client wrapper."""
        logger.info("launching weaviate client...")
        if persistence_data_path is not None:
            self.client = weaviate.use_async_with_embedded(
                version="1.26.5",
                persistence_data_path=persistence_data_path
            )
        elif host is not None:
            self.client = weaviate.use_async_with_local(
                host=host,
                port=port,
                grpc_port=grpc_port
            )
        else:
            raise ValueError("Either host or persistence_data_path must be provided.")

        logger.info("launched weaviate client.")
        self.clip_model = clip_model
        self._ensure_schema()
    
    def _ensure_schema(self):
        """Ensure the Image class schema exists in Weaviate."""
        if not self.client.collections.exists("Image"):
            self.client.collections.create(
                name="Image",
                vectorizer_config=wvc.config.Configure.Vectorizer.none(),  # Since we're providing vectors manually
                vector_index_config=wvc.config.Configure.VectorIndex.dynamic(
                    distance_metric=wvc.config.VectorDistances.COSINE,
                    #quantizer=wvc.config.Configure.VectorIndex.Quantizer.bq(),
                    hnsw=wvc.config.Configure.VectorIndex.hnsw(
                        quantizer=wvc.config.Configure.VectorIndex.Quantizer.bq(),
                        ef_construction=300,
                        #distance_metric=wvc.config.VectorDistances.COSINE,
                        filter_strategy=wvc.config.VectorFilterStrategy.SWEEPING  # or ACORN (Available from Weaviate v1.27.0)
                    ),
                ),
                properties=[
                    Property(name="path",
                             data_type=DataType.TEXT,
                             index_filterable=True
                             ),
                    Property(name="tags",
                             data_type=DataType.TEXT_ARRAY,
                             default_value=[],
                             index_filterable=True
                             )
                ]
            )

    async def search_images(self, query: str) -> List[Dict[str, Any]]:
        """Search for images using a text query."""
        collection = self.client.collections.get("Image")

        #async for item in collection.iterator(
        #        include_vector=True
        #):
        #    print(item.properties)
        #    print(item.vector)

        # First, get the text embedding from your CLIP model
        query_vector = self.clip_model.get_text_features(query)

        results = await collection.query.near_vector(
            near_vector=query_vector,
            limit=100,
            return_metadata=MetadataQuery(distance=True)
        )
        #logger.info(f"query_vector: {query_vector}, results: {results}")
        return results.objects

    async def image_exists(self, file_path: str) -> bool:
        """Check if an image already exists in the database."""
        images = self.client.collections.get("Image")
        response = await images.query.fetch_objects(
            filters=Filter.by_property("path").equal(file_path)
        )
        return len(response.objects) > 0

    async def _add_image(self, file_path: str) -> bool:
        """Add a single image to the database."""
        try:
            # Skip if image already exists
            try:
                if await self.image_exists(file_path):
                    return False
            except Exception as e:
                logging.error(f"caught {e} looking for existing image for {file_path} - will conintue")
                pass
                
            # Convert image to base64
            with Image.open(file_path) as img:
                buffer = BytesIO()
                img.save(buffer, format=img.format)

                # Generate vector using MobileCLIP
                vector = self._generate_image_embedding(img)

            # Add to Weaviate with vector
            tags = [t.name for t in OSXMetaData(file_path).tags]
            await self.client.collections.get("Image").data.insert(
                properties={
                    "path": file_path,
                    "tags": tags,
                },
                vector=vector
            )
            return True
            
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}")
            return False

    async def populate_from_directory(self, image_dir: str) -> Dict[str, Any]:
        """Populate the database with images from a directory."""
        added_count = 0
        supported_formats = {'.jpg', '.jpeg', '.png', '.gif'}
        
        for root, _, files in os.walk(image_dir):
            for filename in files:
                if not any(filename.lower().endswith(fmt) for fmt in supported_formats):
                    continue
                
                file_path = os.path.join(root, filename)
                logger.info(f"adding {file_path} to database")
                
                # Add image to database
                if await self._add_image(file_path):
                    added_count += 1

        return {
            "message": f"Successfully added {added_count} images to the database",
            "count": added_count
        } 

    def _generate_image_embedding(self, image: Image) -> List[float]:
        return self.clip_model.get_image_features(image)
