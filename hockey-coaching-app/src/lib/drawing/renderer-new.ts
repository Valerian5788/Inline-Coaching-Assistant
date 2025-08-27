import type { DrawingElement } from '../../types';
import { normalizedToCanvas, getColorHex } from './utils';
import { drawSmoothPath, drawSmoothArrowhead } from './smooth-arrows';

export const drawElement = (
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  canvasWidth: number,
  canvasHeight: number,
  isSelected: boolean = false,
  opacity: number = 1
): void => {
  const startCanvas = normalizedToCanvas(element.startPoint, canvasWidth, canvasHeight);
  const color = getColorHex(element.color);
  
  // Apply opacity for preview elements
  if (opacity < 1) {
    ctx.save();
    ctx.globalAlpha = opacity;
  }

  // Set base styles
  ctx.strokeStyle = isSelected ? '#0066cc' : color;
  ctx.fillStyle = isSelected ? '#0066cc' : color;
  ctx.lineWidth = isSelected ? 4 : 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (element.type) {
    case 'arrow':
      drawMouseFollowingArrow(ctx, element, canvasWidth, canvasHeight, 'normal');
      break;

    case 'pass_arrow':
      drawMouseFollowingArrow(ctx, element, canvasWidth, canvasHeight, 'pass');
      break;

    case 'backward_arrow':
      drawMouseFollowingArrow(ctx, element, canvasWidth, canvasHeight, 'backward');
      break;

    case 'shoot_arrow':
      drawMouseFollowingArrow(ctx, element, canvasWidth, canvasHeight, 'shoot');
      break;

    case 'puck':
      drawPuck(ctx, startCanvas);
      break;

    case 'defense':
      drawMarker(ctx, startCanvas, 'D', element.color, isSelected);
      break;

    case 'offense':
      drawMarker(ctx, startCanvas, 'O', element.color, isSelected);
      break;

    case 'opponent':
      drawMarker(ctx, startCanvas, 'X', element.color, isSelected);
      break;

    case 'cone':
      drawCone(ctx, startCanvas);
      break;

    case 'text':
      drawText(ctx, element, startCanvas, isSelected);
      break;
  }

  if (opacity < 1) {
    ctx.restore();
  }
};

const drawMouseFollowingArrow = (
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  canvasWidth: number,
  canvasHeight: number,
  style: 'normal' | 'pass' | 'backward' | 'shoot'
): void => {
  // Use path for mouse-following arrows, fallback to simple line for backward compatibility
  const points = element.path || (element.endPoint ? [element.startPoint, element.endPoint] : [element.startPoint]);
  
  if (points.length < 2) return;

  // Convert all points to canvas coordinates
  const canvasPoints = points.map(point => normalizedToCanvas(point, canvasWidth, canvasHeight));
  
  // Draw the path based on style
  switch (style) {
    case 'normal':
      drawNormalArrowPath(ctx, canvasPoints);
      break;
    case 'pass':
      drawPassArrowPath(ctx, canvasPoints);
      break;
    case 'backward':
      drawBackwardArrowPath(ctx, canvasPoints);
      break;
    case 'shoot':
      drawShootArrowPath(ctx, canvasPoints);
      break;
  }
};

const drawNormalArrowPath = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) => {
  if (points.length < 2) return;

  // Use smooth path drawing
  drawSmoothPath(ctx, points);
  
  // Draw smooth arrowhead
  drawSmoothArrowhead(ctx, points, 18);
};

const drawPassArrowPath = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) => {
  if (points.length < 2) return;

  // Straight dashed line from start to end
  ctx.save();
  ctx.setLineDash([10, 5]);
  const start = points[0];
  const end = points[points.length - 1];
  
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw arrowhead at end
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  drawStraightArrowhead(ctx, end, angle, 16);
  ctx.restore();
};

const drawBackwardArrowPath = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) => {
  if (points.length < 2) return;

  // Draw wavy version of the smooth path - curves like normal but looks wavy
  ctx.save();
  
  // Use the smooth path but modify it to look wavy/squiggly
  drawWavySmoothPath(ctx, points);
  
  // Draw smooth arrowhead like normal arrows
  drawSmoothArrowhead(ctx, points, 16);
  ctx.restore();
};

// Helper function to draw straight arrowhead
const drawStraightArrowhead = (
  ctx: CanvasRenderingContext2D, 
  point: { x: number; y: number }, 
  angle: number, 
  size: number
) => {
  const arrowAngle = Math.PI / 6; // 30 degrees
  
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(
    point.x - size * Math.cos(angle - arrowAngle),
    point.y - size * Math.sin(angle - arrowAngle)
  );
  ctx.moveTo(point.x, point.y);
  ctx.lineTo(
    point.x - size * Math.cos(angle + arrowAngle),
    point.y - size * Math.sin(angle + arrowAngle)
  );
  ctx.stroke();
};

