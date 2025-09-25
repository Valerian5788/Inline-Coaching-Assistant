import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Clock, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';
import { dbHelpers } from '../../db';
import ProfessionalDrillDesigner from '../../components/konva/ProfessionalDrillDesigner';
import { type HockeyObject } from '../../components/konva/ProfessionalHockeyCanvas';
import type { Drill, DrillCategory } from '../../types';

const PREDEFINED_TAGS = [
  'Offensive', 'Defensive', 'Warmup', 'Skills', 'Conditioning',
  'Powerplay', 'Penalty Kill', 'Breakout', 'Forechecking', 'Transition'
];

interface HistoryState {
  past: HockeyObject[][];
  present: HockeyObject[];
  future: HockeyObject[][];
}

const DrillDesignerKonva: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Drawing state with history
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: [],
    future: []
  });

  // Drill metadata
  const [drillTitle, setDrillTitle] = useState('');
  const [drillDescription, setDrillDescription] = useState('');
  const [drillCategory, setDrillCategory] = useState<DrillCategory>('Shooting');
  const [drillTags, setDrillTags] = useState<string[]>([]);
  const [drillDuration, setDrillDuration] = useState<number | null>(null);
  const [customTag, setCustomTag] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const categories: DrillCategory[] = ['Shooting', 'Passing', 'Defense', 'Skating', 'Other'];

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load existing drill if editing
  useEffect(() => {
    if (id) {
      loadDrill(id);
    }
  }, [id]);

  // Auto-save functionality
  useEffect(() => {
    if (drillTitle || drillDescription || drillTags.length > 0 || history.present.length > 0) {
      setSaveStatus('unsaved');

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        if (drillTitle.trim()) {
          autoSaveDrill();
        }
      }, 3000); // Auto-save every 3 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [history.present, drillTitle, drillDescription, drillTags, drillCategory, drillDuration]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const loadDrill = async (drillId: string) => {
    try {
      setIsLoading(true);
      const drill = await dbHelpers.getDrillById(drillId);
      if (drill) {
        setDrillTitle(drill.title || drill.name || '');
        setDrillDescription(drill.description || '');
        setDrillCategory(drill.category);
        setDrillTags(drill.tags || []);
        setDrillDuration(drill.duration || null);

        // Load drawing elements - convert from old format if needed
        let elements: HockeyObject[] = [];

        if (drill.canvasData) {
          try {
            const parsedData = JSON.parse(drill.canvasData);
            // Convert old elements to HockeyElement format
            elements = convertToHockeyElements(parsedData);
          } catch (error) {
            console.error('Error parsing canvas data:', error);
          }
        }

        setHistory({
          past: [],
          present: elements,
          future: []
        });

        setSaveStatus('saved');
        setLastSaved(new Date(drill.updatedAt));
      }
    } catch (error) {
      console.error('Error loading drill:', error);
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert old drawing elements to new HockeyObject format
  const convertToHockeyElements = (oldElements: any[]): HockeyObject[] => {
    return oldElements.map((element: any) => {
      const newElement: HockeyObject = {
        id: element.id || generateId(),
        type: convertElementType(element.type),
        x: element.startPoint?.x * 800 || element.x || 0,
        y: element.startPoint?.y * 400 || element.y || 0,
      };

      // Handle different element types
      switch (element.type) {
        case 'offense':
        case 'defense':
        case 'opponent':
          newElement.type = 'player';
          newElement.playerType = element.type === 'offense' ? 'offense' :
                                 element.type === 'defense' ? 'defense' : 'opponent';
          newElement.color = element.color === 'blue' ? '#1E40AF' :
                            element.color === 'red' ? '#DC2626' : '#374151';
          break;

        case 'arrow':
        case 'pass_arrow':
        case 'shoot_arrow':
          newElement.type = 'line';
          newElement.lineType = element.type === 'pass_arrow' ? 'passing' :
                               element.type === 'shoot_arrow' ? 'shooting' : 'skating';
          if (element.endPoint) {
            newElement.points = [
              newElement.x,
              newElement.y,
              element.endPoint.x * 800,
              element.endPoint.y * 400
            ];
          }
          newElement.color = element.color === 'blue' ? '#1E40AF' :
                            element.color === 'red' ? '#DC2626' : '#10B981';
          break;

        case 'text':
          // Text is not currently supported in the new HockeyObject interface
          // Skip text elements for now
          return null;

        case 'puck':
          newElement.color = '#000000';
          break;

        case 'cone':
          newElement.color = '#F97316';
          break;
      }

      return newElement;
    }).filter(element => element !== null);
  };

  const convertElementType = (oldType: string): HockeyObject['type'] => {
    switch (oldType) {
      case 'offense':
      case 'defense':
      case 'opponent':
        return 'player';
      case 'pass_arrow':
      case 'shoot_arrow':
      case 'backward_arrow':
      case 'arrow':
        return 'line';
      case 'puck':
        return 'puck';
      case 'cone':
        return 'cone';
      default:
        return 'player'; // Default fallback
    }
  };

  const handleElementsChange = useCallback((newElements: HockeyObject[]) => {
    setHistory(prev => ({
      past: [...prev.past, prev.present],
      present: newElements,
      future: []
    }));
  }, []);


  const autoSaveDrill = async () => {
    if (!isOnline) return;

    try {
      setSaveStatus('saving');
      await saveDrill(false);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      setSaveStatus('error');
    }
  };

  const saveDrill = async (showAlert = true) => {
    if (!drillTitle.trim()) {
      if (showAlert) alert('Please enter a drill title');
      return;
    }

    try {
      setIsLoading(true);

      const drillData: Partial<Drill> = {
        title: drillTitle.trim(),
        description: drillDescription.trim(),
        category: drillCategory,
        tags: drillTags,
        duration: drillDuration || undefined,
        canvasData: JSON.stringify(history.present),
        updatedAt: new Date().toISOString()
      };

      if (id) {
        await dbHelpers.updateDrill(id, drillData);
        if (showAlert) alert('Drill updated successfully!');
      } else {
        const newDrill = {
          ...drillData,
          id: generateId(),
          createdAt: new Date().toISOString()
        } as Drill;

        await dbHelpers.createDrill(newDrill);
        if (showAlert) alert('Drill saved successfully!');

        // Navigate to edit mode with the new ID
        navigate(`/training/drill-designer-konva/${newDrill.id}`, { replace: true });
      }

      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving drill:', error);
      if (showAlert) alert('Error saving drill. Please try again.');
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !drillTags.includes(customTag.trim())) {
      setDrillTags([...drillTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setDrillTags(drillTags.filter(tag => tag !== tagToRemove));
  };

  const exportDrill = () => {
    // This will be handled by the ProfessionalDrillDesigner component
    // which has access to the Konva stage for export
    console.log('Export drill functionality');
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'saving':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      case 'unsaved':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/training')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Training</span>
              </button>

              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {id ? 'Edit Drill' : 'Create New Drill'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {getSaveStatusIcon()}
                  <span className="text-sm text-gray-600">
                    {saveStatus === 'saved' && lastSaved && `Saved ${lastSaved.toLocaleTimeString()}`}
                    {saveStatus === 'saving' && 'Saving...'}
                    {saveStatus === 'unsaved' && 'Unsaved changes'}
                    {saveStatus === 'error' && 'Save failed'}
                  </span>
                  {!isOnline && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <WifiOff className="w-4 h-4" />
                      <span className="text-sm">Offline</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => saveDrill(true)}
              disabled={isLoading || !drillTitle.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isLoading ? 'Saving...' : id ? 'Update' : 'Save'} Drill
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">

          {/* Drill Details Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Drill Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drill Title *
                </label>
                <input
                  type="text"
                  value={drillTitle}
                  onChange={(e) => setDrillTitle(e.target.value)}
                  placeholder="e.g., 2-on-1 Rush Drill"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={drillCategory}
                  onChange={(e) => setDrillCategory(e.target.value as DrillCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={drillDuration || ''}
                  onChange={(e) => setDrillDuration(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g., 10"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tags - Simplified */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_TAGS.slice(0, 5).map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (drillTags.includes(tag)) {
                          removeTag(tag);
                        } else {
                          setDrillTags([...drillTags, tag]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        drillTags.includes(tag)
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description - Full width below */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={drillDescription}
                onChange={(e) => setDrillDescription(e.target.value)}
                placeholder="Describe the drill objectives and instructions..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Selected tags display */}
            {drillTags.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {drillTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drawing Canvas - Full Width */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Drill Diagram</h2>
              <p className="text-sm text-gray-600 mt-1">
                Use the toolbar below to create your drill diagram. Click to place elements, drag to move them.
              </p>
            </div>

            <div className="flex justify-center">
              <ProfessionalDrillDesigner
                width={Math.min(1200, window.innerWidth - 100)}
                height={600}
                initialObjects={history.present}
                onObjectsChange={handleElementsChange}
                onExport={() => exportDrill()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillDesignerKonva;