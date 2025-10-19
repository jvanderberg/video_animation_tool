import { describe, it, expect, beforeEach } from 'vitest';
import { Renderer } from '../renderer.js';
import { preprocessAnimation, clearEffectsCache } from '../preprocessor.js';
import type { AnimationFile } from '../types.js';

describe('Wipe Effect', () => {
  beforeEach(() => {
    clearEffectsCache();
  });

  it('should fully reveal a rectangle with wipe effect', async () => {
    const animation: AnimationFile = {
      project: { width: 400, height: 400, fps: 30, frames: 30 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 100,
          y: 100,
          width: 200,
          height: 100,
          fill: '#FF0000',
          clip: {
            x: 0,
            y: 0,
            width: 0,
            height: 100
          }
        }
      ],
      sequences: [{
        animations: [{
          target: 'box',
          effect: 'wipe',
          start: 0,
          duration: '1s'  // 1 second = 30 frames at 30fps
        }]
      }]
    };

    const processed = await preprocessAnimation(animation);
    const renderer = new Renderer(processed);

    // Helper to check if pixel is red
    const isRed = (canvas: any, x: number, y: number): boolean => {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(x, y, 1, 1);
      return imageData.data[0] === 255 &&
             imageData.data[1] === 0 &&
             imageData.data[2] === 0;
    };

    // Frame 0: clip width is 0, nothing visible
    const canvas0 = renderer.renderFrame(0);
    expect(isRed(canvas0, 110, 150)).toBe(false); // Left side should not be visible

    // Frame 15: clip width should be ~100 (50%), left half visible
    const canvas15 = renderer.renderFrame(15);
    expect(isRed(canvas15, 110, 150)).toBe(true);  // Left side visible
    expect(isRed(canvas15, 290, 150)).toBe(false); // Right side not yet visible

    // Frame 30: clip width should be 200 (100%), fully visible
    const canvas30 = renderer.renderFrame(30);
    expect(isRed(canvas30, 110, 150)).toBe(true);  // Left side visible
    expect(isRed(canvas30, 290, 150)).toBe(true);  // Right side visible
  });

  it('should fully reveal center-anchored text with wipe effect', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 400, fps: 30, frames: 30 },
      objects: [
        {
          type: 'text',
          id: 'title',
          content: 'HELLO WORLD',
          x: 400,
          y: 200,
          anchor: 'center',
          size: 72,
          color: '#0000FF',
          clip: {
            x: 0,  // Start from left edge in natural object space
            y: 0,
            width: 0,
            height: "100%" as any  // Full height
          }
        }
      ],
      sequences: [{
        animations: [{
          target: 'title',
          effect: 'wipe',
          start: 0,
          duration: '1s'  // 1 second = 30 frames at 30fps
        }]
      }]
    };

    const processed = await preprocessAnimation(animation);
    const renderer = new Renderer(processed);

    // Helper to count blue pixels
    const countBluePixels = (canvas: any): number => {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 800, 400);
      let count = 0;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0 &&
            imageData.data[i + 1] === 0 &&
            imageData.data[i + 2] === 255) {
          count++;
        }
      }
      return count;
    };

    // Frame 0: no text visible
    const canvas0 = renderer.renderFrame(0);
    expect(countBluePixels(canvas0)).toBe(0);

    // Frame 10: some text visible
    const canvas10 = renderer.renderFrame(10);
    const pixels10 = countBluePixels(canvas10);
    expect(pixels10).toBeGreaterThan(0);

    // Frame 30: full text visible (should have many more pixels than early frame)
    const canvas30 = renderer.renderFrame(30);
    const pixels30 = countBluePixels(canvas30);
    expect(pixels30).toBeGreaterThan(pixels10 * 1.5);

    // Text should be substantially revealed at the end
    expect(pixels30).toBeGreaterThan(5000); // Reasonable threshold for "HELLO WORLD"
  });
});
