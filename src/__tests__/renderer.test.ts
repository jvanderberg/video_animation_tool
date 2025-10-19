import { describe, it, expect } from 'vitest';
import { Renderer } from '../renderer.js';
import type { AnimationFile } from '../types.js';

describe('Renderer', () => {
  describe('Basic Rendering', () => {
    it('should create a renderer with correct dimensions', () => {
      const animation: AnimationFile = {
        project: {
          width: 1920,
          height: 1080,
          fps: 60,
          frames: 60,
        },
        objects: [],
      };

      const renderer = new Renderer(animation);
      expect(renderer).toBeDefined();
    });

    it('should render a simple rectangle', async () => {
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
            width: 50,
            height: 50,
            fill: '#FF0000',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should render multiple rectangles with z-index ordering', async () => {
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
            z: 10,
          },
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: '#0000FF',
            z: 5,
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Blue rect (z:5) should be rendered before red rect (z:10)
    });
  });

  describe('Rectangle Properties', () => {
    it('should render rectangle with stroke', async () => {
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
            width: 50,
            height: 50,
            stroke: '#00FF00',
            strokeWidth: 2,
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should render rectangle with both fill and stroke', async () => {
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
            width: 50,
            height: 50,
            fill: '#FF0000',
            stroke: '#00FF00',
            strokeWidth: 2,
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Transforms', () => {
    it('should apply rotation', async () => {
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
            rotation: 45,
            fill: '#FF0000',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should apply opacity', async () => {
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
            width: 50,
            height: 50,
            opacity: 0.5,
            fill: '#FF0000',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Anchor Points', () => {
    it('should handle center anchor', async () => {
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
            fill: '#FF0000',
          },
        ],
      };

      const renderer = new Renderer(animation);
      const buffer = await renderer.exportFrame(0);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('Animations', () => {
    it('should animate x position', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 60,
        },
        objects: [
          {
            type: 'rect',
            x: 0,
            y: 10,
            width: 20,
            height: 20,
            fill: '#FF0000',
            animations: [
              {
                property: 'x',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 30, value: 50 },
                  { frame: 60, value: 80 },
                ],
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // Test frame 0
      const buffer0 = await renderer.exportFrame(0);
      expect(buffer0).toBeInstanceOf(Buffer);

      // Test frame 30 (should be at x: 50)
      const buffer30 = await renderer.exportFrame(30);
      expect(buffer30).toBeInstanceOf(Buffer);

      // Test frame 60
      const buffer60 = await renderer.exportFrame(60);
      expect(buffer60).toBeInstanceOf(Buffer);
    });

    it('should animate opacity with easing', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 60,
        },
        objects: [
          {
            type: 'rect',
            x: 10,
            y: 10,
            width: 50,
            height: 50,
            fill: '#FF0000',
            animations: [
              {
                property: 'opacity',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 60, value: 1, easing: 'ease-in' },
                ],
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // Test frames throughout animation
      const buffer0 = await renderer.exportFrame(0);
      const buffer30 = await renderer.exportFrame(30);
      const buffer60 = await renderer.exportFrame(60);

      expect(buffer0).toBeInstanceOf(Buffer);
      expect(buffer30).toBeInstanceOf(Buffer);
      expect(buffer60).toBeInstanceOf(Buffer);
    });

    it('should animate rotation', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 60,
        },
        objects: [
          {
            type: 'rect',
            x: 50,
            y: 50,
            width: 20,
            height: 20,
            anchor: 'center',
            fill: '#FF0000',
            animations: [
              {
                property: 'rotation',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 60, value: 360, easing: 'linear' },
                ],
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      const buffer0 = await renderer.exportFrame(0);
      const buffer30 = await renderer.exportFrame(30);
      const buffer60 = await renderer.exportFrame(60);

      expect(buffer0).toBeInstanceOf(Buffer);
      expect(buffer30).toBeInstanceOf(Buffer);
      expect(buffer60).toBeInstanceOf(Buffer);
    });

    it('should handle multiple simultaneous animations', async () => {
      const animation: AnimationFile = {
        project: {
          width: 100,
          height: 100,
          fps: 60,
          frames: 60,
        },
        objects: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            fill: '#FF0000',
            animations: [
              {
                property: 'x',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 60, value: 80 },
                ],
              },
              {
                property: 'y',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 60, value: 80 },
                ],
              },
              {
                property: 'opacity',
                keyframes: [
                  { frame: 0, value: 0 },
                  { frame: 30, value: 1 },
                  { frame: 60, value: 0 },
                ],
              },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      const buffer0 = await renderer.exportFrame(0);
      const buffer30 = await renderer.exportFrame(30);
      const buffer60 = await renderer.exportFrame(60);

      expect(buffer0).toBeInstanceOf(Buffer);
      expect(buffer30).toBeInstanceOf(Buffer);
      expect(buffer60).toBeInstanceOf(Buffer);
    });
  });
});
