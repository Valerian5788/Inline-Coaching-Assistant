import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Group, Text, Line } from 'react-konva';
import Konva from 'konva';
import simplify from 'simplify-js';
import throttle from 'lodash.throttle';
import type { KonvaEventObject } from 'konva/lib/Node';

// Drawing modes for hockey-specific actions
export type DrawingMode =
  | 'select'
  | 'skating'
  | 'passing'
  | 'shooting'
  | 'backward'
  | 'carry'
  | 'player_offense'
  | 'player_defense'
  | 'player_opponent'
  | 'player_goalie'
  | 'puck'
  | 'cone'
  | 'erase';

// Hockey object types
export interface HockeyObject {
  id: string;
  type: 'player' | 'puck' | 'cone' | 'line';
  x: number;
  y: number;
  playerType?: 'offense' | 'defense' | 'opponent' | 'goalie';
  points?: number[]; // For lines/arrows
  lineType?: 'skating' | 'passing' | 'shooting' | 'backward' | 'carry';
  color?: string;
  selected?: boolean;
}

// Line styling configurations for different hockey actions
interface LineStyle {
  name: string;
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap?: 'round' | 'butt' | 'square';
  lineJoin?: 'round' | 'bevel' | 'miter';
  dash?: number[];
  arrow: boolean;
  arrowSize?: { length: number; width: number };
}

const LINE_STYLES: Record<string, LineStyle> = {
  skating: {
    name: 'Player Movement',
    stroke: '#2563EB',
    strokeWidth: 4,
    tension: 0.5,
    lineCap: 'round',
    lineJoin: 'round',
    arrow: true,
    arrowSize: { length: 15, width: 15 }
  },
  passing: {
    name: 'Pass',
    stroke: '#10B981',
    strokeWidth: 3,
    dash: [15, 5],
    tension: 0, // Straight lines for passes
    arrow: true,
    arrowSize: { length: 12, width: 12 }
  },
  shooting: {
    name: 'Shot',
    stroke: '#DC2626',
    strokeWidth: 6,
    tension: 0,
    arrow: true,
    arrowSize: { length: 20, width: 20 }
  },
  backward: {
    name: 'Backward Skating',
    stroke: '#7C3AED',
    strokeWidth: 4,
    dash: [5, 5],
    tension: 0.5,
    arrow: true,
    arrowSize: { length: 15, width: 15 }
  },
  carry: {
    name: 'Puck Carry',
    stroke: '#000000',
    strokeWidth: 3,
    dash: [2, 2],
    tension: 0.5,
    arrow: false
  }
};

// Player object configurations
interface PlayerConfig {
  shape: 'circle' | 'rect';
  radius?: number;
  width?: number;
  height?: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
  textFill: string;
}

const PLAYER_CONFIGS: Record<string, PlayerConfig> = {
  offense: {
    shape: 'circle',
    radius: 15,
    fill: '#FF0000',
    stroke: '#8B0000',
    strokeWidth: 2,
    text: 'O',
    textFill: '#FFFFFF'
  },
  defense: {
    shape: 'circle',
    radius: 15,
    fill: '#0000FF',
    stroke: '#000080',
    strokeWidth: 2,
    text: 'D',
    textFill: '#FFFFFF'
  },
  opponent: {
    shape: 'circle',
    radius: 15,
    fill: '#000000',
    stroke: '#333333',
    strokeWidth: 2,
    text: 'X',
    textFill: '#FFFFFF'
  },
  goalie: {
    shape: 'rect',
    width: 20,
    height: 30,
    fill: '#FFD700',
    stroke: '#DAA520',
    strokeWidth: 2,
    text: 'G',
    textFill: '#000000'
  }
};

interface ProfessionalHockeyCanvasProps {
  width: number;
  height: number;
  mode: DrawingMode;
  objects: HockeyObject[];
  onObjectsChange: (objects: HockeyObject[]) => void;
  onModeChange?: (mode: DrawingMode) => void;
}

