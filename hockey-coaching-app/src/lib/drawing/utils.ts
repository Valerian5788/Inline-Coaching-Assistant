import type { DrawingElement, DrawingColor } from '../../types';

// Convert normalized coordinates (0-1) to canvas coordinates
export const normalizedToCanvas = (
  point: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => ({
  x: point.x * canvasWidth,
  y: point.y * canvasHeight
});

// Convert canvas coordinates to normalized coordinates (0-1)
export const canvasToNormalized = (
  point: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => ({
  x: point.x / canvasWidth,
  y: point.y / canvasHeight
});

// Get color hex value from color name
export const getColorHex = (color: DrawingColor): string => {
  switch (color) {
    case 'blue': return '#2563eb';
    case 'red': return '#dc2626';
    case 'black': return '#000000';
    case 'yellow': return '#eab308';
    default: return '#2563eb';
  }
};

// Calculate distance between two points
export const distance = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Check if a point is near a line (for hit testing)
export const pointToLineDistance = (
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    return distance(point, lineStart);
  }
  
  const param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  return distance(point, { x: xx, y: yy });
};

// Hit test for different element types
export const hitTest = (
  element: DrawingElement,
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  const threshold = 10; // Hit test threshold in pixels
  
  const startCanvas = normalizedToCanvas(element.startPoint, canvasWidth, canvasHeight);
  const testPoint = { x, y };

  switch (element.type) {
    case 'arrow':
    case 'pass_arrow':
    case 'backward_arrow':
    case 'shoot_arrow':
      if (element.path && element.path.length > 1) {
        // Check hit along the path
        for (let i = 0; i < element.path.length - 1; i++) {
          const start = normalizedToCanvas(element.path[i], canvasWidth, canvasHeight);
          const end = normalizedToCanvas(element.path[i + 1], canvasWidth, canvasHeight);
          if (pointToLineDistance(testPoint, start, end) <= threshold) {
            return true;
          }
        }
      } else if (element.endPoint) {
        const endCanvas = normalizedToCanvas(element.endPoint, canvasWidth, canvasHeight);
        return pointToLineDistance(testPoint, startCanvas, endCanvas) <= threshold;
      }
      return false;

    case 'puck':
    case 'defense':
    case 'offense': 
    case 'opponent':
    case 'cone':
    case 'text':
      const radius = element.radius || (element.type === 'puck' ? 4 : 18);
      return distance(testPoint, startCanvas) <= radius + threshold;

    default:
      return false;
  }
};

// Get bounding rectangle for an element (for selection handles)
export const getBoundingRect = (
  element: DrawingElement,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } | null => {
  const startCanvas = normalizedToCanvas(element.startPoint, canvasWidth, canvasHeight);
  
  switch (element.type) {
    case 'arrow':
    case 'pass_arrow':
    case 'backward_arrow':
    case 'shoot_arrow':
      if (element.path && element.path.length > 1) {
        // Get bounds from path
        const pathCanvas = element.path.map(p => normalizedToCanvas(p, canvasWidth, canvasHeight));
        const minX = Math.min(...pathCanvas.map(p => p.x));
        const maxX = Math.max(...pathCanvas.map(p => p.x));
        const minY = Math.min(...pathCanvas.map(p => p.y));
        const maxY = Math.max(...pathCanvas.map(p => p.y));
        
        return {
          x: minX,
          y: minY,
          width: Math.max(20, maxX - minX),
          height: Math.max(20, maxY - minY)
        };
      } else if (element.endPoint) {
        const endCanvas = normalizedToCanvas(element.endPoint, canvasWidth, canvasHeight);
        const minX = Math.min(startCanvas.x, endCanvas.x);
        const maxX = Math.max(startCanvas.x, endCanvas.x);
        const minY = Math.min(startCanvas.y, endCanvas.y);
        const maxY = Math.max(startCanvas.y, endCanvas.y);
        
        return {
          x: minX,
          y: minY,
          width: Math.max(20, maxX - minX),
          height: Math.max(20, maxY - minY)
        };
      }
      return null;

    case 'puck':
    case 'defense':
    case 'offense':
    case 'opponent':
    case 'cone':
    case 'text':
      const radius = element.radius || (element.type === 'puck' ? 4 : 18);
      return {
        x: startCanvas.x - radius,
        y: startCanvas.y - radius,
        width: radius * 2,
        height: radius * 2
      };

    default:
      return null;
  }
};

// Generate unique ID for elements
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Snap point to grid (if grid snapping is enabled)
export const snapToGrid = (
  point: { x: number; y: number },
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => {
  const canvasPoint = normalizedToCanvas(point, canvasWidth, canvasHeight);
  const snappedCanvas = {
    x: Math.round(canvasPoint.x / gridSize) * gridSize,
    y: Math.round(canvasPoint.y / gridSize) * gridSize
  };
  return canvasToNormalized(snappedCanvas, canvasWidth, canvasHeight);
};