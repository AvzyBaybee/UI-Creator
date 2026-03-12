import React, { useState, useEffect, useRef } from 'react';
import { getTextShadow } from '../utils/ui';

export const ColorRow = ({ label, value, onChange, onCommit, min, max, textScale, textStroke, highlightColor, onInteractionStart, onInteractionEnd, precision = 0, innerGap = 8, labelWidth = 16 }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const isDragging = useRef(false); const startVal = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setInputValue(value.toFixed(precision)); }, [value, precision]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    const initialX = e.clientX; const initialY = e.clientY;
    isDragging.current = false; startVal.current = value;
    onInteractionStart?.();
    const handleMouseMove = (me: MouseEvent) => {
      if (!isDragging.current) {
        const dist = Math.sqrt(Math.pow(me.clientX - initialX, 2) + Math.pow(me.clientY - initialY, 2));
        if (dist > 3) { isDragging.current = true; containerRef.current?.requestPointerLock(); }
      }
      if (isDragging.current) {
        let movementX = me.movementX || 0;
        const sensitivity = me.shiftKey ? 0.1 : 1;
        let nextVal = startVal.current + (movementX * sensitivity);
        if (min !== undefined) nextVal = Math.max(min, nextVal);
        if (max !== undefined) nextVal = Math.min(max, nextVal);
        let delta = nextVal - startVal.current;
        startVal.current = nextVal;
        onChange(precision === 0 ? Math.round(nextVal) : nextVal, precision === 0 ? Math.round(delta) : delta);
      }
    };
    const handleMouseUp = () => {
      if (!isDragging.current) setIsEditing(true);
      else {
        onCommit(precision === 0 ? Math.round(startVal.current) : startVal.current, false);
        if (document.pointerLockElement === containerRef.current) document.exitPointerLock();
      }
      isDragging.current = false; onInteractionEnd?.();
      window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp);
  };
  return (
    <div className="flex items-center group/scrub w-full overflow-visible" style={{ gap: innerGap }} onMouseDown={e => e.stopPropagation()}>
      <label className="text-zinc-400 text-left select-none shrink-0" style={{ width: labelWidth, fontSize: `${11 * textScale}px`, textShadow: getTextShadow(textStroke, textScale) }}>{label}</label>
      <input type="range" min={min} max={max} step={precision === 0 ? 1 : 0.01} value={value} onMouseDown={onInteractionStart} onChange={e => { const newVal = parseFloat(e.target.value); onChange(newVal, newVal - value); }} onMouseUp={e => { onCommit(parseFloat(e.target.value), false); onInteractionEnd?.(); }} style={{ accentColor: highlightColor }} className="flex-1 min-w-0" />
      {isEditing ? (
        <input ref={inputRef} autoFocus type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} 
          onFocus={(e) => e.target.select()}
          onBlur={() => { setIsEditing(false); let p = parseFloat(inputValue); if (!isNaN(p)) onCommit(p, true); else setInputValue(value.toFixed(precision)); onInteractionEnd?.(); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} style={{ fontSize: `${11 * textScale}px`, textShadow: getTextShadow(textStroke, textScale) }} className="w-8 text-right bg-transparent text-white outline-none border-b border-blue-500 shrink-0 px-0" />
      ) : (
        <div ref={containerRef} onMouseDown={handleMouseDown} style={{ fontSize: `${11 * textScale}px`, textShadow: getTextShadow(textStroke, textScale) }} className="w-8 text-right cursor-ew-resize select-none text-zinc-300 hover:text-white shrink-0 px-0">
          {precision === 0 ? Math.round(value) : value.toFixed(precision)}
        </div>
      )}
    </div>
  );
};
