import React from 'react';

export const ToolButton = ({ icon, label, active, onClick }: any) => (
  <div className="relative group">
    <button onClick={onClick} className="p-2 rounded-xl transition-all flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5" style={{ backgroundColor: active ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: active ? '#60a5fa' : undefined }}>{icon}</button>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">{label}</div>
  </div>
);
