import { createCanvas, Canvas, CanvasRenderingContext2D, Image } from 'canvas';
import { canvasRGBA } from 'stackblur-canvas';
import type { AnimationFile, AnimationObject, GroupObject, PropertyAnimation } from './types.js';
import { getAnchorOffset, renderRect, renderLine, renderCircle, renderEllipse, renderPath } from './renderer/shapes.js';
import { renderText } from './renderer/text.js';
import { loadImageIfNeeded, renderImage } from './renderer/image.js';

export class Renderer {
  private canvas: Canvas;
  private ctx: CanvasRenderingContext2D;
  private animation: AnimationFile;
  private animationMap: Map<string, Map<string, any[]>>;  // objectId -> property -> keyframes
  private imageCache: Map<string, Image>;  // source path -> loaded Image

  constructor(animation: AnimationFile) {
    this.animation = animation;
    this.canvas = createCanvas(animation.project.width, animation.project.height);
    this.ctx = this.canvas.getContext('2d');
    this.animationMap = this.buildAnimationMap();
    this.imageCache = new Map();
  }

  /**
   * Build animation map from sequences
   * Returns: objectId -> property -> keyframes
   */
  private buildAnimationMap(): Map<string, Map<string, any[]>> {
    const map = new Map<string, Map<string, any[]>>();

    if (!this.animation.sequences) {
      return map;
    }

    // Process sequences in order
    for (const sequence of this.animation.sequences) {
      if (!sequence.animations) {
        continue;  // Skip pause sequences
      }

      // Process each animation in the sequence
      for (const anim of sequence.animations) {
        // Type guard: renderer only handles property animations (effects should be expanded)
        if (!('property' in anim) || !('keyframes' in anim)) {
          continue;
        }

        const propAnim = anim as PropertyAnimation;

        // Get or create object's property map
        if (!map.has(propAnim.target)) {
          map.set(propAnim.target, new Map());
        }
        const objectMap = map.get(propAnim.target)!;

        // Store keyframes for this property
        // If property already has keyframes, merge them
        if (objectMap.has(propAnim.property)) {
          const existing = objectMap.get(propAnim.property)!;
          objectMap.set(propAnim.property, [...existing, ...propAnim.keyframes]);
        } else {
          objectMap.set(propAnim.property, [...propAnim.keyframes]);
        }
      }
    }

    return map;
  }

  /**
   * Preload all images from the animation
   */
  async preloadImages(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    const processObjects = (objects: AnimationObject[]) => {
      for (const obj of objects) {
        if (obj.type === 'image') {
          loadPromises.push(loadImageIfNeeded(obj.source, this.imageCache).then(() => {}));
        } else if (obj.type === 'group') {
          processObjects(obj.children);
        }
      }
    };

    processObjects(this.animation.objects);
    await Promise.all(loadPromises);
  }

  /**
   * Render a specific frame
   */
  renderFrame(frameNumber: number): Canvas {
    const { width, height } = this.animation.project;

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Sort objects by z-index (document order by default)
    const sortedObjects = this.getSortedObjects();

    // Render each object
    for (const obj of sortedObjects) {
      this.renderObject(obj, frameNumber);
    }

    return this.canvas;
  }

  /**
   * Export frame as PNG buffer
   */
  async exportFrame(frameNumber: number): Promise<Buffer> {
    this.renderFrame(frameNumber);
    return this.canvas.toBuffer('image/png');
  }

  /**
   * Get pixel color at specific coordinates (for testing)
   * Returns RGBA values [r, g, b, a] where each value is 0-255
   */
  getPixel(x: number, y: number): [number, number, number, number] {
    const imageData = this.ctx.getImageData(x, y, 1, 1);
    return [
      imageData.data[0],
      imageData.data[1],
      imageData.data[2],
      imageData.data[3],
    ];
  }

  /**
   * Sort objects by z-index, maintaining document order for same z-index
   */
  private getSortedObjects(): AnimationObject[] {
    return [...this.animation.objects].sort((a, b) => {
      const zA = a.z ?? 0;
      const zB = b.z ?? 0;
      return zA - zB;
    });
  }

