import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Share2, ArrowLeft, Settings } from 'lucide-react';
import { dbHelpers } from '../../db';
import AdvancedDrawingCanvas from '../../components/AdvancedDrawingCanvas';
import ProfessionalToolbar from '../../components/ProfessionalToolbar';
import { useDrawingHistory } from '../../lib/drawing/history';
import { generateId } from '../../lib/drawing/utils';
import type { Drill, DrillCategory, DrawingElement, DrawingToolType, DrawingColor } from '../../types';

const DrillDesigner: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // Drawing state
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<DrawingToolType>('pointer');
  const [selectedColor, setSelectedColor] = useState<DrawingColor>('blue');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  
  // History management
  const { saveState, undo, redo, clear: clearHistory, canUndo, canRedo } = useDrawingHistory();
  
  // Drill metadata
  const [drillName, setDrillName] = useState('');
  const [drillCategory, setDrillCategory] = useState<DrillCategory>('Shooting');
  const [drillDescription, setDrillDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const categories: DrillCategory[] = ['Shooting', 'Passing', 'Defense', 'Skating', 'Other'];

  // Load existing drill if editing
  useEffect(() => {
    if (id) {
      loadDrill(id);
    }
  }, [id]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [drawingElements, drillName, drillCategory, drillDescription]);

  const loadDrill = async (drillId: string) => {
    try {
      setIsLoading(true);
      const drill = await dbHelpers.getDrillById(drillId);
      if (drill) {
        setDrillName(drill.name);
        setDrillCategory(drill.category);
        setDrillDescription(drill.description);
        
        // Load new drawing elements if available, fallback to legacy elements
        if (drill.drawingElements && drill.drawingElements.length > 0) {
          setDrawingElements(drill.drawingElements);
        } else if (drill.elements && drill.elements.length > 0) {
          // Convert legacy elements to new format
          const convertedElements = convertLegacyElements(drill.elements);
          setDrawingElements(convertedElements);
        }
        
        setHasUnsavedChanges(false);
        clearHistory();
      }
    } catch (error) {
      console.error('Error loading drill:', error);
      alert('Error loading drill. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert legacy DrillElement[] to DrawingElement[]
  const convertLegacyElements = (legacyElements: any[]): DrawingElement[] => {
    return legacyElements.map(element => ({
      id: element.id || generateId(),
      type: element.type === 'circle' ? 'offense' : element.type === 'x' ? 'opponent' : 'arrow',
      startPoint: element.from || element.center || element.position || { x: 0, y: 0 },
      endPoint: element.to,
      path: element.to ? [element.from || element.center || element.position, element.to] : undefined,
      color: (element.color === '#2563eb' ? 'blue' : 
              element.color === '#dc2626' ? 'red' : 
              element.color === '#000000' ? 'black' : 'blue') as DrawingColor,
      label: element.label,
      radius: element.type === 'circle' ? 18 : 4
    }));
  };

  const handleElementsChange = useCallback((newElements: DrawingElement[]) => {
    saveState(drawingElements);
    setDrawingElements(newElements);
  }, [drawingElements, saveState]);

  const handleUndo = useCallback(() => {
    const previousElements = undo(drawingElements);
    if (previousElements) {
      setDrawingElements(previousElements);
    }
  }, [drawingElements, undo]);

  const handleRedo = useCallback(() => {
    const nextElements = redo(drawingElements);
    if (nextElements) {
      setDrawingElements(nextElements);
    }
  }, [drawingElements, redo]);

  const handleClear = useCallback(() => {
    if (drawingElements.length > 0 && window.confirm('Clear all elements? This cannot be undone.')) {
      saveState(drawingElements);
      setDrawingElements([]);
      setSelectedElements([]);
    }
  }, [drawingElements, saveState]);

  const handleStartDrawing = useCallback(() => {
    saveState(drawingElements);
  }, [drawingElements, saveState]);

  const saveDrill = async () => {
    if (!drillName.trim()) {
      alert('Please enter a drill name');
      return;
    }

    try {
      setIsLoading(true);
      
      const drill: Drill = {
        id: id || generateId(),
        name: drillName.trim(),
        category: drillCategory,
        elements: [], // Keep empty for legacy compatibility
        drawingElements, // Use new drawing elements
        description: drillDescription.trim(),
        createdAt: id ? (await dbHelpers.getDrillById(id))?.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (id) {
        await dbHelpers.updateDrill(id, drill);
      } else {
        await dbHelpers.createDrill(drill);
      }
      
      setHasUnsavedChanges(false);
      navigate('/training');
    } catch (error) {
      console.error('Error saving drill:', error);
      alert('Error saving drill. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const shareDrill = async () => {
    const drillData = {
      name: drillName,
      category: drillCategory,
      description: drillDescription,
      elements: drawingElements,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(drillData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${drillName || 'drill'}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
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
            saveDrill();
            break;
        }
      }
      
      // Tool shortcuts (only when not in input field and settings panel is closed)
      if (!showSettings && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        switch (e.key.toLowerCase()) {
          case 'v': setSelectedTool('pointer'); break;
          case 'a': setSelectedTool('arrow'); break;
          case 'p': setSelectedTool('pass_arrow'); break;
          case 'b': setSelectedTool('backward_arrow'); break;
          case 's': setSelectedTool('shoot_arrow'); break;
          case 'u': setSelectedTool('puck'); break;
          case 'd': setSelectedTool('defense'); break;
          case 'o': setSelectedTool('offense'); break;
          case 'x': setSelectedTool('opponent'); break;
          case 'c': setSelectedTool('cone'); break;
          case 't': setSelectedTool('text'); break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, showSettings]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                  return;
                }
                navigate('/training');
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Training</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {id ? 'Edit Drill' : 'New Drill'}
                {hasUnsavedChanges && <span className="text-orange-500 ml-2">•</span>}
              </h1>
              {drillName && (
                <p className="text-sm text-gray-600 mt-1">{drillName}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={shareDrill}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={saveDrill}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{isLoading ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      <div className={`fixed top-16 right-0 w-80 h-full bg-white shadow-lg transform transition-transform z-40 ${
        showSettings ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Drill Settings</h3>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto h-full pb-20">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Drill Name *
            </label>
            <input
              type="text"
              value={drillName}
              onChange={(e) => setDrillName(e.target.value)}
              placeholder="e.g., 2-on-1 Rush Drill"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={drillCategory}
              onChange={(e) => setDrillCategory(e.target.value as DrillCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={drillDescription}
              onChange={(e) => setDrillDescription(e.target.value)}
              placeholder="Describe the drill setup and execution..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Stats */}
          <div className="pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Elements: {drawingElements.length}</p>
              <p>Selected: {selectedElements.length}</p>
              <p>Tool: {selectedTool.replace('_', ' ')}</p>
              <p>Color: {selectedColor}</p>
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div className="pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">Keyboard Shortcuts</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><kbd className="bg-gray-100 px-1 rounded">V</kbd> Select</p>
              <p><kbd className="bg-gray-100 px-1 rounded">A</kbd> Arrow</p>
              <p><kbd className="bg-gray-100 px-1 rounded">P</kbd> Pass</p>
              <p><kbd className="bg-gray-100 px-1 rounded">B</kbd> Backward</p>
              <p><kbd className="bg-gray-100 px-1 rounded">S</kbd> Shoot</p>
              <p><kbd className="bg-gray-100 px-1 rounded">D</kbd> Defense</p>
              <p><kbd className="bg-gray-100 px-1 rounded">O</kbd> Offense</p>
              <p><kbd className="bg-gray-100 px-1 rounded">X</kbd> Opponent</p>
              <p><kbd className="bg-gray-100 px-1 rounded">T</kbd> Text</p>
              <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+Z</kbd> Undo</p>
              <p><kbd className="bg-gray-100 px-1 rounded">Ctrl+S</kbd> Save</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 p-4 pb-24">
        <div className="bg-white rounded-xl shadow-lg border h-full flex items-center justify-center">
          <div className="relative max-w-full max-h-full">
            <AdvancedDrawingCanvas
              elements={drawingElements}
              selectedTool={selectedTool}
              selectedColor={selectedColor}
              selectedElements={selectedElements}
              onElementsChange={handleElementsChange}
              onSelectionChange={setSelectedElements}
              onStartDrawing={handleStartDrawing}
              width={800}
              height={400}
              rinkImageSrc="/images/rink.png"
            />
            
            {/* Element counter */}
            {drawingElements.length > 0 && (
              <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 text-gray-700 px-3 py-1 rounded-lg text-sm shadow-sm">
                {drawingElements.length} element{drawingElements.length !== 1 ? 's' : ''}
              </div>
            )}

            {/* Current tool indicator */}
            {selectedTool !== 'pointer' && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm shadow-sm">
                {selectedTool.replace('_', ' ')} tool active
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Professional Toolbar */}
      <ProfessionalToolbar
        selectedTool={selectedTool}
        selectedColor={selectedColor}
        onToolChange={setSelectedTool}
        onColorChange={setSelectedColor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
};

export default DrillDesigner;