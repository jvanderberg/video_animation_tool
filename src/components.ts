import fs from 'fs/promises';
import path from 'path';
import type { ComponentDefinition, ComponentObject, AnimationObject, GroupObject } from './types.js';

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
 * Expand a component into a group object
 * Loads the component file, applies parameter substitution, and returns a group
 */
export async function expandComponent(
  component: ComponentObject,
  basePath: string
): Promise<GroupObject> {
  // Resolve component path relative to base path
  const componentPath = path.resolve(basePath, component.source);

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
    children: expandedObjects,
  };

  return group;
}

/**
 * Expand all components in an animation file
 * Recursively expands component objects into groups
 */
export async function expandComponents(
  objects: AnimationObject[],
  basePath: string
): Promise<AnimationObject[]> {
  const expanded: AnimationObject[] = [];

  for (const obj of objects) {
    if (obj.type === 'component') {
      // Expand component into a group
      const group = await expandComponent(obj, basePath);
      expanded.push(group);
    } else if (obj.type === 'group') {
      // Recursively expand components in group children
      const expandedChildren = await expandComponents(obj.children, basePath);
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