  /**
   * Render a single object
   */
  private renderObject(obj: AnimationObject, frameNumber: number): void {
    // Get animated properties for this frame
    const props = this.getPropertiesAtFrame(obj, frameNumber);

    // Skip rendering if any scale is 0 or negative (invisible)
    // This also avoids canvas issues with degenerate transformation matrices
    if (props.scale !== undefined && props.scale <= 0) {
      return;
    }
    if (props.scaleX !== undefined && props.scaleX <= 0) {
      return;
    }
    if (props.scaleY !== undefined && props.scaleY <= 0) {
      return;
    }

    // If blur is needed, render to temp canvas
    if (props.blur !== undefined && props.blur > 0) {
      this.renderObjectWithBlur(obj, frameNumber, props);
      return;
    }

    // Save context state
    this.ctx.save();

    // Apply transforms
    if (props.x !== undefined || props.y !== undefined) {
      this.ctx.translate(props.x ?? 0, props.y ?? 0);
    }

    // Apply uniform scale first, then scaleX/scaleY
    // Calculate final scale values
    const finalScaleX = (props.scale ?? 1) * (props.scaleX ?? 1);
    const finalScaleY = (props.scale ?? 1) * (props.scaleY ?? 1);

    if (finalScaleX !== 1 || finalScaleY !== 1) {
      this.ctx.scale(finalScaleX, finalScaleY);
    }

    if (props.rotation !== undefined && props.rotation !== 0) {
      this.ctx.rotate((props.rotation * Math.PI) / 180);
    }

    if (props.opacity !== undefined && props.opacity !== 1) {
      // Multiply by current globalAlpha to combine with parent opacity
      this.ctx.globalAlpha *= props.opacity;
    }

    // Apply clipping if present (in object's natural bounding box space)
    // Clip coordinates are relative to object's top-left (0,0), so we need to adjust for anchor
    if (props.clip) {
      // Get object dimensions to calculate anchor offset
      let width = 100, height = 100;
      if (obj.type === 'rect' || obj.type === 'image') {
        width = props.width ?? (obj as any).width ?? width;
        height = props.height ?? (obj as any).height ?? height;
      } else if (obj.type === 'text') {
        const size = (obj as any).size ?? 16;
        const font = (obj as any).font ?? 'sans-serif';
        this.ctx.font = `${size}px ${font}`;
        const metrics = this.ctx.measureText((obj as any).content);
        width = metrics.width;
        height = size * 1.2;
      } else if (obj.type === 'circle' && 'radius' in obj) {
        width = height = ((obj as any).radius ?? 50) * 2;
      } else if (obj.type === 'ellipse') {
        width = ((obj as any).radiusX ?? 50) * 2;
        height = ((obj as any).radiusY ?? 50) * 2;
      }

      // Get anchor offset
      const { offsetX, offsetY } = getAnchorOffset(obj.anchor, width, height);

      // Apply clip adjusted for anchor
      this.ctx.beginPath();
      this.ctx.rect(
        props.clip.x + offsetX,
        props.clip.y + offsetY,
        props.clip.width,
        props.clip.height
      );
      this.ctx.clip();
    }

    // Render based on type
    switch (obj.type) {
      case 'rect':
        renderRect(this.ctx, obj, props);
        break;
      case 'text':
        renderText(this.ctx, obj, props);
        break;
      case 'image':
        renderImage(this.ctx, obj, props, this.imageCache, getAnchorOffset);
        break;
      case 'line':
        renderLine(this.ctx, obj, props);
        break;
      case 'circle':
        renderCircle(this.ctx, obj, props);
        break;
      case 'ellipse':
        renderEllipse(this.ctx, obj, props);
        break;
      case 'path':
        renderPath(this.ctx, obj, props);
        break;
      case 'group':
        this.renderGroup(obj, frameNumber);
        break;
      // Other types will be added later
    }

    // Restore context state
    this.ctx.restore();
  }

