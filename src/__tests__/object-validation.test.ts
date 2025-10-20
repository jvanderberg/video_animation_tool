import { describe, it, expect } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import type { AnimationFile } from '../types.js';

describe('Object Property Validation', () => {
  describe('Dimension Validation', () => {
    it('should reject negative width on rect', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box', width: -100, height: 100, fill: '#FF0000' }
        ]
      };

      await expect(preprocessAnimation(animation)).rejects.toThrow(
        /width.*cannot be negative/i
      );
    });

    it('should accept zero width on rect', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box', width: 0, height: 100, fill: '#FF0000' }
        ]
      };

      await expect(preprocessAnimation(animation)).resolves.toBeDefined();
    });

    it('should reject negative height on rect', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box', width: 100, height: -50, fill: '#FF0000' }
        ]
      };

      await expect(preprocessAnimation(animation)).rejects.toThrow(
        /height.*cannot be negative/i
      );
    });

    it('should reject negative radius on circle', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'circle', id: 'circle', radius: -50, fill: '#FF0000' }
        ]
      };

      await expect(preprocessAnimation(animation)).rejects.toThrow(
        /radius.*cannot be negative/i
      );
    });

    it('should accept zero radius on circle', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'circle', id: 'circle', radius: 0, fill: '#FF0000' }
        ]
      };

      await expect(preprocessAnimation(animation)).resolves.toBeDefined();
    });

    it('should reject negative radiusX on ellipse', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'ellipse', id: 'ellipse', radiusX: -50, radiusY: 30, fill: '#FF0000' }
        ]
      };

      await expect(preprocessAnimation(animation)).rejects.toThrow(
        /radiusX.*cannot be negative/i
      );
    });

    it('should reject negative radiusY on ellipse', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'ellipse', id: 'ellipse', radiusX: 50, radiusY: -30, fill: '#FF0000' }
        ]
      };

      await expect(preprocessAnimation(animation)).rejects.toThrow(
        /radiusY.*cannot be negative/i
      );
    });

    it('should accept valid positive dimensions', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box', width: 100, height: 50, fill: '#FF0000' },
          { type: 'circle', id: 'circle', radius: 25, fill: '#00FF00' },
          { type: 'ellipse', id: 'ellipse', radiusX: 50, radiusY: 30, fill: '#0000FF' }
        ]
      };

      await expect(preprocessAnimation(animation)).resolves.toBeDefined();
    });
  });

  describe('Opacity Validation', () => {
    it('should reject opacity greater than 1', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000', opacity: 1.5 }
        ]
      };

      await expect(preprocessAnimation(animation)).rejects.toThrow(
        /opacity.*must be between 0 and 1/i
      );
    });

    it('should reject negative opacity', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000', opacity: -0.5 }
        ]
      };

      await expect(preprocessAnimation(animation)).rejects.toThrow(
        /opacity.*must be between 0 and 1/i
      );
    });

    it('should accept opacity 0', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000', opacity: 0 }
        ]
      };

      await expect(preprocessAnimation(animation)).resolves.toBeDefined();
    });

    it('should accept opacity 1', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000', opacity: 1 }
        ]
      };

      await expect(preprocessAnimation(animation)).resolves.toBeDefined();
    });

    it('should accept valid opacity values', async () => {
      const animation: AnimationFile = {
        project: { width: 800, height: 600, fps: 30 },
        objects: [
          { type: 'rect', id: 'box1', width: 100, height: 100, fill: '#FF0000', opacity: 0.5 },
          { type: 'rect', id: 'box2', width: 100, height: 100, fill: '#00FF00', opacity: 0.25 },
          { type: 'rect', id: 'box3', width: 100, height: 100, fill: '#0000FF', opacity: 0.75 }
        ]
      };

      await expect(preprocessAnimation(animation)).resolves.toBeDefined();
    });
  });
});
