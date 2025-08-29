import { useEffect } from 'react';
import { API_BASE_URL } from '@/Constants';
import Image from '@/types/image';

interface MacOSQuickLookProps {
  image: Image;
  onClose: () => void;
}

export function MacOSQuickLook({ image, onClose }: MacOSQuickLookProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* Full window but avoiding right sidebar (320px for tag editor) */}
      <div className="fixed inset-4 right-80 pointer-events-auto">
        {/* Image Content - no background, just drop shadow */}
        <div className="flex items-center justify-center w-full h-full p-8">
          <img
            src={`${API_BASE_URL}/api/image/${image.id}`}
            alt={image.path}
            className="max-w-full max-h-full object-contain rounded-lg"
            style={{
              filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.5))'
            }}
          />
        </div>
        
        {/* Floating info overlay - positioned over the image */}
        <div className="absolute bottom-8 left-8 right-8">
          <div className="bg-black/80 backdrop-blur-sm text-white rounded-lg px-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="truncate">
                {image.path.split('/').pop() || 'Unknown'}
              </div>
              {image.distance !== undefined && (
                <div className="ml-4 flex-shrink-0">
                  Distance: {image.distance.toFixed(3)}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-300 mt-1 truncate">
              {image.path}
            </div>
          </div>
        </div>
        
        {/* Instruction text */}
        <div className="absolute bottom-2 left-0 right-0 text-center">
          <div className="text-xs text-white bg-black/60 rounded px-2 py-1 mx-auto inline-block">
            Use arrow keys to navigate • Space or Esc to close
          </div>
        </div>
      </div>
    </div>
  );
}
