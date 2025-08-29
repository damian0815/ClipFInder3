import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from '@/types/image';
import { ResultImage } from '@/Components/ResultImage';
import { MacOSQuickLook } from '@/Components/MacOSQuickLook';
import { TagMergeProvider } from '@/contexts/TagMergeContext';

interface ImageResultsGridProps {
  images: Image[];
  onSelect: (selectedImages: Image[]) => void;
  onAddToQuery: (image: Image) => void;
  onImageDeleted?: (imageId: string) => void;
}

function ImageResultsGrid({ 
  images, 
  onSelect, 
  onAddToQuery, 
  onImageDeleted: _ 
}: ImageResultsGridProps) {
  const [selectedImages, setSelectedImages] = useState<Image[]>([]);
  const [focusedImageIndex, setFocusedImageIndex] = useState<number>(-1);
  const [gridHasFocus, setGridHasFocus] = useState<boolean>(false);
  const [quickLookVisible, setQuickLookVisible] = useState<boolean>(false);
  const [thumbnailSizeIndex, setThumbnailSizeIndex] = useState<number>(2);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridColumns, setGridColumns] = useState<number>(1);

  // Define Tailwind size options
  const sizeOptions = [
    { name: 'XS', class: 'w-16 h-16', minWidth: '4rem' },
    { name: 'SM', class: 'w-20 h-20', minWidth: '5rem' },
    { name: 'MD', class: 'w-32 h-32', minWidth: '8rem' },
    { name: 'LG', class: 'w-48 h-48', minWidth: '12rem' },
    { name: 'XL', class: 'w-64 h-64', minWidth: '16rem' },
    { name: '2XL', class: 'w-88 h-88', minWidth: '22rem' },
    { name: '3XL', class: 'w-112 h-112', minWidth: '28rem' },
    { name: '4XL', class: 'w-136 h-136', minWidth: '34rem' }
  ];

  const currentSize = sizeOptions[thumbnailSizeIndex];

  // Calculate grid columns based on container width and thumbnail size
  useEffect(() => {
    const updateGridColumns = () => {
      if (!gridRef.current) return;
      
      const containerWidth = gridRef.current.offsetWidth;
      const thumbnailWidth = parseInt(currentSize.minWidth) * 16; // Convert rem to px
      const columns = Math.floor(containerWidth / (thumbnailWidth + 16)); // 16px for gap
      setGridColumns(Math.max(1, columns));
    };

    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, [currentSize.minWidth]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gridHasFocus || images.length === 0) return;

    let newIndex = focusedImageIndex;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = Math.max(0, focusedImageIndex - 1);
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        newIndex = Math.min(images.length - 1, focusedImageIndex + 1);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(0, focusedImageIndex - gridColumns);
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(images.length - 1, focusedImageIndex + gridColumns);
        break;
        
      case ' ':
        e.preventDefault();
        if (focusedImageIndex >= 0) {
          setQuickLookVisible(!quickLookVisible);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        if (quickLookVisible) {
          setQuickLookVisible(false);
        } else {
          setGridHasFocus(false);
          setFocusedImageIndex(-1);
        }
        break;
        
      case 'Enter':
        e.preventDefault();
        if (focusedImageIndex >= 0) {
          const focusedImage = images[focusedImageIndex];
          if (e.shiftKey || e.metaKey) {
            // Add to selection
            if (!selectedImages.includes(focusedImage)) {
              const newSelection = [...selectedImages, focusedImage];
              setSelectedImages(newSelection);
              onSelect(newSelection);
            }
          } else {
            // Replace selection
            setSelectedImages([focusedImage]);
            onSelect([focusedImage]);
          }
        }
        break;
    }
    
    if (newIndex !== focusedImageIndex && newIndex >= 0 && newIndex < images.length) {
      setFocusedImageIndex(newIndex);
      scrollToImage(newIndex);
    }
  }, [gridHasFocus, focusedImageIndex, images, quickLookVisible, gridColumns, selectedImages, onSelect]);

  const scrollToImage = (index: number) => {
    const imageElement = gridRef.current?.children[1]?.children[index] as HTMLElement; // Skip the controls div
    if (imageElement) {
      imageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleGridClick = (e: React.MouseEvent) => {
    // Focus grid when clicking on the grid container
    if (e.target === e.currentTarget) {
      setGridHasFocus(true);
      if (images.length > 0 && focusedImageIndex === -1) {
        setFocusedImageIndex(0);
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent, image: Image) => {
    const index = images.findIndex(img => img.id === image.id);
    setGridHasFocus(true);
    setFocusedImageIndex(index);
    
    if (e.shiftKey || e.metaKey) {
      const isSelected = selectedImages.includes(image);
      let newSelection: Image[];
      if (isSelected) {
        newSelection = selectedImages.filter(img => img !== image);
      } else {
        newSelection = [...selectedImages, image];
      }
      setSelectedImages(newSelection);
      onSelect(newSelection);
    } else {
      setSelectedImages([image]);
      onSelect([image]);
    }
  };

  const focusedImage = focusedImageIndex >= 0 ? images[focusedImageIndex] : null;

  return (
    <TagMergeProvider>
      <div className="space-y-4">
        {/* Thumbnail Size Control */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
          <label className="text-sm font-medium text-slate-700">Thumbnail Size:</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max={sizeOptions.length - 1}
              value={thumbnailSizeIndex}
              onChange={(e) => setThumbnailSizeIndex(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-slate-600 min-w-[3rem]">{currentSize.name}</span>
          </div>
          <div className="text-xs text-slate-500">
            {gridHasFocus ? (
              <span className="text-blue-600">
                Grid focused • Use arrow keys to navigate • Space for QuickLook
              </span>
            ) : (
              'Click on the grid to enable keyboard navigation'
            )}
          </div>
        </div>

        {/* Image Grid */}
        <div
          ref={gridRef}
          className={`grid gap-4 p-4 min-h-[200px] outline-none rounded-lg border-2 transition-colors ${
            gridHasFocus 
              ? 'border-blue-500 bg-blue-50/30' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${currentSize.minWidth}, 1fr))`
          }}
          onClick={handleGridClick}
          tabIndex={0}
          onFocus={() => {
            setGridHasFocus(true);
            if (images.length > 0 && focusedImageIndex === -1) {
              setFocusedImageIndex(0);
            }
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setGridHasFocus(false);
            }
          }}
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`relative transition-all duration-150 ${
                index === focusedImageIndex 
                  ? 'ring-2 ring-blue-500 ring-offset-2 scale-105' 
                  : ''
              }`}
            >
              <ResultImage
                image={image}
                isSelected={selectedImages.includes(image)}
                onClick={(e, img) => handleImageClick(e, img)}
                onAddToQuery={onAddToQuery}
                onRevealInFinder={() => {}} // TODO: implement if needed
                className={currentSize.class}
              />
            </div>
          ))}
        </div>
        
        {/* Status */}
        {images.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No images to display
          </div>
        )}
      </div>
      
      {/* macOS-style QuickLook */}
      {quickLookVisible && focusedImage && (
        <MacOSQuickLook
          image={focusedImage}
          onClose={() => setQuickLookVisible(false)}
        />
      )}
    </TagMergeProvider>
  );
}

export default ImageResultsGrid;
