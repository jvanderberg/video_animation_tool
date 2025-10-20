import { describe, it, expect } from 'vitest';
import { Renderer } from '../renderer.js';
import { getPixelFromPNG, hexToRgb, colorMatches } from '../test-helpers.js';
import type { AnimationFile } from '../types.js';

describe('Renderer - Pixel Validation', () => {
  describe('Rectangle Position', () => {
    it('should render a rectangle at the correct position', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'rect',
            x: 20,
            y: 30,
            width: 40,
            height: 25,
            fill: '#FF0000',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Test pixel inside the rectangle (center)
      const centerX = 20 + 20; // x + width/2 = 40
      const centerY = 30 + 12; // y + height/2 = 42
      const insidePixel = await getPixelFromPNG(buffer, centerX, centerY);
      expect(colorMatches(insidePixel, hexToRgb('#FF0000'))).toBe(true);

      // Test pixel outside the rectangle (should be transparent)
      const outsidePixel = await getPixelFromPNG(buffer, 5, 5);
      expect(outsidePixel[3]).toBe(0); // Alpha should be 0 (transparent)
    });

    it('should handle top-left anchor correctly', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'rect',
            x: 10,
            y: 10,
            width: 20,
            height: 20,
            anchor: 'top-left',
            fill: '#00FF00',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Top-left corner should be at (10, 10)
      const pixel = await getPixelFromPNG(buffer, 15, 15);
      expect(colorMatches(pixel, hexToRgb('#00FF00'))).toBe(true);
    });

    it('should handle center anchor correctly', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'rect',
            x: 50,
            y: 50,
            width: 20,
            height: 20,
            anchor: 'center',
            fill: '#0000FF',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // With center anchor at (50,50) and 20x20 size,
      // the rect should span from (40,40) to (60,60)
      const centerPixel = await getPixelFromPNG(buffer, 50, 50);
      expect(colorMatches(centerPixel, hexToRgb('#0000FF'))).toBe(true);

      // Check corner
      const cornerPixel = await getPixelFromPNG(buffer, 45, 45);
      expect(colorMatches(cornerPixel, hexToRgb('#0000FF'))).toBe(true);
    });
  });

  describe('Rectangle Color', () => {
    it('should render correct fill color', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: '#FFAA33',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      const pixel = await getPixelFromPNG(buffer, 50, 50);
      expect(colorMatches(pixel, hexToRgb('#FFAA33'))).toBe(true);
    });
  });

  describe('Z-Index Layering', () => {
    it('should render objects in correct z-index order', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: '#FF0000',
            z: 10, // Should be on top
          },
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: '#0000FF',
            z: 5, // Should be below
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Center pixel should be red (top layer)
      const pixel = await getPixelFromPNG(buffer, 50, 50);
      expect(colorMatches(pixel, hexToRgb('#FF0000'))).toBe(true);
    });
  });

  describe('Animation Position', () => {
    it('should interpolate x position correctly', async () => {
      const animation: AnimationFile = {
        project: {
          width: 200,
          height: 100,
          fps: 60,
          frames: 60,
        },
        objects: [
          {
            id: 'test-rect',
            type: 'rect',
            x: 0,
            y: 40,
            width: 20,
            height: 20,
            fill: '#FF0000',
          },
        ],
        animations: [
              {
                target: 'test-rect',
                property: 'x',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 60, value: 180 },
                ],
              },
        ],
      };

      const renderer = new Renderer(animation);

      // Frame 0: x should be 0
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 10, 50); // center of rect at x=0
      expect(colorMatches(pixel0, hexToRgb('#FF0000'))).toBe(true);

      // Frame 30: x should be 90 (halfway)
      const buffer30 = await renderer.exportFrame(30);
      const pixel30 = await getPixelFromPNG(buffer30, 100, 50); // center at x=90
      expect(colorMatches(pixel30, hexToRgb('#FF0000'))).toBe(true);

      // Frame 60: x should be 180
      const buffer60 = await renderer.exportFrame(60);
      const pixel60 = await getPixelFromPNG(buffer60, 190, 50); // center at x=180
      expect(colorMatches(pixel60, hexToRgb('#FF0000'))).toBe(true);

      // Verify old position is now transparent
      const oldPos = await getPixelFromPNG(buffer60, 10, 50);
      expect(oldPos[3]).toBe(0); // Should be transparent
    });

    it('should interpolate y position correctly', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 200,
          fps: 60,
          frames: 40,
        },
        objects: [
          {
            id: 'test-rect',
            type: 'rect',
            x: 40,
            y: 0,
            width: 20,
            height: 20,
            fill: '#00FF00',
          },
        ],
        animations: [
              {
                target: 'test-rect',
                property: 'y',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 40, value: 160 },
                ],
              },
        ],
      };

      const renderer = new Renderer(animation);

      // Frame 0: y should be 0
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 50, 10);
      expect(colorMatches(pixel0, hexToRgb('#00FF00'))).toBe(true);

      // Frame 20: y should be 80
      const buffer20 = await renderer.exportFrame(20);
      const pixel20 = await getPixelFromPNG(buffer20, 50, 90);
      expect(colorMatches(pixel20, hexToRgb('#00FF00'))).toBe(true);

      // Frame 40: y should be 160
      const buffer40 = await renderer.exportFrame(40);
      const pixel40 = await getPixelFromPNG(buffer40, 50, 170);
      expect(colorMatches(pixel40, hexToRgb('#00FF00'))).toBe(true);
    });
  });

  describe('Opacity Animation', () => {
    it('should handle opacity values correctly', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 30,
        },
        objects: [
          {
            id: 'test-rect',
            type: 'rect',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: '#FF0000',
          },
        ],
        animations: [
              {
                target: 'test-rect',
                property: 'opacity',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 30, value: 1 },
                ],
              },
        ],
      };

      const renderer = new Renderer(animation);

      // Frame 0: should be fully transparent
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 50, 50);
      expect(pixel0[3]).toBe(0); // Alpha = 0

      // Frame 30: should be fully opaque
      const buffer30 = await renderer.exportFrame(30);
      const pixel30 = await getPixelFromPNG(buffer30, 50, 50);
      expect(pixel30[3]).toBe(255); // Alpha = 255

      // Frame 15: should be about 50% opacity
      const buffer15 = await renderer.exportFrame(15);
      const pixel15 = await getPixelFromPNG(buffer15, 50, 50);
      // Alpha should be around 127-128 (50% of 255)
      expect(pixel15[3]).toBeGreaterThan(100);
      expect(pixel15[3]).toBeLessThan(155);
    });
  });

  describe('Background', () => {
    it('should have transparent background by default', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 1,
        },
        objects: [],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      const pixel = await getPixelFromPNG(buffer, 50, 50);
      expect(pixel[3]).toBe(0); // Alpha should be 0 (transparent)
    });

    it('should render background rectangle', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: '#000000',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      const pixel = await getPixelFromPNG(buffer, 50, 50);
      expect(colorMatches(pixel, hexToRgb('#000000'))).toBe(true);
      expect(pixel[3]).toBe(255); // Should be opaque
    });
  });
});
