import { describe, it, expect, beforeEach } from 'vitest';
import { preprocessAnimation, clearEffectsCache } from '../preprocessor.js';
import type { AnimationFile, PropertyAnimation } from '../types.js';

describe('Percentage Values', () => {
  beforeEach(() => {
    clearEffectsCache();
  });

  it('should resolve percentage clip width based on object width', async () => {
    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 0,
          y: 0,
          width: 400,
          height: 200,
          fill: '#FF0000'
        }
      ],
      animations: [{
        target: 'box',
        property: 'clip.width',
        keyframes: [
          { frame: 0, value: 0 },
          { frame: 60, value: '100%' as any }
        ]
      }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.animations as PropertyAnimation[];
    const clipAnim = animations.find(a => a.property === 'clip.width')!;

    // 100% of width (400) should resolve to 400
    expect(clipAnim.keyframes[1].value).toBe(400);
  });

  it('should resolve percentage clip height based on object height', async () => {
    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 0,
          y: 0,
          width: 400,
          height: 200,
          fill: '#FF0000'
        }
      ],
      animations: [{
          target: 'box',
          property: 'clip.height',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 60, value: '100%' as any }
          ]
        }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.animations as PropertyAnimation[];
    const clipAnim = animations.find(a => a.property === 'clip.height')!;

    // 100% of height (200) should resolve to 200
    expect(clipAnim.keyframes[1].value).toBe(200);
  });

  it('should support partial percentages', async () => {
    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 0,
          y: 0,
          width: 400,
          height: 200,
          fill: '#FF0000'
        }
      ],
      animations: [{
          target: 'box',
          property: 'clip.width',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 30, value: '50%' as any },
            { frame: 60, value: '100%' as any }
          ]
        }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.animations as PropertyAnimation[];
    const clipAnim = animations.find(a => a.property === 'clip.width')!;

    expect(clipAnim.keyframes[1].value).toBe(200); // 50% of 400
    expect(clipAnim.keyframes[2].value).toBe(400); // 100% of 400
  });

  it('should keep pixel values unchanged', async () => {
    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 0,
          y: 0,
          width: 400,
          height: 200,
          fill: '#FF0000'
        }
      ],
      animations: [{
          target: 'box',
          property: 'clip.width',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 60, value: 250 }
          ]
        }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.animations as PropertyAnimation[];
    const clipAnim = animations.find(a => a.property === 'clip.width')!;

    // Pixel values should stay as-is
    expect(clipAnim.keyframes[1].value).toBe(250);
  });

  it('should resolve percentages in text objects based on measured width', async () => {
    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'text',
          id: 'title',
          content: 'HELLO WORLD',
          x: 960,
          y: 540,
          size: 72,
          color: '#FFFFFF'
        }
      ],
      animations: [{
          target: 'title',
          property: 'clip.width',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 60, value: '100%' as any }
          ]
        }]
    };

    const result = await preprocessAnimation(animation);
    const animations = result.animations as PropertyAnimation[];
    const clipAnim = animations.find(a => a.property === 'clip.width')!;

    // Should resolve to measured text width (will be > 0)
    expect(clipAnim.keyframes[1].value).toBeGreaterThan(0);
  });
});