const ProfessionalHockeyCanvas: React.FC<ProfessionalHockeyCanvasProps> = ({
  width,
  height,
  mode,
  objects,
  onObjectsChange
}) => {
  // Refs for different layers
  const stageRef = useRef<Konva.Stage>(null);
  const rinkLayerRef = useRef<Konva.Layer>(null);
  const objectLayerRef = useRef<Konva.Layer>(null);
  const drawingLayerRef = useRef<Konva.Layer>(null);
  const tempLayerRef = useRef<Konva.Layer>(null);
  const uiLayerRef = useRef<Konva.Layer>(null);

  // Drawing state
  const [rinkImage, setRinkImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<Konva.Line | null>(null);

  // Load rink background
  useEffect(() => {
    const image = new window.Image();
    image.onload = () => {
      setRinkImage(image);
    };
    image.src = '/images/rink.png';
  }, []);

  // Setup layers with proper performance settings
  useEffect(() => {
    if (!stageRef.current) return;

    const rinkLayer = rinkLayerRef.current;
    const objectLayer = objectLayerRef.current;
    const drawingLayer = drawingLayerRef.current;
    const tempLayer = tempLayerRef.current;
    const uiLayer = uiLayerRef.current;

    if (rinkLayer) {
      // Static layer - disable events for performance
      rinkLayer.listening(false);
    }

    if (objectLayer) {
      objectLayer.listening(true);
    }

    if (drawingLayer) {
      drawingLayer.listening(true);
    }

    if (tempLayer) {
      tempLayer.listening(false);
    }

    if (uiLayer) {
      uiLayer.listening(false);
    }
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Smooth path using Douglas-Peucker algorithm
  const smoothPath = useCallback((points: number[], tolerance = 2.0) => {
    if (points.length < 6) return points;

    // Convert flat array to point objects
    const pointObjects = [];
    for (let i = 0; i < points.length; i += 2) {
      pointObjects.push({ x: points[i], y: points[i + 1] });
    }

    // Simplify with high quality
    const simplified = simplify(pointObjects, tolerance, true);

    // Convert back to flat array
    return simplified.flatMap(p => [p.x, p.y]);
  }, []);

  // Handle drawing start
  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!stageRef.current || !drawingLayerRef.current) return;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Clear selection if clicking on empty space
    if (e.target === stage && mode === 'select') {
      return;
    }

    // Handle different modes
    switch (mode) {
      case 'skating':
      case 'backward':
      case 'carry':
        startDrawing(pos, mode);
        break;

      case 'passing':
      case 'shooting':
        // For now, use same drawing method but with tension 0
        startDrawing(pos, mode);
        break;

      case 'player_offense':
      case 'player_defense':
      case 'player_opponent':
      case 'player_goalie':
        placePlayer(pos, mode);
        break;

      case 'puck':
        placePuck(pos);
        break;

      case 'cone':
        placeCone(pos);
        break;
    }
  }, [mode]);

  // Start smooth curve drawing
  const startDrawing = (pos: { x: number; y: number }, lineType: string) => {

    if (!drawingLayerRef.current) return;

    setIsDrawing(true);

    const style = LINE_STYLES[lineType as keyof typeof LINE_STYLES];
    const line = new Konva.Line({
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      lineCap: style.lineCap,
      lineJoin: style.lineJoin,
      tension: style.tension,
      dash: style.dash,
      points: [pos.x, pos.y],
      opacity: 0.9,
      shadowBlur: 1,
      shadowColor: 'black',
      shadowOpacity: 0.2
    });

    drawingLayerRef.current.add(line);
    setCurrentLine(line);
  };

  // Handle mouse move with throttling for performance
  const handleMouseMove = useCallback(
    throttle((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawing || !currentLine || !drawingLayerRef.current) return;

      e.evt?.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Add point to current line
      const newPoints = currentLine.points().concat([pos.x, pos.y]);
      currentLine.points(newPoints);
      drawingLayerRef.current.batchDraw(); // Use batchDraw for performance
    }, 16), // ~60 FPS
    [isDrawing, currentLine]
  );

  // Handle drawing end
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentLine) return;

    const points = currentLine.points();
    if (points.length < 4) {
      // Remove line if too short
      currentLine.destroy();
    } else {
      // Apply smoothing to the completed line
      const smoothedPoints = smoothPath(points);
      currentLine.points(smoothedPoints);

      // Add arrow if needed
      const lineType = getCurrentLineType();
      const style = LINE_STYLES[lineType];

      if (style.arrow && smoothedPoints.length >= 4 && style.arrowSize) {
        addArrowToLine(currentLine, style.arrowSize);
      }

      // Save to objects
      const newObject: HockeyObject = {
        id: generateId(),
        type: 'line',
        x: 0,
        y: 0,
        points: smoothedPoints,
        lineType: lineType as HockeyObject['lineType'],
        color: style.stroke
      };

      onObjectsChange([...objects, newObject]);
    }

    setIsDrawing(false);
    setCurrentLine(null);
    drawingLayerRef.current?.batchDraw();
  }, [isDrawing, currentLine, objects, onObjectsChange, smoothPath]);

  // Get current line type based on mode
  const getCurrentLineType = (): string => {
    switch (mode) {
      case 'skating': return 'skating';
      case 'passing': return 'passing';
      case 'shooting': return 'shooting';
      case 'backward': return 'backward';
      case 'carry': return 'carry';
      default: return 'skating';
    }
  };

  // Add arrow to line
  const addArrowToLine = (line: Konva.Line, arrowSize: { length: number; width: number }) => {
    const points = line.points();
    if (points.length < 4) return;

    const lastX = points[points.length - 2];
    const lastY = points[points.length - 1];
    const prevX = points[points.length - 4];
    const prevY = points[points.length - 3];

    // Calculate arrow angle
    const angle = Math.atan2(lastY - prevY, lastX - prevX);

    // Create arrow shape
    const arrowPoints = [
      lastX - arrowSize.length * Math.cos(angle - Math.PI / 6),
      lastY - arrowSize.length * Math.sin(angle - Math.PI / 6),
      lastX,
      lastY,
      lastX - arrowSize.length * Math.cos(angle + Math.PI / 6),
      lastY - arrowSize.length * Math.sin(angle + Math.PI / 6)
    ];

    const arrow = new Konva.Line({
      points: arrowPoints,
      fill: line.stroke(),
      stroke: line.stroke(),
      strokeWidth: line.strokeWidth(),
      closed: true
    });

    drawingLayerRef.current?.add(arrow);
  };

  // Place player
  const placePlayer = (pos: { x: number; y: number }, playerMode: string) => {
    const playerType = playerMode.replace('player_', '') as keyof typeof PLAYER_CONFIGS;
    const config = PLAYER_CONFIGS[playerType];

    const newObject: HockeyObject = {
      id: generateId(),
      type: 'player',
      x: pos.x,
      y: pos.y,
      playerType: playerType as any,
      color: config.fill
    };

    onObjectsChange([...objects, newObject]);
  };

  // Place puck
  const placePuck = (pos: { x: number; y: number }) => {
    const newObject: HockeyObject = {
      id: generateId(),
      type: 'puck',
      x: pos.x,
      y: pos.y,
      color: '#000000'
    };

    onObjectsChange([...objects, newObject]);
  };

  // Place cone
  const placeCone = (pos: { x: number; y: number }) => {
    const newObject: HockeyObject = {
      id: generateId(),
      type: 'cone',
      x: pos.x,
      y: pos.y,
      color: '#FF6600'
    };

    onObjectsChange([...objects, newObject]);
  };

  // Render player object
  const renderPlayer = (obj: HockeyObject) => {
    if (!obj.playerType) return null;

    const config = PLAYER_CONFIGS[obj.playerType];

    return (
      <Group
        key={obj.id}
        x={obj.x}
        y={obj.y}
        draggable={mode === 'select'}
        onClick={() => {
          if (mode === 'select') {
            // Handle selection - can be implemented later
          }
        }}
      >
        <Circle
          radius={config.radius}
          fill={config.fill}
          stroke={obj.selected ? '#FFD700' : config.stroke}
          strokeWidth={obj.selected ? 3 : config.strokeWidth}
        />
        <Text
          text={config.text}
          fontSize={10}
          fontStyle="bold"
          fill={config.textFill}
          offsetX={5}
          offsetY={5}
        />
      </Group>
    );
  };

  // Render line object
  const renderLine = (obj: HockeyObject) => {
    if (!obj.points || !obj.lineType) return null;

    const style = LINE_STYLES[obj.lineType];

    return (
      <Line
        key={obj.id}
        points={obj.points}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        lineCap={style.lineCap}
        lineJoin={style.lineJoin}
        tension={style.tension}
        dash={style.dash}
        opacity={0.9}
        onClick={() => {
          if (mode === 'select') {
            // Handle selection - can be implemented later
          }
        }}
      />
    );
  };

  // Render puck
  const renderPuck = (obj: HockeyObject) => {
    return (
      <Circle
        key={obj.id}
        x={obj.x}
        y={obj.y}
        radius={8}
        fill="#000000"
        draggable={mode === 'select'}
        onClick={() => {
          if (mode === 'select') {
            // Handle selection - can be implemented later
          }
        }}
      />
    );
  };

  // Render cone
  const renderCone = (obj: HockeyObject) => {
    return (
      <Group
        key={obj.id}
        x={obj.x}
        y={obj.y}
        draggable={mode === 'select'}
        onClick={() => {
          if (mode === 'select') {
            // Handle selection - can be implemented later
          }
        }}
      >
        <Line
          points={[0, -12, -10, 8, 10, 8]}
          closed={true}
          fill="#FF6600"
          stroke="#CC5500"
          strokeWidth={1}
        />
      </Group>
    );
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
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Rink Layer - Static background */}
        <Layer ref={rinkLayerRef}>
          {rinkImage && (
            <KonvaImage
              image={rinkImage}
              width={width}
              height={height}
            />
          )}
        </Layer>

        {/* Object Layer - Players, pucks, cones */}
        <Layer ref={objectLayerRef}>
          {objects.map(obj => {
            switch (obj.type) {
              case 'player':
                return renderPlayer(obj);
              case 'puck':
                return renderPuck(obj);
              case 'cone':
                return renderCone(obj);
              default:
                return null;
            }
          })}
        </Layer>

        {/* Drawing Layer - Active line drawing */}
        <Layer ref={drawingLayerRef}>
          {objects.map(obj => {
            if (obj.type === 'line') {
              return renderLine(obj);
            }
            return null;
          })}
        </Layer>

        {/* Temp Layer - Preview/temporary drawings */}
        <Layer ref={tempLayerRef} />

        {/* UI Layer - Selection boxes, etc */}
        <Layer ref={uiLayerRef} />
      </Stage>
    </div>
  );
};

export default ProfessionalHockeyCanvas;