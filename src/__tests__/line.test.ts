import { describe, it, expect } from 'vitest';
import { Renderer } from '../renderer.js';
import { getPixelFromPNG } from '../test-helpers.js';
import type { AnimationFile } from '../types.js';

describe('Line Rendering', () => {
  it('should render a horizontal line', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'line',
          x: 50,
          y: 100,
          x2: 150,
          y2: 100,
          stroke: '#FF0000',
          strokeWidth: 2
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // Check pixels along the line
    const left = await getPixelFromPNG(buffer, 50, 100);
    expect(left[0]).toBeGreaterThan(200); // Red

    const middle = await getPixelFromPNG(buffer, 100, 100);
    expect(middle[0]).toBeGreaterThan(200); // Red

    const nearRight = await getPixelFromPNG(buffer, 148, 100);
    expect(nearRight[0]).toBeGreaterThan(200); // Red

    // Check pixel above line (should be transparent)
    const above = await getPixelFromPNG(buffer, 100, 95);
    expect(above[3]).toBe(0);
  });

  it('should render a vertical line', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'line',
          x: 100,
          y: 50,
          x2: 100,
          y2: 150,
          stroke: '#00FF00',
          strokeWidth: 2
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // Check pixels along the line
    const top = await getPixelFromPNG(buffer, 100, 50);
    expect(top[1]).toBeGreaterThan(200); // Green

    const middle = await getPixelFromPNG(buffer, 100, 100);
    expect(middle[1]).toBeGreaterThan(200); // Green

    const nearBottom = await getPixelFromPNG(buffer, 100, 148);
    expect(nearBottom[1]).toBeGreaterThan(200); // Green
  });

  it('should render a diagonal line', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'line',
          x: 50,
          y: 50,
          x2: 150,
          y2: 150,
          stroke: '#0000FF',
          strokeWidth: 3
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // Check pixels along the diagonal
    const start = await getPixelFromPNG(buffer, 50, 50);
    expect(start[2]).toBeGreaterThan(200); // Blue

    const middle = await getPixelFromPNG(buffer, 100, 100);
    expect(middle[2]).toBeGreaterThan(200); // Blue

    const nearEnd = await getPixelFromPNG(buffer, 148, 148);
    expect(nearEnd[2]).toBeGreaterThan(200); // Blue
  });

  it('should respect strokeWidth', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'line',
          x: 100,
          y: 50,
          x2: 100,
          y2: 150,
          stroke: '#FFFFFF',
          strokeWidth: 10
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // With strokeWidth=10, line should be visible 5px on each side
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[0]).toBe(255); // White

    const offset4 = await getPixelFromPNG(buffer, 104, 100);
    expect(offset4[0]).toBe(255); // Still white

    // Outside stroke width
    const offset7 = await getPixelFromPNG(buffer, 107, 100);
    expect(offset7[3]).toBe(0); // Transparent
  });

  it('should apply opacity to line', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'line',
          x: 50,
          y: 100,
          x2: 150,
          y2: 100,
          stroke: '#FF0000',
          strokeWidth: 2,
          opacity: 0.5
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    const pixel = await getPixelFromPNG(buffer, 100, 100);
    // Should have red color but partial alpha
    expect(pixel[0]).toBeGreaterThan(100);
    expect(pixel[3]).toBeLessThan(255);
    expect(pixel[3]).toBeGreaterThan(0);
  });

  it('should animate line position', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 60 },
      objects: [
        {
          id: 'moving-line',
          type: 'line',
          x: 50,
          y: 100,
          x2: 150,
          y2: 100,
          stroke: '#00FFFF',
          strokeWidth: 2
        }
      ],
      sequences: [
        {
          name: 'move',
          animations: [
            {
              target: 'moving-line',
              property: 'y',
              keyframes: [
                { frame: 0, value: 50 },
                { frame: 60, value: 150 }
              ]
            },
            {
              target: 'moving-line',
              property: 'y2',
              keyframes: [
                { frame: 0, value: 50 },
                { frame: 60, value: 150 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Frame 0: line at y=50
    const buffer0 = await renderer.exportFrame(0);
    const pixel0 = await getPixelFromPNG(buffer0, 100, 50);
    expect(pixel0[1]).toBeGreaterThan(200); // Cyan (green component)

    // Frame 30: line at y=100
    const buffer30 = await renderer.exportFrame(30);
    const pixel30 = await getPixelFromPNG(buffer30, 100, 100);
    expect(pixel30[1]).toBeGreaterThan(200);

    // Frame 60: line at y=150
    const buffer60 = await renderer.exportFrame(60);
    const pixel60 = await getPixelFromPNG(buffer60, 100, 150);
    expect(pixel60[1]).toBeGreaterThan(200);
  });

  it('should apply rotation to line', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'line',
          x: 100,
          y: 100,
          x2: 150,
          y2: 100,
          rotation: 90, // Rotate 90 degrees
          stroke: '#FFFF00',
          strokeWidth: 2
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // After 90° rotation, horizontal line becomes vertical
    // Line rotates around (x, y) = (100, 100)
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[0]).toBeGreaterThan(200); // Yellow (red component)
    expect(center[1]).toBeGreaterThan(200); // Yellow (green component)
  });

  it('should use default stroke color if not specified', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'line',
          x: 50,
          y: 100,
          x2: 150,
          y2: 100,
          strokeWidth: 2
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // Should render with default color (black)
    const pixel = await getPixelFromPNG(buffer, 100, 100);
    expect(pixel[3]).toBeGreaterThan(0); // Should be visible
  });
});
