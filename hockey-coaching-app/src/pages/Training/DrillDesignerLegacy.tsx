import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, 
  Circle, 
  X, 
  Undo, 
  RotateCcw, 
  Save, 
  Share2, 
  ArrowLeft 
} from 'lucide-react';
import { dbHelpers } from '../../db';
import type { Drill, DrillElement, DrillCategory } from '../../types';

type Tool = 'arrow' | 'circle' | 'x' | 'eraser';

const DrillDesigner: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('arrow');
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<DrillElement[]>([]);
  const [undoStack, setUndoStack] = useState<DrillElement[][]>([]);
  const [drillName, setDrillName] = useState('');
  const [drillCategory, setDrillCategory] = useState<DrillCategory>('Shooting');
  const [drillDescription, setDrillDescription] = useState('');
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [rinkImage, setRinkImage] = useState<HTMLImageElement | null>(null);

  const categories: DrillCategory[] = ['Shooting', 'Passing', 'Defense', 'Skating', 'Other'];

  // Load existing drill if editing
  useEffect(() => {
    if (id) {
      loadDrill(id);
    }
  }, [id]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw rink background
    if (rinkImage) {
      ctx.drawImage(rinkImage, 0, 0, canvas.width, canvas.height);
    }

    // Draw all elements
    elements.forEach(element => {
      drawElement(ctx, element, canvas.width, canvas.height);
    });
  }, [elements, rinkImage]);

  // Load rink background image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setRinkImage(img);
    };
    img.src = '/images/rink.png';
  }, []);

  // Redraw canvas when elements change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const loadDrill = async (drillId: string) => {
    try {
      const drill = await dbHelpers.getDrillById(drillId);
      if (drill) {
        setDrillName(drill.name);
        setDrillCategory(drill.category);
        setDrillDescription(drill.description);
        setElements(drill.elements);
      }
    } catch (error) {
      console.error('Error loading drill:', error);
    }
  };

  const drawElement = (
    ctx: CanvasRenderingContext2D, 
    element: DrillElement, 
    canvasWidth: number, 
    canvasHeight: number
  ) => {
    ctx.strokeStyle = element.color || '#2563eb';
    ctx.fillStyle = element.color || '#2563eb';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    switch (element.type) {
      case 'arrow':
        if (element.from && element.to) {
          const fromX = element.from.x * canvasWidth;
          const fromY = element.from.y * canvasHeight;
          const toX = element.to.x * canvasWidth;
          const toY = element.to.y * canvasHeight;
          
          // Draw arrow line
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();
          
          // Draw arrowhead
          const angle = Math.atan2(toY - fromY, toX - fromX);
          const arrowLength = 20;
          const arrowAngle = Math.PI / 6;
          
          ctx.beginPath();
          ctx.moveTo(toX, toY);
          ctx.lineTo(
            toX - arrowLength * Math.cos(angle - arrowAngle),
            toY - arrowLength * Math.sin(angle - arrowAngle)
          );
          ctx.moveTo(toX, toY);
          ctx.lineTo(
            toX - arrowLength * Math.cos(angle + arrowAngle),
            toY - arrowLength * Math.sin(angle + arrowAngle)
          );
          ctx.stroke();
        }
        break;
      
      case 'circle':
        if (element.center) {
          const centerX = element.center.x * canvasWidth;
          const centerY = element.center.y * canvasHeight;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Draw label if present
          if (element.label) {
            ctx.fillStyle = element.color || '#2563eb';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(element.label, centerX, centerY);
          }
        }
        break;
      
      case 'x':
        if (element.position) {
          const x = element.position.x * canvasWidth;
          const y = element.position.y * canvasHeight;
          const size = 12;
          
          ctx.beginPath();
          ctx.moveTo(x - size, y - size);
          ctx.lineTo(x + size, y + size);
          ctx.moveTo(x + size, y - size);
          ctx.lineTo(x - size, y + size);
          ctx.stroke();
        }
        break;
    }
  };

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: ((event.clientX - rect.left) * scaleX) / canvas.width,
      y: ((event.clientY - rect.top) * scaleY) / canvas.height
    };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(event);
    
    if (currentTool === 'arrow') {
      setStartPoint(coords);
      setIsDrawing(true);
    } else if (currentTool === 'circle' || currentTool === 'x') {
      addElement(coords);
    }
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    
    const coords = getCanvasCoordinates(event);
    
    if (currentTool === 'arrow') {
      const newElement: DrillElement = {
        id: Date.now().toString(),
        type: 'arrow',
        from: startPoint,
        to: coords,
        color: '#2563eb'
      };
      
      saveToUndoStack();
      setElements(prev => [...prev, newElement]);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
  };

  const addElement = (coords: { x: number; y: number }) => {
    let newElement: DrillElement;
    
    if (currentTool === 'circle') {
      newElement = {
        id: Date.now().toString(),
        type: 'circle',
        center: coords,
        color: '#2563eb'
      };
    } else {
      newElement = {
        id: Date.now().toString(),
        type: 'x',
        position: coords,
        color: '#2563eb'
      };
    }
    
    saveToUndoStack();
    setElements(prev => [...prev, newElement]);
  };

  const saveToUndoStack = () => {
    setUndoStack(prev => [...prev, elements]);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      setElements(undoStack[undoStack.length - 1]);
      setUndoStack(prev => prev.slice(0, -1));
    }
  };

  const clearCanvas = () => {
    if (elements.length > 0 && window.confirm('Clear all elements? This cannot be undone.')) {
      saveToUndoStack();
      setElements([]);
    }
  };

  const saveDrill = async () => {
    if (!drillName.trim()) {
      alert('Please enter a drill name');
      return;
    }

    const drill: Drill = {
      id: id || Date.now().toString(),
      name: drillName.trim(),
      category: drillCategory,
      elements,
      description: drillDescription.trim(),
      createdAt: id ? (await dbHelpers.getDrillById(id))?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (id) {
        await dbHelpers.updateDrill(id, drill);
      } else {
        await dbHelpers.createDrill(drill);
      }
      navigate('/training');
    } catch (error) {
      console.error('Error saving drill:', error);
      alert('Error saving drill. Please try again.');
    }
  };

  const shareDrill = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvasElement = await html2canvas(canvas);
      
      canvasElement.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${drillName || 'drill'}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Error sharing drill:', error);
      alert('Error generating drill image. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/training')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Training
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {id ? 'Edit Drill' : 'New Drill'}
            </h1>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={shareDrill}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={saveDrill}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-full">
        {/* Tools Sidebar */}
        <div className="w-full lg:w-64 bg-white border-b lg:border-r lg:border-b-0 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Drawing Tools</h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 mb-6">
            <button
              onClick={() => setCurrentTool('arrow')}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                currentTool === 'arrow'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Arrow
            </button>
            
            <button
              onClick={() => setCurrentTool('circle')}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                currentTool === 'circle'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Circle className="w-4 h-4" />
              Player (O)
            </button>
            
            <button
              onClick={() => setCurrentTool('x')}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                currentTool === 'x'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <X className="w-4 h-4" />
              Cone (X)
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 mb-6">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="flex items-center gap-2 p-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Undo className="w-4 h-4" />
              Undo
            </button>
            
            <button
              onClick={clearCanvas}
              className="flex items-center gap-2 p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Clear All
            </button>
          </div>

          {/* Drill Info Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drill Name
              </label>
              <input
                type="text"
                value={drillName}
                onChange={(e) => setDrillName(e.target.value)}
                placeholder="e.g., 2-on-1 Rush"
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
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg border shadow-sm h-full flex items-center justify-center">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                className="border border-gray-300 rounded-lg cursor-crosshair max-w-full h-auto"
                style={{ aspectRatio: '2/1' }}
              />
              
              {/* Tool hint */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                {currentTool === 'arrow' && 'Click and drag to draw arrow'}
                {currentTool === 'circle' && 'Click to place player'}
                {currentTool === 'x' && 'Click to place cone'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillDesigner;