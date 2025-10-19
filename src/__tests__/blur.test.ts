import { describe, it, expect } from 'vitest';
import { Renderer } from '../renderer.js';
import type { AnimationFile } from '../types.js';

describe('Blur Effect', () => {
  it('should apply blur filter to an object', () => {
    const animation: AnimationFile = {
      project: { width: 400, height: 300, fps: 30, frames: 1 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          fill: '#FF0000',
          blur: 5
        }
      ]
    };

    const renderer = new Renderer(animation);
    const canvas = renderer.renderFrame(0);

    // Blur should make edges softer - check pixels near the edge
    const ctx = canvas.getContext('2d');
    const edgeData = ctx.getImageData(99, 150, 1, 1); // Just outside left edge

    // With blur, pixels outside the rect should have some red bleed
    expect(edgeData.data[0]).toBeGreaterThan(0);
  });

  it('should animate blur over time', () => {
    const animation: AnimationFile = {
      project: { width: 400, height: 300, fps: 30, frames: 30 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          fill: '#0000FF',
          blur: 0
        }
      ],
      sequences: [{
        animations: [{
          target: 'box',
          property: 'blur',
          keyframes: [
            { frame: 0, value: 0 },
            { frame: 30, value: 10 }
          ]
        }]
      }]
    };

    const renderer = new Renderer(animation);

    // Frame 0: no blur
    const canvas0 = renderer.renderFrame(0);
    const ctx0 = canvas0.getContext('2d');
    const edge0 = ctx0.getImageData(99, 150, 1, 1);
    expect(edge0.data[2]).toBe(0); // No blue outside rect

    // Frame 30: with blur
    const canvas30 = renderer.renderFrame(30);
    const ctx30 = canvas30.getContext('2d');
    const edge30 = ctx30.getImageData(99, 150, 1, 1);
    expect(edge30.data[2]).toBeGreaterThan(0); // Blue bleed with blur
  });

  it('should support blur with opacity for fade effect', () => {
    const animation: AnimationFile = {
      project: { width: 400, height: 300, fps: 30, frames: 1 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          fill: '#00FF00',
          blur: 5,
          opacity: 0.5
        }
      ]
    };

    const renderer = new Renderer(animation);
    const canvas = renderer.renderFrame(0);

    // Should render without errors
    expect(canvas).toBeDefined();
  });
});
