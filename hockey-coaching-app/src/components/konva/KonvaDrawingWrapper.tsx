import React, { useState, useCallback } from 'react';
import KonvaDrawingCanvas, { type HockeyElement } from './KonvaDrawingCanvas';
import HockeyToolbar from './HockeyToolbar';

interface KonvaDrawingWrapperProps {
  width?: number;
  height?: number;
  elements: HockeyElement[];
  onElementsChange: (elements: HockeyElement[]) => void;
  onHistoryAction?: (action: 'undo' | 'redo' | 'clear') => void;
  canUndo?: boolean;
  canRedo?: boolean;
  readOnly?: boolean;
}

const KonvaDrawingWrapper: React.FC<KonvaDrawingWrapperProps> = ({
  width = 800,
  height = 400,
  elements,
  onElementsChange,
  onHistoryAction,
  canUndo = false,
  canRedo = false,
  readOnly = false
}) => {
  const [selectedTool, setSelectedTool] = useState('select');
  const [selectedColor, setSelectedColor] = useState('#1E40AF');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const handleToolChange = useCallback((tool: string) => {
    setSelectedTool(tool);
    // Deselect element when switching tools
    setSelectedElementId(null);
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const handleElementSelect = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
    // If selecting an element, switch to select tool
    if (elementId) {
      setSelectedTool('select');
    }
  }, []);

  const handleUndo = useCallback(() => {
    onHistoryAction?.('undo');
  }, [onHistoryAction]);

  const handleRedo = useCallback(() => {
    onHistoryAction?.('redo');
  }, [onHistoryAction]);

  const handleClear = useCallback(() => {
    if (elements.length > 0 && window.confirm('Clear all elements? This cannot be undone.')) {
      onHistoryAction?.('clear');
    }
  }, [elements.length, onHistoryAction]);

  // Delete selected element with Delete key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedElementId && !readOnly) {
        const newElements = elements.filter(el => el.id !== selectedElementId);
        onElementsChange(newElements);
        setSelectedElementId(null);
      }
      // Undo/Redo with keyboard shortcuts
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, elements, onElementsChange, readOnly, handleUndo, handleRedo]);

  // Update selected element in elements array when it's selected
  const elementsWithSelection = elements.map(el => ({
    ...el,
    selected: el.id === selectedElementId
  }));

  return (
    <div className="relative">
      <KonvaDrawingCanvas
        width={width}
        height={height}
        elements={elementsWithSelection}
        onElementsChange={onElementsChange}
        selectedTool={selectedTool}
        selectedColor={selectedColor}
        onElementSelect={handleElementSelect}
        selectedElementId={selectedElementId}
        readOnly={readOnly}
      />

      {!readOnly && (
        <HockeyToolbar
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      )}

      {/* Selection info */}
      {selectedElementId && !readOnly && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md border p-3">
          <p className="text-sm font-medium text-gray-700">Element Selected</p>
          <p className="text-xs text-gray-500 mt-1">Press Delete to remove</p>
          <button
            onClick={() => setSelectedElementId(null)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Element counter */}
      {elements.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md border px-3 py-2">
          <p className="text-sm text-gray-600">
            {elements.length} element{elements.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default KonvaDrawingWrapper;