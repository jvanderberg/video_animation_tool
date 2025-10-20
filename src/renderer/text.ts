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
  const bold = obj.bold ?? false;
  const italic = obj.italic ?? false;
  const underline = obj.underline ?? false;

  // Build font string with style and weight
  let fontString = '';
  if (italic) fontString += 'italic ';
  if (bold) fontString += 'bold ';
  fontString += `${size}px ${font}`;

  // Set font properties
  ctx.font = fontString;
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

  // Render stroke if specified (draw before fill for proper layering)
  if (obj.stroke) {
    ctx.strokeStyle = obj.stroke;
    ctx.lineWidth = obj.strokeWidth ?? 1;
    ctx.strokeText(obj.content, offsetX, offsetY);
  }

  // Render the text fill
  ctx.fillText(obj.content, offsetX, offsetY);

  // Render underline if specified
  if (underline) {
    const textWidth = metrics.width;

    // Use actualBoundingBoxDescent if available, otherwise estimate
    // Underline should be positioned slightly below the alphabetic baseline
    const descent = metrics.actualBoundingBoxDescent ?? size * 0.2;
    const underlineOffset = descent * 0.3; // Position 30% into the descent area

    // Calculate underline position based on textBaseline
    let underlineY: number;
    if (ctx.textBaseline === 'middle') {
      // Middle is roughly at cap-height/2, so we need to go down to baseline + offset
      underlineY = offsetY + (size * 0.35) + underlineOffset;
    } else if (ctx.textBaseline === 'bottom') {
      // Bottom is at the bottom of the descent, go up slightly
      underlineY = offsetY - descent + underlineOffset;
    } else {
      // 'top' - go down from top to baseline + offset
      underlineY = offsetY + (size * 0.75) + underlineOffset;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.05); // Scale line width with font size
    ctx.beginPath();

    // Adjust underline position based on text alignment
    if (ctx.textAlign === 'left') {
      ctx.moveTo(offsetX, underlineY);
      ctx.lineTo(offsetX + textWidth, underlineY);
    } else if (ctx.textAlign === 'center') {
      ctx.moveTo(offsetX - textWidth / 2, underlineY);
      ctx.lineTo(offsetX + textWidth / 2, underlineY);
    } else if (ctx.textAlign === 'right') {
      ctx.moveTo(offsetX - textWidth, underlineY);
      ctx.lineTo(offsetX, underlineY);
    }

    ctx.stroke();
  }
}
