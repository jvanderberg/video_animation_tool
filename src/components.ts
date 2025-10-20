import fs from 'fs/promises';
import path from 'path';
import type { ComponentDefinition, ComponentObject, AnimationObject, GroupObject, Animation, PropertyAnimation, EffectAnimation, Keyframe } from './types.js';
import { parseTime, type TimeValue } from './time-utils.js';

/**
 * Load a component definition from a file
 */
async function loadComponent(componentPath: string): Promise<ComponentDefinition> {
  const data = await fs.readFile(componentPath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Substitute template variables in a string
 * Replaces {{variableName}} with the corresponding value from params
 */
function substituteTemplates(str: string, params: Record<string, any>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (varName in params) {
      return String(params[varName]);
    }
    return match; // Keep original if not found
  });
}

/**
 * Recursively substitute template variables in an object
 */
function substituteInObject(obj: any, params: Record<string, any>): any {
  if (typeof obj === 'string') {
    // Check if the entire string is a single template variable
    const singleVarMatch = obj.match(/^\{\{(\w+)\}\}$/);
    if (singleVarMatch) {
      const varName = singleVarMatch[1];
      if (varName in params) {
        // Return the actual value (preserving type)
        return params[varName];
      }
    }
    // Otherwise do string substitution
    return substituteTemplates(obj, params);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => substituteInObject(item, params));
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteInObject(value, params);
    }
    return result;
  }

  return obj;
}

/**
 * Prefix all object IDs in an array with a namespace
 * Recursively handles groups and nested objects
 */
function prefixObjectIds(objects: AnimationObject[], prefix: string): AnimationObject[] {
  return objects.map(obj => {
    const newObj = { ...obj };

    // Prefix the ID if it exists
    if (newObj.id) {
      newObj.id = `${prefix}.${newObj.id}`;
    }

    // Recursively prefix children in groups
    if (newObj.type === 'group' && 'children' in newObj) {
      (newObj as GroupObject).children = prefixObjectIds((newObj as GroupObject).children, prefix);
    }

    return newObj;
  });
}

/**
 * Offset animation times and namespace targets
 */
function processAnimations(
  animations: Animation[],
  startOffset: number,
  namespace: string,
  fps: number
): Animation[] {
  return animations.map(anim => {
    // Namespace the target
    const namespacedTarget = `${namespace}.${anim.target}`;

    // Check if it's a property animation or effect animation
    if ('keyframes' in anim) {
      // Property animation - offset keyframe frames
      const propAnim = anim as PropertyAnimation;
      return {
        ...propAnim,
        target: namespacedTarget,
        keyframes: propAnim.keyframes.map(kf => ({
          ...kf,
          frame: kf.frame + startOffset
        }))
      };
    } else {
      // Effect animation - offset start time
      const effectAnim = anim as EffectAnimation;
      const startFrame = typeof effectAnim.start === 'number'
        ? effectAnim.start
        : parseTime(effectAnim.start, fps);

      return {
        ...effectAnim,
        target: namespacedTarget,
        start: startFrame + startOffset
      };
    }
  });
}

/**
 * Expand a component into a group object
 * Loads the component file, applies parameter substitution, and returns a group
 */
export async function expandComponent(
  component: ComponentObject,
  basePath: string,
  fps: number = 30,
  parentOffset: number = 0,
  componentStack: Set<string> = new Set()
): Promise<GroupObject> {
  // Require component to have an ID for namespacing
  if (!component.id) {
    throw new Error('Component objects must have an id for namespacing');
  }

  // Resolve component path relative to base path
  const componentPath = path.resolve(basePath, component.source);

  // Check for circular reference
  if (componentStack.has(componentPath)) {
    const cycle = Array.from(componentStack).concat(componentPath);
    throw new Error(
      `Circular component reference detected: ${cycle.join(' -> ')}`
    );
  }

  // Add to stack for cycle detection
  const newStack = new Set(componentStack);
  newStack.add(componentPath);

  // Load component definition
  const definition = await loadComponent(componentPath);

  // Build params with defaults
  const params: Record<string, any> = {};

  // Apply defaults from definition
  if (definition.parameters) {
    for (const [name, paramDef] of Object.entries(definition.parameters)) {
      if (paramDef.default !== undefined) {
        params[name] = paramDef.default;
      }
    }
  }

  // Override with provided params
  if (component.params) {
    Object.assign(params, component.params);
  }

  // Clone and substitute in component objects
  const expandedObjects = substituteInObject(definition.objects, params);

  // Prefix all IDs with component ID for namespacing
  const namespacedObjects = prefixObjectIds(expandedObjects, component.id);

  // Calculate total start time offset (parent offset + this component's start)
  const componentStartOffset = component.start ? parseTime(component.start, fps) : 0;
  const totalOffset = parentOffset + componentStartOffset;

  // Recursively expand any nested components in children
  const fullyExpandedChildren = await expandComponents(
    namespacedObjects,
    basePath,
    fps,
    totalOffset,
    newStack
  );

  // Process animations if they exist
  let processedAnimations: Animation[] | undefined;
  if (definition.animations && definition.animations.length > 0) {
    processedAnimations = processAnimations(
      definition.animations,
      totalOffset,
      component.id,
      fps
    );
  }

  // Create a group with the component's objects
  const group: GroupObject = {
    type: 'group',
    id: component.id,
    x: component.x,
    y: component.y,
    rotation: component.rotation,
    opacity: component.opacity,
    scale: component.scale,
    scaleX: component.scaleX,
    scaleY: component.scaleY,
    z: component.z,
    anchor: component.anchor,
    children: fullyExpandedChildren,
    animations: processedAnimations,
  };

  return group;
}

/**
 * Expand all components in an animation file
 * Recursively expands component objects into groups
 */
export async function expandComponents(
  objects: AnimationObject[],
  basePath: string,
  fps: number = 30,
  parentOffset: number = 0,
  componentStack: Set<string> = new Set()
): Promise<AnimationObject[]> {
  const expanded: AnimationObject[] = [];

  for (const obj of objects) {
    if (obj.type === 'component') {
      // Expand component into a group
      const group = await expandComponent(obj, basePath, fps, parentOffset, componentStack);
      expanded.push(group);
    } else if (obj.type === 'group') {
      // Recursively expand components in group children
      const expandedChildren = await expandComponents(obj.children, basePath, fps, parentOffset, componentStack);
      expanded.push({
        ...obj,
        children: expandedChildren,
      });
    } else {
      // Keep other object types as-is
      expanded.push(obj);
    }
  }

  return expanded;
}

/**
 * Check if animation is an Animation (has absolute timing)
 */
function isAnimation(anim: any): anim is Animation {
  // Animation has either 'effect' property OR keyframes with 'frame' property
  if ('effect' in anim) return true;
  if ('keyframes' in anim && anim.keyframes?.[0]?.frame !== undefined) return true;
  return false;
}

/**
 * Extract all animations from groups (including nested groups)
 * Returns a flat array of all animations found
 * Only extracts Animations (absolute timing), skips GroupAnimations (relative timing)
 */
export function extractAnimationsFromGroups(objects: AnimationObject[]): Animation[] {
  const animations: Animation[] = [];

  for (const obj of objects) {
    if (obj.type === 'group') {
      const group = obj as GroupObject;

      // Collect animations from this group (only Animations)
      if (group.animations) {
        const sequenceAnims = group.animations.filter(isAnimation);
        animations.push(...sequenceAnims);
      }

      // Recursively collect from children
      if (group.children) {
        animations.push(...extractAnimationsFromGroups(group.children));
      }
    }
  }

  return animations;
}
