import { describe, it, expect } from 'vitest';
import { Renderer } from '../renderer.js';
import { getPixelFromPNG, hexToRgb, colorMatches } from '../test-helpers.js';
import type { AnimationFile } from '../types.js';

describe('Group Rendering', () => {
  describe('Basic Group', () => {
    it('should render children within a group', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'test-group',
            x: 0,
            y: 0,
            children: [
              {
                type: 'rect',
                x: 50,
                y: 50,
                width: 100,
                height: 100,
                fill: '#FF0000',
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Rectangle should be at (50, 50) from group origin
      const pixel = await getPixelFromPNG(buffer, 100, 100);
      expect(colorMatches(pixel, hexToRgb('#FF0000'))).toBe(true);
    });

    it('should render multiple children in a group', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'multi-group',
            x: 0,
            y: 0,
            children: [
              {
                type: 'rect',
                x: 50,
                y: 50,
                width: 50,
                height: 50,
                fill: '#FF0000',
              },
              {
                type: 'rect',
                x: 150,
                y: 50,
                width: 50,
                height: 50,
                fill: '#00FF00',
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Check red rectangle
      const redPixel = await getPixelFromPNG(buffer, 75, 75);
      expect(colorMatches(redPixel, hexToRgb('#FF0000'))).toBe(true);

      // Check green rectangle
      const greenPixel = await getPixelFromPNG(buffer, 175, 75);
      expect(colorMatches(greenPixel, hexToRgb('#00FF00'))).toBe(true);
    });
  });

  describe('Group Position Transform', () => {
    it('should apply group x,y offset to all children', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'offset-group',
            x: 100,
            y: 50,
            children: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                width: 50,
                height: 50,
                fill: '#FF0000',
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Rectangle at (0,0) in group should be at (100,50) in canvas
      const pixel = await getPixelFromPNG(buffer, 125, 75);
      expect(colorMatches(pixel, hexToRgb('#FF0000'))).toBe(true);

      // Check it's not at original position
      const originalPos = await getPixelFromPNG(buffer, 25, 25);
      expect(originalPos[3]).toBe(0); // Should be transparent
    });

    it('should combine group offset with child position', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'combined-group',
            x: 100,
            y: 100,
            children: [
              {
                type: 'rect',
                x: 20,
                y: 30,
                width: 40,
                height: 40,
                fill: '#0000FF',
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Group at (100,100) + child at (20,30) = (120,130)
      const pixel = await getPixelFromPNG(buffer, 140, 150);
      expect(colorMatches(pixel, hexToRgb('#0000FF'))).toBe(true);
    });
  });

  describe('Group Rotation', () => {
    it('should rotate all children around group origin', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 400,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'rotated-group',
            x: 200,
            y: 200,
            rotation: 90,
            children: [
              {
                type: 'rect',
                x: 50,
                y: 0,
                width: 40,
                height: 40,
                fill: '#FF0000',
                anchor: 'center',
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // After 90° rotation, child at (50,0) should be at approximately (0,50)
      // relative to group origin (200,200) = (200,250) on canvas
      const pixel = await getPixelFromPNG(buffer, 200, 250);
      expect(pixel[3]).toBeGreaterThan(0); // Some part of rotated rect
    });
  });

  describe('Group Opacity', () => {
    it('should apply group opacity to all children', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'transparent-group',
            x: 0,
            y: 0,
            opacity: 0.5,
            children: [
              {
                type: 'rect',
                x: 50,
                y: 50,
                width: 100,
                height: 100,
                fill: '#FFFFFF',
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      const pixel = await getPixelFromPNG(buffer, 100, 100);

      // Should be semi-transparent
      expect(pixel[3]).toBeGreaterThan(50);
      expect(pixel[3]).toBeLessThan(200);
    });

    it('should combine group and child opacity', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'double-transparent-group',
            x: 0,
            y: 0,
            opacity: 0.5,
            children: [
              {
                type: 'rect',
                x: 50,
                y: 50,
                width: 100,
                height: 100,
                fill: '#FFFFFF',
                opacity: 0.5,
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      const pixel = await getPixelFromPNG(buffer, 100, 100);

      // 0.5 * 0.5 = 0.25 opacity
      // Should be very transparent
      expect(pixel[3]).toBeGreaterThan(0);
      expect(pixel[3]).toBeLessThan(100);
    });
  });

  describe('Nested Groups', () => {
    it('should support nested groups', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'outer-group',
            x: 50,
            y: 50,
            children: [
              {
                type: 'group',
                id: 'inner-group',
                x: 30,
                y: 30,
                children: [
                  {
                    type: 'rect',
                    x: 20,
                    y: 20,
                    width: 40,
                    height: 40,
                    fill: '#FF0000',
                  },
                ],
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Outer (50,50) + Inner (30,30) + Rect (20,20) = (100,100)
      const pixel = await getPixelFromPNG(buffer, 120, 120);
      expect(colorMatches(pixel, hexToRgb('#FF0000'))).toBe(true);
    });

    it('should apply nested transforms correctly', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'outer-group',
            x: 100,
            y: 100,
            opacity: 0.8,
            children: [
              {
                type: 'group',
                id: 'inner-group',
                x: 50,
                y: 50,
                opacity: 0.5,
                children: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    width: 40,
                    height: 40,
                    fill: '#FFFFFF',
                  },
                ],
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Position: (100,100) + (50,50) = (150,150)
      // Opacity: 0.8 * 0.5 = 0.4
      const pixel = await getPixelFromPNG(buffer, 170, 170);

      expect(pixel[3]).toBeGreaterThan(0);
      expect(pixel[3]).toBeLessThan(150); // Should be quite transparent
    });
  });

  describe('Group Animation', () => {
    it('should animate group position and move all children', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 60,
        },
        objects: [
          {
            type: 'group',
            id: 'moving-group',
            x: 0,
            y: 100,
            children: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                width: 40,
                height: 40,
                fill: '#FF0000',
              },
            ],
          },
        ],
        animations: [
          {
            target: 'moving-group',
            property: 'x',
            keyframes: [
              { start: 0, value: 50 },
              { start: 60, value: 300 },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // Frame 0: group at x=50
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 70, 120);
      expect(pixel0[3]).toBeGreaterThan(0);

      // Frame 60: group at x=300
      const buffer60 = await renderer.exportFrame(60);
      const pixel60 = await getPixelFromPNG(buffer60, 320, 120);
      expect(pixel60[3]).toBeGreaterThan(0);

      // Old position should be empty
      const oldPixel = await getPixelFromPNG(buffer60, 70, 120);
      expect(oldPixel[3]).toBe(0);
    });

    it('should animate group rotation and rotate all children', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 400,
          fps: 60,
          frames: 60,
        },
        objects: [
          {
            type: 'group',
            id: 'rotating-group',
            x: 200,
            y: 200,
            children: [
              {
                type: 'rect',
                x: 50,
                y: 0,
                width: 30,
                height: 30,
                fill: '#FF0000',
                anchor: 'center',
              },
            ],
          },
        ],
        animations: [
          {
            target: 'rotating-group',
            property: 'rotation',
            keyframes: [
              { start: 0, value: 0 },
              { start: 60, value: 360 },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // Frame 0: child at (50,0) relative to (200,200) = (250,200)
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 245, 190);
      expect(pixel0[3]).toBeGreaterThan(0);

      // Frame 30: rotated 180°, child should be at approximately (150,200)
      const buffer30 = await renderer.exportFrame(30);
      const pixel30 = await getPixelFromPNG(buffer30, 150, 190);
      expect(pixel30[3]).toBeGreaterThan(0);
    });

    it('should animate group opacity and affect all children', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 30,
        },
        objects: [
          {
            type: 'group',
            id: 'fading-group',
            x: 0,
            y: 0,
            children: [
              {
                type: 'rect',
                x: 100,
                y: 100,
                width: 100,
                height: 100,
                fill: '#FFFFFF',
              },
            ],
          },
        ],
        animations: [
          {
            target: 'fading-group',
            property: 'opacity',
            keyframes: [
              { start: 0, value: 0 },
              { start: 30, value: 1 },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // Frame 0: should be transparent
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 150, 150);
      expect(pixel0[3]).toBe(0);

      // Frame 30: should be opaque
      const buffer30 = await renderer.exportFrame(30);
      const pixel30 = await getPixelFromPNG(buffer30, 150, 150);
      expect(pixel30[3]).toBeGreaterThan(200);
    });
  });

  describe('Group with Text', () => {
    it('should support text children in groups', async () => {
      const animation: AnimationFile = {
        project: {
          width: 400,
          height: 300,
          fps: 60,
          frames: 1,
        },
        objects: [
          {
            type: 'group',
            id: 'text-group',
            x: 100,
            y: 100,
            children: [
              {
                type: 'text',
                content: 'Grouped',
                x: 0,
                y: 0,
                size: 32,
                color: '#FFFFFF',
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      // Text should be offset by group position
      const pixel = await getPixelFromPNG(buffer, 110, 102);
      expect(pixel[3]).toBeGreaterThan(0);
    });
  });
});
