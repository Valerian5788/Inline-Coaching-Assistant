import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  ArrowLeft, 
  Clock, 
  Target, 
  Coffee, 
  Users, 
  Thermometer,
  Wind,
  Trash2,
  GripVertical
} from 'lucide-react';
import { dbHelpers } from '../../db';
import { generateId } from '../../lib/drawing/utils';
import type { 
  Drill, 
  PracticePlanItem 
} from '../../types';

const PRACTICE_TEMPLATES = [
  {
    name: 'Standard Practice (60 min)',
    duration: 60,
    items: [
      { type: 'warm_up' as const, title: 'Warm-up Skate', duration: 5 },
      { type: 'drill' as const, title: 'Passing Drill', duration: 10 },
      { type: 'drill' as const, title: 'Shooting Drill', duration: 10 },
      { type: 'break' as const, title: 'Water Break', duration: 5 },
      { type: 'drill' as const, title: 'Defense Drill', duration: 10 },
      { type: 'scrimmage' as const, title: 'Small Scrimmage', duration: 15 },
      { type: 'cool_down' as const, title: 'Cool Down', duration: 5 }
    ]
  },
  {
    name: 'Skills Focus (45 min)',
    duration: 45,
    items: [
      { type: 'warm_up' as const, title: 'Dynamic Warm-up', duration: 5 },
      { type: 'drill' as const, title: 'Skating Skills', duration: 12 },
      { type: 'drill' as const, title: 'Puck Handling', duration: 12 },
      { type: 'break' as const, title: 'Quick Break', duration: 3 },
      { type: 'drill' as const, title: 'Shooting Practice', duration: 10 },
      { type: 'cool_down' as const, title: 'Cool Down', duration: 3 }
    ]
  },
  {
    name: 'Game Prep (30 min)',
    duration: 30,
    items: [
      { type: 'warm_up' as const, title: 'Light Warm-up', duration: 5 },
      { type: 'drill' as const, title: 'Power Play', duration: 10 },
      { type: 'drill' as const, title: 'Penalty Kill', duration: 10 },
      { type: 'cool_down' as const, title: 'Cool Down', duration: 5 }
    ]
  }
];

const getItemIcon = (type: PracticePlanItem['type']) => {
  switch (type) {
    case 'drill': return <Target className="w-4 h-4" />;
    case 'break': return <Coffee className="w-4 h-4" />;
    case 'scrimmage': return <Users className="w-4 h-4" />;
    case 'warm_up': return <Thermometer className="w-4 h-4" />;
    case 'cool_down': return <Wind className="w-4 h-4" />;
    default: return <Target className="w-4 h-4" />;
  }
};

