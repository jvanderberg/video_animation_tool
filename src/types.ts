/**
 * Core type definitions for the animation tool
 */

// Easing function types
export type EasingPreset = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';

// Cubic bezier easing definition
export interface CubicBezierEasing {
  type: 'cubic-bezier';
  points: [number, number, number, number]; // [x1, y1, x2, y2]
}

// Easing can be a preset, a cubic-bezier string, or a cubic-bezier object
export type EasingType = EasingPreset | `cubic-bezier(${string})` | CubicBezierEasing;

// Anchor point for positioning
export type AnchorType = 'top-left' | 'top-center' | 'top-right' |
                         'center-left' | 'center' | 'center-right' |
                         'bottom-left' | 'bottom-center' | 'bottom-right';

// Project configuration
export interface ProjectConfig {
  width: number;
  height: number;
  fps: number;
  frames: number;
}

// Keyframe for animation
export interface Keyframe {
  frame: number;
  value: number;
  easing?: EasingType;
}

// Animation definition
export interface Animation {
  property: string;
  keyframes: Keyframe[];
}

// Base object properties shared by all object types
export interface BaseObject {
  id?: string;
  type: string;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
  z?: number;
  anchor?: AnchorType;
  animations?: Animation[];
}

// Text object
export interface TextObject extends BaseObject {
  type: 'text';
  content: string;
  font?: string;
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

// Image object
export interface ImageObject extends BaseObject {
  type: 'image';
  source: string;
  width?: number;
  height?: number;
}

// Rectangle object
export interface RectObject extends BaseObject {
  type: 'rect';
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// Line object
export interface LineObject extends BaseObject {
  type: 'line';
  x2: number;
  y2: number;
  stroke?: string;
  strokeWidth?: number;
}

// Point object
export interface PointObject extends BaseObject {
  type: 'point';
  radius?: number;
  fill?: string;
}

// Group object (container for other objects)
export interface GroupObject extends BaseObject {
  type: 'group';
  children: AnimationObject[];
}

// Component object (reference to external component)
export interface ComponentObject extends BaseObject {
  type: 'component';
  source: string;
  params?: Record<string, any>;
}

// Union type of all object types
export type AnimationObject =
  | TextObject
  | ImageObject
  | RectObject
  | LineObject
  | PointObject
  | GroupObject
  | ComponentObject;

// Component definition (for reusable components)
export interface ComponentParameter {
  type: 'string' | 'number' | 'boolean';
  default?: any;
}

export interface ComponentDefinition {
  parameters?: Record<string, ComponentParameter>;
  objects: AnimationObject[];
}

// Main animation file structure
export interface AnimationFile {
  project: ProjectConfig;
  objects: AnimationObject[];
}
