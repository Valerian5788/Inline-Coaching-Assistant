// Smooth arrow drawing utilities

// Simplify path by removing redundant points
export const simplifyPath = (
  points: { x: number; y: number }[],
  tolerance: number = 2
): { x: number; y: number }[] => {
  if (points.length <= 2) return points;
  
  const simplified = [points[0]]; // Always keep first point
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const current = points[i];
    const next = points[i + 1];
    
    // Calculate distance from current point to line between prev and next
    const distance = pointToLineDistance(current, prev, next);
    
    // Only keep points that are far enough from the line
    if (distance > tolerance) {
      simplified.push(current);
    }
  }
  
  simplified.push(points[points.length - 1]); // Always keep last point
  return simplified;
};

// Calculate distance from point to line segment
const pointToLineDistance = (
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
  
  if (lenSq === 0) return Math.sqrt(A * A + B * B);
  
  const param = Math.max(0, Math.min(1, dot / lenSq));
  const projection = {
    x: lineStart.x + param * C,
    y: lineStart.y + param * D
  };
  
  const dx = point.x - projection.x;
  const dy = point.y - projection.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Draw smooth path using quadratic curves
export const drawSmoothPath = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[]
): void => {
  if (points.length < 2) return;
  
  // Simplify the path first
  const simplified = simplifyPath(points, 3);
  
  if (simplified.length === 2) {
    // Simple line
    ctx.beginPath();
    ctx.moveTo(simplified[0].x, simplified[0].y);
    ctx.lineTo(simplified[1].x, simplified[1].y);
    ctx.stroke();
    return;
  }
  
  ctx.beginPath();
  ctx.moveTo(simplified[0].x, simplified[0].y);
  
  // Draw smooth curves between points
  for (let i = 1; i < simplified.length - 1; i++) {
    const current = simplified[i];
    const next = simplified[i + 1];
    
    // Calculate control point for smooth curve
    const cpx = (current.x + next.x) / 2;
    const cpy = (current.y + next.y) / 2;
    
    ctx.quadraticCurveTo(current.x, current.y, cpx, cpy);
  }
  
  // Draw to final point
  const last = simplified[simplified.length - 1];
  const secondLast = simplified[simplified.length - 2];
  ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
  
  ctx.stroke();
};

// Add point to path with minimum distance filtering
export const addPointToPath = (
  path: { x: number; y: number }[],
  newPoint: { x: number; y: number },
  minDistance: number = 5 // Minimum distance in pixels
): { x: number; y: number }[] => {
  if (path.length === 0) {
    return [newPoint];
  }
  
  const lastPoint = path[path.length - 1];
  const distance = Math.sqrt(
    Math.pow(newPoint.x - lastPoint.x, 2) + Math.pow(newPoint.y - lastPoint.y, 2)
  );
  
  // Only add point if it's far enough from the last point
  if (distance >= minDistance) {
    return [...path, newPoint];
  }
  
  return path;
};

// Create smooth arrowhead
export const drawSmoothArrowhead = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  size: number = 20
): void => {
  if (points.length < 2) return;
  
  const simplified = simplifyPath(points, 3);
  const last = simplified[simplified.length - 1];
  const secondLast = simplified[simplified.length - 2] || simplified[0];
  
  // Calculate arrow direction
  const angle = Math.atan2(last.y - secondLast.y, last.x - secondLast.x);
  const arrowAngle = Math.PI / 6; // 30 degrees
  
  // Draw arrowhead
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle;
  
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(
    last.x - size * Math.cos(angle - arrowAngle),
    last.y - size * Math.sin(angle - arrowAngle)
  );
  ctx.lineTo(
    last.x - size * 0.6 * Math.cos(angle), // Shorter back point
    last.y - size * 0.6 * Math.sin(angle)
  );
  ctx.lineTo(
    last.x - size * Math.cos(angle + arrowAngle),
    last.y - size * Math.sin(angle + arrowAngle)
  );
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
};