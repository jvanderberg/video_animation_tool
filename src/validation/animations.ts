/**
 * Validation functions for animations (property existence, target validity)
 */

import type { AnimationObject, PropertyAnimation } from '../types.js';

/**
 * Get all valid property names for an object type
 */
function getValidProperties(obj: AnimationObject): Set<string> {
  // Common properties that all objects can animate
  const commonProps = new Set([
    'x', 'y', 'opacity', 'rotation', 'scale', 'scaleX', 'scaleY', 'blur',
    'clip.x', 'clip.y', 'clip.width', 'clip.height'
  ]);

  // Add object-specific properties
  switch (obj.type) {
    case 'rect':
    case 'image':
      commonProps.add('width');
      commonProps.add('height');
      break;
    case 'circle':
      commonProps.add('radius');
      break;
    case 'ellipse':
      commonProps.add('radiusX');
      commonProps.add('radiusY');
      break;
    case 'text':
      commonProps.add('content');
      commonProps.add('size');
      commonProps.add('color');
      commonProps.add('font');
      commonProps.add('align');
      break;
    case 'line':
      commonProps.add('x2');
      commonProps.add('y2');
      commonProps.add('stroke');
      commonProps.add('strokeWidth');
      break;
  }

  // Add fill/stroke for objects that have them
  if ('fill' in obj) {
    commonProps.add('fill');
  }
  if ('stroke' in obj) {
    commonProps.add('stroke');
  }

  return commonProps;
}

/**
 * Find an object by ID in the objects tree (including nested groups)
 */
function findObjectById(objects: AnimationObject[], id: string): AnimationObject | null {
  for (const obj of objects) {
    if (obj.id === id) {
      return obj;
    }
    if (obj.type === 'group' && 'children' in obj) {
      const found = findObjectById((obj as any).children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Validate animation property against target object
 */
export function validateAnimationProperty(
  animation: PropertyAnimation,
  objects: AnimationObject[]
): void {
  // Find the target object
  const targetObj = findObjectById(objects, animation.target);
  if (!targetObj) {
    throw new Error(
      `Animation target '${animation.target}' not found. ` +
      `Cannot animate property '${animation.property}'.`
    );
  }

  // Get valid properties for this object
  const validProps = getValidProperties(targetObj);

  // Check if property is valid
  if (!validProps.has(animation.property)) {
    throw new Error(
      `Property '${animation.property}' is not valid for object '${animation.target}' of type '${targetObj.type}'. ` +
      `Valid properties: ${Array.from(validProps).sort().join(', ')}`
    );
  }
}
