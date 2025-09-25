import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Circle, Line, Text, Group, Arrow, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';

// Enhanced drawing element types for hockey-specific needs
export interface HockeyElement {
  id: string;
  type: 'player' | 'puck' | 'cone' | 'arrow' | 'pass_arrow' | 'shoot_arrow' | 'backward_arrow' | 'text' | 'line';
  x: number;
  y: number;
  // Player-specific
  playerType?: 'offense' | 'defense' | 'opponent' | 'goalie';
  playerColor?: 'blue' | 'red' | 'black' | 'white';
  // Arrow/Line specific
  points?: number[]; // For free-form curved arrows (movement)
  endPoint?: { x: number; y: number }; // For simple straight arrows (passes/shots)
  // Text specific
  text?: string;
  fontSize?: number;
  // General
  color?: string;
  strokeWidth?: number;
  isDragging?: boolean;
  selected?: boolean;
  // Arrow style
  isFreeDraw?: boolean; // True for movement arrows that can be curved freely
}

interface KonvaDrawingCanvasProps {
  width: number;
  height: number;
  elements: HockeyElement[];
  onElementsChange: (elements: HockeyElement[]) => void;
  selectedTool: string;
  selectedColor: string;
  onElementSelect?: (elementId: string | null) => void;
  selectedElementId?: string | null;
  readOnly?: boolean;
}

