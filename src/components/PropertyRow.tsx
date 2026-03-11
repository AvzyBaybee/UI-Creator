import React, { useState, useEffect, useRef } from 'react';
import { getTextShadow } from '../utils/ui';

export const PropertyRow = ({ label, value, onChange, onCommit, min, max, textScale, textStroke, tooltip, showTooltip, hideTooltip, onInteractionStart, onInteractionEnd, precision = 0, innerGap = 8, textColor = 'white' }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const isDragging = useRef(false);
  const startVal = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setInputValue(value.toFixed(precision)); }, [value, precision]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleLockChange = () => {
      if (document.pointerLockElement !== containerRef.current && isDragging.current) {
        isDragging.current = false;
        onCommit(startVal.current, false);
        onInteractionEnd?.();
      }
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => document.removeEventListener('pointerlockchange', handleLockChange);
  }, [onCommit, onInteractionEnd]);

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
        if (Math.abs(movementX) > 500) movementX = 0;
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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex items-center justify-center group/scrub w-full overflow-visible" style={{ gap: innerGap }} onMouseDown={e => e.stopPropagation()}>
      <label
        className="text-zinc-400 cursor-help select-none shrink-0 pr-1"
        style={{ fontSize: `${11 * textScale}px`, textShadow: getTextShadow(textStroke, textScale) }}
        onMouseEnter={() => showTooltip(tooltip)}
        onMouseLeave={hideTooltip}
      >
        {label}:
      </label>
      {isEditing ? (
        <input
          ref={inputRef}
          autoFocus type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={() => { setIsEditing(false); let p = parseFloat(inputValue); if (!isNaN(p)) onCommit(p, true); else setInputValue(value.toFixed(precision)); onInteractionEnd?.(); }}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{ fontSize: `${11 * textScale}px`, textShadow: getTextShadow(textStroke, textScale) }}
          className="w-12 text-left bg-transparent text-white outline-none border-b border-blue-500 px-1"
        />
      ) : (
        <div
          ref={containerRef} onMouseDown={handleMouseDown}
          style={{ fontSize: `${11 * textScale}px`, textShadow: getTextShadow(textStroke, textScale), color: textColor }}
          className="text-left cursor-ew-resize select-none hover:opacity-80 px-1 shrink-0"
        >
          {precision === 0 ? Math.round(value) : value.toFixed(precision)}
        </div>
      )}
    </div>
  );
};
