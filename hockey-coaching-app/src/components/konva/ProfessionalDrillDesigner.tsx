import React, { useState, useCallback, useEffect } from 'react';
import ProfessionalHockeyCanvas, { type DrawingMode, type HockeyObject } from './ProfessionalHockeyCanvas';
import ProfessionalToolbar from './ProfessionalToolbar';

interface ProfessionalDrillDesignerProps {
  width?: number;
  height?: number;
  initialObjects?: HockeyObject[];
  onObjectsChange?: (objects: HockeyObject[]) => void;
  onExport?: () => void;
}

interface HistoryState {
  past: HockeyObject[][];
  present: HockeyObject[];
  future: HockeyObject[][];
}

const ProfessionalDrillDesigner: React.FC<ProfessionalDrillDesignerProps> = ({
  width = 800,
  height = 400,
  initialObjects = [],
  onObjectsChange,
  onExport
}) => {
  const [mode, setMode] = useState<DrawingMode>('select');

  // History management for undo/redo
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialObjects,
    future: []
  });

  // Update parent component when objects change
  useEffect(() => {
    onObjectsChange?.(history.present);
  }, [history.present, onObjectsChange]);

  // Handle objects change with history
  const handleObjectsChange = useCallback((newObjects: HockeyObject[]) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: newObjects,
      future: [] // Clear future when new action is performed
    }));
  }, []);

  // Undo function
  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  // Redo function
  const handleRedo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  // Clear all objects
  const handleClear = useCallback(() => {
    if (history.present.length === 0) return;

    if (window.confirm('Clear all objects? This cannot be undone.')) {
      setHistory(prev => ({
        past: [...prev.past, prev.present],
        present: [],
        future: []
      }));
    }
  }, [history.present.length]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl) {
        switch (e.key.toLowerCase()) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              handleRedo();
            } else {
              e.preventDefault();
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 's':
            e.preventDefault();
            // Save functionality could be added here
            break;
          case 'e':
            e.preventDefault();
            onExport?.();
            break;
        }
      } else {
        // Single key shortcuts
        switch (e.key.toLowerCase()) {
          case 'v':
            setMode('select');
            break;
          case 'd':
            setMode('skating');
            break;
          case 'p':
            setMode('passing');
            break;
          case 's':
            setMode('shooting');
            break;
          case 'e':
            setMode('erase');
            break;
          case 'delete':
          case 'backspace':
            // Delete selected objects
            const selectedObjects = history.present.filter(obj => obj.selected);
            if (selectedObjects.length > 0) {
              const remainingObjects = history.present.filter(obj => !obj.selected);
              handleObjectsChange(remainingObjects);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, onExport, history.present, handleObjectsChange]);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return (
    <div className="relative">
      {/* Main Canvas */}
      <ProfessionalHockeyCanvas
        width={width}
        height={height}
        mode={mode}
        objects={history.present}
        onObjectsChange={handleObjectsChange}
        onModeChange={setMode}
      />

      {/* Professional Toolbar */}
      <ProfessionalToolbar
        mode={mode}
        onModeChange={setMode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onExport={onExport}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Status Info */}
      {history.present.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md border px-3 py-2">
          <p className="text-sm text-gray-600">
            {history.present.length} object{history.present.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Mode Indicator */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md border px-3 py-2">
        <p className="text-sm font-medium text-gray-700">
          Current Tool: <span className="capitalize text-blue-600">
            {mode.replace('_', ' ').replace('player ', '')}
          </span>
        </p>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md border px-3 py-2">
        <div className="text-xs text-gray-600">
          <div className="font-medium mb-1">Shortcuts:</div>
          <div>V: Select • D: Skating • P: Pass • S: Shot</div>
          <div>Ctrl+Z: Undo • Ctrl+Y: Redo • Ctrl+E: Export</div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDrillDesigner;