import { describe, it, expect } from 'vitest';
import { Renderer } from './renderer.js';
import type { AnimationFile } from './types.js';

describe('Path Rendering', () => {
  it('should render a triangle using lineTo commands', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 100,
          y: 50,
          commands: [
            { type: 'moveTo', x: 0, y: 0 },
            { type: 'lineTo', x: 50, y: 100 },
            { type: 'lineTo', x: -50, y: 100 },
            { type: 'closePath' },
          ],
          fill: '#FF0000',
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check center of triangle (should be red)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Red
    expect(centerPixel[1]).toBe(0);   // Green
    expect(centerPixel[2]).toBe(0);   // Blue

    // Check outside triangle (should be transparent)
    const outsidePixel = renderer.getPixel(20, 20);
    expect(outsidePixel[3]).toBe(0); // Alpha should be 0
  });

  it('should render a path with stroke only', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 50,
          y: 50,
          commands: [
            { type: 'moveTo', x: 0, y: 0 },
            { type: 'lineTo', x: 100, y: 0 },
            { type: 'lineTo', x: 100, y: 100 },
            { type: 'lineTo', x: 0, y: 100 },
            { type: 'closePath' },
          ],
          stroke: '#0000FF',
          strokeWidth: 3,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check edge pixel (should be blue)
    const edgePixel = renderer.getPixel(50, 50);
    expect(edgePixel[2]).toBeGreaterThan(200); // Blue

    // Check center pixel (should be transparent - no fill)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[3]).toBe(0); // Alpha should be 0
  });

  it('should render a path with both fill and stroke', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 100,
          y: 100,
          commands: [
            { type: 'moveTo', x: -30, y: -30 },
            { type: 'lineTo', x: 30, y: -30 },
            { type: 'lineTo', x: 30, y: 30 },
            { type: 'lineTo', x: -30, y: 30 },
            { type: 'closePath' },
          ],
          fill: '#FFFF00',
          stroke: '#000000',
          strokeWidth: 2,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check center pixel (should be yellow - fill)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Red
    expect(centerPixel[1]).toBe(255); // Green
    expect(centerPixel[2]).toBe(0);   // Blue

    // Check edge pixel (should be dark - black stroke)
    const edgePixel = renderer.getPixel(70, 100);
    expect(edgePixel[0]).toBeLessThan(50); // Should be dark
  });

  it('should render a star using lineTo commands', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 100,
          y: 100,
          commands: [
            { type: 'moveTo', x: 0, y: -50 },
            { type: 'lineTo', x: 15, y: -15 },
            { type: 'lineTo', x: 50, y: -10 },
            { type: 'lineTo', x: 20, y: 15 },
            { type: 'lineTo', x: 30, y: 50 },
            { type: 'lineTo', x: 0, y: 25 },
            { type: 'lineTo', x: -30, y: 50 },
            { type: 'lineTo', x: -20, y: 15 },
            { type: 'lineTo', x: -50, y: -10 },
            { type: 'lineTo', x: -15, y: -15 },
            { type: 'closePath' },
          ],
          fill: '#FFD700',
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check center pixel (should be gold)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Red
    expect(centerPixel[1]).toBeGreaterThan(200); // Green
    expect(centerPixel[2]).toBe(0);   // Blue
  });

  it('should render a bezier curve', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 50,
          y: 100,
          commands: [
            { type: 'moveTo', x: 0, y: 0 },
            { type: 'bezierCurveTo', cp1x: 50, cp1y: -50, cp2x: 50, cp2y: 50, x: 100, y: 0 },
          ],
          stroke: '#FF00FF',
          strokeWidth: 3,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check starting point
    const startPixel = renderer.getPixel(50, 100);
    expect(startPixel[0]).toBeGreaterThan(200); // Magenta (red component)
    expect(startPixel[2]).toBeGreaterThan(200); // Magenta (blue component)

    // Check end point
    const endPixel = renderer.getPixel(150, 100);
    expect(endPixel[0]).toBeGreaterThan(200); // Magenta
    expect(endPixel[2]).toBeGreaterThan(200); // Magenta
  });

  it('should render a quadratic curve', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 20,
          y: 100,
          commands: [
            { type: 'moveTo', x: 0, y: 0 },
            { type: 'quadraticCurveTo', cpx: 80, cpy: -80, x: 160, y: 0 },
          ],
          stroke: '#00FFFF',
          strokeWidth: 5,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check starting point (should have cyan stroke)
    const startPixel = renderer.getPixel(20, 100);
    expect(startPixel[1]).toBeGreaterThan(200); // Cyan (green component)
    expect(startPixel[2]).toBeGreaterThan(200); // Cyan (blue component)
  });

  it('should apply transforms to paths', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 100,
          y: 100,
          commands: [
            { type: 'moveTo', x: -20, y: -20 },
            { type: 'lineTo', x: 20, y: -20 },
            { type: 'lineTo', x: 20, y: 20 },
            { type: 'lineTo', x: -20, y: 20 },
            { type: 'closePath' },
          ],
          fill: '#00FF00',
          scale: 1.5,
          rotation: 45,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check center pixel (should be green)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(0);   // Red
    expect(centerPixel[1]).toBe(255); // Green
    expect(centerPixel[2]).toBe(0);   // Blue
  });

  it('should render arc command', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 100,
          y: 100,
          commands: [
            { type: 'moveTo', x: 0, y: 0 },
            { type: 'arc', x: 0, y: 0, radius: 40, startAngle: 0, endAngle: Math.PI },
            { type: 'closePath' },
          ],
          fill: '#FFA500',
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check center pixel (should be orange)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Red
    expect(centerPixel[1]).toBeGreaterThan(150); // Green (orange has some green)
    expect(centerPixel[2]).toBe(0);   // Blue
  });

  it('should render arcTo command with rounded corners', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 50,
          y: 50,
          commands: [
            { type: 'moveTo', x: 20, y: 0 },
            { type: 'lineTo', x: 80, y: 0 },
            { type: 'arcTo', x1: 100, y1: 0, x2: 100, y2: 20, radius: 20 },
            { type: 'lineTo', x: 100, y: 80 },
            { type: 'arcTo', x1: 100, y1: 100, x2: 80, y2: 100, radius: 20 },
            { type: 'lineTo', x: 20, y: 100 },
            { type: 'arcTo', x1: 0, y1: 100, x2: 0, y2: 80, radius: 20 },
            { type: 'lineTo', x: 0, y: 20 },
            { type: 'arcTo', x1: 0, y1: 0, x2: 20, y2: 0, radius: 20 },
            { type: 'closePath' },
          ],
          fill: '#8B4513',
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check center pixel (should be brown)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBeGreaterThan(100); // Red component
    expect(centerPixel[1]).toBeGreaterThan(50);  // Green component
  });

  it('should handle multiple disconnected paths in one object', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'path',
          x: 100,
          y: 100,
          commands: [
            // First shape - small circle
            { type: 'moveTo', x: -40, y: 0 },
            { type: 'arc', x: -40, y: 0, radius: 10, startAngle: 0, endAngle: 2 * Math.PI },
            // Second shape - small circle
            { type: 'moveTo', x: 40, y: 0 },
            { type: 'arc', x: 40, y: 0, radius: 10, startAngle: 0, endAngle: 2 * Math.PI },
          ],
          fill: '#FF1493',
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check left circle center (should be pink)
    const leftPixel = renderer.getPixel(60, 100);
    expect(leftPixel[0]).toBe(255); // Red

    // Check right circle center (should be pink)
    const rightPixel = renderer.getPixel(140, 100);
    expect(rightPixel[0]).toBe(255); // Red

    // Check between circles (should be transparent)
    const middlePixel = renderer.getPixel(100, 100);
    expect(middlePixel[3]).toBe(0); // Alpha should be 0
  });
});
