import { describe, it, expect } from 'vitest';
import { Renderer } from './renderer.js';
import type { AnimationFile } from './types.js';

describe('Cubic Bezier Easing', () => {
  it('should support cubic-bezier string format', async () => {
    // Test with a bezier curve that differs significantly from linear
    // cubic-bezier(0.68, -0.55, 0.265, 1.55) creates a bounce effect
    const animation: AnimationFile = {
      project: { width: 200, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#FF0000',
          animations: [
            {
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 100, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // At frame 15 (25% through), this curve dips below 0 (goes negative)
    // So the box should not be visible at x=25 where linear would be
    renderer.renderFrame(15);
    const pixelAtLinear = renderer.getPixel(25, 5);
    expect(pixelAtLinear[0]).toBeLessThan(100); // Should NOT be red at linear position

    // At frame 40 (67% through), this curve overshoots above 1.0
    // Should be past x=100 where linear would be at x=67
    renderer.renderFrame(40);
    let foundRed = false;
    for (let x = 100; x < 150; x++) {
      const pixel = renderer.getPixel(x, 5);
      if (pixel[0] > 200) {
        foundRed = true;
        break;
      }
    }
    expect(foundRed).toBe(true); // Should overshoot past x=100
  });

  it('should support object format for cubic-bezier', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#00FF00',
          animations: [
            {
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                {
                  frame: 60,
                  value: 90,
                  easing: {
                    type: 'cubic-bezier',
                    points: [0.42, 0, 0.58, 1]
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // At frame 30 (50% through), should be around x=45
    renderer.renderFrame(30);
    const pixel = renderer.getPixel(45, 5);
    expect(pixel[1]).toBeGreaterThan(200); // Green channel should be high
  });

  it('should create overshoot effect with bezier values > 1', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#0000FF',
          animations: [
            {
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                // This curve overshoots (goes above 1.0)
                { frame: 60, value: 100, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // At some point during the animation, x should overshoot 100
    let maxX = 0;
    for (let frame = 0; frame <= 60; frame++) {
      renderer.renderFrame(frame);
      // Check pixels from 0 to 150 to find the box
      for (let x = 0; x < 150; x++) {
        const pixel = renderer.getPixel(x, 5);
        if (pixel[2] > 200) { // Blue channel
          maxX = Math.max(maxX, x);
        }
      }
    }

    // Should overshoot past 100
    expect(maxX).toBeGreaterThan(105);
  });

  it('should handle ease-in-out as cubic-bezier(0.42, 0, 0.58, 1)', async () => {
    const animationWithPreset: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 5,
          height: 5,
          fill: '#FF0000',
          animations: [
            {
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 90, easing: 'ease-in-out' }
              ]
            }
          ]
        }
      ]
    };

    const animationWithBezier: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 5,
          height: 5,
          fill: '#FF0000',
          animations: [
            {
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 90, easing: 'cubic-bezier(0.42, 0, 0.58, 1)' }
              ]
            }
          ]
        }
      ]
    };

    const renderer1 = new Renderer(animationWithPreset);
    const renderer2 = new Renderer(animationWithBezier);

    // Both should produce similar results at frame 30
    renderer1.renderFrame(30);
    renderer2.renderFrame(30);

    // Find x position in both
    let x1 = -1, x2 = -1;
    for (let x = 0; x < 100; x++) {
      if (renderer1.getPixel(x, 2)[0] > 200) x1 = x;
      if (renderer2.getPixel(x, 2)[0] > 200) x2 = x;
    }

    // Should be within a few pixels
    expect(Math.abs(x1 - x2)).toBeLessThan(5);
  });

  it('should interpolate with custom bezier curve for opacity', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fill: '#FFFFFF',
          opacity: 0,
          animations: [
            {
              property: 'opacity',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 1, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Check that opacity changes over time
    renderer.renderFrame(0);
    const pixel0 = renderer.getPixel(50, 50);

    renderer.renderFrame(30);
    const pixel30 = renderer.getPixel(50, 50);

    renderer.renderFrame(60);
    const pixel60 = renderer.getPixel(50, 50);

    // Should fade in
    expect(pixel0[3]).toBe(0); // Fully transparent
    expect(pixel30[3]).toBeGreaterThan(0); // Partially visible
    expect(pixel60[3]).toBe(255); // Fully opaque
  });

  it('should handle multiple keyframes with different bezier curves', async () => {
    const animation: AnimationFile = {
      project: { width: 300, height: 100, fps: 30, frames: 120 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#FF00FF',
          animations: [
            {
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 40, value: 100, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
                { frame: 80, value: 150, easing: 'cubic-bezier(0.42, 0, 1, 1)' },
                { frame: 120, value: 250, easing: 'cubic-bezier(0, 0, 0.58, 1)' }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Check that box moves through all positions
    renderer.renderFrame(0);
    let pixel = renderer.getPixel(5, 5);
    expect(pixel[0]).toBeGreaterThan(200); // At start

    renderer.renderFrame(40);
    pixel = renderer.getPixel(105, 5);
    expect(pixel[0]).toBeGreaterThan(200); // At first keyframe

    renderer.renderFrame(80);
    pixel = renderer.getPixel(152, 5);
    expect(pixel[0]).toBeGreaterThan(200); // At second keyframe
  });
});
