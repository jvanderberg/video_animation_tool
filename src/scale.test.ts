import { describe, it, expect } from 'vitest';
import { Renderer } from './renderer.js';
import { getPixelFromPNG } from './test-helpers.js';
import type { AnimationFile } from './types.js';

describe('Scale Transform', () => {
  it('should apply scale to rectangle', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          scale: 2.0,  // Double size
          fill: '#FF0000'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // At 2x scale, 40x40 rect becomes 80x80, centered at (100, 100)
    // So it spans from (60, 60) to (140, 140)

    // Center should be red
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[0]).toBeGreaterThan(200);

    // Edge at original boundary (120, 100) should still be red at 2x scale
    const edge = await getPixelFromPNG(buffer, 120, 100);
    expect(edge[0]).toBeGreaterThan(200);

    // Outside scaled boundary (145, 100) should be transparent
    const outside = await getPixelFromPNG(buffer, 145, 100);
    expect(outside[3]).toBe(0);
  });

  it('should apply scale to text', async () => {
    const animation: AnimationFile = {
      project: { width: 400, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'text',
          content: 'BIG',
          x: 200,
          y: 100,
          size: 48,
          anchor: 'center',
          scale: 2.0,
          color: '#00FF00'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // At 2x scale, text should be larger and extend further
    // Check that green pixels exist in a wider area
    const pixel = await getPixelFromPNG(buffer, 200, 100);
    expect(pixel[1]).toBeGreaterThan(0); // Some green should be present
  });

  it('should apply scale to groups', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'group',
          x: 100,
          y: 100,
          scale: 2.0,
          children: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              width: 20,
              height: 20,
              anchor: 'center',
              fill: '#0000FF'
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // Child is 20x20 centered at group origin (100, 100)
    // With 2x group scale, it becomes 40x40
    // Center should be blue
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[2]).toBeGreaterThan(200);

    // At distance 15 from center (within scaled 40x40), should be blue
    const inside = await getPixelFromPNG(buffer, 115, 100);
    expect(inside[2]).toBeGreaterThan(200);

    // Outside scaled boundary should be transparent
    const outside = await getPixelFromPNG(buffer, 125, 100);
    expect(outside[3]).toBe(0);
  });

  it('should animate scale property', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 60 },
      objects: [
        {
          id: 'box',
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          scale: 0,
          fill: '#FFFF00'
        }
      ],
      sequences: [
        {
          name: 'grow',
          animations: [
            {
              target: 'box',
              property: 'scale',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 2.0 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Frame 0: scale = 0 (invisible)
    const buffer0 = await renderer.exportFrame(0);
    const pixel0 = await getPixelFromPNG(buffer0, 100, 100);
    expect(pixel0[3]).toBe(0); // Transparent

    // Frame 30: scale = 1.0 (normal size, 40x40)
    const buffer30 = await renderer.exportFrame(30);
    const pixel30 = await getPixelFromPNG(buffer30, 100, 100);
    expect(pixel30[0]).toBeGreaterThan(200); // Yellow (red component)
    expect(pixel30[1]).toBeGreaterThan(200); // Yellow (green component)

    // Frame 60: scale = 2.0 (double size, 80x80)
    const buffer60 = await renderer.exportFrame(60);
    const pixel60 = await getPixelFromPNG(buffer60, 130, 100);
    expect(pixel60[0]).toBeGreaterThan(200); // Yellow at extended boundary
  });

  it('should handle small scale values', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          scale: 0.5,  // Half size
          fill: '#FF00FF'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // At 0.5x scale, 40x40 becomes 20x20, centered at (100, 100)
    // Spans from (90, 90) to (110, 110)

    // Center should be magenta
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[0]).toBeGreaterThan(200); // Red component
    expect(center[2]).toBeGreaterThan(200); // Blue component

    // Just inside boundary (105, 100) should be magenta
    const inside = await getPixelFromPNG(buffer, 105, 100);
    expect(inside[0]).toBeGreaterThan(200);

    // Just outside boundary (115, 100) should be transparent
    const outside = await getPixelFromPNG(buffer, 115, 100);
    expect(outside[3]).toBe(0);
  });

  it('should combine scale with rotation', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 20,
          anchor: 'center',
          scale: 2.0,
          rotation: 45,
          fill: '#00FFFF'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // With 2x scale and 45° rotation, the rect should be larger and rotated
    // Center should be cyan
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[1]).toBeGreaterThan(200); // Green component
    expect(center[2]).toBeGreaterThan(200); // Blue component
  });

  it('should use scale=1 as default', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          // No scale specified, should default to 1.0
          fill: '#FFFFFF'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // At default scale (1.0), rect should be normal 40x40
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[0]).toBe(255);
    expect(center[1]).toBe(255);
    expect(center[2]).toBe(255);

    // Edge at (120, 100) should be white (just inside boundary)
    const edge = await getPixelFromPNG(buffer, 119, 100);
    expect(edge[0]).toBe(255);

    // Outside at (125, 100) should be transparent
    const outside = await getPixelFromPNG(buffer, 125, 100);
    expect(outside[3]).toBe(0);
  });
});