  /**
   * Render an object with blur effect using temp canvas
   */
  private renderObjectWithBlur(obj: AnimationObject, frameNumber: number, props: any): void {
    // Calculate object bounds
    let width = 100, height = 100;
    if (obj.type === 'rect' || obj.type === 'image') {
      width = props.width ?? (obj as any).width ?? width;
      height = props.height ?? (obj as any).height ?? height;
    } else if (obj.type === 'text') {
      const size = (obj as any).size ?? 16;
      const font = (obj as any).font ?? 'sans-serif';
      this.ctx.font = `${size}px ${font}`;
      const metrics = this.ctx.measureText((obj as any).content);
      width = metrics.width;
      height = size * 1.2;
    } else if (obj.type === 'circle' && 'radius' in obj) {
      width = height = ((obj as any).radius ?? 50) * 2;
    } else if (obj.type === 'ellipse') {
      width = ((obj as any).radiusX ?? 50) * 2;
      height = ((obj as any).radiusY ?? 50) * 2;
    }

    // Add padding for blur
    const blurRadius = props.blur;
    const padding = Math.ceil(blurRadius * 2);
    const tempWidth = Math.ceil(width + padding * 2);
    const tempHeight = Math.ceil(height + padding * 2);

    // Create temp canvas
    const tempCanvas = createCanvas(tempWidth, tempHeight);
    const tempCtx = tempCanvas.getContext('2d');

    // Save main context and swap
    const savedCtx = this.ctx;
    this.ctx = tempCtx as any;

    // Apply transforms (centered in temp canvas with padding)
    this.ctx.save();
    this.ctx.translate(padding, padding);

    // Apply anchor offset
    const { offsetX, offsetY } = getAnchorOffset(obj.anchor, width, height);
    this.ctx.translate(-offsetX, -offsetY);

    // Apply opacity
    if (props.opacity !== undefined && props.opacity !== 1) {
      this.ctx.globalAlpha = props.opacity;
    }

    // Apply scale and rotation (without position, since we handled that above)
    const finalScaleX = (props.scale ?? 1) * (props.scaleX ?? 1);
    const finalScaleY = (props.scale ?? 1) * (props.scaleY ?? 1);
    if (finalScaleX !== 1 || finalScaleY !== 1) {
      this.ctx.scale(finalScaleX, finalScaleY);
    }
    if (props.rotation !== undefined && props.rotation !== 0) {
      this.ctx.rotate((props.rotation * Math.PI) / 180);
    }

    // Render the object
    switch (obj.type) {
      case 'rect':
        renderRect(this.ctx, obj, props);
        break;
      case 'text':
        renderText(this.ctx, obj, props);
        break;
      case 'image':
        renderImage(this.ctx, obj, props, this.imageCache, getAnchorOffset);
        break;
      case 'line':
        renderLine(this.ctx, obj, props);
        break;
      case 'circle':
        renderCircle(this.ctx, obj, props);
        break;
      case 'ellipse':
        renderEllipse(this.ctx, obj, props);
        break;
      case 'path':
        renderPath(this.ctx, obj, props);
        break;
    }

    this.ctx.restore();

    // Apply blur to temp canvas
    canvasRGBA(tempCanvas as any, 0, 0, tempWidth, tempHeight, blurRadius);

    // Restore main context
    this.ctx = savedCtx;

    // Draw blurred result to main canvas at correct position
    savedCtx.save();
    savedCtx.translate(props.x ?? 0, props.y ?? 0);
    savedCtx.drawImage(tempCanvas as any, -padding + offsetX, -padding + offsetY);
    savedCtx.restore();
  }







  /**
   * Render a group (container for other objects)
   * Children inherit the group's transforms
   */
  private renderGroup(obj: GroupObject, frameNumber: number): void {
    // Render each child object
    // The group's transforms have already been applied to the context
    // by renderObject(), so children will automatically inherit them
    for (const child of obj.children) {
      this.renderObject(child, frameNumber);
    }
  }


  /**
   * Get property values at a specific frame, including animations
   */
  private getPropertiesAtFrame(obj: AnimationObject, frameNumber: number): any {
    const props: any = {
      x: obj.x ?? 0,
      y: obj.y ?? 0,
      rotation: obj.rotation ?? 0,
      opacity: obj.opacity ?? 1,
      scale: obj.scale ?? 1,
      scaleX: obj.scaleX ?? 1,
      scaleY: obj.scaleY ?? 1,
      blur: obj.blur ?? 0,
    };

    // Add clip if present
    if (obj.clip) {
      props.clip = { ...obj.clip };
    }

    // Add type-specific properties that might be animated
    if ('width' in obj) {
      props.width = obj.width;
    }
    if ('height' in obj) {
      props.height = obj.height;
    }
    if ('x2' in obj) {
      props.x2 = obj.x2;
    }
    if ('y2' in obj) {
      props.y2 = obj.y2;
    }
    if ('radius' in obj) {
      props.radius = obj.radius;
    }
    if ('radiusX' in obj) {
      props.radiusX = obj.radiusX;
    }
    if ('radiusY' in obj) {
      props.radiusY = obj.radiusY;
    }

    // Apply animations from sequence map
    if (obj.id && this.animationMap.has(obj.id)) {
      const objectAnimations = this.animationMap.get(obj.id)!;
      for (const [property, keyframes] of objectAnimations.entries()) {
        const value = this.getAnimatedValue(keyframes, frameNumber);
        if (value !== null) {
          // Handle nested properties like "clip.width"
          if (property.includes('.')) {
            const parts = property.split('.');
            if (parts.length === 2) {
              const [parent, child] = parts;
              if (!props[parent]) {
                props[parent] = {};
              }
              props[parent][child] = value;
            }
          } else {
            props[property] = value;
          }
        }
      }
    }

    return props;
  }

  /**
   * Calculate animated value at a specific frame using keyframes
   */
  private getAnimatedValue(keyframes: any[], frameNumber: number): number | null {
    if (keyframes.length === 0) return null;

    // Find surrounding keyframes
    let prevKeyframe = null;
    let nextKeyframe = null;

    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      if (kf.frame <= frameNumber) {
        prevKeyframe = kf;
      }
      if (kf.frame >= frameNumber && !nextKeyframe) {
        nextKeyframe = kf;
      }
    }

