import hashlib
from pathlib import Path
from PIL import Image
import platformdirs
from PIL import ImageOps

class ThumbnailProvider:
    def __init__(self, thumbnail_size=(512, 512)):
        self.thumbnail_size = thumbnail_size
        self.cache_dir = Path(platformdirs.user_cache_dir("clipfinder3")) / "thumbnails"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_thumbnail_path(self, original_path: str) -> Path:
        """Generate a unique thumbnail path based on the original image path."""
        # Create a hash of the original path to use as the thumbnail filename
        path_hash = hashlib.sha256(original_path.encode()).hexdigest()
        return self.cache_dir / f"{path_hash}.jpg"

    def get_or_create_thumbnail(self, image_path: str) -> Path:
        """Get existing thumbnail or create a new one if it doesn't exist."""
        thumbnail_path = self.get_thumbnail_path(image_path)
        
        # Return existing thumbnail if it exists
        if thumbnail_path.exists():
            return thumbnail_path

        # Create new thumbnail
        try:
            with Image.open(image_path) as img:
                # Convert to RGB if necessary (handles PNG with transparency)
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                img = ImageOps.exif_transpose(img)

                # Create thumbnail
                img.thumbnail(self.thumbnail_size, Image.Resampling.LANCZOS)
                img.save(thumbnail_path, "JPEG", quality=85)
                
            return thumbnail_path
        except Exception as e:
            raise RuntimeError(f"Failed to create thumbnail: {str(e)}") 