/**
 * Text rendering functions
 */

import type { CanvasRenderingContext2D } from 'canvas';
import type { TextObject } from '../types.js';

/**
 * Render text
 */
export function renderText(
  ctx: CanvasRenderingContext2D,
  obj: TextObject,
  props: any
): void {
  const size = obj.size ?? 16;
  const font = obj.font ?? 'sans-serif';
  const color = obj.color ?? '#000000';
  const align = obj.align ?? 'left';

  // Set font properties
  ctx.font = `${size}px ${font}`;
  ctx.fillStyle = color;

  // Handle anchor point
  // For text, we need to measure it to calculate anchor offsets
  const metrics = ctx.measureText(obj.content);
  const textWidth = metrics.width;

  // Approximate text height based on font size
  const textHeight = size;

  // Calculate anchor offsets
  let offsetX = 0;
  let offsetY = 0;

  const anchor = obj.anchor ?? 'top-left';

  // Horizontal alignment based on anchor
  if (anchor.includes('left')) {
    ctx.textAlign = 'left';
    offsetX = 0;
  } else if (anchor.includes('center') || anchor === 'center') {
    ctx.textAlign = 'center';
    offsetX = 0;
  } else if (anchor.includes('right')) {
    ctx.textAlign = 'right';
    offsetX = 0;
  }

  // Vertical alignment based on anchor
  if (anchor.startsWith('top')) {
    ctx.textBaseline = 'top';
    offsetY = 0;
  } else if (anchor.includes('center') || anchor === 'center') {
    ctx.textBaseline = 'middle';
    offsetY = 0;
  } else if (anchor.startsWith('bottom')) {
    ctx.textBaseline = 'bottom';
    offsetY = 0;
  } else {
    // default to top
    ctx.textBaseline = 'top';
    offsetY = 0;
  }

  // Render the text
  ctx.fillText(obj.content, offsetX, offsetY);
}
