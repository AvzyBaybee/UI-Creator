import React, { useRef } from 'react';

export const ColorPicker2D = ({ tile, onChange, onCommit }: any) => {
  const areaRef = useRef<HTMLDivElement>(null); const isDragging = useRef(false);
  const max2 = tile.colorMode === 'RGB' ? 255 : 100; const max3 = tile.colorMode === 'RGB' ? 255 : 100;
  const handleMove = (e: any) => {
    if (!areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onChange({ channel2: Math.round(x * max2), channel3: Math.round((1 - y) * max3) });
  };
  const handlePointerDown = (e: any) => {
    e.stopPropagation(); isDragging.current = true; handleMove(e);
    const onPointerMove = (me: any) => { if (isDragging.current) handleMove(me); };
    const onPointerUp = (me: any) => {
      isDragging.current = false; 
      if (areaRef.current) {
        const r = areaRef.current.getBoundingClientRect();
        onCommit({ channel2: Math.round(Math.max(0, Math.min(1, (me.clientX - r.left) / r.width)) * max2), channel3: Math.round((1 - Math.max(0, Math.min(1, (me.clientY - r.top) / r.height))) * max3) });
      }
      window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerup', onPointerUp);
  };
  return (
    <div ref={areaRef} onPointerDown={handlePointerDown} className="w-full h-32 rounded-lg relative cursor-crosshair overflow-hidden"
      style={{ backgroundColor: `hsl(${tile.channel1}, 100%, 50%)`, backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)` }}>
      <div className="absolute w-3 h-3 border-2 border-white rounded-full shadow-md pointer-events-none"
           style={{ left: `calc(${(tile.channel2 / max2) * 100}% - 6px)`, top: `calc(${(1 - tile.channel3 / max3) * 100}% - 6px)` }} />
    </div>
  );
};
