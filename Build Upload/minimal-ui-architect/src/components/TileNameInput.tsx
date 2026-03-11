import React, { useRef } from 'react';
import { getTextShadow } from '../utils/ui';

export const TileNameInput = ({ name, onChange, onCommit, textScale, textStroke, textColor = 'white', showTooltip, hideTooltip }: any) => {
  const elRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full overflow-hidden relative"
         onMouseEnter={() => { if (name.length > 10 && showTooltip) showTooltip(name); }}
         onMouseLeave={() => { if (hideTooltip) hideTooltip(); }}>
        <div
            ref={elRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
                const val = e.currentTarget.innerText;
                onChange({ target: { value: val } });
                onCommit({ target: { value: val } });
                window.getSelection()?.removeAllRanges();
                e.currentTarget.scrollLeft = 0;
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            onPointerDown={e => e.stopPropagation()}
            className={`font-bold outline-none whitespace-nowrap px-2 py-1 cursor-text ${name.length > 12 ? 'hover:animate-marquee focus:animate-none' : ''}`}
            style={{ 
                fontSize: `${14 * textScale}px`, 
                textShadow: getTextShadow(textStroke, textScale), 
                color: textColor,
                textAlign: name.length > 12 ? 'left' : 'center',
                minWidth: '100%',
                display: 'inline-block'
            }}
        >
            {name}
        </div>
    </div>
  );
};