    // If before first keyframe, return first value
    if (!prevKeyframe && nextKeyframe) {
      return nextKeyframe.value;
    }

    // If after last keyframe, return last value
    if (prevKeyframe && !nextKeyframe) {
      return prevKeyframe.value;
    }

    // If exactly on a keyframe
    if (prevKeyframe && prevKeyframe.frame === frameNumber) {
      return prevKeyframe.value;
    }

    // Interpolate between keyframes
    if (prevKeyframe && nextKeyframe) {
      const t = (frameNumber - prevKeyframe.frame) / (nextKeyframe.frame - prevKeyframe.frame);
      // Easing is associated with the target keyframe (where we're going TO)
      const easedT = this.applyEasing(t, nextKeyframe.easing || 'linear');
      return prevKeyframe.value + (nextKeyframe.value - prevKeyframe.value) * easedT;
    }

    return null;
  }

  /**
   * Apply easing function to interpolation value
   */
  private applyEasing(t: number, easing: any): number {
    // Handle cubic bezier object format
    if (typeof easing === 'object' && easing.type === 'cubic-bezier') {
      const [x1, y1, x2, y2] = easing.points;
      return this.cubicBezier(t, x1, y1, x2, y2);
    }

    // Handle cubic-bezier string format
    if (typeof easing === 'string' && easing.startsWith('cubic-bezier(')) {
      const match = easing.match(/cubic-bezier\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
      if (match) {
        const x1 = parseFloat(match[1].trim());
        const y1 = parseFloat(match[2].trim());
        const x2 = parseFloat(match[3].trim());
        const y2 = parseFloat(match[4].trim());
        return this.cubicBezier(t, x1, y1, x2, y2);
      }
    }

    // Handle preset easing functions
    switch (easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'bounce':
        if (t < 1 / 2.75) {
          return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
          return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
          return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
          return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
      case 'elastic':
        return t === 0 || t === 1
          ? t
          : -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
      default:
        return t;
    }
  }

  /**
   * Cubic bezier easing function
   * @param t Progress value (0-1)
   * @param x1 First control point x (0-1)
   * @param y1 First control point y (can be outside 0-1 for overshoot)
   * @param x2 Second control point x (0-1)
   * @param y2 Second control point y (can be outside 0-1 for overshoot)
   * @returns Eased value
   */
  private cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
    // For cubic bezier, we need to solve for the parameter that gives us t on the x-axis,
    // then evaluate the curve at that parameter to get the y value.

    // Edge cases
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Use Newton-Raphson method to find the parameter value for the given t
    let parameter = t; // Initial guess
    const epsilon = 1e-6;
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      // Calculate the x value at current parameter
      const currentX = this.bezierX(parameter, x1, x2);
      const difference = currentX - t;

      if (Math.abs(difference) < epsilon) {
        break;
      }

      // Calculate derivative for Newton-Raphson
      const derivative = this.bezierXDerivative(parameter, x1, x2);

      if (Math.abs(derivative) < epsilon) {
        break;
      }

      // Update parameter
      parameter -= difference / derivative;
    }

    // Calculate y value at the found parameter
    return this.bezierY(parameter, y1, y2);
  }

  /**
   * Calculate x coordinate on cubic bezier curve
   */
  private bezierX(t: number, x1: number, x2: number): number {
    // Cubic bezier: B(t) = (1-t)³ * P0 + 3(1-t)²t * P1 + 3(1-t)t² * P2 + t³ * P3
    // Where P0 = 0, P1 = x1, P2 = x2, P3 = 1
    const oneMinusT = 1 - t;
    return 3 * oneMinusT * oneMinusT * t * x1 +
           3 * oneMinusT * t * t * x2 +
           t * t * t;
  }

  /**
   * Calculate y coordinate on cubic bezier curve
   */
  private bezierY(t: number, y1: number, y2: number): number {
    // Same formula as bezierX, but for y coordinates
    // Where P0 = 0, P1 = y1, P2 = y2, P3 = 1
    const oneMinusT = 1 - t;
    return 3 * oneMinusT * oneMinusT * t * y1 +
           3 * oneMinusT * t * t * y2 +
           t * t * t;
  }

  /**
   * Calculate derivative of x with respect to t
   */
  private bezierXDerivative(t: number, x1: number, x2: number): number {
    // Derivative of cubic bezier x component
    const oneMinusT = 1 - t;
    return 3 * oneMinusT * oneMinusT * x1 +
           6 * oneMinusT * t * (x2 - x1) +
           3 * t * t * (1 - x2);
  }
}
