import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';
import { parseTime } from './time-utils.js';
import type { TimeValue } from './time-utils.js';
import { validateEasing, validateEffectValue } from './validation/effects.js';
import { validateObject, validateObjects } from './validation/objects.js';
import { validateAnimationProperty } from './validation/animations.js';
import type {
  AnimationFile,
  AnimationObject,
  EffectDefinition,
  EffectAnimation,
  PropertyAnimation,
  Animation,
  Keyframe,
  TimeKeyframe,
  GroupAnimation,
  GroupObject,
  GroupTransition
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
function isEffectAnimation(anim: Animation): anim is EffectAnimation {
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
    start: Math.round(startFrame + tk.time * durationFrames),
    value: tk.value,
    easing: tk.easing
  }));
}

/**
 * Convert keyframes with TimeValue start to numeric frame values
 * @param keyframes - Keyframes with start as TimeValue
 * @param fps - Frames per second
 * @param startFrameOffset - Offset to add (for relative timing in groups)
 * @param animationSpeed - Speed multiplier
 */
function convertKeyframesToFrames(
  keyframes: Keyframe[],
  fps: number,
  startFrameOffset: number = 0,
  animationSpeed: number = 1.0
): Keyframe[] {
  return keyframes.map(kf => ({
    start: startFrameOffset + (parseTime(kf.start, fps) / animationSpeed),
    value: kf.value,
    easing: kf.easing
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
 * Find an object by ID in the objects array (recursively searches groups)
 */
function findObjectById(objects: AnimationObject[], id: string): AnimationObject | null {
  for (const obj of objects) {
    if (obj.id === id) {
      return obj;
    }
    if (obj.type === 'group' && 'children' in obj) {
      const found = findObjectById((obj as GroupObject).children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get property value from object with defaults
 */
function getObjectPropertyValue(obj: any, propertyName: string): number {
  // Check if property exists on object
  if (propertyName in obj && obj[propertyName] !== undefined) {
    return obj[propertyName];
  }

  // Return common defaults
  switch (propertyName) {
    case 'opacity':
    case 'scale':
    case 'scaleX':
    case 'scaleY':
      return 1;
    case 'rotation':
    case 'x':
    case 'y':
    case 'blur':
      return 0;
    default:
      return 0;
  }
}

/**
 * Substitute property tokens like {x}, {opacity} in effect values
 */
function substitutePropertyTokens(
  value: number | string,
  targetObject: AnimationObject | null,
  propertyName: string
): number | string {
  // Check if value is a substitution token like {x} or {opacity}
  if (typeof value === 'string' && value.match(/^\{(\w+)\}$/)) {
    const propName = value.slice(1, -1); // Remove { and }
    if (!targetObject) {
      // If no target object available, use default value
      return propName === 'opacity' || propName === 'scale' || propName === 'scaleX' || propName === 'scaleY' ? 1 : 0;
    }
    return getObjectPropertyValue(targetObject, propName);
  }

  // Otherwise return as-is (preserve percentages, numbers, etc.)
  return value;
}

/**
 * Expand an effect animation into property animations
 * @param effectAnim - Effect animation to expand
 * @param fps - Project frame rate
 * @param objects - All objects in the animation (to look up target for property substitution)
 */
export async function expandEffectAnimation(
  effectAnim: EffectAnimation,
  fps: number,
  objects: AnimationObject[] = []
): Promise<PropertyAnimation[]> {
  const effect = await loadEffect(effectAnim.effect);

  // Find target object for property substitution (if objects provided)
  const targetObject = objects.length > 0 ? findObjectById(objects, effectAnim.target) : null;

  // Validate effect property values and easing
  for (const [property, timeKeyframes] of Object.entries(effect.properties)) {
    for (let i = 0; i < timeKeyframes.length; i++) {
      // Skip validation for substitution tokens
      const value = timeKeyframes[i].value;
      if (typeof value !== 'string' || !value.match(/^\{(\w+)\}$/)) {
        validateEffectValue(value, effectAnim.effect, property, i);
      }
      validateEasing(timeKeyframes[i].easing, effectAnim.effect, property, i);
    }
  }

  const startFrame = parseTime(effectAnim.start, fps);

  // Use custom duration if provided, otherwise use effect's default duration
  // Effect definitions store duration in seconds (legacy format)
  // User overrides can use TimeValue format
  let durationFrames: number;
  if (effectAnim.duration !== undefined) {
    durationFrames = parseTime(effectAnim.duration, fps);
  } else {
    // Effect's default duration is always in seconds
    durationFrames = Math.round(effect.duration * fps);
  }

  const propertyAnimations: PropertyAnimation[] = [];

  for (const [property, timeKeyframes] of Object.entries(effect.properties)) {
    // Substitute property tokens in keyframe values
    const substitutedKeyframes: TimeKeyframe[] = timeKeyframes.map(kf => ({
      ...kf,
      value: substitutePropertyTokens(kf.value, targetObject, property)
    }));

    propertyAnimations.push({
      target: effectAnim.target,
      property,
      keyframes: timeKeyframesToFrameKeyframes(substitutedKeyframes, startFrame, durationFrames)
    });
  }

  return propertyAnimations;
}

/**
 * Expand effect animation to relative property animations (for groups)
 * Returns property animations with relative timing (start/duration format)
 */
async function expandEffectToRelativeAnimations(
  effectAnim: GroupAnimation,
  fps: number,
  objects: AnimationObject[]
): Promise<GroupAnimation[]> {
  const effect = await loadEffect(effectAnim.effect!);

  // Find target object for property substitution
  const targetObject = findObjectById(objects, effectAnim.target);

  // Use custom duration if provided, otherwise use effect's default duration
  const durationSeconds = effectAnim.duration !== undefined
    ? (typeof effectAnim.duration === 'number' ? effectAnim.duration / fps : parseFloat(effectAnim.duration as string))
    : effect.duration;

  const relativeAnimations: GroupAnimation[] = [];

  for (const [property, timeKeyframes] of Object.entries(effect.properties)) {
    // Convert effect's time-based keyframes (0.0 to 1.0) to actual time values
    // and substitute property tokens
    const relativeKeyframes = timeKeyframes.map(kf => {
      const relativeStart = effectAnim.start !== undefined
        ? parseTime(effectAnim.start, fps)
        : 0;
      const timeOffset = kf.time * durationSeconds;

      return {
        start: `${(relativeStart / fps) + timeOffset}s` as TimeValue,
        value: substitutePropertyTokens(kf.value, targetObject, property),
        easing: kf.easing
      };
    });

    relativeAnimations.push({
      target: effectAnim.target,
      property,
      keyframes: relativeKeyframes
    });
  }

  return relativeAnimations;
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

/**
 * Check if animation has keyframes (is a property animation, not an effect)
 */
function hasKeyframes(anim: any): anim is PropertyAnimation {
  return 'keyframes' in anim && Array.isArray(anim.keyframes);
}

/**
 * Find the full path to a target object within a tree of objects
 */
function findObjectPath(targetId: string, objects: AnimationObject[], currentPath: string = ''): string | null {
  for (const obj of objects) {
    const objPath = currentPath ? `${currentPath}.${obj.id}` : obj.id || '';

    if (obj.id === targetId) {
      return objPath;
    }

    // Search in children if this is a group
    if (obj.type === 'group') {
      const group = obj as GroupObject;
      if (group.children) {
        const found = findObjectPath(targetId, group.children, objPath);
        if (found) return found;
      }
    }
  }

  return null;
}

/**
 * Process animations and convert to absolute frame timing
 * All animations use 'start: TimeValue' - timing is relative to context:
 * - Root level: relative to frame 0 (effectively absolute)
 * - Group level: relative to group's start time
 */
async function processAnimations(
  animations: (GroupAnimation | Animation)[],
  objects: AnimationObject[],
  fps: number,
  pathPrefix: string = '',
  startFrameOffset: number = 0,
  animationSpeed: number = 1.0
): Promise<Animation[]> {
  const processed: Animation[] = [];

  for (const anim of animations) {
    if (!hasKeyframes(anim)) {
      continue; // Skip effect animations (should already be expanded)
    }

    const propAnim = anim as PropertyAnimation | GroupAnimation;

    // Find the full path to the target within the object tree
    const targetPath = findObjectPath(propAnim.target, objects);
    if (!targetPath) {
      throw new Error(`Animation target "${propAnim.target}" not found in object tree`);
    }

    const fullTarget = pathPrefix ? `${pathPrefix}.${targetPath}` : targetPath;
    const property = propAnim.property || (propAnim as any).property;

    if (property && propAnim.keyframes) {
      // Convert all keyframes: parse TimeValue start + add offset + apply speed
      const absoluteKeyframes: Keyframe[] = propAnim.keyframes.map((kf: any) => ({
        start: startFrameOffset + (parseTime(kf.start, fps) / animationSpeed),
        value: kf.value,
        easing: kf.easing
      }));

      processed.push({
        target: fullTarget,
        property: property,
        keyframes: absoluteKeyframes
      } as PropertyAnimation);
    }
  }

  return processed;
}

/**
 * Extract and process animations from nested groups
 * Recursively processes groups and their children, converting relative timing to absolute
 */
async function extractGroupAnimations(
  objects: AnimationObject[],
  fps: number,
  parentPath: string = '',
  parentStartFrame: number = 0,
  parentSpeed: number = 1.0
): Promise<Animation[]> {
  const extracted: Animation[] = [];

  for (const obj of objects) {
    if (obj.type === 'group') {
      const group = obj as GroupObject;
      const groupPath = parentPath ? `${parentPath}.${group.id}` : group.id || '';

      // Calculate group's absolute start frame
      const groupStartFrame = group.start !== undefined
        ? parentStartFrame + parseTime(group.start, fps)
        : parentStartFrame;

      // Process group transitions
      if (group.transition?.in) {
        const trans = group.transition.in;
        extracted.push({
          target: groupPath,
          effect: trans.effect,
          start: groupStartFrame,
          duration: trans.duration
        } as EffectAnimation);
      }

      if (group.transition?.out && group.duration !== undefined) {
        const trans = group.transition.out;
        const groupDurationFrames = parseTime(group.duration, fps);
        const transitionStartFrame = groupStartFrame + groupDurationFrames;

        extracted.push({
          target: groupPath,
          effect: trans.effect,
          start: transitionStartFrame,
          duration: trans.duration
        } as EffectAnimation);
      }

      // Process group animations using unified path
      if (group.animations && group.animations.length > 0) {
        // Expand effect animations to property animations FIRST
        const expandedAnimations: (GroupAnimation | Animation)[] = [];
        for (const anim of group.animations) {
          if ('effect' in anim && anim.effect) {
            // Expand effect to property animations with relative timing
            const expanded = await expandEffectToRelativeAnimations(anim as GroupAnimation, fps, group.children);
            expandedAnimations.push(...expanded);
          } else {
            // Already a property animation
            expandedAnimations.push(anim);
          }
        }

        // Now process property animations with offsets
        const groupSpeed = (group.animationSpeed || 1.0) * parentSpeed;
        const processedAnims = await processAnimations(
          expandedAnimations,
          group.children,
          fps,
          groupPath,
          groupStartFrame,
          groupSpeed
        );
        extracted.push(...processedAnims);

        // Clear animations after extraction to avoid type conflicts
        group.animations = undefined;
      }

      // Recursively process nested groups with combined speed
      const combinedSpeed = (group.animationSpeed || 1.0) * parentSpeed;
      const childAnimations = await extractGroupAnimations(
        group.children,
        fps,
        groupPath,
        groupStartFrame,
        combinedSpeed
      );
      extracted.push(...childAnimations);
    }
  }

  return extracted;
}

export async function preprocessAnimation(animation: AnimationFile): Promise<AnimationFile> {
  // Validate objects first
  validateObjects(animation.objects);

  // Resolve percentages in object clip properties
  resolveClipPercentages(animation.objects);

  // Collect all animations from:
  // 1. Root-level animations array
  // 2. Nested group animations

  const allAnimations: Animation[] = [];

  // Process root-level animations (treat as group with start=0)
  if (animation.animations && animation.animations.length > 0) {
    // Expand effect animations to property animations FIRST
    const expandedRootAnimations: (GroupAnimation | Animation)[] = [];
    for (const anim of animation.animations) {
      // Check if this is an EffectAnimation
      if ('effect' in anim && 'start' in anim && !('keyframes' in anim)) {
        // EffectAnimation - expand to property animations
        const expanded = await expandEffectAnimation(anim as EffectAnimation, animation.project.fps, animation.objects);
        expandedRootAnimations.push(...expanded);
      } else {
        // Already a property animation
        expandedRootAnimations.push(anim);
      }
    }

    const rootSpeed = animation.animationSpeed || 1.0;
    const rootAnimations = await processAnimations(
      expandedRootAnimations,
      animation.objects,
      animation.project.fps,
      '',  // No path prefix for root
      0,   // Start at frame 0
      rootSpeed  // Apply root animation speed
    );
    allAnimations.push(...rootAnimations);
  }

  // Extract animations from nested groups (pass root speed for multiplicative combination)
  const rootSpeed = animation.animationSpeed || 1.0;
  const groupAnimations = await extractGroupAnimations(
    animation.objects,
    animation.project.fps,
    '',  // No parent path
    0,   // No parent start offset
    rootSpeed  // Pass root speed to groups
  );
  allAnimations.push(...groupAnimations);

  // If no animations at all, nothing more to preprocess
  if (allAnimations.length === 0) {
    return animation;
  }

  // Expand any remaining effect animations (e.g., group transitions)
  const expandedAnimations: PropertyAnimation[] = [];
  for (const anim of allAnimations) {
    if (isEffectAnimation(anim)) {
      const propertyAnims = await expandEffectAnimation(anim as EffectAnimation, animation.project.fps, animation.objects);
      expandedAnimations.push(...propertyAnims);
    } else {
      expandedAnimations.push(anim as PropertyAnimation);
    }
  }

  // Validate all animations
  for (const anim of expandedAnimations) {
    validateAnimationProperty(anim, animation.objects);
  }

  // Resolve percentage values in all animations
  const resolvedAnimations = expandedAnimations.map(anim =>
    resolvePercentagesInAnimation(anim, animation.objects)
  );

  // Return with processed animations
  return {
    ...animation,
    animations: resolvedAnimations
  };
}

/**
 * Clear the cached effects (useful for testing)
 */
export function clearEffectsCache(): void {
  effectCache.clear();
}
