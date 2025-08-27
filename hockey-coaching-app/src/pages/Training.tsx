import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Target, Edit, Trash2, Share2, Filter, Clock, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dbHelpers } from '../db';
import type { Drill } from '../types';

// Simple drill thumbnail component
const DrillThumbnail: React.FC<{ drill: Drill }> = ({ drill }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rinkImage, setRinkImage] = useState<HTMLImageElement | null>(null);

  const drawThumbnail = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rinkImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw rink background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(rinkImage, 0, 0, canvas.width, canvas.height);

    // Get elements from new or legacy format
    let elements: any[] = [];
    if (drill.canvasData) {
      try {
        elements = JSON.parse(drill.canvasData);
      } catch (error) {
        elements = drill.elements || [];
      }
    } else {
      elements = drill.elements || [];
    }
    
    // Draw drill elements (simplified for thumbnail)
    elements.forEach(element => {
      ctx.strokeStyle = element.color || '#2563eb';
      ctx.fillStyle = element.color || '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      switch (element.type) {
        case 'arrow':
          if (element.from && element.to) {
            const fromX = element.from.x * canvas.width;
            const fromY = element.from.y * canvas.height;
            const toX = element.to.x * canvas.width;
            const toY = element.to.y * canvas.height;
            
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();
            
            // Small arrowhead
            const angle = Math.atan2(toY - fromY, toX - fromX);
            const arrowLength = 6;
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
            const centerX = element.center.x * canvas.width;
            const centerY = element.center.y * canvas.height;
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, 4, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;
        
        case 'x':
          if (element.position) {
            const x = element.position.x * canvas.width;
            const y = element.position.y * canvas.height;
            const size = 3;
            
            ctx.beginPath();
            ctx.moveTo(x - size, y - size);
            ctx.lineTo(x + size, y + size);
            ctx.moveTo(x + size, y - size);
            ctx.lineTo(x - size, y + size);
            ctx.stroke();
          }
          break;
      }
    });
  }, [rinkImage, drill.canvasData, drill.elements]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setRinkImage(img);
    };
    img.src = '/images/rink.png';
  }, []);

  useEffect(() => {
    if (rinkImage) {
      drawThumbnail();
    }
  }, [rinkImage, drill.canvasData, drill.elements, drawThumbnail]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={100}
      className="w-full h-full object-cover"
    />
  );
};

