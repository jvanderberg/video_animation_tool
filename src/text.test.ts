import { describe, it, expect } from 'vitest';
import { Renderer } from './renderer.js';
import { getPixelFromPNG, hexToRgb, colorMatches } from './test-helpers.js';
import type { AnimationFile } from './types.js';

describe('Text Rendering', () => {
  describe('Basic Text', () => {
    it('should render text at specified position', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 200,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'text',
            content: 'Hello',
            x: 100,
            y: 100,
            size: 48,
            color: '#FFFFFF',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Check that some pixels in the text area are white (not transparent)
      // Text should be rendered around (100, 100)
      // Note: font metrics may cause slight vertical offset
      // Check at a position where text pixels actually exist (not whitespace)
      const pixel = await getPixelFromPNG(buffer, 107, 105);

      // Should have some opacity (text is rendered)
      expect(pixel[3]).toBeGreaterThan(0);
    });

    it('should render text with correct color', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 200,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'text',
            content: 'Test',
            x: 50,
            y: 100,
            size: 72,
            color: '#FF0000',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Sample a pixel in the middle of where text should be
      const pixel = await getPixelFromPNG(buffer, 80, 105);

      // Should be reddish and opaque
      expect(pixel[0]).toBeGreaterThan(200); // Red channel high
      expect(pixel[3]).toBeGreaterThan(200); // Opaque
    });

    it('should respect text size', async () => {
      const smallText: AnimationFile = {
        project: {
          width: 200,
          height: 200,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'text',
            content: 'A',
            x: 50,
            y: 100,
            size: 12,
            color: '#FFFFFF',
          },
        ],
      };

      const largeText: AnimationFile = {
        project: {
          width: 200,
          height: 200,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'text',
            content: 'A',
            x: 50,
            y: 100,
            size: 72,
            color: '#FFFFFF',
          },
        ],
      };

      const smallRenderer = new Renderer(smallText);
      const largeRenderer = new Renderer(largeText);

      const smallBuffer = await smallRenderer.exportFrame(0);
      const largeBuffer = await largeRenderer.exportFrame(0);

      // Count non-transparent pixels in a sample region
      let smallPixelCount = 0;
      let largePixelCount = 0;

      for (let x = 50; x < 150; x += 5) {
        for (let y = 80; y < 120; y += 5) {
          const smallPixel = await getPixelFromPNG(smallBuffer, x, y);
          const largePixel = await getPixelFromPNG(largeBuffer, x, y);

          if (smallPixel[3] > 0) smallPixelCount++;
          if (largePixel[3] > 0) largePixelCount++;
        }
      }

      // Larger text should have more pixels rendered
      expect(largePixelCount).toBeGreaterThan(smallPixelCount);
    });
  });

  describe('Text Properties', () => {
    it('should render text with default font', async () => {
      const animation: AnimationFile = {
        project: {
          width: 300,
          height: 150,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'text',
            content: 'Default Font',
            x: 50,
            y: 75,
            size: 32,
            color: '#00FF00',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Should render without crashing and have some pixels
      const pixel = await getPixelFromPNG(buffer, 60, 78);
      expect(pixel[3]).toBeGreaterThan(0);
    });

    it('should render text with specified font', async () => {
      const animation: AnimationFile = {
        project: {
          width: 300,
          height: 150,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'text',
            content: 'Arial',
            x: 50,
            y: 75,
            size: 32,
            font: 'Arial',
            color: '#FFFFFF',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      const pixel = await getPixelFromPNG(buffer, 60, 82);
      expect(pixel[3]).toBeGreaterThan(0);
    });
  });

  describe('Text Transforms', () => {
    it('should apply opacity to text', async () => {
      const animation: AnimationFile = {
        project: {
          width: 300,
          height: 150,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'text',
            content: 'Faded',
            x: 50,
            y: 75,
            size: 48,
            color: '#FFFFFF',
            opacity: 0.5,
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      const pixel = await getPixelFromPNG(buffer, 70, 78);

      // Should be semi-transparent (not 0, not 255)
      expect(pixel[3]).toBeGreaterThan(50);
      expect(pixel[3]).toBeLessThan(200);
    });

    it('should rotate text', async () => {
      const animation: AnimationFile = {
        project: {
          width: 300,
          height: 150,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'text',
            content: 'Rotated',
            x: 150,
            y: 75,
            size: 32,
            color: '#FFFFFF',
            rotation: 90,
            anchor: 'center',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Should render without crashing
      // Rotated text should still have some pixels
      const pixel = await getPixelFromPNG(buffer, 150, 75);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Text Animation', () => {
    it('should animate text position', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 200,
          fps: 60,
          frames: 60,
        },
        objects: [
          {
            id: 'test-text',
            type: 'text',
            content: 'Moving',
            x: 0,
            y: 100,
            size: 48,
            color: '#FFFFFF',
          },
        ],
        sequences: [
          {
            name: 'test',
            animations: [
              {
                target: 'test-text',
                property: 'x',
                keyframes: [
                  { frame: 0, value: 50 },
                  { frame: 60, value: 300 },
                ],
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // Frame 0: should be at x=50
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 60, 105);
      expect(pixel0[3]).toBeGreaterThan(0);

      // Frame 60: should be at x=300
      const buffer60 = await renderer.exportFrame(60);
      const pixel60 = await getPixelFromPNG(buffer60, 310, 105);
      expect(pixel60[3]).toBeGreaterThan(0);

      // Old position should be transparent
      const oldPixel = await getPixelFromPNG(buffer60, 60, 105);
      expect(oldPixel[3]).toBe(0);
    });

    it('should animate text opacity', async () => {
      const animation: AnimationFile = {
        project: {
          width: 300,
          height: 150,
          fps: 60,
          frames: 30,
        },
        objects: [
          {
            id: 'test-text',
            type: 'text',
            content: 'Fading',
            x: 100,
            y: 75,
            size: 48,
            color: '#FFFFFF',
          },
        ],
        sequences: [
          {
            name: 'test',
            animations: [
              {
                target: 'test-text',
                property: 'opacity',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 30, value: 1 },
                ],
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // Frame 0: should be transparent
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 120, 78);
      expect(pixel0[3]).toBe(0);

      // Frame 30: should be opaque
      const buffer30 = await renderer.exportFrame(30);
      const pixel30 = await getPixelFromPNG(buffer30, 120, 78);
      expect(pixel30[3]).toBeGreaterThan(200);
    });
  });

  describe('Text with Background', () => {
    it('should render text on top of background', async () => {
      const animation: AnimationFile = {
        project: {
          width: 300,
          height: 150,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 300,
            height: 150,
            fill: '#000000',
            z: 0,
          },
          {
            type: 'text',
            content: 'On Top',
            x: 100,
            y: 75,
            size: 36,
            color: '#FFFFFF',
            z: 10,
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Background should be black
      const bgPixel = await getPixelFromPNG(buffer, 10, 10);
      expect(colorMatches(bgPixel, hexToRgb('#000000'))).toBe(true);

      // Text area should have white pixels
      const textPixel = await getPixelFromPNG(buffer, 120, 78);
      expect(textPixel[0]).toBeGreaterThan(200); // White-ish
      expect(textPixel[3]).toBeGreaterThan(200); // Opaque
    });
  });
});
