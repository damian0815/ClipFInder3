import React, { useState, useRef, useEffect } from 'react';

interface ZoomableContainerProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
}

const ZoomableContainer: React.FC<ZoomableContainerProps> = ({
  children,
  minScale = 0.1,
  maxScale = 10,
  initialScale = 1,
}) => {
  const [scale, setScale] = useState(initialScale);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));

    // Calculate cursor position relative to container
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Adjust offset to zoom toward cursor position
    const newOffsetX = offset.x - x * (newScale - scale);
    const newOffsetY = offset.y - y * (newScale - scale);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = (e.clientX - dragStart.x) / scale;
    const dy = (e.clientY - dragStart.y) / scale;

    setOffset({ x: offset.x + dx, y: offset.y + dy });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    // Reset to initial view
    setScale(initialScale);
    setOffset({ x: 0, y: 0 });
  };

  // Add and remove window event listeners for mouse up
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: 'fit-content',
          height: 'fit-content',
          position: 'absolute'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ZoomableContainer;