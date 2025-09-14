import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Clock, WifiOff } from 'lucide-react';
import { dbHelpers } from '../../db';
import AdvancedDrawingCanvas from '../../components/AdvancedDrawingCanvas';
import ProfessionalToolbar from '../../components/ProfessionalToolbar';
import { useDrawingHistory } from '../../lib/drawing/history';
import { generateId } from '../../lib/drawing/utils';
// import { useToast } from '../../contexts/ToastContext';
import type { Drill, DrillCategory, DrawingElement, DrawingToolType, DrawingColor } from '../../types';

const PREDEFINED_TAGS = [
  'Offensive', 'Defensive', 'Warmup', 'Skills', 'Conditioning', 
  'Powerplay', 'Penalty Kill', 'Breakout', 'Forechecking', 'Transition'
];

const DrillDesigner: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  // Simple notification functions for now - can be replaced with toast system later
  const showSuccess = (msg: string) => console.log('Success:', msg);
  const showError = (msg: string) => console.error('Error:', msg);
  const showWarning = (msg: string) => console.warn('Warning:', msg);
  const showInfo = (msg: string) => console.info('Info:', msg);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Drawing state
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<DrawingToolType>('pointer');
  const [selectedColor, setSelectedColor] = useState<DrawingColor>('blue');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  
  // History management
  const { saveState, undo, redo, clear: clearHistory, canUndo, canRedo } = useDrawingHistory();
  
  // Drill metadata - enhanced for tablet use
  const [drillTitle, setDrillTitle] = useState('');
  const [drillDescription, setDrillDescription] = useState('');
  const [drillCategory, setDrillCategory] = useState<DrillCategory>('Shooting');
  const [drillTags, setDrillTags] = useState<string[]>([]);
  const [drillDuration, setDrillDuration] = useState<number | null>(null);
  const [customTag, setCustomTag] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [failedSaves, setFailedSaves] = useState(0);

  const categories: DrillCategory[] = ['Shooting', 'Passing', 'Defense', 'Skating', 'Other'];

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showInfo('Connection restored - auto-save enabled');
      // Retry failed saves
      if (failedSaves > 0 && drillTitle.trim()) {
        autoSaveDrill();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      showWarning('No internet connection - changes saved locally');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [failedSaves, drillTitle, showInfo, showWarning]);

  // Load existing drill if editing
  useEffect(() => {
    if (id) {
      loadDrill(id);
    }
  }, [id]);

  // Track unsaved changes
  useEffect(() => {
    if (drillTitle || drillDescription || drillTags.length > 0 || drawingElements.length > 0) {
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
      
      // Setup auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        if (drillTitle.trim()) { // Only auto-save if there's at least a title
          autoSaveDrill();
        }
      }, 5000); // Auto-save every 5 seconds
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [drawingElements, drillTitle, drillDescription, drillTags, drillCategory, drillDuration]);

  const loadDrill = async (drillId: string) => {
    try {
      setIsLoading(true);
      const drill = await dbHelpers.getDrillById(drillId);
      if (drill) {
        // Handle backward compatibility
        setDrillTitle(drill.title || drill.name || '');
        setDrillDescription(drill.description || '');
        setDrillCategory(drill.category);
        setDrillTags(drill.tags || []);
        setDrillDuration(drill.duration || null);
        
        // Load drawing elements
        let elements: DrawingElement[] = [];
        
        if (drill.canvasData) {
          // New format - parse JSON canvas data
          try {
            elements = JSON.parse(drill.canvasData);
          } catch (error) {
            console.error('Error parsing canvas data:', error);
          }
        } else if (drill.drawingElements && drill.drawingElements.length > 0) {
          // Intermediate format
          elements = drill.drawingElements;
        } else if (drill.elements && drill.elements.length > 0) {
          // Legacy format - convert old elements
          elements = convertLegacyElements(drill.elements);
        }
        
        setDrawingElements(elements);
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setLastSaved(new Date(drill.updatedAt));
        clearHistory();
      }
    } catch (error) {
      console.error('Error loading drill:', error);
      showError('Failed to load drill. Please try again.');
      setSaveStatus('error');
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

  const toggleTag = (tag: string) => {
    setDrillTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (tag && !drillTags.includes(tag)) {
      setDrillTags(prev => [...prev, tag]);
      setCustomTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setDrillTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const autoSaveDrill = async () => {
    if (!drillTitle.trim()) return;

    try {
      setSaveStatus('saving');
      
      const drill: Drill = {
        id: id || generateId(),
        title: drillTitle.trim(),
        description: drillDescription.trim(),
        tags: drillTags,
        category: drillCategory,
        duration: drillDuration || undefined,
        canvasData: JSON.stringify(drawingElements),
        // Legacy compatibility
        elements: [],
        userId: 'current-user', // Will be set by Firebase auth
        createdAt: id ? (await dbHelpers.getDrillById(id))?.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (id) {
        await dbHelpers.updateDrill(id, drill);
      } else {
        // For new drills, we need to set the ID after creation
        const newId = await dbHelpers.createDrill(drill);
        // Update URL to reflect the new drill ID
        window.history.replaceState(null, '', `/training/drill-designer/${newId}`);
      }
      
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setLastSaved(new Date());
      setFailedSaves(0);
      
      // Only show success toast for manual saves, not auto-saves
      if (!isOnline) {
        showInfo('Drill saved locally (offline)');
      }
    } catch (error) {
      console.error('Error auto-saving drill:', error);
      setSaveStatus('error');
      setFailedSaves(prev => prev + 1);
      
      if (!isOnline) {
        showWarning('Drill saved locally - will sync when online');
      } else {
        showError(`Auto-save failed (attempt ${failedSaves + 1})`);
      }
    }
  };

  const saveDrill = async () => {
    if (!drillTitle.trim()) {
      showError('Please enter a drill title');
      return;
    }

    try {
      setIsLoading(true);
      await autoSaveDrill();
      showSuccess('Drill saved successfully!');
      
      // Small delay to show success message before navigating
      setTimeout(() => {
        navigate('/training');
      }, 1000);
    } catch (error) {
      console.error('Error saving drill:', error);
      showError('Failed to save drill. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveAndNew = async () => {
    if (!drillTitle.trim()) {
      showError('Please enter a drill title');
      return;
    }

    try {
      setIsLoading(true);
      await autoSaveDrill();
      
      // Reset form for new drill
      setDrawingElements([]);
      setDrillTitle('');
      setDrillDescription('');
      setDrillTags([]);
      setDrillDuration(null);
      setSelectedElements([]);
      clearHistory();
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      
      // Update URL to new drill
      window.history.replaceState(null, '', '/training/drill-designer');
      showSuccess('Drill saved! Ready for new drill.');
    } catch (error) {
      console.error('Error saving drill:', error);
      showError('Failed to save drill. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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

  // Get save status indicator
  const getSaveStatusDisplay = () => {
    switch (saveStatus) {
      case 'saving':
        return <span className="text-orange-600">Saving...</span>;
      case 'saved':
        return lastSaved ? (
          <span className="text-green-600">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        ) : <span className="text-green-600">Saved</span>;
      case 'unsaved':
        return <span className="text-orange-600">Unsaved changes</span>;
      case 'error':
        return <span className="text-red-600">Save failed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header - Fixed at top */}
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
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {id ? 'Edit Drill' : 'New Drill'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {getSaveStatusDisplay()}
                {!isOnline && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <WifiOff className="w-4 h-4" />
                    <span>Offline</span>
                  </div>
                )}
                {isOnline && failedSaves > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <span>Sync pending ({failedSaves})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={saveAndNew}
              disabled={isLoading || !drillTitle.trim()}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Save & New
            </button>
            <button
              onClick={saveDrill}
              disabled={isLoading || !drillTitle.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Metadata Panel - Above canvas on mobile, left side on desktop */}
        <div className="bg-white border-b lg:border-r lg:border-b-0 p-4 lg:w-80 overflow-y-auto">
          {/* Title - Large, prominent input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Drill Title *
            </label>
            <input
              type="text"
              value={drillTitle}
              onChange={(e) => setDrillTitle(e.target.value)}
              placeholder="e.g., 2-1 Breakout Drill"
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Quick Tag Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Tags
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PREDEFINED_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    drillTags.includes(tag)
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Tags Display */}
          {drillTags.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {drillTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-900 min-h-[24px] min-w-[24px]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Custom Tag Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Tag
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Add custom tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              />
              <button
                onClick={addCustomTag}
                disabled={!customTag.trim() || drillTags.includes(customTag.trim())}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category & Duration Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={drillCategory}
                onChange={(e) => setDrillCategory(e.target.value as DrillCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (min)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={drillDuration || ''}
                  onChange={(e) => setDrillDuration(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="5"
                  min="1"
                  max="60"
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                />
                <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={drillDescription}
              onChange={(e) => setDrillDescription(e.target.value)}
              placeholder="Describe the drill setup, execution, and key coaching points..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Stats */}
          <div className="pt-4 border-t text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>Elements: {drawingElements.length}</div>
              <div>Selected: {selectedElements.length}</div>
              <div>Tool: {selectedTool.replace('_', ' ')}</div>
              <div>Color: {selectedColor}</div>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 min-h-0">
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
                    {selectedTool.replace('_', ' ')} tool
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Professional Toolbar - Always at bottom */}
          <div className="border-t">
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
        </div>
      </div>
    </div>
  );
};

export default DrillDesigner;