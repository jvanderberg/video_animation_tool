import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';
import type {
  AnimationFile,
  AnimationObject,
  EffectDefinition,
  EffectAnimation,
  PropertyAnimation,
  SequenceAnimation,
  Sequence,
  Keyframe,
  TimeKeyframe
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for individual effect definitions
const effectCache = new Map<string, EffectDefinition>();

/**
 * Load a single effect from its file (with caching)
 */
async function loadEffect(effectName: string): Promise<EffectDefinition> {
  if (effectCache.has(effectName)) {
    return effectCache.get(effectName)!;
  }

  const effectPath = join(__dirname, `../effects/${effectName}.json`);
  try {
    const data = await readFile(effectPath, 'utf-8');
    const effect = JSON.parse(data);
    effectCache.set(effectName, effect);
    return effect;
  } catch (error) {
    throw new Error(`Effect '${effectName}' not found in effects library`);
  }
}

/**
 * Check if animation is an effect animation (has 'effect' property)
 */
function isEffectAnimation(anim: SequenceAnimation): anim is EffectAnimation {
  return 'effect' in anim && typeof anim.effect === 'string';
}

/**
 * Convert time-based keyframes to frame-based keyframes
 * @param timeKeyframes - Keyframes with normalized time (0.0 to 1.0)
 * @param startFrame - Starting frame number
 * @param durationFrames - Duration in frames
 */
function timeKeyframesToFrameKeyframes(
  timeKeyframes: TimeKeyframe[],
  startFrame: number,
  durationFrames: number
): Keyframe[] {
  return timeKeyframes.map(tk => ({
    frame: Math.round(startFrame + tk.time * durationFrames),
    value: tk.value,
    easing: tk.easing
  }));
}

/**
 * Get object dimensions (width and height)
 * For text objects, measures the text width
 */
function getObjectDimensions(obj: AnimationObject): { width: number; height: number } {
  if (obj.type === 'rect' && 'width' in obj && 'height' in obj) {
    return { width: obj.width as number, height: obj.height as number };
  }

  if (obj.type === 'image' && 'width' in obj && 'height' in obj) {
    return { width: obj.width as number, height: obj.height as number };
  }

  if (obj.type === 'text') {
    // Measure text width using canvas
    const canvas = createCanvas(10, 10);
    const ctx = canvas.getContext('2d');
    const size = (obj as any).size ?? 16;
    const font = (obj as any).font ?? 'sans-serif';
    ctx.font = `${size}px ${font}`;
    const metrics = ctx.measureText((obj as any).content);
    const width = metrics.width;
    const height = size * 1.2; // Approximate height based on font size
    return { width, height };
  }

  if (obj.type === 'circle' && 'radius' in obj) {
    const radius = obj.radius as number;
    return { width: radius * 2, height: radius * 2 };
  }

  if (obj.type === 'ellipse' && 'radiusX' in obj && 'radiusY' in obj) {
    return { width: (obj.radiusX as number) * 2, height: (obj.radiusY as number) * 2 };
  }

  // Default fallback
  return { width: 100, height: 100 };
}

/**
 * Resolve percentage value to pixel value
 * @param value - Either a number (pixels) or string like "50%" or "-50%"
 * @param dimension - The dimension to calculate percentage against
 */
function resolvePercentage(value: number | string, dimension: number): number {
  if (typeof value === 'string' && value.endsWith('%')) {
    const percent = parseFloat(value.slice(0, -1));
    return (percent / 100) * dimension;
  }
  return value as number;
}

/**
 * Resolve percentage values in animation keyframes
 */
function resolvePercentagesInAnimation(
  anim: PropertyAnimation,
  objects: AnimationObject[]
): PropertyAnimation {
  // Find the target object
  const targetObj = objects.find(obj => obj.id === anim.target);
  if (!targetObj) {
    return anim; // Can't resolve without target object
  }

  const dimensions = getObjectDimensions(targetObj);

  // Determine which dimension to use based on property
  let dimension: number;
  if (anim.property === 'clip.width' || anim.property === 'clip.x') {
    dimension = dimensions.width;
  } else if (anim.property === 'clip.height' || anim.property === 'clip.y') {
    dimension = dimensions.height;
  } else {
    return anim; // Not a clip property, no resolution needed
  }

  // Resolve percentages in all keyframes
  const resolvedKeyframes = anim.keyframes.map(kf => ({
    ...kf,
    value: resolvePercentage(kf.value, dimension)
  }));

  return {
    ...anim,
    keyframes: resolvedKeyframes
  };
}

/**
 * Expand an effect animation into property animations
 * @param effectAnim - Effect animation to expand
 * @param fps - Project frame rate
 */
async function expandEffectAnimation(
  effectAnim: EffectAnimation,
  fps: number
): Promise<PropertyAnimation[]> {
  const effect = await loadEffect(effectAnim.effect);

  const startFrame = Math.round(effectAnim.startTime * fps);
  // Use custom duration if provided, otherwise use effect's default duration
  const duration = effectAnim.duration ?? effect.duration;
  const durationFrames = Math.round(duration * fps);

  const propertyAnimations: PropertyAnimation[] = [];

  for (const [property, timeKeyframes] of Object.entries(effect.properties)) {
    propertyAnimations.push({
      target: effectAnim.target,
      property,
      keyframes: timeKeyframesToFrameKeyframes(timeKeyframes, startFrame, durationFrames)
    });
  }

  return propertyAnimations;
}

/**
 * Preprocess animation file
 * - Load individual effects as needed
 * - Expand effect animations into property animations
 * - Convert all timing to frame-based
 *
 * @param animation - Raw animation file (may contain effects)
 * @returns Processed animation file (frame-based only, ready for renderer)
 */
/**
 * Resolve percentages in object clip properties
 */
function resolveClipPercentages(objects: AnimationObject[]): void {
  for (const obj of objects) {
    if (obj.clip) {
      const dimensions = getObjectDimensions(obj);

      // Resolve clip.x and clip.width against width
      if (typeof obj.clip.x === 'string') {
        obj.clip.x = resolvePercentage(obj.clip.x, dimensions.width) as any;
      }
      if (typeof obj.clip.width === 'string') {
        obj.clip.width = resolvePercentage(obj.clip.width, dimensions.width) as any;
      }

      // Resolve clip.y and clip.height against height
      if (typeof obj.clip.y === 'string') {
        obj.clip.y = resolvePercentage(obj.clip.y, dimensions.height) as any;
      }
      if (typeof obj.clip.height === 'string') {
        obj.clip.height = resolvePercentage(obj.clip.height, dimensions.height) as any;
      }
    }

    // Recurse into groups
    if (obj.type === 'group' && 'children' in obj) {
      resolveClipPercentages((obj as any).children);
    }
  }
}

export async function preprocessAnimation(animation: AnimationFile): Promise<AnimationFile> {
  // Resolve percentages in object clip properties first
  resolveClipPercentages(animation.objects);

  // If no sequences, nothing more to preprocess
  if (!animation.sequences || animation.sequences.length === 0) {
    return animation;
  }

  // Process each sequence
  const processedSequences: Sequence[] = [];

  for (const sequence of animation.sequences) {
    if (!sequence.animations) {
      // Pause sequence, keep as-is
      processedSequences.push(sequence);
      continue;
    }

    const expandedAnimations: PropertyAnimation[] = [];

    for (const anim of sequence.animations) {
      if (isEffectAnimation(anim)) {
        // Expand effect into property animations (async - loads effect file)
        const propertyAnims = await expandEffectAnimation(anim, animation.project.fps);
        expandedAnimations.push(...propertyAnims);
      } else {
        // Already a property animation, keep as-is
        expandedAnimations.push(anim as PropertyAnimation);
      }
    }

    // Resolve percentage values in all animations
    const resolvedAnimations = expandedAnimations.map(anim =>
      resolvePercentagesInAnimation(anim, animation.objects)
    );

    processedSequences.push({
      ...sequence,
      animations: resolvedAnimations
    });
  }

  return {
    ...animation,
    sequences: processedSequences
  };
}

/**
 * Clear the cached effects (useful for testing)
 */
export function clearEffectsCache(): void {
  effectCache.clear();
}
