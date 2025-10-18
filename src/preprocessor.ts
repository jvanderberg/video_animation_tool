import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  AnimationFile,
  EffectsLibrary,
  EffectAnimation,
  PropertyAnimation,
  SequenceAnimation,
  Sequence,
  Keyframe,
  TimeKeyframe
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedLibrary: EffectsLibrary | null = null;

/**
 * Load effects library from disk (with caching)
 */
async function loadEffectsLibrary(): Promise<EffectsLibrary> {
  if (cachedLibrary) {
    return cachedLibrary;
  }

  const libraryPath = join(__dirname, '../effects/library.json');
  const data = await readFile(libraryPath, 'utf-8');
  cachedLibrary = JSON.parse(data);
  return cachedLibrary;
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
 * @param library - Effects library
 * @param fps - Project frame rate
 */
function expandEffectAnimation(
  effectAnim: EffectAnimation,
  library: EffectsLibrary,
  fps: number
): PropertyAnimation[] {
  const effect = library[effectAnim.effect];
  if (!effect) {
    throw new Error(`Effect '${effectAnim.effect}' not found in effects library`);
  }

  const startFrame = Math.round(effectAnim.startTime * fps);
  const durationFrames = Math.round(effect.duration * fps);

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
 * - Load effects library
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

  // Load effects library
  const library = await loadEffectsLibrary();

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
        // Expand effect into property animations
        const propertyAnims = expandEffectAnimation(anim, library, animation.project.fps);
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
 * Clear the cached effects library (useful for testing)
 */
export function clearEffectsCache(): void {
  cachedLibrary = null;
}
