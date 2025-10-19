import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  AnimationFile,
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
export async function preprocessAnimation(animation: AnimationFile): Promise<AnimationFile> {
  // If no sequences, nothing to preprocess
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

    processedSequences.push({
      ...sequence,
      animations: expandedAnimations
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
