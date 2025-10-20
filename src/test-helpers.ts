import { createCanvas, loadImage } from 'canvas';
import { readFile } from 'fs/promises';
import { preprocessAnimation } from './preprocessor.js';
import type { AnimationFile, PropertyAnimation } from './types.js';

// Memoization cache for preprocessed animations
const preprocessCache = new Map<string, AnimationFile>();

/**
 * Load and preprocess an animation file with memoization
 * Useful for debugging and testing - loads once, reuses result
 */
export async function loadAndPreprocess(filePath: string): Promise<AnimationFile> {
  if (preprocessCache.has(filePath)) {
    return preprocessCache.get(filePath)!;
  }

  const content = await readFile(filePath, 'utf-8');
  const animation = JSON.parse(content);
  const processed = await preprocessAnimation(animation);

  preprocessCache.set(filePath, processed);
  return processed;
}

/**
 * Clear the preprocessing cache (useful between test runs)
 */
export function clearPreprocessCache(): void {
  preprocessCache.clear();
}

/**
 * Find animations targeting a specific object ID
 */
export function findAnimationsForTarget(
  processed: AnimationFile,
  targetId: string
): PropertyAnimation[] {
  if (!processed.animations) return [];

  return processed.animations.filter((a): a is PropertyAnimation =>
    'property' in a && 'keyframes' in a && a.target === targetId
  );
}

/**
 * Find animations by property name (e.g., all 'x' animations)
 */
export function findAnimationsByProperty(
  processed: AnimationFile,
  property: string
): PropertyAnimation[] {
  if (!processed.animations) return [];

  return processed.animations.filter((a): a is PropertyAnimation =>
    'property' in a && 'keyframes' in a && a.property === property
  );
}

/**
 * Find object by ID (handles namespaced IDs like "group.child")
 */
export function findObjectById(
  processed: AnimationFile,
  id: string
): any | undefined {
  return processed.objects.find(obj => obj.id === id);
}

/**
 * Read pixel color from a PNG buffer at specific coordinates
 * Returns RGBA values [r, g, b, a] where each value is 0-255
 */
export async function getPixelFromPNG(
  pngBuffer: Buffer,
  x: number,
  y: number
): Promise<[number, number, number, number]> {
  const image = await loadImage(pngBuffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(x, y, 1, 1);

  return [
    imageData.data[0],
    imageData.data[1],
    imageData.data[2],
    imageData.data[3],
  ];
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Check if pixel matches expected color (with small tolerance for anti-aliasing)
 */
export function colorMatches(
  actual: [number, number, number, number],
  expected: [number, number, number],
  tolerance: number = 2
): boolean {
  return (
    Math.abs(actual[0] - expected[0]) <= tolerance &&
    Math.abs(actual[1] - expected[1]) <= tolerance &&
    Math.abs(actual[2] - expected[2]) <= tolerance
  );
}