const getItemColor = (type: PracticePlanItem['type']) => {
  switch (type) {
    case 'drill': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'break': return 'bg-green-100 text-green-800 border-green-200';
    case 'scrimmage': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'warm_up': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'cool_down': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const PracticePlanner: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  
  // Practice plan state
  const [planName, setPlanName] = useState('');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [planNotes, setPlanNotes] = useState('');
  const [planItems, setPlanItems] = useState<PracticePlanItem[]>([]);
  
  // Available drills
  const [availableDrills, setAvailableDrills] = useState<Drill[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load available drills
  useEffect(() => {
    loadDrills();
  }, []);

  // Load existing plan if editing
  useEffect(() => {
    if (id) {
      loadPracticePlan(id);
    }
  }, [id]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [planName, planDate, planNotes, planItems]);

  const loadDrills = async () => {
    try {
      const drills = await dbHelpers.getAllDrills();
      setAvailableDrills(drills);
    } catch (error) {
      console.error('Error loading drills:', error);
    }
  };

  const loadPracticePlan = async (planId: string) => {
    // For now, we'll work with the legacy format and convert
    // In a real implementation, you'd migrate to the enhanced format
    try {
      const plan = await dbHelpers.getPracticePlanById(planId);
      if (plan) {
        setPlanName(plan.name);
        setPlanDate(plan.date.split('T')[0]);
        setPlanNotes(plan.notes);
        
        // Convert legacy drillIds to practice items
        const items: PracticePlanItem[] = plan.drillIds.map((drillId, index) => {
          const drill = availableDrills.find(d => d.id === drillId);
          return {
            id: generateId(),
            drillId: drillId,
            type: 'drill' as const,
            title: drill?.title || drill?.name || 'Unknown Drill',
            duration: drill?.duration || 10,
            order: index
          };
        });
        setPlanItems(items);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error loading practice plan:', error);
    }
  };

  const calculateTotalDuration = () => {
    return planItems.reduce((total, item) => total + item.duration, 0);
  };

  const addItem = (type: PracticePlanItem['type'], title: string = '', duration: number = 10) => {
    const newItem: PracticePlanItem = {
      id: generateId(),
      type,
      title: title || `New ${type.replace('_', ' ')}`,
      duration,
      order: planItems.length
    };
    setPlanItems([...planItems, newItem]);
  };

  const addDrillToSchedule = (drill: Drill) => {
    const newItem: PracticePlanItem = {
      id: generateId(),
      drillId: drill.id,
      type: 'drill',
      title: drill.title || drill.name || 'Unknown Drill',
      duration: drill.duration || 10,
      order: planItems.length
    };
    setPlanItems([...planItems, newItem]);
  };

  const removeItem = (itemId: string) => {
    setPlanItems(planItems.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, changes: Partial<PracticePlanItem>) => {
    setPlanItems(planItems.map(item => 
      item.id === itemId ? { ...item, ...changes } : item
    ));
  };

  const loadTemplate = (template: typeof PRACTICE_TEMPLATES[0]) => {
    const items: PracticePlanItem[] = template.items.map((item, index) => ({
      id: generateId(),
      type: item.type,
      title: item.title,
      duration: item.duration,
      order: index
    }));
    setPlanItems(items);
    setPlanName(template.name);
    setShowTemplates(false);
  };

  const savePracticePlan = async () => {
    if (!planName.trim()) {
      alert('Please enter a practice plan name');
      return;
    }

    try {
      setIsLoading(true);
      
      // For now, convert to legacy format for compatibility
      const legacyPlan = {
        id: id || generateId(),
        name: planName.trim(),
        date: new Date(planDate).toISOString(),
        drillIds: planItems.filter(item => item.drillId).map(item => item.drillId!),
        notes: planNotes.trim(),
        duration: calculateTotalDuration(),
        createdAt: id ? (await dbHelpers.getPracticePlanById(id))?.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (id) {
        await dbHelpers.updatePracticePlan(id, legacyPlan);
      } else {
        await dbHelpers.createPracticePlan(legacyPlan);
      }
      
      setHasUnsavedChanges(false);
      navigate('/training');
    } catch (error) {
      console.error('Error saving practice plan:', error);
      alert('Error saving practice plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {id ? 'Edit Practice Plan' : 'New Practice Plan'}
              </h1>
              <div className="text-sm text-gray-600">
                Total Duration: {calculateTotalDuration()} minutes
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors min-h-[44px]"
            >
              <Target className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={savePracticePlan}
              disabled={isLoading || !planName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Practice Plan Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Templates Panel */}
            {showTemplates && (
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Practice Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {PRACTICE_TEMPLATES.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => loadTemplate(template)}
                      className="p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {template.duration} min • {template.items.length} items
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Plan Details */}
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Practice Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Practice Name *
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g., Tuesday Skills Practice"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="Practice goals, focus areas, or special instructions..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Practice Schedule */}
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Practice Schedule</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => addItem('warm_up', 'Warm-up', 5)}
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded"
                  >
                    + Warm-up
                  </button>
                  <button
                    onClick={() => addItem('break', 'Break', 3)}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded"
                  >
                    + Break
                  </button>
                  <button
                    onClick={() => addItem('scrimmage', 'Scrimmage', 15)}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded"
                  >
                    + Scrimmage
                  </button>
                </div>
              </div>

              {planItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No items in your practice yet</p>
                  <p className="text-sm">Add drills from the sidebar or use a template</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {planItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg ${getItemColor(item.type)}`}
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                      {getItemIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          className="w-full bg-transparent border-none p-0 font-medium focus:ring-0 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.duration}
                          onChange={(e) => updateItem(item.id, { duration: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 bg-white border border-gray-300 rounded text-sm text-center"
                          min="1"
                        />
                        <span className="text-sm opacity-75">min</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Drills Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Available Drills</h3>
              
              {availableDrills.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Target className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No drills available</p>
                  <p className="text-xs">Create some drills first</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableDrills.map(drill => (
                    <div
                      key={drill.id}
                      onClick={() => addDrillToSchedule(drill)}
                      className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-gray-900 text-sm">
                        {drill.title || drill.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="bg-gray-100 px-2 py-1 rounded">{drill.category}</span>
                        {drill.duration && (
                          <span className="ml-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {drill.duration}m
                          </span>
                        )}
                      </div>
                      {drill.tags && drill.tags.length > 0 && (
                        <div className="mt-1">
                          {drill.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded mr-1">
                              {tag}
                            </span>
                          ))}
                          {drill.tags.length > 2 && (
                            <span className="text-xs text-gray-500">+{drill.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticePlanner;