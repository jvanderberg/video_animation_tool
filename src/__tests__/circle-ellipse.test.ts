import { describe, it, expect } from 'vitest';
import { Renderer } from '../renderer.js';
import type { AnimationFile } from '../types.js';

describe('Circle and Ellipse Rendering', () => {
  it('should render a circle with fill', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'circle',
          x: 100,
          y: 100,
          radius: 50,
          fill: '#FF0000',
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check center pixel (should be red)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Red
    expect(centerPixel[1]).toBe(0);   // Green
    expect(centerPixel[2]).toBe(0);   // Blue

    // Check pixel inside circle (should be red)
    const insidePixel = renderer.getPixel(130, 100);
    expect(insidePixel[0]).toBe(255); // Red

    // Check outside pixel (should be transparent)
    const outsidePixel = renderer.getPixel(160, 100);
    expect(outsidePixel[3]).toBeLessThan(50); // Alpha should be low
  });

  it('should render a circle with stroke', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'circle',
          x: 100,
          y: 100,
          radius: 50,
          stroke: '#0000FF',
          strokeWidth: 2,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check edge pixel (should be blue)
    const edgePixel = renderer.getPixel(150, 100);
    expect(edgePixel[2]).toBeGreaterThan(200); // Blue

    // Check center pixel (should be transparent - no fill)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[3]).toBe(0); // Alpha should be 0
  });

  it('should render an ellipse with fill', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'ellipse',
          x: 100,
          y: 100,
          radiusX: 80,
          radiusY: 40,
          fill: '#00FF00',
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

    // Check pixel inside ellipse horizontally (should be green)
    const hInsidePixel = renderer.getPixel(160, 100);
    expect(hInsidePixel[1]).toBe(255); // Green

    // Check pixel inside ellipse vertically (should be green)
    const vInsidePixel = renderer.getPixel(100, 120);
    expect(vInsidePixel[1]).toBe(255); // Green
  });

  it('should render an ellipse with stroke', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'ellipse',
          x: 100,
          y: 100,
          radiusX: 60,
          radiusY: 30,
          stroke: '#FF00FF',
          strokeWidth: 3,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Check edge pixel (should be magenta)
    const edgePixel = renderer.getPixel(160, 100);
    expect(edgePixel[0]).toBeGreaterThan(200); // Red
    expect(edgePixel[2]).toBeGreaterThan(200); // Blue

    // Check center pixel (should be transparent - no fill)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[3]).toBe(0); // Alpha should be 0
  });

  it('should animate circle radius', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 60 },
      objects: [
        {
          type: 'circle',
          id: 'growing-circle',
          x: 100,
          y: 100,
          radius: 10,
          fill: '#FF0000',
        },
      ],
      animations: [
            {
              target: 'growing-circle',
              property: 'radius',
              keyframes: [
                { frame: 0, value: 10 },
                { frame: 30, value: 50 },
              ],
            },
      ],
    };

    const renderer = new Renderer(animation);

    // At frame 0, radius should be 10
    renderer.renderFrame(0);
    let centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Center is red

    let closePixel = renderer.getPixel(115, 100);
    expect(closePixel[3]).toBeLessThan(50); // Should be outside at radius 10

    // At frame 30, radius should be 50
    renderer.renderFrame(30);
    centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Center is red

    closePixel = renderer.getPixel(140, 100);
    expect(closePixel[0]).toBeGreaterThan(200); // Should be inside at radius 50
  });

  it('should animate ellipse radii independently', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 60 },
      objects: [
        {
          type: 'ellipse',
          id: 'changing-ellipse',
          x: 100,
          y: 100,
          radiusX: 20,
          radiusY: 20,
          fill: '#0000FF',
        },
      ],
      animations: [
            {
              target: 'changing-ellipse',
              property: 'radiusX',
              keyframes: [
                { frame: 0, value: 20 },
                { frame: 30, value: 60 },
              ],
            },
            {
              target: 'changing-ellipse',
              property: 'radiusY',
              keyframes: [
                { frame: 0, value: 20 },
                { frame: 30, value: 30 },
              ],
            },
      ],
    };

    const renderer = new Renderer(animation);

    // At frame 0, should be roughly circular (20x20)
    renderer.renderFrame(0);
    let centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[2]).toBe(255); // Center is blue

    // At frame 30, should be wider (60x30)
    renderer.renderFrame(30);
    centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[2]).toBe(255); // Center is blue

    // Check horizontal extent (radiusX = 60)
    let hPixel = renderer.getPixel(150, 100);
    expect(hPixel[2]).toBeGreaterThan(200); // Should be blue

    // Check vertical extent (radiusY = 30)
    let vPixel = renderer.getPixel(100, 125);
    expect(vPixel[2]).toBeGreaterThan(200); // Should be blue
  });

  it('should apply transforms to circles', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'circle',
          x: 100,
          y: 100,
          radius: 30,
          fill: '#FFFF00',
          scale: 2, // Double size
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Center should be yellow
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Red
    expect(centerPixel[1]).toBe(255); // Green

    // With scale 2, effective radius is 60
    const farPixel = renderer.getPixel(155, 100);
    expect(farPixel[0]).toBeGreaterThan(200); // Should be yellow (or close due to antialiasing)
  });

  it('should apply transforms to ellipses with scaleX and scaleY', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'ellipse',
          x: 100,
          y: 100,
          radiusX: 40,
          radiusY: 20,
          fill: '#00FFFF',
          scaleX: 1.5,
          scaleY: 2,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Center should be cyan
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[1]).toBe(255); // Green
    expect(centerPixel[2]).toBe(255); // Blue

    // Effective radiusX = 40 * 1.5 = 60
    // Effective radiusY = 20 * 2 = 40
    const hPixel = renderer.getPixel(155, 100);
    expect(hPixel[1]).toBeGreaterThan(200); // Should be cyan

    const vPixel = renderer.getPixel(100, 135);
    expect(vPixel[1]).toBeGreaterThan(200); // Should be cyan
  });

  it('should handle circle with both fill and stroke', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'circle',
          x: 100,
          y: 100,
          radius: 40,
          fill: '#FFFFFF',
          stroke: '#000000',
          strokeWidth: 2,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Center should be white (fill)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Red
    expect(centerPixel[1]).toBe(255); // Green
    expect(centerPixel[2]).toBe(255); // Blue

    // Edge should have stroke color (black)
    const edgePixel = renderer.getPixel(140, 100);
    expect(edgePixel[0]).toBeLessThan(50); // Should be dark (black stroke)
  });

  it('should handle ellipse with both fill and stroke', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'ellipse',
          x: 100,
          y: 100,
          radiusX: 50,
          radiusY: 30,
          fill: '#FF8800',
          stroke: '#0088FF',
          strokeWidth: 3,
        },
      ],
    };

    const renderer = new Renderer(animation);
    renderer.renderFrame(0);

    // Center should be orange (fill)
    const centerPixel = renderer.getPixel(100, 100);
    expect(centerPixel[0]).toBe(255); // Red
    expect(centerPixel[1]).toBeGreaterThan(100); // Green

    // Edge should have stroke color (blue)
    const edgePixel = renderer.getPixel(150, 100);
    expect(edgePixel[2]).toBeGreaterThan(200); // Blue
  });

});
