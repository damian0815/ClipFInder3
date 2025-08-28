import React, { useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/Constants';
import Image from '@/types/image';

interface QuickLookOverlayProps {
    image: Image | null;
    onClose: () => void;
}

export function QuickLookOverlay({ image, onClose }: QuickLookOverlayProps) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === ' ') {
            e.preventDefault();
            onClose();
        }
    }, [onClose]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        // Only close if clicking on the backdrop, not the image
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        // Prevent scrolling when overlay is open
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    if (!image) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center w-full h-full"
            style={{ zIndex: 9999, position: 'fixed' }}
            onClick={handleBackdropClick}
        >
            <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                    src={`${API_BASE_URL}/api/image/${image.id}`}
                    alt={image.path}
                    className="w-full h-full object-contain shadow-2xl"
                />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-colors"
                    style={{ zIndex: 10000 }}
                >
                    ×
                </button>

                {/* Image info */}
                <div
                    className="absolute bottom-4 left-4 right-4 text-white bg-black bg-opacity-50 rounded p-3"
                    style={{ zIndex: 10000 }}
                >
                    <div className="text-sm font-medium truncate">{image.path}</div>
                    {image.distance !== undefined && (
                        <div className="text-xs text-gray-300">Distance: {image.distance.toFixed(3)}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
