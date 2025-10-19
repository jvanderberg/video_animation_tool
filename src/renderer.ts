import { createCanvas, Canvas, CanvasRenderingContext2D, Image, loadImage } from 'canvas';
import { canvasRGBA } from 'stackblur-canvas';
import type { AnimationFile, AnimationObject, RectObject, TextObject, GroupObject, LineObject, CircleObject, EllipseObject, PathObject, PathCommand, ImageObject } from './types.js';

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
        // Get or create object's property map
        if (!map.has(anim.target)) {
          map.set(anim.target, new Map());
        }
        const objectMap = map.get(anim.target)!;

        // Store keyframes for this property
        // If property already has keyframes, merge them
        if (objectMap.has(anim.property)) {
          const existing = objectMap.get(anim.property)!;
          objectMap.set(anim.property, [...existing, ...anim.keyframes]);
        } else {
          objectMap.set(anim.property, [...anim.keyframes]);
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
          loadPromises.push(this.loadImageIfNeeded(obj.source).then(() => {}));
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
      const { offsetX, offsetY } = this.getAnchorOffset(obj.anchor, width, height);

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
        this.renderRect(obj, props);
        break;
      case 'text':
        this.renderText(obj, props);
        break;
      case 'image':
        this.renderImage(obj, props);
        break;
      case 'line':
        this.renderLine(obj, props);
        break;
      case 'circle':
        this.renderCircle(obj, props);
        break;
      case 'ellipse':
        this.renderEllipse(obj, props);
        break;
      case 'path':
        this.renderPath(obj, props);
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
    const { offsetX, offsetY } = this.getAnchorOffset(obj.anchor, width, height);
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
        this.renderRect(obj, props);
        break;
      case 'text':
        this.renderText(obj, props);
        break;
      case 'image':
        this.renderImage(obj, props);
        break;
      case 'line':
        this.renderLine(obj, props);
        break;
      case 'circle':
        this.renderCircle(obj, props);
        break;
      case 'ellipse':
        this.renderEllipse(obj, props);
        break;
      case 'path':
        this.renderPath(obj, props);
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
   * Render a rectangle
   */
  private renderRect(obj: RectObject, props: any): void {
    // Use animated width/height if available, otherwise use object properties
    const width = props.width ?? obj.width;
    const height = props.height ?? obj.height;

    // Apply anchor offset
    const { offsetX, offsetY } = this.getAnchorOffset(obj.anchor, width, height);

    // Fill
    if (obj.fill) {
      this.ctx.fillStyle = obj.fill;
      this.ctx.fillRect(offsetX, offsetY, width, height);
    }

    // Stroke
    if (obj.stroke) {
      this.ctx.strokeStyle = obj.stroke;
      this.ctx.lineWidth = obj.strokeWidth ?? 1;
      this.ctx.strokeRect(offsetX, offsetY, width, height);
    }
  }

  /**
   * Render text
   */
  private renderText(obj: TextObject, props: any): void {
    const size = obj.size ?? 16;
    const font = obj.font ?? 'sans-serif';
    const color = obj.color ?? '#000000';
    const align = obj.align ?? 'left';

    // Set font properties
    this.ctx.font = `${size}px ${font}`;
    this.ctx.fillStyle = color;

    // Handle anchor point
    // For text, we need to measure it to calculate anchor offsets
    const metrics = this.ctx.measureText(obj.content);
    const textWidth = metrics.width;

    // Approximate text height based on font size
    const textHeight = size;

    // Calculate anchor offsets
    let offsetX = 0;
    let offsetY = 0;

    const anchor = obj.anchor ?? 'top-left';

    // Horizontal alignment based on anchor
    if (anchor.includes('left')) {
      this.ctx.textAlign = 'left';
      offsetX = 0;
    } else if (anchor.includes('center') || anchor === 'center') {
      this.ctx.textAlign = 'center';
      offsetX = 0;
    } else if (anchor.includes('right')) {
      this.ctx.textAlign = 'right';
      offsetX = 0;
    }

    // Vertical alignment based on anchor
    if (anchor.startsWith('top')) {
      this.ctx.textBaseline = 'top';
      offsetY = 0;
    } else if (anchor.includes('center') || anchor === 'center') {
      this.ctx.textBaseline = 'middle';
      offsetY = 0;
    } else if (anchor.startsWith('bottom')) {
      this.ctx.textBaseline = 'bottom';
      offsetY = 0;
    } else {
      // default to top
      this.ctx.textBaseline = 'top';
      offsetY = 0;
    }

    // Render the text
    this.ctx.fillText(obj.content, offsetX, offsetY);
  }

  /**
   * Render a line
   */
  private renderLine(obj: LineObject, props: any): void {
    // Use animated coordinates if available
    const x = props.x ?? obj.x ?? 0;
    const y = props.y ?? obj.y ?? 0;
    const x2 = props.x2 ?? obj.x2;
    const y2 = props.y2 ?? obj.y2;

    // Calculate relative end point
    // Since transforms already moved us to (x, y), we draw to (x2-x, y2-y)
    const dx = x2 - x;
    const dy = y2 - y;

    // Set line style
    this.ctx.strokeStyle = obj.stroke ?? '#000000';
    this.ctx.lineWidth = obj.strokeWidth ?? 1;

    // Draw line from (0, 0) to (dx, dy)
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(dx, dy);
    this.ctx.stroke();
  }

  /**
   * Render a circle
   */
  private renderCircle(obj: CircleObject, props: any): void {
    // Use animated radius if available
    const radius = props.radius ?? obj.radius;

    // Draw circle at (0, 0) since we've already translated to position
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, 2 * Math.PI);

    // Fill
    if (obj.fill) {
      this.ctx.fillStyle = obj.fill;
      this.ctx.fill();
    }

    // Stroke
    if (obj.stroke) {
      this.ctx.strokeStyle = obj.stroke;
      this.ctx.lineWidth = obj.strokeWidth ?? 1;
      this.ctx.stroke();
    }
  }

  /**
   * Render an ellipse
   */
  private renderEllipse(obj: EllipseObject, props: any): void {
    // Use animated radii if available
    const radiusX = props.radiusX ?? obj.radiusX;
    const radiusY = props.radiusY ?? obj.radiusY;

    // Draw ellipse at (0, 0) since we've already translated to position
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI);

    // Fill
    if (obj.fill) {
      this.ctx.fillStyle = obj.fill;
      this.ctx.fill();
    }

    // Stroke
    if (obj.stroke) {
      this.ctx.strokeStyle = obj.stroke;
      this.ctx.lineWidth = obj.strokeWidth ?? 1;
      this.ctx.stroke();
    }
  }

  /**
   * Render a path (custom shape using canvas path commands)
   */
  private renderPath(obj: PathObject, props: any): void {
    // Begin the path
    this.ctx.beginPath();

    // Execute each path command
    for (const command of obj.commands) {
      this.executePathCommand(command);
    }

    // Fill
    if (obj.fill) {
      this.ctx.fillStyle = obj.fill;
      this.ctx.fill();
    }

    // Stroke
    if (obj.stroke) {
      this.ctx.strokeStyle = obj.stroke;
      this.ctx.lineWidth = obj.strokeWidth ?? 1;
      this.ctx.stroke();
    }
  }

  /**
   * Execute a single path command
   */
  private executePathCommand(command: PathCommand): void {
    switch (command.type) {
      case 'moveTo':
        this.ctx.moveTo(command.x, command.y);
        break;
      case 'lineTo':
        this.ctx.lineTo(command.x, command.y);
        break;
      case 'closePath':
        this.ctx.closePath();
        break;
      case 'quadraticCurveTo':
        this.ctx.quadraticCurveTo(command.cpx, command.cpy, command.x, command.y);
        break;
      case 'bezierCurveTo':
        this.ctx.bezierCurveTo(command.cp1x, command.cp1y, command.cp2x, command.cp2y, command.x, command.y);
        break;
      case 'arc':
        this.ctx.arc(command.x, command.y, command.radius, command.startAngle, command.endAngle, command.counterclockwise);
        break;
      case 'arcTo':
        this.ctx.arcTo(command.x1, command.y1, command.x2, command.y2, command.radius);
        break;
    }
  }

  /**
   * Load and cache an image
   */
  private async loadImageIfNeeded(source: string): Promise<Image> {
    if (!this.imageCache.has(source)) {
      const image = await loadImage(source);
      this.imageCache.set(source, image);
    }
    return this.imageCache.get(source)!;
  }

  /**
   * Render an image
   */
  private renderImage(obj: ImageObject, props: any): void {
    // Images must be preloaded synchronously before rendering
    const image = this.imageCache.get(obj.source);
    if (!image) {
      console.warn(`Image not loaded: ${obj.source}`);
      return;
    }

    // Use animated width/height if available, otherwise use object properties or image dimensions
    const width = props.width ?? obj.width ?? image.width;
    const height = props.height ?? obj.height ?? image.height;

    // Apply anchor offset
    const { offsetX, offsetY } = this.getAnchorOffset(obj.anchor, width, height);

    // Draw image
    this.ctx.drawImage(image, offsetX, offsetY, width, height);
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
   * Get anchor offset for positioning
   */
  private getAnchorOffset(anchor: string = 'top-left', width: number, height: number): { offsetX: number; offsetY: number } {
    switch (anchor) {
      case 'top-left':
        return { offsetX: 0, offsetY: 0 };
      case 'top-center':
        return { offsetX: -width / 2, offsetY: 0 };
      case 'top-right':
        return { offsetX: -width, offsetY: 0 };
      case 'center-left':
        return { offsetX: 0, offsetY: -height / 2 };
      case 'center':
        return { offsetX: -width / 2, offsetY: -height / 2 };
      case 'center-right':
        return { offsetX: -width, offsetY: -height / 2 };
      case 'bottom-left':
        return { offsetX: 0, offsetY: -height };
      case 'bottom-center':
        return { offsetX: -width / 2, offsetY: -height };
      case 'bottom-right':
        return { offsetX: -width, offsetY: -height };
      default:
        return { offsetX: 0, offsetY: 0 };
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
