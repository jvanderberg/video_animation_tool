/**
 * Image rendering functions
 */

import type { CanvasRenderingContext2D, Image } from 'canvas';
import { loadImage } from 'canvas';
import type { ImageObject } from '../types.js';

/**
 * Load and cache an image
 */
export async function loadImageIfNeeded(
  source: string,
  imageCache: Map<string, Image>
): Promise<Image> {
  if (!imageCache.has(source)) {
    const image = await loadImage(source);
    imageCache.set(source, image);
  }
  return imageCache.get(source)!;
}

/**
 * Render an image
 */
export function renderImage(
  ctx: CanvasRenderingContext2D,
  obj: ImageObject,
  props: any,
  imageCache: Map<string, Image>,
  getAnchorOffset: (anchor: string | undefined, width: number, height: number) => { offsetX: number; offsetY: number }
): void {
  // Images must be preloaded synchronously before rendering
  const image = imageCache.get(obj.source);
  if (!image) {
    console.warn(`Image not loaded: ${obj.source}`);
    return;
  }

  // Use animated width/height if available, otherwise use object properties
  // If not specified, use image's natural dimensions
  const width = props.width ?? obj.width ?? image.width;
  const height = props.height ?? obj.height ?? image.height;

  // Apply anchor offset
  const { offsetX, offsetY } = getAnchorOffset(obj.anchor, width, height);

  // Draw the image
  ctx.drawImage(image, offsetX, offsetY, width, height);
}