// Helper function to draw wavy smooth path - follows curves but looks wavy
const drawWavySmoothPath = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) => {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    // Simple wavy line for two points
    const start = points[0];
    const end = points[1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const segments = Math.max(6, Math.floor(length / 15));
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const baseX = start.x + t * dx;
      const baseY = start.y + t * dy;
      
      // Add wavy offset perpendicular to direction
      const perpX = -dy / length;
      const perpY = dx / length;
      const waveAmount = Math.sin(t * Math.PI * 3) * 4; // 3 waves
      
      const x = baseX + perpX * waveAmount;
      const y = baseY + perpY * waveAmount;
      
      ctx.lineTo(x, y);
    }
  } else {
    // For multi-point paths, draw smooth curves with wavy effect
    for (let i = 1; i < points.length - 1; i++) {
      const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) * 0.5;
      const cp1y = points[i - 1].y + (points[i].y - points[i - 1].y) * 0.5;
      const cp2x = points[i].x + (points[i + 1].x - points[i].x) * 0.5;
      const cp2y = points[i].y + (points[i + 1].y - points[i].y) * 0.5;
      
      // Add small wavy perturbation to control points
      const waveOffset = Math.sin(i * 0.8) * 3;
      const dx = points[i + 1].x - points[i - 1].x;
      const dy = points[i + 1].y - points[i - 1].y;
      const length = Math.sqrt(dx * dx + dy * dy) || 1;
      const perpX = -dy / length * waveOffset;
      const perpY = dx / length * waveOffset;
      
      ctx.bezierCurveTo(
        cp1x + perpX, cp1y + perpY,
        cp2x + perpX, cp2y + perpY,
        points[i].x, points[i].y
      );
    }
    
    // Final segment
    if (points.length > 2) {
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
  }

  ctx.stroke();
};

const drawShootArrowPath = (ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) => {
  if (points.length < 2) return;

  // Two parallel straight lines like the example
  ctx.save();
  const start = points[0];
  const end = points[points.length - 1];
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
  // Calculate perpendicular offset for parallel lines
  const offset = 3;
  const perpX = -Math.sin(angle) * offset;
  const perpY = Math.cos(angle) * offset;
  
  // Draw first line
  ctx.beginPath();
  ctx.moveTo(start.x + perpX, start.y + perpY);
  ctx.lineTo(end.x + perpX, end.y + perpY);
  ctx.stroke();
  
  // Draw second line
  ctx.beginPath();
  ctx.moveTo(start.x - perpX, start.y - perpY);
  ctx.lineTo(end.x - perpX, end.y - perpY);
  ctx.stroke();
  
  // Draw arrowhead at end
  drawStraightArrowhead(ctx, end, angle, 20);
  ctx.restore();
};

// Legacy arrow head function - kept for potential future use
// const drawArrowHead = (
//   ctx: CanvasRenderingContext2D,
//   from: { x: number; y: number },
//   to: { x: number; y: number },
//   size: number = 18
// ): void => {
//   const angle = Math.atan2(to.y - from.y, to.x - from.x);
//   const arrowAngle = Math.PI / 6;
//
//   ctx.beginPath();
//   ctx.moveTo(to.x, to.y);
//   ctx.lineTo(
//     to.x - size * Math.cos(angle - arrowAngle),
//     to.y - size * Math.sin(angle - arrowAngle)
//   );
//   ctx.moveTo(to.x, to.y);
//   ctx.lineTo(
//     to.x - size * Math.cos(angle + arrowAngle),
//     to.y - size * Math.sin(angle + arrowAngle)
//   );
//   ctx.stroke();
// };

const drawPuck = (ctx: CanvasRenderingContext2D, center: { x: number; y: number }): void => {
  ctx.beginPath();
  ctx.arc(center.x, center.y, 4, 0, 2 * Math.PI);
  ctx.fill();
};

const drawMarker = (
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  letter: string,
  color: string,
  isSelected: boolean
): void => {
  const radius = 18;
  
  // Draw circle
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  ctx.lineWidth = isSelected ? 4 : 2;
  ctx.stroke();
  
  // Draw letter
  ctx.save();
  ctx.fillStyle = isSelected ? '#0066cc' : getColorHex(color as any);
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, center.x, center.y);
  ctx.restore();
};

const drawCone = (ctx: CanvasRenderingContext2D, center: { x: number; y: number }): void => {
  const size = 12;
  
  // Draw triangle
  ctx.beginPath();
  ctx.moveTo(center.x, center.y - size);
  ctx.lineTo(center.x - size, center.y + size);
  ctx.lineTo(center.x + size, center.y + size);
  ctx.closePath();
  ctx.stroke();
};

const drawText = (
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  center: { x: number; y: number },
  isSelected: boolean
): void => {
  const text = element.label || 'Text';
  const fontSize = element.fontSize || 16;
  
  ctx.save();
  ctx.fillStyle = isSelected ? '#0066cc' : getColorHex(element.color);
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw background for better visibility
  const textMetrics = ctx.measureText(text);
  const padding = 6;
  const backgroundWidth = textMetrics.width + padding * 2;
  const backgroundHeight = fontSize + padding * 2;
  
  // Background
  ctx.fillStyle = element.isEditing ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(
    center.x - backgroundWidth / 2,
    center.y - backgroundHeight / 2,
    backgroundWidth,
    backgroundHeight
  );
  
  // Border if editing
  if (element.isEditing) {
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      center.x - backgroundWidth / 2,
      center.y - backgroundHeight / 2,
      backgroundWidth,
      backgroundHeight
    );
  }
  
  // Text
  ctx.fillStyle = isSelected ? '#0066cc' : getColorHex(element.color);
  ctx.fillText(text, center.x, center.y);
  ctx.restore();
};