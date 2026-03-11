import React, { useState } from 'react';
import { CanvasElement, GroupData } from '../types';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, FolderPlus, Box, Palette, ChevronRight, ChevronDown, GripVertical, Eye, EyeOff, Trash2, Edit3 } from 'lucide-react';

interface SortableItemProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  depth: number;
}

const SortableItem = ({ element, isSelected, onSelect, onToggleExpand, onDelete, onRename, onToggleVisibility, depth }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: `${depth * 16 + 8}px`,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(element.name);

  const handleRename = () => {
    onRename(element.id, tempName);
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-1.5 px-2 group cursor-default border-l-2 transition-colors ${
        isSelected ? 'bg-blue-500/20 border-blue-500' : 'hover:bg-white/5 border-transparent'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity">
        <GripVertical size={14} />
      </div>

      {element.type === 'group' && (
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleExpand(element.id); }}
          className="p-0.5 hover:bg-white/10 rounded"
        >
          {(element as GroupData).expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {element.type === 'group' ? (
          <Folder size={14} className="text-amber-400 shrink-0" />
        ) : element.type === 'color' ? (
          <Palette size={14} className="text-pink-400 shrink-0" />
        ) : (
          <Box size={14} className="text-blue-400 shrink-0" />
        )}

        {isEditing ? (
          <input
            autoFocus
            className="bg-black/40 border border-blue-500/50 rounded px-1 text-xs text-white w-full outline-none"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs truncate flex-1">{element.name || 'Untitled'}</span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
        >
          <Edit3 size={12} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }}
          className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"
        >
          {(element as any).visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
          className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

interface ElementsPanelProps {
  elements: CanvasElement[];
  selectedIds: string[];
  onSelect: (id: string, multi: boolean) => void;
  onReorder: (newElements: CanvasElement[]) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleVisibility: (id: string) => void;
  onCreateGroup: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const ElementsPanel = ({ 
  elements, 
  selectedIds, 
  onSelect, 
  onReorder, 
  onToggleExpand, 
  onDelete, 
  onRename, 
  onToggleVisibility,
  onCreateGroup,
  collapsed,
  onToggleCollapse
}: ElementsPanelProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const activeId = active.id as string;
      const overId = over.id as string;
      
      if (activeId === overId) return;

      const activeEl = elements.find(el => el.id === activeId);
      const overEl = elements.find(el => el.id === overId);
      
      if (!activeEl || !overEl) return;

      let newElements = [...elements];

      // If dropped over a group, move into it as the first child
      if (overEl.type === 'group' && (overEl as GroupData).expanded) {
        newElements = newElements.map(el => 
          el.id === activeId ? { ...el, parentId: overId } : el
        );
        // Move to just after the group in the flat list
        const activeIdx = newElements.findIndex(el => el.id === activeId);
        const overIdx = newElements.findIndex(el => el.id === overId);
        onReorder(arrayMove(newElements, activeIdx, overIdx + 1));
      } else {
        // Move to same parent as the target
        newElements = newElements.map(el => 
          el.id === activeId ? { ...el, parentId: overEl.parentId } : el
        );
        const activeIdx = newElements.findIndex(el => el.id === activeId);
        const overIdx = newElements.findIndex(el => el.id === overId);
        onReorder(arrayMove(newElements, activeIdx, overIdx));
      }
    }
  };

  const renderItems = (parentId?: string, depth = 0) => {
    const filtered = elements.filter(el => el.parentId === parentId);
    
    return filtered.map(el => (
      <React.Fragment key={el.id}>
        <SortableItem 
          element={el} 
          isSelected={selectedIds.includes(el.id)}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          onDelete={onDelete}
          onRename={onRename}
          onToggleVisibility={onToggleVisibility}
          depth={depth}
        />
        {el.type === 'group' && (el as GroupData).expanded && renderItems(el.id, depth + 1)}
      </React.Fragment>
    ));
  };

  // For sortable context, we need a flat list of IDs that are currently visible
  const getVisibleIds = (parentId?: string): string[] => {
    const filtered = elements.filter(el => el.parentId === parentId);
    let ids: string[] = [];
    filtered.forEach(el => {
      ids.push(el.id);
      if (el.type === 'group' && (el as GroupData).expanded) {
        ids = [...ids, ...getVisibleIds(el.id)];
      }
    });
    return ids;
  };

  const visibleIds = getVisibleIds();

  return (
    <div className={`bg-[#111111] border-r border-white/5 flex flex-col h-full overflow-hidden transition-all duration-300 relative ${collapsed ? 'w-12' : 'w-64'}`}>
      <button 
        onClick={onToggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#111111] border border-white/10 rounded-full flex items-center justify-center text-zinc-500 hover:text-white z-50 shadow-xl"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronRight size={14} className="rotate-180" />}
      </button>

      <div className={`p-3 border-b border-white/5 flex items-center justify-between shrink-0 ${collapsed ? 'flex-col gap-4' : ''}`}>
        {!collapsed && <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Elements</h2>}
        <button 
          onClick={onCreateGroup}
          className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
          title="New Group"
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={visibleIds}
              strategy={verticalListSortingStrategy}
            >
              {renderItems()}
            </SortableContext>
          </DndContext>
          
          {elements.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-zinc-600">No elements yet.<br/>Use the toolbar to create some.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
