import { describe, it, expect, beforeAll } from 'vitest';
import { Renderer } from '../renderer.js';
import type { AnimationFile } from '../types.js';
import { createCanvas } from 'canvas';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Image Rendering', () => {
  let testImagePath: string;

  beforeAll(async () => {
    // Create a test image (50x50 red square)
    const canvas = createCanvas(50, 50);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 50, 50);

    // Save to temp directory
    const tempDir = join(tmpdir(), 'animation-tool-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });
    testImagePath = join(tempDir, 'test-image.png');
    await writeFile(testImagePath, canvas.toBuffer('image/png'));
  });

  it('should render an image at its natural size', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'image',
          source: testImagePath,
          x: 75,
          y: 75,
        },
      ],
    };

    const renderer = new Renderer(animation);
    await renderer.preloadImages();
    renderer.renderFrame(0);

    // Check that a pixel in the image area is red
    const pixel = renderer.getPixel(100, 100);
    expect(pixel[0]).toBe(255); // Red
    expect(pixel[1]).toBe(0);   // Green
    expect(pixel[2]).toBe(0);   // Blue
  });

  it('should render an image with custom width and height', async () => {
    const animation: AnimationFile = {
      project: { width: 300, height: 300, fps: 30, frames: 1 },
      objects: [
        {
          type: 'image',
          source: testImagePath,
          x: 100,
          y: 100,
          width: 100,
          height: 100,
        },
      ],
    };

    const renderer = new Renderer(animation);
    await renderer.preloadImages();
    renderer.renderFrame(0);

    // Check that a pixel in the center of the scaled image is red
    const pixel = renderer.getPixel(150, 150);
    expect(pixel[0]).toBe(255); // Red
  });

  it('should render an image with center anchor', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'image',
          source: testImagePath,
          x: 100,
          y: 100,
          anchor: 'center',
        },
      ],
    };

    const renderer = new Renderer(animation);
    await renderer.preloadImages();
    renderer.renderFrame(0);

    // With center anchor at (100, 100) and 50x50 image,
    // image should span from (75, 75) to (125, 125)
    const pixel = renderer.getPixel(100, 100);
    expect(pixel[0]).toBe(255); // Red
  });

  it('should animate image width and height', async () => {
    const animation: AnimationFile = {
      project: { width: 300, height: 300, fps: 30, frames: 60 },
      objects: [
        {
          type: 'image',
          id: 'growing-image',
          source: testImagePath,
          x: 100,
          y: 100,
          width: 50,
          height: 50,
        },
      ],
      sequences: [
        {
          name: 'grow',
          animations: [
            {
              target: 'growing-image',
              property: 'width',
              keyframes: [
                { frame: 0, value: 50 },
                { frame: 30, value: 100 },
              ],
            },
            {
              target: 'growing-image',
              property: 'height',
              keyframes: [
                { frame: 0, value: 50 },
                { frame: 30, value: 100 },
              ],
            },
          ],
        },
      ],
    };

    const renderer = new Renderer(animation);
    await renderer.preloadImages();

    // At frame 0, should be 50x50
    renderer.renderFrame(0);
    let pixel = renderer.getPixel(125, 125);
    expect(pixel[0]).toBe(255); // Inside image

    let outside = renderer.getPixel(155, 155);
    expect(outside[0]).toBe(0); // Outside image

    // At frame 30, should be 100x100
    renderer.renderFrame(30);
    pixel = renderer.getPixel(150, 150);
    expect(pixel[0]).toBe(255); // Inside image
  });

  it('should apply transforms to images', async () => {
    const animation: AnimationFile = {
      project: { width: 300, height: 300, fps: 30, frames: 1 },
      objects: [
        {
          type: 'image',
          source: testImagePath,
          x: 100,
          y: 100,
          scale: 2, // Double size
          anchor: 'center',
        },
      ],
    };

    const renderer = new Renderer(animation);
    await renderer.preloadImages();
    renderer.renderFrame(0);

    // With scale 2 and center anchor, 50x50 image becomes 100x100
    // centered at (100, 100), so spans from (50, 50) to (150, 150)
    const pixel = renderer.getPixel(100, 100);
    expect(pixel[0]).toBe(255); // Red
  });

  it('should handle opacity on images', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 30, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          fill: '#0000FF', // Blue background
        },
        {
          type: 'image',
          source: testImagePath,
          x: 75,
          y: 75,
          opacity: 0.5,
        },
      ],
    };

    const renderer = new Renderer(animation);
    await renderer.preloadImages();
    renderer.renderFrame(0);

    // The image should be blended with the background
    const pixel = renderer.getPixel(100, 100);
    // Should be a mix of red and blue (not pure red or pure blue)
    expect(pixel[0]).toBeGreaterThan(0); // Has some red
    expect(pixel[2]).toBeGreaterThan(0); // Has some blue
    expect(pixel[0]).toBeLessThan(255); // Not fully red
  });
});
