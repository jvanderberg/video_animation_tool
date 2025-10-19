import { describe, it, expect } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import type { AnimationFile } from '../types.js';

describe('Required Property Validation', () => {
  it('should reject rect without width', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'rect', id: 'box', height: 100, fill: '#FF0000' } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /rect.*must have.*width/i
    );
  });

  it('should reject rect without height', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'rect', id: 'box', width: 100, fill: '#FF0000' } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /rect.*must have.*height/i
    );
  });

  it('should reject circle without radius', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'circle', id: 'circle', fill: '#FF0000' } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /circle.*must have.*radius/i
    );
  });

  it('should reject ellipse without radiusX', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'ellipse', id: 'ellipse', radiusY: 30, fill: '#FF0000' } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /ellipse.*must have.*radiusX/i
    );
  });

  it('should reject ellipse without radiusY', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'ellipse', id: 'ellipse', radiusX: 50, fill: '#FF0000' } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /ellipse.*must have.*radiusY/i
    );
  });

  it('should reject text without content', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'text', id: 'text', color: '#FFFFFF' } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /text.*must have.*content/i
    );
  });

  it('should reject image without src', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'image', id: 'img', width: 100, height: 100 } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /image.*must have.*src/i
    );
  });

  it('should reject line without x2', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'line', id: 'line', y2: 100 } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /line.*must have.*x2/i
    );
  });

  it('should reject line without y2', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'line', id: 'line', x2: 100 } as any
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /line.*must have.*y2/i
    );
  });

  it('should accept valid objects with all required properties', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' },
        { type: 'circle', id: 'circle', radius: 50, fill: '#00FF00' },
        { type: 'ellipse', id: 'ellipse', radiusX: 50, radiusY: 30, fill: '#0000FF' },
        { type: 'text', id: 'text', content: 'Hello', color: '#FFFFFF' },
        { type: 'line', id: 'line', x2: 100, y2: 100, stroke: '#000000' }
      ]
    };

    await expect(preprocessAnimation(animation)).resolves.toBeDefined();
  });

  it('should validate required properties in nested groups', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        {
          type: 'group',
          children: [
            { type: 'rect', id: 'box', height: 100, fill: '#FF0000' } as any
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /rect.*must have.*width/i
    );
  });
});
