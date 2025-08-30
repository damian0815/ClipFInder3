import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from '@/types/image';
import { ResultImage } from '@/Components/ResultImage';
import { MacOSQuickLook } from '@/Components/MacOSQuickLook';
import { TagMergeProvider } from '@/contexts/TagMergeContext';

interface ImageResultsGridProps {
  images: Image[];
  onSelect: (selectedImages: Image[]) => void;
  onAddToQuery: (image: Image) => void;
  onRevealInFinder: (image: Image) => void;
  onMoveToTrash: (image: Image) => boolean;
  thumbnailSize: number;
  gridHasFocus: boolean;
  onGridFocusChange: (focused: boolean) => void;
}

function ImageResultsGrid({
  images,
  onSelect,
  onAddToQuery,
  onRevealInFinder,
  onMoveToTrash,
  thumbnailSize,
  gridHasFocus,
  onGridFocusChange
}: ImageResultsGridProps) {
  const [selectedImages, setSelectedImages] = useState<Image[]>([]);
  const [focusedImageIndex, setFocusedImageIndex] = useState<number>(-1);
  const [quickLookVisible, setQuickLookVisible] = useState<boolean>(false);
  const [selectionAnchor, setSelectionAnchor] = useState<number>(-1); // For range selection
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridColumns, setGridColumns] = useState<number>(1);

  // Calculate grid columns based on container width and thumbnail size
  useEffect(() => {
    const updateGridColumns = () => {
      if (!gridRef.current) return;

      const containerWidth = gridRef.current.offsetWidth;
      const thumbnailWidth = thumbnailSize * 4; // Convert rem to px
      const columns = Math.floor(containerWidth / (thumbnailWidth + 16)); // 16px for gap
      setGridColumns(Math.max(1, columns));
    };

    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, [thumbnailSize]);

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
          // Clear selection when Escape is pressed and QuickLook isn't open
          setSelectedImages([]);
          onSelect([]);
          setSelectionAnchor(-1);
          onGridFocusChange(false);
          setFocusedImageIndex(-1);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (focusedImageIndex >= 0) {
          const focusedImage = images[focusedImageIndex];
          if (e.shiftKey || e.metaKey) {
            // Add to selection
            const isAlreadySelected = selectedImages.includes(focusedImage);
            if (isAlreadySelected) {
              // Remove from selection
              const newSelection = selectedImages.filter(img => img !== focusedImage);
              setSelectedImages(newSelection);
              onSelect(newSelection);
            } else {
              // Add to selection
              const newSelection = [...selectedImages, focusedImage];
              setSelectedImages(newSelection);
              onSelect(newSelection);
            }
          } else {
            // Replace selection and set anchor
            setSelectedImages([focusedImage]);
            onSelect([focusedImage]);
            setSelectionAnchor(focusedImageIndex);
          }
        }
        break;
    }

    if (newIndex !== focusedImageIndex && newIndex >= 0 && newIndex < images.length) {
      setFocusedImageIndex(newIndex);
      console.log('scrolling to image index:', newIndex);
      scrollToImage(newIndex);

      if (e.shiftKey && selectionAnchor >= 0) {
        // Extend selection from anchor to new position
        const startIndex = Math.min(selectionAnchor, newIndex);
        const endIndex = Math.max(selectionAnchor, newIndex);
        const rangeSelection = images.slice(startIndex, endIndex + 1);

        setSelectedImages(rangeSelection);
        onSelect(rangeSelection);
      } else if (!e.shiftKey) {
        // Normal navigation without shift - set new anchor but don't change selection unless nothing is selected
        setSelectionAnchor(newIndex);

        // Only auto-select if no current selection
        if (selectedImages.length === 0) {
          const focusedImage = images[newIndex];
          setSelectedImages([focusedImage]);
          onSelect([focusedImage]);
        }
      }
      // If shift is held but no anchor, don't change selection
    }
  }, [gridHasFocus, focusedImageIndex, images, quickLookVisible, gridColumns, selectedImages, onSelect, selectionAnchor]);

  const scrollToImage = (index: number) => {
    if (index < 0 || index >= images.length) return;

    const imageId = images[index].id;
    const imageElement = document.querySelector(`[data-image-id="${imageId}"]`) as HTMLElement;
    if (imageElement) {
      imageElement.scrollIntoView({
        behavior: 'auto', // Changed from 'smooth' to 'auto' for immediate response
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
      onGridFocusChange(true);
      if (images.length > 0 && focusedImageIndex === -1) {
        setFocusedImageIndex(0);
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent, image: Image) => {
    const index = images.findIndex(img => img.id === image.id);
    onGridFocusChange(true);
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
      // Regular click - replace selection and set anchor
      setSelectedImages([image]);
      onSelect([image]);
      setSelectionAnchor(index);
    }
  };

  const handleMoveToTrash = (image: Image) => {
    const trashed = onMoveToTrash(image);
    if (trashed) {
      if (selectedImages.includes(image)) {
        const newSelection = selectedImages.filter(img => img !== image);
        setSelectedImages(newSelection);
        onSelect(newSelection);
      }
    }
    return trashed
  }

  const focusedImage = focusedImageIndex >= 0 ? images[focusedImageIndex] : null;

  return (
    <TagMergeProvider>
      <div className="space-y-4">
        {/* Image Grid */}
        <div
          ref={gridRef}
          className={`grid gap-4 p-4 min-h-[200px] outline-none rounded-lg border-2 ${
            gridHasFocus 
              ? 'border-blue-500 bg-blue-50/30' 
              : 'border-slate-200 hover:border-slate-300'
          } grid-cols-[repeat(auto-fill,minmax(var(--min-width),1fr))]`}
          style={{ "--min-width": `${thumbnailSize/4}rem` } as React.CSSProperties}
          onClick={handleGridClick}
          tabIndex={0}
          onFocus={() => {
            onGridFocusChange(true);
            if (images.length > 0 && focusedImageIndex === -1) {
              setFocusedImageIndex(0);
            }
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              onGridFocusChange(false);
            }
          }}
        >
          {images.map((image, index) => {
            const isFocused = index === focusedImageIndex;
            const isSelected = selectedImages.includes(image);

            return (
              <div
                key={image.id}
                data-image-id={image.id}
                className={`relative ${
                  isFocused 
                    ? 'ring-2 ring-yellow-400 ring-offset-2 scale-105' 
                    : ''
                } ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-1'
                    : ''
                }`}
              >
                <ResultImage
                  image={image}
                  isSelected={isSelected}
                  onClick={(e, img) => handleImageClick(e, img)}
                  onAddToQuery={onAddToQuery}
                  onRevealInFinder={onRevealInFinder}
                  onMoveToTrash={handleMoveToTrash}
                  className={`w-${thumbnailSize} h-${thumbnailSize}`}
                />
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
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