const KonvaDrawingCanvas: React.FC<KonvaDrawingCanvasProps> = ({
  width,
  height,
  elements,
  onElementsChange,
  selectedTool,
  selectedColor,
  onElementSelect,
  selectedElementId,
  readOnly = false
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [rinkImage, setRinkImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<number[]>([]);
  const [currentDrawingType, setCurrentDrawingType] = useState<string>('');

  // Load the actual hockey rink image
  useEffect(() => {
    const image = new window.Image();
    image.onload = () => {
      setRinkImage(image);
    };
    image.src = '/images/rink.png'; // Use the real rink.png
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Handle mouse down for drawing
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (readOnly) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // If clicking on empty space, deselect
    if (e.target === stage) {
      onElementSelect?.(null);
    }

    // Handle different tools
    switch (selectedTool) {
      case 'offense':
      case 'defense':
      case 'opponent':
      case 'goalie':
        addPlayer(pos.x, pos.y, selectedTool);
        break;

      case 'puck':
        addPuck(pos.x, pos.y);
        break;

      case 'cone':
        addCone(pos.x, pos.y);
        break;

      case 'arrow':
      case 'pass_arrow':
      case 'shoot_arrow':
      case 'backward_arrow':
        startDrawingLine(pos.x, pos.y, selectedTool);
        break;

      case 'text':
        addText(pos.x, pos.y);
        break;
    }
  }, [selectedTool, selectedColor, readOnly, onElementSelect]);

  // Handle mouse move for drawing lines/arrows
  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || readOnly) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // For movement arrows (free drawing), add points to create curves
    if (currentDrawingType === 'arrow' || currentDrawingType === 'backward_arrow') {
      setCurrentLine(prev => [...prev, pos.x, pos.y]);
    } else {
      // For passes and shots, keep as straight lines
      setCurrentLine(prev => [prev[0], prev[1], pos.x, pos.y]);
    }
  }, [isDrawing, readOnly, currentDrawingType]);

  // Handle mouse up for finishing drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || readOnly) return;

    if (currentLine.length >= 4) {
      finishDrawingLine();
    }

    setIsDrawing(false);
    setCurrentLine([]);
    setCurrentDrawingType('');
  }, [isDrawing, currentLine, readOnly]);

  const addPlayer = (x: number, y: number, toolType: string) => {
    const playerTypes: { [key: string]: { type: HockeyElement['playerType'], color: string } } = {
      'offense': { type: 'offense', color: '#2563eb' }, // Blue
      'defense': { type: 'defense', color: '#2563eb' }, // Blue
      'opponent': { type: 'opponent', color: '#dc2626' }, // Red
      'goalie': { type: 'goalie', color: '#059669' }, // Green
    };

    const playerConfig = playerTypes[toolType];
    if (!playerConfig) return;

    const newElement: HockeyElement = {
      id: generateId(),
      type: 'player',
      x,
      y,
      playerType: playerConfig.type,
      color: playerConfig.color,
    };

    onElementsChange([...elements, newElement]);
  };

  const addPuck = (x: number, y: number) => {
    const newElement: HockeyElement = {
      id: generateId(),
      type: 'puck',
      x,
      y,
      color: '#000000',
    };

    onElementsChange([...elements, newElement]);
  };

  const addCone = (x: number, y: number) => {
    const newElement: HockeyElement = {
      id: generateId(),
      type: 'cone',
      x,
      y,
      color: '#F97316', // Orange
    };

    onElementsChange([...elements, newElement]);
  };

  const startDrawingLine = (x: number, y: number, toolType: string) => {
    setIsDrawing(true);
    setCurrentDrawingType(toolType);
    setCurrentLine([x, y]);
  };

  const finishDrawingLine = () => {
    if (currentLine.length < 4) return;

    const newElement: HockeyElement = {
      id: generateId(),
      type: currentDrawingType as HockeyElement['type'],
      x: currentLine[0],
      y: currentLine[1],
      color: selectedColor,
      strokeWidth: currentDrawingType === 'shoot_arrow' ? 4 : 2,
    };

    // For movement arrows (free drawing), store all points
    if (currentDrawingType === 'arrow' || currentDrawingType === 'backward_arrow') {
      newElement.points = [...currentLine];
      newElement.isFreeDraw = true;
    } else {
      // For passes and shots, use simple end point
      newElement.endPoint = { x: currentLine[currentLine.length - 2], y: currentLine[currentLine.length - 1] };
      newElement.isFreeDraw = false;
    }

    onElementsChange([...elements, newElement]);
  };

  const addText = (x: number, y: number) => {
    const text = prompt('Enter text:');
    if (!text) return;

    const newElement: HockeyElement = {
      id: generateId(),
      type: 'text',
      x,
      y,
      text,
      fontSize: 16,
      color: selectedColor,
    };

    onElementsChange([...elements, newElement]);
  };

  // Handle element drag
  const handleElementDragEnd = (elementId: string, e: KonvaEventObject<DragEvent>) => {
    if (readOnly) return;

    const newElements = elements.map(el =>
      el.id === elementId
        ? { ...el, x: e.target.x(), y: e.target.y() }
        : el
    );
    onElementsChange(newElements);
  };

  // Render player markers (like original system)
  const renderPlayer = (element: HockeyElement) => {
    const radius = 15;
    const getPlayerLabel = () => {
      switch (element.playerType) {
        case 'offense': return 'O';
        case 'defense': return 'D';
        case 'opponent': return 'X';
        case 'goalie': return 'G';
        default: return 'P';
      }
    };

    return (
      <Group
        key={element.id}
        x={element.x}
        y={element.y}
        draggable={!readOnly}
        onDragEnd={(e) => handleElementDragEnd(element.id, e)}
        onClick={() => onElementSelect?.(element.id)}
      >
        <Circle
          radius={radius}
          fill={element.color}
          stroke={element.selected ? '#FFD700' : '#FFFFFF'}
          strokeWidth={element.selected ? 3 : 1}
        />
        <Text
          text={getPlayerLabel()}
          fontSize={10}
          fontStyle="bold"
          fill="#FFFFFF"
          offsetX={5}
          offsetY={5}
        />
      </Group>
    );
  };

  // Render arrows with hockey-specific styling
  const renderArrow = (element: HockeyElement) => {
    let strokeColor = element.color || '#374151';
    let strokeStyle: number[] | undefined = undefined;

    // Set colors and styles based on arrow type
    switch (element.type) {
      case 'pass_arrow':
        strokeColor = '#10B981'; // Green
        strokeStyle = [8, 4]; // Dashed
        break;
      case 'shoot_arrow':
        strokeColor = '#EF4444'; // Red
        strokeStyle = undefined; // Solid, thick
        break;
      case 'backward_arrow':
        strokeColor = '#8B5CF6'; // Purple
        strokeStyle = [4, 4]; // Short dashes
        break;
      default:
        strokeColor = '#374151'; // Gray for regular movement
    }

    // For free-form movement arrows (curved paths)
    if (element.isFreeDraw && element.points && element.points.length >= 4) {
      const lastIndex = element.points.length - 2;
      const lastX = element.points[lastIndex];
      const lastY = element.points[lastIndex + 1];
      const prevX = element.points[lastIndex - 2] || lastX;
      const prevY = element.points[lastIndex - 1] || lastY;

      return (
        <Group key={element.id}>
          <Line
            points={element.points}
            stroke={strokeColor}
            strokeWidth={element.strokeWidth || 2}
            dash={strokeStyle}
            tension={0.3}
            lineCap="round"
            lineJoin="round"
            draggable={!readOnly}
            onDragEnd={(e) => handleElementDragEnd(element.id, e)}
            onClick={() => onElementSelect?.(element.id)}
          />
          {/* Arrow head at the end */}
          <Arrow
            points={[prevX, prevY, lastX, lastY]}
            pointerLength={10}
            pointerWidth={8}
            fill={strokeColor}
            stroke={strokeColor}
            strokeWidth={1}
          />
        </Group>
      );
    }

    // For straight arrows (passes and shots)
    if (element.endPoint) {
      const points = [element.x, element.y, element.endPoint.x, element.endPoint.y];

      return (
        <Arrow
          key={element.id}
          points={points}
          pointerLength={10}
          pointerWidth={8}
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth={element.strokeWidth || 2}
          dash={strokeStyle}
          draggable={!readOnly}
          onDragEnd={(e) => handleElementDragEnd(element.id, e)}
          onClick={() => onElementSelect?.(element.id)}
        />
      );
    }

    return null;
  };

  // Render other elements
  const renderElement = (element: HockeyElement) => {
    switch (element.type) {
      case 'player':
        return renderPlayer(element);

      case 'puck':
        return (
          <Circle
            key={element.id}
            x={element.x}
            y={element.y}
            radius={8}
            fill="#000000"
            stroke="#FFFFFF"
            strokeWidth={1}
            draggable={!readOnly}
            onDragEnd={(e) => handleElementDragEnd(element.id, e)}
            onClick={() => onElementSelect?.(element.id)}
          />
        );

      case 'cone':
        return (
          <Group
            key={element.id}
            x={element.x}
            y={element.y}
            draggable={!readOnly}
            onDragEnd={(e) => handleElementDragEnd(element.id, e)}
            onClick={() => onElementSelect?.(element.id)}
          >
            {/* Triangle for cone */}
            <Line
              points={[0, -15, -10, 10, 10, 10]}
              closed={true}
              fill="#F97316"
              stroke="#FFFFFF"
              strokeWidth={1}
            />
          </Group>
        );

      case 'arrow':
      case 'pass_arrow':
      case 'shoot_arrow':
      case 'backward_arrow':
        return renderArrow(element);

      case 'text':
        return (
          <Text
            key={element.id}
            x={element.x}
            y={element.y}
            text={element.text || ''}
            fontSize={element.fontSize || 16}
            fill={element.color || '#000000'}
            draggable={!readOnly}
            onDragEnd={(e) => handleElementDragEnd(element.id, e)}
            onClick={() => onElementSelect?.(element.id)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative bg-white rounded-lg shadow-lg border overflow-hidden">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
      >
        <Layer ref={layerRef}>
          {/* Hockey rink background */}
          {rinkImage && (
            <KonvaImage
              image={rinkImage}
              width={width}
              height={height}
            />
          )}

          {/* Render all elements */}
          {elements.map(renderElement)}

          {/* Current drawing preview */}
          {isDrawing && currentLine.length >= 4 && (
            <>
              {/* For free-form movement, show curved line */}
              {(currentDrawingType === 'arrow' || currentDrawingType === 'backward_arrow') ? (
                <Line
                  points={currentLine}
                  stroke={selectedColor}
                  strokeWidth={2}
                  tension={0.3}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.7}
                />
              ) : (
                /* For passes and shots, show straight arrow */
                <Arrow
                  points={[currentLine[0], currentLine[1], currentLine[currentLine.length - 2], currentLine[currentLine.length - 1]]}
                  pointerLength={8}
                  pointerWidth={6}
                  fill={selectedColor}
                  stroke={selectedColor}
                  strokeWidth={2}
                  opacity={0.7}
                />
              )}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default KonvaDrawingCanvas;