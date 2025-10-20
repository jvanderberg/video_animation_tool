/**
 * Validation functions for objects (dimensions, opacity, required properties)
 */

import type { AnimationObject } from '../types.js';

/**
 * Validate object properties (dimensions, opacity, etc.)
 */
export function validateObject(obj: AnimationObject): void {
  const objId = 'id' in obj ? obj.id : 'unknown';

  // Validate required properties for each object type
  switch (obj.type) {
    case 'rect':
      if (!('width' in obj)) {
        throw new Error(`Object '${objId}' of type 'rect' must have a 'width' property.`);
      }
      if (!('height' in obj)) {
        throw new Error(`Object '${objId}' of type 'rect' must have a 'height' property.`);
      }
      break;
    case 'circle':
      if (!('radius' in obj)) {
        throw new Error(`Object '${objId}' of type 'circle' must have a 'radius' property.`);
      }
      break;
    case 'ellipse':
      if (!('radiusX' in obj)) {
        throw new Error(`Object '${objId}' of type 'ellipse' must have a 'radiusX' property.`);
      }
      if (!('radiusY' in obj)) {
        throw new Error(`Object '${objId}' of type 'ellipse' must have a 'radiusY' property.`);
      }
      break;
    case 'text':
      if (!('content' in obj)) {
        throw new Error(`Object '${objId}' of type 'text' must have a 'content' property.`);
      }
      break;
    case 'image':
      if (!('source' in obj)) {
        throw new Error(`Object '${objId}' of type 'image' must have a 'source' property.`);
      }
      break;
    case 'line':
      if (!('x2' in obj)) {
        throw new Error(`Object '${objId}' of type 'line' must have an 'x2' property.`);
      }
      if (!('y2' in obj)) {
        throw new Error(`Object '${objId}' of type 'line' must have a 'y2' property.`);
      }
      break;
  }

  // Validate dimensions (allow 0 for animation purposes, just not negative)
  if ('width' in obj) {
    const width = obj.width as number;
    if (typeof width === 'number' && width < 0) {
      throw new Error(`Object '${objId}' has invalid width: ${width}. Width cannot be negative.`);
    }
  }

  if ('height' in obj) {
    const height = obj.height as number;
    if (typeof height === 'number' && height < 0) {
      throw new Error(`Object '${objId}' has invalid height: ${height}. Height cannot be negative.`);
    }
  }

  if ('radius' in obj) {
    const radius = obj.radius as number;
    if (typeof radius === 'number' && radius < 0) {
      throw new Error(`Object '${objId}' has invalid radius: ${radius}. Radius cannot be negative.`);
    }
  }

  if ('radiusX' in obj) {
    const radiusX = obj.radiusX as number;
    if (typeof radiusX === 'number' && radiusX < 0) {
      throw new Error(`Object '${objId}' has invalid radiusX: ${radiusX}. RadiusX cannot be negative.`);
    }
  }

  if ('radiusY' in obj) {
    const radiusY = obj.radiusY as number;
    if (typeof radiusY === 'number' && radiusY < 0) {
      throw new Error(`Object '${objId}' has invalid radiusY: ${radiusY}. RadiusY cannot be negative.`);
    }
  }

  // Validate opacity
  if ('opacity' in obj) {
    const opacity = obj.opacity as number;
    if (typeof opacity === 'number' && (opacity < 0 || opacity > 1)) {
      throw new Error(`Object '${objId}' has invalid opacity: ${opacity}. Opacity must be between 0 and 1.`);
    }
  }

  // Recursively validate children in groups
  if (obj.type === 'group' && 'children' in obj) {
    for (const child of (obj as any).children) {
      validateObject(child);
    }
  }
}

/**
 * Validate all objects in animation
 */
export function validateObjects(objects: AnimationObject[]): void {
  for (const obj of objects) {
    validateObject(obj);
  }
}
