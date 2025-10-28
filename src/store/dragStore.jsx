import { createContext } from 'react';
import { useState, useContext } from 'react';

/**
 * Drag Store - Global state for drag-and-drop operations
 *
 * This bypasses HTML5 drag-and-drop which conflicts with Tauri's fileDropEnabled.
 * Instead, we use mouse events and global state to track dragging.
 */

const DragContext = createContext();

export function DragProvider({ children }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const startDrag = (item) => {
    setDraggedItem(item);
    setIsDragging(true);
  };

  const updateDragPosition = (x, y) => {
    setDragPosition({ x, y });
  };

  const endDrag = () => {
    setDraggedItem(null);
    setIsDragging(false);
  };

  const value = {
    draggedItem,
    isDragging,
    dragPosition,
    startDrag,
    updateDragPosition,
    endDrag,
  };

  return (
    <DragContext.Provider value={value}>
      {children}
      {/* Drag ghost preview */}
      {isDragging && draggedItem && (
        <div
          className="fixed pointer-events-none z-[9999] bg-blue-500 bg-opacity-20 border-2 border-blue-500 rounded px-3 py-2 text-white text-sm font-medium"
          style={{
            left: `${dragPosition.x + 10}px`,
            top: `${dragPosition.y + 10}px`,
          }}
        >
          {draggedItem.filename}
        </div>
      )}
    </DragContext.Provider>
  );
}

export function useDrag() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDrag must be used within DragProvider');
  }
  return context;
}
