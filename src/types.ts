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

// Clipping region (in local object space)
// Values can be numbers (pixels) or strings (percentages like "50%" or "-50%")
export interface ClipRegion {
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
}

// Project configuration
export interface ProjectConfig {
  width: number;
  height: number;
  fps: number;
  frames: number;
}

// Keyframe for animation (frame-based)
// Value can be a number (pixels) or string (percentage like "50%")
export interface Keyframe {
  frame: number;
  value: number | string;
  easing?: EasingType;
}

// Time-based keyframe (gets converted to frame-based during preprocessing)
export interface TimeKeyframe {
  time: number;  // 0.0 to 1.0 (normalized to effect duration)
  value: number | string;  // Number (pixels) or string (percentage like "50%")
  easing?: EasingType;
}

// Effect definition from library
export interface EffectDefinition {
  description?: string;
  duration: number;  // seconds
  properties: Record<string, TimeKeyframe[]>;
}

// Animation using an effect from library
export interface EffectAnimation {
  target: string;  // Object ID
  effect: string;  // Name of effect in library
  startTime: number;  // seconds (gets converted to startFrame)
  duration?: number;  // Optional duration override in seconds (uses effect default if not specified)
}

// Traditional property animation
export interface PropertyAnimation {
  target: string;  // Object ID
  property: string;
  keyframes: Keyframe[];
}

// Union type for all animation types
export type SequenceAnimation = PropertyAnimation | EffectAnimation;

// Effects library structure
export interface EffectsLibrary {
  [effectName: string]: EffectDefinition;
}

// Animation sequence - runs in order, animations within run in parallel
export interface Sequence {
  name?: string;
  duration?: number;  // For pause sequences (no animations)
  animations?: SequenceAnimation[];
}

// Base object properties shared by all object types
export interface BaseObject {
  id?: string;  // Now required for animation targeting
  type: string;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
  scale?: number;  // Uniform scale factor (1.0 = 100%)
  scaleX?: number;  // X-axis scale factor (1.0 = 100%)
  scaleY?: number;  // Y-axis scale factor (1.0 = 100%)
  z?: number;
  anchor?: AnchorType;
  clip?: ClipRegion;  // Optional clipping region in local space
  blur?: number;  // Blur radius in pixels
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

// Circle object
export interface CircleObject extends BaseObject {
  type: 'circle';
  radius: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// Ellipse object
export interface EllipseObject extends BaseObject {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

// Path command types
export interface MoveToCommand {
  type: 'moveTo';
  x: number;
  y: number;
}

export interface LineToCommand {
  type: 'lineTo';
  x: number;
  y: number;
}

export interface ClosePathCommand {
  type: 'closePath';
}

export interface QuadraticCurveToCommand {
  type: 'quadraticCurveTo';
  cpx: number;
  cpy: number;
  x: number;
  y: number;
}

export interface BezierCurveToCommand {
  type: 'bezierCurveTo';
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
  x: number;
  y: number;
}

export interface ArcCommand {
  type: 'arc';
  x: number;
  y: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  counterclockwise?: boolean;
}

export interface ArcToCommand {
  type: 'arcTo';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
}

// Union type of all path commands
export type PathCommand =
  | MoveToCommand
  | LineToCommand
  | ClosePathCommand
  | QuadraticCurveToCommand
  | BezierCurveToCommand
  | ArcCommand
  | ArcToCommand;

// Path object (custom shapes using canvas path commands)
export interface PathObject extends BaseObject {
  type: 'path';
  commands: PathCommand[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
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
  | CircleObject
  | EllipseObject
  | PathObject
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
  width?: number;   // Optional bounding box width (for reference)
  height?: number;  // Optional bounding box height (for reference)
}

// Main animation file structure
export interface AnimationFile {
  project: ProjectConfig;
  objects: AnimationObject[];
  sequences?: Sequence[];  // Optional for backward compatibility
}
