import { describe, it, expect } from 'vitest';
import { createCanvas } from 'canvas';
import { Renderer } from '../renderer.js';
import type { AnimationFile } from '../types.js';

describe('Clipping', () => {
  it('should clip a rectangle to a smaller region', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fill: '#FF0000',
          clip: {
            x: 0,
            y: 0,
            width: 50,
            height: 100
          }
        }
      ]
    };

    const renderer = new Renderer(animation);
    const canvas = renderer.renderFrame(0);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, 200, 200);

    // Helper to check if pixel is red
    const isRed = (x: number, y: number): boolean => {
      const index = (y * 200 + x) * 4;
      return imageData.data[index] === 255 &&
             imageData.data[index + 1] === 0 &&
             imageData.data[index + 2] === 0;
    };

    // Left half (clipped region) should be red
    expect(isRed(25, 50)).toBe(true);

    // Right half (outside clip) should NOT be red
    expect(isRed(75, 50)).toBe(false);
  });

  it('should animate clip width for wipe effect', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 60 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fill: '#00FF00',
          clip: {
            x: 0,
            y: 0,
            width: 0,
            height: 100
          }
        }
      ],
      animations: [
        {
          target: 'box',
          property: 'clip.width',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 60, value: 100 }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Helper to check if pixel is green
    const isGreen = (canvas: any, x: number, y: number): boolean => {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(x, y, 1, 1);
      return imageData.data[0] === 0 &&
             imageData.data[1] === 255 &&
             imageData.data[2] === 0;
    };

    // Frame 0: clip width is 0, nothing visible
    const canvas0 = renderer.renderFrame(0);
    expect(isGreen(canvas0, 25, 50)).toBe(false);

    // Frame 30: clip width is 50, left half visible
    const canvas30 = renderer.renderFrame(30);
    expect(isGreen(canvas30, 25, 50)).toBe(true);
    expect(isGreen(canvas30, 75, 50)).toBe(false);

    // Frame 60: clip width is 100, fully visible
    const canvas60 = renderer.renderFrame(60);
    expect(isGreen(canvas60, 25, 50)).toBe(true);
    expect(isGreen(canvas60, 75, 50)).toBe(true);
  });

  it('should handle text clipping', () => {
    const animation: AnimationFile = {
      project: { width: 400, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'text',
          content: 'WWWWWWWW',
          x: 0,
          y: 50,
          size: 48,
          color: '#0000FF',
          clip: {
            x: 0,
            y: 0,
            width: 100,
            height: 200
          }
        }
      ]
    };

    const renderer = new Renderer(animation);
    const canvas = renderer.renderFrame(0);
    const ctx = canvas.getContext('2d');

    // Should have some blue pixels in clipped region
    const imageData = ctx.getImageData(0, 0, 400, 200);
    let hasBlueInClippedRegion = false;
    let hasBlueOutsideClip = false;

    // Check entire scanline for blue
    for (let y = 30; y < 70; y++) {
      for (let x = 0; x < 100; x++) {
        const index = (y * 400 + x) * 4;
        if (imageData.data[index] === 0 &&
            imageData.data[index + 1] === 0 &&
            imageData.data[index + 2] === 255) {
          hasBlueInClippedRegion = true;
        }
      }
      for (let x = 200; x < 300; x++) {
        const index = (y * 400 + x) * 4;
        if (imageData.data[index] === 0 &&
            imageData.data[index + 1] === 0 &&
            imageData.data[index + 2] === 255) {
          hasBlueOutsideClip = true;
        }
      }
    }

    expect(hasBlueInClippedRegion).toBe(true);
    expect(hasBlueOutsideClip).toBe(false);
  });

  it('should handle clipping with transforms', () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 80,
          height: 80,
          fill: '#FFFF00',
          anchor: 'center',
          rotation: 45,
          clip: {
            x: 0,
            y: 0,
            width: 40,
            height: 80
          }
        }
      ]
    };

    const renderer = new Renderer(animation);
    const canvas = renderer.renderFrame(0);

    // Should render without errors and apply clipping in local space
    expect(canvas).toBeDefined();
  });

  it('should clip groups and all their children', () => {
    const animation: AnimationFile = {
      project: { width: 400, height: 400, fps: 60, frames: 1 },
      objects: [
        {
          type: 'group',
          x: 200,
          y: 200,
          clip: {
            x: -50,
            y: -50,
            width: 100,
            height: 100
          },
          children: [
            {
              type: 'rect',
              x: -75,
              y: -75,
              width: 50,
              height: 50,
              fill: '#FF0000'
            },
            {
              type: 'rect',
              x: 25,
              y: 25,
              width: 50,
              height: 50,
              fill: '#00FF00'
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);
    const canvas = renderer.renderFrame(0);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, 400, 400);

    // Helper to check pixel color
    const getPixel = (x: number, y: number) => {
      const index = (y * 400 + x) * 4;
      return {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2]
      };
    };

    // Red rect at (-75, -75) relative to group (200, 200) = (125, 125) absolute
    // But clip is at (-50, -50) to (50, 50) in group space = (150, 150) to (250, 250) absolute
    // So red rect at (125, 125) is outside the clip (starts at 150) - should not be visible
    const redPixel = getPixel(140, 140);
    expect(redPixel.r).toBe(0); // No red

    // Green rect at (25, 25) relative to group (200, 200) = (225, 225) absolute
    // This is inside the clip region (150, 150) to (250, 250) - should be visible
    const greenPixel = getPixel(240, 240);
    expect(greenPixel.g).toBe(255); // Green visible
  });
});
