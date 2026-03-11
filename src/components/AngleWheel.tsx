import React, { useState, useRef, useEffect } from 'react';

interface AngleWheelProps {
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  size?: number;
}

export const AngleWheel: React.FC<AngleWheelProps> = ({ value, onChange, onCommit, size = 32 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateAngle(e.clientX, e.clientY);
  };

  const updateAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate angle in degrees (0 is top, clockwise)
    let angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    angle += 90; // Shift so 0 is top
    if (angle < 0) angle += 360;
    
    onChange(Math.round(angle));
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      updateAngle(e.clientX, e.clientY);
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        onCommit(value);
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, value, onChange, onCommit]);

  return (
    <div 
      ref={wheelRef}
      className="relative rounded-full border border-white/20 bg-black/20 cursor-pointer flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      onPointerDown={handlePointerDown}
    >
      <div 
        className="absolute w-0.5 h-1/2 bg-blue-500 origin-bottom"
        style={{ 
          bottom: '50%', 
          transform: `rotate(${value}deg)`,
          borderRadius: '2px 2px 0 0'
        }}
      />
      <div className="absolute w-1.5 h-1.5 bg-white rounded-full" />
    </div>
  );
};
