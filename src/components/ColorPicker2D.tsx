import React, { useRef } from 'react';

export const ColorPicker2D = ({ tile, onChange, onCommit }: any) => {
  const areaRef = useRef<HTMLDivElement>(null); const isDragging = useRef(false);
  const max2 = tile.colorMode === 'RGB' ? 255 : 100; const max3 = tile.colorMode === 'RGB' ? 255 : 100;
  const getBackground = () => {
    if (tile.colorMode === 'RGB') {
      return `rgb(${tile.channel1}, 255, 255)`;
    }
    return `hsl(${tile.channel1}, 100%, 50%)`;
  };

  const getPointerColor = () => {
    if (tile.colorMode === 'HSB') return hsbToHex(tile.channel1, tile.channel2, tile.channel3);
    if (tile.colorMode === 'HSL') return hslToHex(tile.channel1, tile.channel2, tile.channel3);
    return rgbToHex(tile.channel1, tile.channel2, tile.channel3);
  };

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
    <div ref={areaRef} onPointerDown={handlePointerDown} className="w-full h-32 rounded-lg relative cursor-crosshair overflow-hidden border border-white/10"
      style={{ backgroundColor: getBackground(), backgroundImage: tile.colorMode === 'HSL' ? `linear-gradient(to top, #808080, transparent), linear-gradient(to right, #808080, transparent)` : `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)` }}>
      <div className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg pointer-events-none"
           style={{ left: `calc(${(tile.channel2 / max2) * 100}% - 8px)`, top: `calc(${(1 - tile.channel3 / max3) * 100}% - 8px)`, backgroundColor: getPointerColor() }} />
    </div>
  );
};

import { hsbToHex, hslToHex, rgbToHex } from '../utils/color';