const Training: React.FC = () => {
  const [drills, setDrills] = useState<Drill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  const categories = ['All', 'Shooting', 'Passing', 'Defense', 'Skating', 'Other'];

  useEffect(() => {
    loadDrills();
  }, []);

  const loadDrills = async () => {
    try {
      const loadedDrills = await dbHelpers.getAllDrills();
      setDrills(loadedDrills);
      
      // Extract all unique tags from drills
      const tagSet = new Set<string>();
      loadedDrills.forEach(drill => {
        drill.tags?.forEach(tag => tagSet.add(tag));
      });
      setAllTags(Array.from(tagSet).sort());
    } catch (error) {
      console.error('Error loading drills:', error);
    }
  };

  const filteredDrills = drills.filter(drill => {
    // Filter by category
    const categoryMatch = selectedCategory === 'All' || drill.category === selectedCategory;
    
    // Filter by tags
    const tagMatch = selectedTags.length === 0 || 
      (drill.tags && selectedTags.some(tag => drill.tags!.includes(tag)));
    
    return categoryMatch && tagMatch;
  });

  const deleteDrill = async (drillId: string) => {
    if (window.confirm('Delete this drill? This cannot be undone.')) {
      try {
        await dbHelpers.deleteDrill(drillId);
        setDrills(prev => prev.filter(d => d.id !== drillId));
      } catch (error) {
        console.error('Error deleting drill:', error);
        alert('Error deleting drill. Please try again.');
      }
    }
  };

  const generateDrillImage = async (drill: Drill): Promise<string> => {
    // Create a temporary canvas to generate the drill image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Cannot create canvas context');
    
    // Load rink background
    const rinkImage = new Image();
    rinkImage.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
      rinkImage.onload = () => {
        try {
          // Draw rink background
          ctx.drawImage(rinkImage, 0, 0, canvas.width, canvas.height);
          
          // Get elements from new or legacy format
          let elements: any[] = [];
          if (drill.canvasData) {
            try {
              elements = JSON.parse(drill.canvasData);
            } catch (error) {
              console.error('Error parsing canvas data:', error);
              elements = drill.elements || [];
            }
          } else {
            elements = drill.elements || [];
          }
          
          // Draw drill elements
          elements.forEach(element => {
            ctx.strokeStyle = element.color || '#2563eb';
            ctx.fillStyle = element.color || '#2563eb';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            
            switch (element.type) {
              case 'arrow':
                if (element.from && element.to) {
                  const fromX = element.from.x * canvas.width;
                  const fromY = element.from.y * canvas.height;
                  const toX = element.to.x * canvas.width;
                  const toY = element.to.y * canvas.height;
                  
                  // Draw arrow line
                  ctx.beginPath();
                  ctx.moveTo(fromX, fromY);
                  ctx.lineTo(toX, toY);
                  ctx.stroke();
                  
                  // Draw arrowhead
                  const angle = Math.atan2(toY - fromY, toX - fromX);
                  const arrowLength = 10;
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
                  const centerX = element.center.x * canvas.width;
                  const centerY = element.center.y * canvas.height;
                  
                  ctx.beginPath();
                  ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
                  ctx.stroke();
                  
                  if (element.label) {
                    ctx.fillStyle = element.color || '#2563eb';
                    ctx.font = 'bold 8px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(element.label, centerX, centerY);
                  }
                }
                break;
              
              case 'x':
                if (element.position) {
                  const x = element.position.x * canvas.width;
                  const y = element.position.y * canvas.height;
                  const size = 6;
                  
                  ctx.beginPath();
                  ctx.moveTo(x - size, y - size);
                  ctx.lineTo(x + size, y + size);
                  ctx.moveTo(x + size, y - size);
                  ctx.lineTo(x - size, y + size);
                  ctx.stroke();
                }
                break;
            }
          });
          
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };
      
      rinkImage.onerror = () => reject(new Error('Failed to load rink image'));
      rinkImage.src = '/images/rink.png';
    });
  };

  const shareDrill = async (drill: Drill) => {
    try {
      const imageDataUrl = await generateDrillImage(drill);
      
      // Convert data URL to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(drill.title || drill.name || 'drill').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error sharing drill:', error);
      alert('Error generating drill image. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Training Preparation
          </h1>
          <p className="text-gray-600 mt-1">Create and manage your practice drills</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to="/training/drill-designer"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Drill
          </Link>
          <button className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Practice Plan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500 mr-1" />
          <span className="text-sm font-medium text-gray-700 mr-2">Category:</span>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="w-5 h-5 text-gray-500 mr-1" />
            <span className="text-sm font-medium text-gray-700 mr-2">Tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors min-h-[36px] ${
                  selectedTags.includes(tag)
                    ? 'bg-green-100 text-green-700 border-2 border-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-3 py-1 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 min-h-[36px]"
              >
                Clear Tags
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drills Grid */}
      {filteredDrills.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedCategory === 'All' && selectedTags.length === 0 
              ? 'No drills yet' 
              : 'No matching drills found'}
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedCategory === 'All' && selectedTags.length === 0
              ? 'Start by creating your first drill to build your practice library'
              : 'Try adjusting your filters or create a new drill'
            }
          </p>
          <Link
            to="/training/drill-designer"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Drill
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDrills.map(drill => (
            <div key={drill.id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              {/* Drill Thumbnail */}
              <div className="h-32 bg-green-50 rounded-t-lg flex items-center justify-center border-b relative overflow-hidden">
                <DrillThumbnail drill={drill} />
              </div>
              
              {/* Drill Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {drill.title || drill.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    {drill.duration && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {drill.duration}m
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {drill.category}
                    </span>
                  </div>
                </div>
                
                {/* Tags */}
                {drill.tags && drill.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {drill.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {drill.tags.length > 2 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{drill.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {drill.description || 'No description'}
                </p>
                
                {/* Action Buttons */}
                <div className="flex gap-1">
                  <Link
                    to={`/training/drill-designer/${drill.id}`}
                    className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded text-xs transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Link>
                  <button
                    onClick={() => shareDrill(drill)}
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1.5 rounded text-xs transition-colors"
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </button>
                  <button
                    onClick={() => deleteDrill(drill.id)}
                    className="flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1.5 rounded text-xs transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Training;