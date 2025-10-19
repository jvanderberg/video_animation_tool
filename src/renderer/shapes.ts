/**
 * Shape rendering functions (rect, circle, ellipse, line, path)
 */

import type { CanvasRenderingContext2D } from 'canvas';
import type { RectObject, CircleObject, EllipseObject, LineObject, PathObject, PathCommand } from '../types.js';

/**
 * Helper to get anchor offset for a shape
 */
export function getAnchorOffset(
  anchor: string | undefined,
  width: number,
  height: number
): { offsetX: number; offsetY: number } {
  const anchorPoint = anchor ?? 'top-left';

  let offsetX = 0;
  let offsetY = 0;

  // Horizontal offset
  if (anchorPoint.includes('center') || anchorPoint === 'center') {
    offsetX = -width / 2;
  } else if (anchorPoint.includes('right')) {
    offsetX = -width;
  }

  // Vertical offset
  if (anchorPoint.includes('center') || anchorPoint === 'center') {
    offsetY = -height / 2;
  } else if (anchorPoint.includes('bottom')) {
    offsetY = -height;
  }

  return { offsetX, offsetY };
}

/**
 * Render a rectangle
 */
export function renderRect(
  ctx: CanvasRenderingContext2D,
  obj: RectObject,
  props: any
): void {
  // Use animated width/height if available, otherwise use object properties
  const width = props.width ?? obj.width;
  const height = props.height ?? obj.height;

  // Apply anchor offset
  const { offsetX, offsetY } = getAnchorOffset(obj.anchor, width, height);

  // Fill
  if (obj.fill) {
    ctx.fillStyle = obj.fill;
    ctx.fillRect(offsetX, offsetY, width, height);
  }

  // Stroke
  if (obj.stroke) {
    ctx.strokeStyle = obj.stroke;
    ctx.lineWidth = obj.strokeWidth ?? 1;
    ctx.strokeRect(offsetX, offsetY, width, height);
  }
}

/**
 * Render a line
 */
export function renderLine(
  ctx: CanvasRenderingContext2D,
  obj: LineObject,
  props: any
): void {
  // Use animated coordinates if available
  const x = props.x ?? obj.x ?? 0;
  const y = props.y ?? obj.y ?? 0;
  const x2 = props.x2 ?? obj.x2;
  const y2 = props.y2 ?? obj.y2;

  // Calculate relative end point
  // Since transforms already moved us to (x, y), we draw to (x2-x, y2-y)
  const dx = x2 - x;
  const dy = y2 - y;

  // Set line style
  ctx.strokeStyle = obj.stroke ?? '#000000';
  ctx.lineWidth = obj.strokeWidth ?? 1;

  // Draw line from (0, 0) to (dx, dy)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(dx, dy);
  ctx.stroke();
}

/**
 * Render a circle
 */
export function renderCircle(
  ctx: CanvasRenderingContext2D,
  obj: CircleObject,
  props: any
): void {
  // Use animated radius if available
  const radius = props.radius ?? obj.radius;

  // Draw circle at (0, 0) since we've already translated to position
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);

  // Fill
  if (obj.fill) {
    ctx.fillStyle = obj.fill;
    ctx.fill();
  }

  // Stroke
  if (obj.stroke) {
    ctx.strokeStyle = obj.stroke;
    ctx.lineWidth = obj.strokeWidth ?? 1;
    ctx.stroke();
  }
}

/**
 * Render an ellipse
 */
export function renderEllipse(
  ctx: CanvasRenderingContext2D,
  obj: EllipseObject,
  props: any
): void {
  // Use animated radii if available
  const radiusX = props.radiusX ?? obj.radiusX;
  const radiusY = props.radiusY ?? obj.radiusY;

  // Draw ellipse at (0, 0) since we've already translated to position
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI);

  // Fill
  if (obj.fill) {
    ctx.fillStyle = obj.fill;
    ctx.fill();
  }

  // Stroke
  if (obj.stroke) {
    ctx.strokeStyle = obj.stroke;
    ctx.lineWidth = obj.strokeWidth ?? 1;
    ctx.stroke();
  }
}

/**
 * Execute a single path command
 */
function executePathCommand(ctx: CanvasRenderingContext2D, command: PathCommand): void {
  switch (command.type) {
    case 'moveTo':
      ctx.moveTo(command.x, command.y);
      break;
    case 'lineTo':
      ctx.lineTo(command.x, command.y);
      break;
    case 'closePath':
      ctx.closePath();
      break;
    case 'quadraticCurveTo':
      ctx.quadraticCurveTo(command.cpx, command.cpy, command.x, command.y);
      break;
    case 'bezierCurveTo':
      ctx.bezierCurveTo(command.cp1x, command.cp1y, command.cp2x, command.cp2y, command.x, command.y);
      break;
    case 'arc':
      ctx.arc(command.x, command.y, command.radius, command.startAngle, command.endAngle, command.counterclockwise);
      break;
    case 'arcTo':
      ctx.arcTo(command.x1, command.y1, command.x2, command.y2, command.radius);
      break;
  }
}

/**
 * Render a path (custom shape using canvas path commands)
 */
export function renderPath(
  ctx: CanvasRenderingContext2D,
  obj: PathObject,
  props: any
): void {
  // Begin the path
  ctx.beginPath();

  // Execute each path command
  for (const command of obj.commands) {
    executePathCommand(ctx, command);
  }

  // Fill
  if (obj.fill) {
    ctx.fillStyle = obj.fill;
    ctx.fill();
  }

  // Stroke
  if (obj.stroke) {
    ctx.strokeStyle = obj.stroke;
    ctx.lineWidth = obj.strokeWidth ?? 1;
    ctx.stroke();
  }
}
