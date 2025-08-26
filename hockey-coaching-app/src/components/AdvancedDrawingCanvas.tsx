import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { DrawingElement, DrawingToolType, DrawingColor } from '../types';
import { drawElement } from '../lib/drawing/renderer-new';
import { hitTest, getBoundingRect, generateId } from '../lib/drawing/utils';
import { addPointToPath } from '../lib/drawing/smooth-arrows';

interface AdvancedDrawingCanvasProps {
  elements: DrawingElement[];
  selectedTool: DrawingToolType;
  selectedColor: DrawingColor;
  selectedElements: string[];
  onElementsChange: (elements: DrawingElement[]) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  onStartDrawing?: () => void;
  onFinishDrawing?: () => void;
  width?: number;
  height?: number;
  rinkImageSrc?: string;
  readOnly?: boolean;
}

export const AdvancedDrawingCanvas: React.FC<AdvancedDrawingCanvasProps> = ({
  elements,
  selectedTool,
  selectedColor,
  selectedElements,
  onElementsChange,
  onSelectionChange,
  onStartDrawing,
  onFinishDrawing,
  width = 800,
  height = 400,
  rinkImageSrc = '/images/rink.png',
  readOnly = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingElement | null>(null);
  const [rinkImage, setRinkImage] = useState<HTMLImageElement | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Load rink background image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setRinkImage(img);
    img.src = rinkImageSrc;
  }, [rinkImageSrc]);

  // Redraw canvas when elements change
  const redraw = useCallback(() => {
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
      const isSelected = selectedElements.includes(element.id);
      drawElement(ctx, element, canvas.width, canvas.height, isSelected);
    });

    // Draw current drawing preview
    if (currentDrawing) {
      drawElement(ctx, currentDrawing, canvas.width, canvas.height, false, 0.7);
    }

    // Draw selection handles for selected elements
    selectedElements.forEach(elementId => {
      const element = elements.find(e => e.id === elementId);
      if (element) {
        drawSelectionHandles(ctx, element, canvas.width, canvas.height);
      }
    });
  }, [elements, selectedElements, currentDrawing, rinkImage]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const drawSelectionHandles = (
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const rect = getBoundingRect(element, canvasWidth, canvasHeight);
    if (!rect) return;

    ctx.strokeStyle = '#0066cc';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Draw bounding box
    ctx.strokeRect(rect.x - 5, rect.y - 5, rect.width + 10, rect.height + 10);

    // Draw corner handles
    const handleSize = 6;
    const handles = [
      { x: rect.x - 5, y: rect.y - 5 },
      { x: rect.x + rect.width + 5, y: rect.y - 5 },
      { x: rect.x - 5, y: rect.y + rect.height + 5 },
      { x: rect.x + rect.width + 5, y: rect.y + rect.height + 5 },
    ];

    handles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });
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
    if (readOnly) return;

    const coords = getCanvasCoordinates(event);
    const canvasCoords = {
      x: coords.x * width,
      y: coords.y * height
    };

    // Check if clicking on an existing element
    const clickedElement = elements.find(element => 
      hitTest(element, canvasCoords.x, canvasCoords.y, width, height)
    );

    if (selectedTool === 'pointer') {
      if (clickedElement) {
        if (!selectedElements.includes(clickedElement.id)) {
          if (event.shiftKey) {
            onSelectionChange([...selectedElements, clickedElement.id]);
          } else {
            onSelectionChange([clickedElement.id]);
          }
        }
      } else {
        onSelectionChange([]);
      }
      return;
    }

    // Handle text tool with inline editing
    if (selectedTool === 'text') {
      if (clickedElement && clickedElement.type === 'text') {
        startTextEditing(clickedElement.id);
      } else {
        createTextElement(coords);
      }
      return;
    }

    // Start drawing for arrow tools
    if (['arrow', 'pass_arrow', 'backward_arrow', 'shoot_arrow'].includes(selectedTool)) {
      setIsDrawing(true);
      onStartDrawing?.();
      
      const newElement: DrawingElement = {
        id: generateId(),
        type: selectedTool,
        startPoint: coords,
        path: [coords],
        color: selectedColor,
      };
      setCurrentDrawing(newElement);
    } else if (['puck', 'defense', 'offense', 'opponent', 'cone'].includes(selectedTool)) {
      // Single-click placement tools
      const newElement: DrawingElement = {
        id: generateId(),
        type: selectedTool,
        startPoint: coords,
        color: selectedColor,
        radius: selectedTool === 'puck' ? 4 : 18,
      };
      
      onElementsChange([...elements, newElement]);
      onFinishDrawing?.();
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const coords = getCanvasCoordinates(event);

    if (isDrawing && currentDrawing) {
      // Convert to canvas coordinates for distance calculation
      const canvasCoords = {
        x: coords.x * width,
        y: coords.y * height
      };
      
      // Add point to path with minimum distance filtering
      const currentCanvasPath = (currentDrawing.path || []).map(p => ({
        x: p.x * width,
        y: p.y * height
      }));
      
      const newCanvasPath = addPointToPath(currentCanvasPath, canvasCoords, 8); // 8px minimum distance
      
      // Convert back to normalized coordinates
      const newPath = newCanvasPath.map(p => ({
        x: p.x / width,
        y: p.y / height
      }));
      
      setCurrentDrawing({
        ...currentDrawing,
        path: newPath,
        endPoint: coords
      });
    }
  };

  const handleMouseUp = () => {
    if (readOnly) return;

    if (isDrawing && currentDrawing) {
      // Finalize the drawing
      onElementsChange([...elements, currentDrawing]);
      onFinishDrawing?.();
    }

    setIsDrawing(false);
    setCurrentDrawing(null);
  };

  const startTextEditing = (elementId: string) => {
    const element = elements.find(e => e.id === elementId);
    if (!element || element.type !== 'text') return;

    setEditingTextId(elementId);
    
    // Update element to editing state
    const updatedElements = elements.map(e => 
      e.id === elementId 
        ? { ...e, isEditing: true }
        : { ...e, isEditing: false }
    );
    onElementsChange(updatedElements);

    // Create input element for text editing
    setTimeout(() => createTextInput(element), 0);
  };

  const createTextInput = (element: DrawingElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const canvasX = element.startPoint.x * canvas.width;
    const canvasY = element.startPoint.y * canvas.height;
    
    // Convert canvas coordinates to screen coordinates
    const screenX = rect.left + (canvasX * rect.width / canvas.width);
    const screenY = rect.top + (canvasY * rect.height / canvas.height);

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = element.label || '';
    input.style.position = 'fixed';
    input.style.left = `${screenX - 50}px`;
    input.style.top = `${screenY - 10}px`;
    input.style.width = '100px';
    input.style.fontSize = '16px';
    input.style.textAlign = 'center';
    input.style.border = '2px solid #0066cc';
    input.style.borderRadius = '4px';
    input.style.padding = '4px';
    input.style.zIndex = '1000';
    input.style.background = 'white';

    document.body.appendChild(input);
    input.focus();
    input.select();

    const finishEditing = () => {
      const newText = input.value.trim();
      
      // Update element
      const updatedElements = elements.map(e => 
        e.id === element.id 
          ? { ...e, label: newText || 'Text', isEditing: false }
          : e
      );
      onElementsChange(updatedElements);
      
      setEditingTextId(null);
      document.body.removeChild(input);
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        finishEditing();
      }
    });
  };

  const createTextElement = (coords: { x: number; y: number }) => {
    const newElement: DrawingElement = {
      id: generateId(),
      type: 'text',
      startPoint: coords,
      color: selectedColor,
      label: 'Text',
      fontSize: 16
    };
    
    onElementsChange([...elements, newElement]);
    
    // Immediately start editing the new text
    setTimeout(() => startTextEditing(newElement.id), 50);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (readOnly) return;

    if (event.key === 'Delete' && selectedElements.length > 0) {
      const remainingElements = elements.filter(element => !selectedElements.includes(element.id));
      onElementsChange(remainingElements);
      onSelectionChange([]);
    }

    if (event.key === 'Escape' && editingTextId) {
      setEditingTextId(null);
      const updatedElements = elements.map(e => ({ ...e, isEditing: false }));
      onElementsChange(updatedElements);
    }
  }, [elements, selectedElements, editingTextId, onElementsChange, onSelectionChange, readOnly]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`border border-gray-300 rounded-lg ${
          readOnly ? 'cursor-default' : selectedTool === 'pointer' ? 'cursor-default' : 'cursor-crosshair'
        } max-w-full h-auto`}
        style={{ aspectRatio: `${width}/${height}` }}
      />
    </div>
  );
};

export default AdvancedDrawingCanvas;