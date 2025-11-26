import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { preprocessAnimation } from '../preprocessor.js';
import { Renderer } from '../renderer.js';
import { getPixelFromPNG } from '../test-helpers.js';
import type {
  AnimationFile,
  SceneObject,
  SceneFile,
  Transition,
} from '../types.js';

describe('Scene Object Type', () => {
  describe('Type definitions', () => {
    it('should have SceneObject type with required properties', () => {
      // SceneObject should have type: 'scene' and source: string
      const scene: SceneObject = {
        type: 'scene',
        source: './intro.json',
      };

      expect(scene.type).toBe('scene');
      expect(scene.source).toBe('./intro.json');
    });

    it('should allow optional start property on SceneObject', () => {
      const scene: SceneObject = {
        type: 'scene',
        source: './intro.json',
        start: '2s',
      };

      expect(scene.start).toBe('2s');
    });

    it('should allow optional transition property on SceneObject', () => {
      const transition: Transition = {
        effect: 'fadeIn',
        duration: '0.5s',
      };

      const scene: SceneObject = {
        type: 'scene',
        source: './intro.json',
        transition: {
          in: transition,
          out: { effect: 'fadeOut' },
        },
      };

      expect(scene.transition?.in?.effect).toBe('fadeIn');
      expect(scene.transition?.out?.effect).toBe('fadeOut');
    });

    it('should have SceneFile interface with objects array', () => {
      const sceneFile: SceneFile = {
        objects: [
          { type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: '#FF0000' },
        ],
      };

      expect(sceneFile.objects).toHaveLength(1);
    });

    it('should allow optional duration on SceneFile', () => {
      const sceneFile: SceneFile = {
        duration: '5s',
        objects: [],
      };

      expect(sceneFile.duration).toBe('5s');
    });

    it('should allow optional animations on SceneFile', () => {
      const sceneFile: SceneFile = {
        objects: [
          { type: 'rect', id: 'box', x: 0, y: 0, width: 100, height: 100 },
        ],
        animations: [
          {
            target: 'box',
            property: 'x',
            keyframes: [
              { start: 0, value: 0 },
              { start: 30, value: 100 },
            ],
          },
        ],
      };

      expect(sceneFile.animations).toHaveLength(1);
    });
  });

  describe('Scene loading in preprocessor', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `scene-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should load and expand scene from external file', async () => {
      // Create a scene file
      const sceneFile: SceneFile = {
        objects: [
          { type: 'rect', id: 'box', x: 50, y: 50, width: 100, height: 100, fill: '#FF0000' },
        ],
      };
      await writeFile(join(tempDir, 'intro.json'), JSON.stringify(sceneFile));

      // Create main animation that references the scene
      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          {
            type: 'scene',
            source: './intro.json',
          } as SceneObject,
        ],
      };

      // Preprocess should expand the scene
      const processed = await preprocessAnimation(animation, tempDir);

      // The scene should be expanded into its objects
      expect(processed.objects).toHaveLength(1);
      expect(processed.objects[0].type).toBe('rect');
    });

    it('should namespace scene object IDs', async () => {
      const sceneFile: SceneFile = {
        objects: [
          { type: 'rect', id: 'box', x: 0, y: 0, width: 100, height: 100 },
        ],
      };
      await writeFile(join(tempDir, 'intro.json'), JSON.stringify(sceneFile));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          {
            type: 'scene',
            id: 'intro',
            source: './intro.json',
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);

      // Object IDs should be namespaced with scene ID
      expect(processed.objects[0].id).toBe('intro.box');
    });

    it('should offset scene animations by scene start time', async () => {
      const sceneFile: SceneFile = {
        objects: [
          { type: 'rect', id: 'box', x: 0, y: 0, width: 100, height: 100, fill: '#FF0000' },
        ],
        animations: [
          {
            target: 'box',
            property: 'x',
            keyframes: [
              { start: 0, value: 0 },
              { start: 30, value: 100 },
            ],
          },
        ],
      };
      await writeFile(join(tempDir, 'intro.json'), JSON.stringify(sceneFile));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 120 },
        objects: [
          {
            type: 'scene',
            id: 'intro',
            source: './intro.json',
            start: '1s', // 30 frames at 30fps
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);

      // Animation keyframes should be offset by scene start time
      const anims = processed.animations || [];
      expect(anims).toHaveLength(1);
      expect((anims[0] as any).keyframes[0].start).toBe(30); // 0 + 30 offset
      expect((anims[0] as any).keyframes[1].start).toBe(60); // 30 + 30 offset
    });

    it('should handle nested scenes', async () => {
      // Create inner scene
      const innerScene: SceneFile = {
        objects: [
          { type: 'text', id: 'label', content: 'Hello', x: 10, y: 10 },
        ],
      };
      await writeFile(join(tempDir, 'inner.json'), JSON.stringify(innerScene));

      // Create outer scene that references inner
      const outerScene: SceneFile = {
        objects: [
          {
            type: 'scene',
            id: 'nested',
            source: './inner.json',
          } as SceneObject,
        ],
      };
      await writeFile(join(tempDir, 'outer.json'), JSON.stringify(outerScene));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          {
            type: 'scene',
            id: 'outer',
            source: './outer.json',
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);

      // Should have the text object with nested namespace
      expect(processed.objects[0].id).toBe('outer.nested.label');
    });
  });

  describe('Duration-based visibility', () => {
    it('should not render scene before its start time', async () => {
      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 90 },
        objects: [
          {
            type: 'group',
            id: 'delayed',
            start: '1s', // Start at frame 30
            children: [
              { type: 'rect', x: 50, y: 50, width: 100, height: 100, fill: '#FF0000' },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // At frame 0, the group should not be visible
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 100, 100);
      expect(pixel0[3]).toBe(0); // Should be transparent

      // At frame 30, the group should be visible
      const buffer30 = await renderer.exportFrame(30);
      const pixel30 = await getPixelFromPNG(buffer30, 100, 100);
      expect(pixel30[0]).toBeGreaterThan(200); // Should be red
    });

    it('should not render scene after its duration ends', async () => {
      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 120 },
        objects: [
          {
            type: 'group',
            id: 'timed',
            start: '1s', // Start at frame 30
            duration: '1s', // Duration of 30 frames (ends at frame 60)
            children: [
              { type: 'rect', x: 50, y: 50, width: 100, height: 100, fill: '#FF0000' },
            ],
          },
        ],
      };

      const renderer = new Renderer(animation);

      // At frame 45, within duration, should be visible
      const buffer45 = await renderer.exportFrame(45);
      const pixel45 = await getPixelFromPNG(buffer45, 100, 100);
      expect(pixel45[0]).toBeGreaterThan(200); // Should be red

      // At frame 60, at end of duration, should still be visible
      const buffer60 = await renderer.exportFrame(60);
      const pixel60 = await getPixelFromPNG(buffer60, 100, 100);
      expect(pixel60[0]).toBeGreaterThan(200); // Should be red

      // At frame 61, after duration, should not be visible
      const buffer61 = await renderer.exportFrame(61);
      const pixel61 = await getPixelFromPNG(buffer61, 100, 100);
      expect(pixel61[3]).toBe(0); // Should be transparent
    });
  });

  describe('Transition type (renamed from GroupTransition)', () => {
    it('should use Transition type instead of GroupTransition', () => {
      // Transition should work the same as GroupTransition
      const transition: Transition = {
        effect: 'fadeIn',
        duration: '0.5s',
      };

      expect(transition.effect).toBe('fadeIn');
      expect(transition.duration).toBe('0.5s');
    });
  });
});
