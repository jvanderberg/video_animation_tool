import { describe, it, expect, beforeEach } from 'vitest';
import { preprocessAnimation, clearEffectsCache } from './preprocessor.js';
import type { AnimationFile, PropertyAnimation } from './types.js';

describe('Preprocessor', () => {
  beforeEach(() => {
    clearEffectsCache();
  });

  it('should pass through animation without sequences', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 60 },
      objects: [
        { type: 'rect', id: 'box', width: 50, height: 50 }
      ]
    };

    const result = await preprocessAnimation(animation);
    expect(result).toEqual(animation);
  });

  it('should pass through property animations unchanged', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 60 },
      objects: [
        { type: 'rect', id: 'box', width: 50, height: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'box',
          property: 'x',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 60, value: 100 }
          ]
        }]
      }]
    };

    const result = await preprocessAnimation(animation);
    expect(result.sequences).toEqual(animation.sequences);
  });

  it('should expand effect animation into property animations', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 60 },
      objects: [
        { type: 'text', id: 'title', content: 'Test', x: 50, y: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'title',
          effect: 'pop',
          startTime: 0.0
        }]
      }]
    };

    const result = await preprocessAnimation(animation);

    expect(result.sequences).toBeDefined();
    expect(result.sequences![0].animations).toBeDefined();

    const animations = result.sequences![0].animations as PropertyAnimation[];

    // Pop effect should expand into scale and opacity animations
    expect(animations.length).toBe(2);

    const scaleAnim = animations.find(a => a.property === 'scale');
    const opacityAnim = animations.find(a => a.property === 'opacity');

    expect(scaleAnim).toBeDefined();
    expect(opacityAnim).toBeDefined();

    // Check scale keyframes
    expect(scaleAnim!.keyframes).toHaveLength(2);
    expect(scaleAnim!.keyframes[0].frame).toBe(0);
    expect(scaleAnim!.keyframes[0].value).toBe(0);
    expect(scaleAnim!.keyframes[1].value).toBe(1);
    expect(scaleAnim!.keyframes[1].easing).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');

    // Check opacity keyframes
    expect(opacityAnim!.keyframes).toHaveLength(2);
    expect(opacityAnim!.keyframes[0].frame).toBe(0);
    expect(opacityAnim!.keyframes[0].value).toBe(0);
    expect(opacityAnim!.keyframes[1].value).toBe(1);
  });

  it('should convert startTime to frames based on fps', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 120 },
      objects: [
        { type: 'text', id: 'title', content: 'Test', x: 50, y: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'title',
          effect: 'pop',
          startTime: 1.0  // 1 second at 60fps = frame 60
        }]
      }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.sequences![0].animations as PropertyAnimation[];

    const scaleAnim = animations.find(a => a.property === 'scale');

    // Pop starts at 1.0 seconds = frame 60
    // Duration is 0.33 seconds = ~20 frames
    expect(scaleAnim!.keyframes[0].frame).toBe(60);
    expect(scaleAnim!.keyframes[1].frame).toBeGreaterThanOrEqual(79);
    expect(scaleAnim!.keyframes[1].frame).toBeLessThanOrEqual(80);
  });

  it('should handle mixed effect and property animations', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 120 },
      objects: [
        { type: 'text', id: 'title', content: 'Test', x: 50, y: 50 }
      ],
      sequences: [{
        animations: [
          {
            target: 'title',
            effect: 'pop',
            startTime: 0.0
          },
          {
            target: 'title',
            property: 'x',
            keyframes: [
              { frame: 0, value: 50 },
              { frame: 60, value: 150 }
            ]
          }
        ]
      }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.sequences![0].animations as PropertyAnimation[];

    // Should have 3 animations: scale, opacity (from pop), and x (original)
    expect(animations.length).toBe(3);

    const xAnim = animations.find(a => a.property === 'x');
    expect(xAnim).toBeDefined();
    expect(xAnim!.keyframes).toEqual([
      { frame: 0, value: 50 },
      { frame: 60, value: 150 }
    ]);
  });

  it('should throw error for unknown effect', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 60 },
      objects: [
        { type: 'text', id: 'title', content: 'Test', x: 50, y: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'title',
          effect: 'unknownEffect',
          startTime: 0.0
        }]
      }]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      "Effect 'unknownEffect' not found in effects library"
    );
  });

  it('should handle fadeOut effect correctly', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 120 },
      objects: [
        { type: 'rect', id: 'box', width: 50, height: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'box',
          effect: 'fadeOut',
          startTime: 1.0
        }]
      }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.sequences![0].animations as PropertyAnimation[];

    expect(animations.length).toBe(1);

    const opacityAnim = animations[0];
    expect(opacityAnim.property).toBe('opacity');
    expect(opacityAnim.keyframes[0].value).toBe(1);  // Start at full opacity
    expect(opacityAnim.keyframes[1].value).toBe(0);  // Fade to transparent
  });

  it('should handle effects with different fps', async () => {
    const animation30fps: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        { type: 'text', id: 'title', content: 'Test', x: 50, y: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'title',
          effect: 'pop',
          startTime: 0.0
        }]
      }]
    };

    const result30 = await preprocessAnimation(animation30fps);
    const animations30 = result30.sequences![0].animations as PropertyAnimation[];
    const scale30 = animations30.find(a => a.property === 'scale')!;

    // Pop duration is 0.33 seconds
    // At 30fps: 0.33 * 30 = ~10 frames
    const duration30 = scale30.keyframes[1].frame - scale30.keyframes[0].frame;
    expect(duration30).toBeGreaterThanOrEqual(9);
    expect(duration30).toBeLessThanOrEqual(10);

    const animation60fps: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 120 },
      objects: [
        { type: 'text', id: 'title', content: 'Test', x: 50, y: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'title',
          effect: 'pop',
          startTime: 0.0
        }]
      }]
    };

    const result60 = await preprocessAnimation(animation60fps);
    const animations60 = result60.sequences![0].animations as PropertyAnimation[];
    const scale60 = animations60.find(a => a.property === 'scale')!;

    // At 60fps: 0.33 * 60 = ~20 frames
    const duration60 = scale60.keyframes[1].frame - scale60.keyframes[0].frame;
    expect(duration60).toBeGreaterThanOrEqual(19);
    expect(duration60).toBeLessThanOrEqual(20);
  });

  it('should allow custom duration to override effect default duration', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 120 },
      objects: [
        { type: 'text', id: 'title', content: 'Test', x: 50, y: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'title',
          effect: 'pop',
          startTime: 0.0,
          duration: 0.6  // Override default 0.33s with 0.6s
        }]
      }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.sequences![0].animations as PropertyAnimation[];
    const scaleAnim = animations.find(a => a.property === 'scale')!;

    // Pop with custom duration 0.6s at 60fps = 36 frames
    const duration = scaleAnim.keyframes[scaleAnim.keyframes.length - 1].frame - scaleAnim.keyframes[0].frame;
    expect(duration).toBe(36);
  });

  it('should load effects from individual files', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 60, frames: 120 },
      objects: [
        { type: 'text', id: 'title', content: 'Test', x: 50, y: 50 }
      ],
      sequences: [{
        animations: [{
          target: 'title',
          effect: 'fadeIn',
          startTime: 0.0
        }]
      }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.sequences![0].animations as PropertyAnimation[];

    // FadeIn effect should load from effects/fadeIn.json
    expect(animations.length).toBe(1);
    expect(animations[0].property).toBe('opacity');
  });
});

