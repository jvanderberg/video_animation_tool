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
  GroupObject,
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

    it('should wrap scene in group with scene ID', async () => {
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

      // Scene should be wrapped in a group with the scene ID
      expect(processed.objects[0].type).toBe('group');
      expect(processed.objects[0].id).toBe('intro');
      // Child object should have its original ID (group provides namespace)
      const group = processed.objects[0] as GroupObject;
      expect(group.children[0].id).toBe('box');
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
              { start: '1s', value: 100 },  // 30 frames
            ],
          },
        ],
      };
      await writeFile(join(tempDir, 'offset-test.json'), JSON.stringify(sceneFile));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 120 },
        objects: [
          {
            type: 'scene',
            id: 'intro',
            source: './offset-test.json',
            start: '1s', // 30 frames at 30fps
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);

      // Animation keyframes should be offset by scene start time (30 frames)
      // Scene animation: 0→30 becomes 30→60
      const anims = processed.animations || [];
      expect(anims).toHaveLength(1);
      // Target should include the group path
      expect((anims[0] as any).target).toBe('intro.box');
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

      // Outer scene becomes a group with id='outer'
      expect(processed.objects[0].type).toBe('group');
      expect(processed.objects[0].id).toBe('outer');

      // Inner scene becomes a nested group with id='nested'
      const outerGroup = processed.objects[0] as GroupObject;
      expect(outerGroup.children[0].type).toBe('group');
      expect(outerGroup.children[0].id).toBe('nested');

      // The text is inside the nested group
      const innerGroup = outerGroup.children[0] as GroupObject;
      expect(innerGroup.children[0].type).toBe('text');
      expect(innerGroup.children[0].id).toBe('label');
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

  describe('Error handling', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `scene-error-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should give clear error for non-existent scene file', async () => {
      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'missing', source: './does-not-exist.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/not found/i);
      // Should NOT say "invalid" since file doesn't exist
      await expect(preprocessAnimation(animation, tempDir)).rejects.not.toThrow(/invalid/i);
    });

    it('should give clear error for invalid JSON in scene file', async () => {
      await writeFile(join(tempDir, 'bad.json'), '{ this is not valid json }');

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'bad', source: './bad.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/invalid json/i);
    });

    it('should include scene path in error message', async () => {
      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'missing', source: './my-scene.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/my-scene\.json/);
    });

    it('should error when scene file has no objects array', async () => {
      await writeFile(join(tempDir, 'no-objects.json'), JSON.stringify({ duration: '5s' }));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'bad', source: './no-objects.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/objects/i);
    });

    it('should error when scene file objects is not an array', async () => {
      await writeFile(join(tempDir, 'objects-not-array.json'), JSON.stringify({ objects: 'not an array' }));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'bad', source: './objects-not-array.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/objects.*array/i);
    });

    it('should error when scene file has null objects', async () => {
      await writeFile(join(tempDir, 'null-objects.json'), JSON.stringify({ objects: null }));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'bad', source: './null-objects.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/objects/i);
    });
  });

  describe('Circular reference detection', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `scene-circular-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should detect scene referencing itself (A → A)', async () => {
      // Scene A references itself
      const sceneA: SceneFile = {
        objects: [
          { type: 'scene', id: 'self', source: './a.json' } as SceneObject,
        ],
      };
      await writeFile(join(tempDir, 'a.json'), JSON.stringify(sceneA));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'a', source: './a.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/circular/i);
    });

    it('should detect two scenes referencing each other (A → B → A)', async () => {
      // Scene A references B
      const sceneA: SceneFile = {
        objects: [
          { type: 'scene', id: 'b', source: './b.json' } as SceneObject,
        ],
      };
      await writeFile(join(tempDir, 'a.json'), JSON.stringify(sceneA));

      // Scene B references A
      const sceneB: SceneFile = {
        objects: [
          { type: 'scene', id: 'a', source: './a.json' } as SceneObject,
        ],
      };
      await writeFile(join(tempDir, 'b.json'), JSON.stringify(sceneB));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'a', source: './a.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/circular/i);
    });

    it('should detect chain of three (A → B → C → A)', async () => {
      const sceneA: SceneFile = {
        objects: [
          { type: 'scene', id: 'b', source: './b.json' } as SceneObject,
        ],
      };
      await writeFile(join(tempDir, 'a.json'), JSON.stringify(sceneA));

      const sceneB: SceneFile = {
        objects: [
          { type: 'scene', id: 'c', source: './c.json' } as SceneObject,
        ],
      };
      await writeFile(join(tempDir, 'b.json'), JSON.stringify(sceneB));

      const sceneC: SceneFile = {
        objects: [
          { type: 'scene', id: 'a', source: './a.json' } as SceneObject,
        ],
      };
      await writeFile(join(tempDir, 'c.json'), JSON.stringify(sceneC));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          { type: 'scene', id: 'a', source: './a.json' } as SceneObject,
        ],
      };

      await expect(preprocessAnimation(animation, tempDir)).rejects.toThrow(/circular/i);
    });
  });

  describe('Scene transitions', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `scene-transition-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should apply transition.in effect when scene starts', async () => {
      // Create a scene with a visible rect
      const sceneFile: SceneFile = {
        objects: [
          { type: 'rect', id: 'box', x: 100, y: 100, width: 50, height: 50, fill: '#FF0000' },
        ],
      };
      await writeFile(join(tempDir, 'transition-in.json'), JSON.stringify(sceneFile));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          {
            type: 'scene',
            id: 'test',
            source: './transition-in.json',
            start: '0s',
            transition: {
              in: { effect: 'fadeIn', duration: '0.5s' },
            },
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);
      const renderer = new Renderer(processed);

      // At frame 0, fadeIn should just be starting (opacity near 0)
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 100, 100);
      expect(pixel0[3]).toBeLessThan(50); // Should be mostly transparent

      // At frame 15 (0.5s fadeIn complete), should be fully visible
      const buffer15 = await renderer.exportFrame(15);
      const pixel15 = await getPixelFromPNG(buffer15, 100, 100);
      expect(pixel15[3]).toBeGreaterThan(200); // Should be mostly opaque
    });

    it('should apply transition.out effect at end of scene duration', async () => {
      // Create a scene with duration and visible rect
      const sceneFile: SceneFile = {
        duration: '1s', // 30 frames
        objects: [
          { type: 'rect', id: 'box', x: 100, y: 100, width: 50, height: 50, fill: '#00FF00', opacity: 1 },
        ],
      };
      await writeFile(join(tempDir, 'transition-out.json'), JSON.stringify(sceneFile));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          {
            type: 'scene',
            id: 'test',
            source: './transition-out.json',
            start: '0s',
            transition: {
              out: { effect: 'fadeOut', duration: '0.5s' },
            },
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);
      const renderer = new Renderer(processed);

      // At frame 15 (middle of scene), should be fully visible
      const buffer15 = await renderer.exportFrame(15);
      const pixel15 = await getPixelFromPNG(buffer15, 100, 100);
      expect(pixel15[3]).toBe(255); // Fully opaque

      // At frame 29 (just before end, during fadeOut), should be fading
      const buffer29 = await renderer.exportFrame(29);
      const pixel29 = await getPixelFromPNG(buffer29, 100, 100);
      expect(pixel29[3]).toBeLessThan(200); // Should be fading out
    });
  });

  describe('Scene effect animations', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `scene-effect-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should complete fadeOut animation in scene (object becomes transparent)', async () => {
      // Create a scene with a fadeOut animation
      // The bug: fadeOut doesn't complete - object stays at ~10% opacity
      const sceneFile: SceneFile = {
        duration: '2s',  // 60 frames at 30fps
        objects: [
          {
            type: 'rect',
            id: 'box',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#FF0000',
            opacity: 1,  // Start fully visible
          },
        ],
        animations: [
          {
            target: 'box',
            effect: 'fadeOut',
            start: '1s',  // Start fadeOut at 1 second (frame 30)
          },
        ],
      };
      await writeFile(join(tempDir, 'fadeout-scene.json'), JSON.stringify(sceneFile));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 90 },
        objects: [
          {
            type: 'scene',
            id: 'test',
            source: './fadeout-scene.json',
            start: '0s',
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);
      const renderer = new Renderer(processed);

      // At frame 0 (start), box should be visible
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 100, 100);
      expect(pixel0[0]).toBeGreaterThan(200); // Red channel
      expect(pixel0[3]).toBeGreaterThan(200); // Fully opaque

      // At frame 45 (after fadeOut completes: 30 + 15 frames = 0.5s duration)
      // The fadeOut effect has 0.5s duration, so it should complete by frame 45
      const buffer45 = await renderer.exportFrame(45);
      const pixel45 = await getPixelFromPNG(buffer45, 100, 100);
      expect(pixel45[3]).toBe(0); // Should be fully transparent
    });

    it('should correctly namespace animation targets in scenes', async () => {
      // Create a scene and verify animation targets are properly namespaced
      const sceneFile: SceneFile = {
        objects: [
          { type: 'rect', id: 'box', x: 50, y: 50, width: 100, height: 100, fill: '#FF0000' },
        ],
        animations: [
          {
            target: 'box',
            property: 'opacity',
            keyframes: [
              { start: 0, value: 1 },
              { start: 30, value: 0 },
            ],
          },
        ],
      };
      await writeFile(join(tempDir, 'namespaced.json'), JSON.stringify(sceneFile));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 60 },
        objects: [
          {
            type: 'scene',
            id: 'myscene',
            source: './namespaced.json',
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);

      // Animation target should be 'myscene.box', not 'myscene.myscene.box'
      expect(processed.animations).toHaveLength(1);
      expect((processed.animations![0] as any).target).toBe('myscene.box');
    });

    it('should handle scene with multiple effect animations', async () => {
      // Test case from the actual example - fadeIn followed by fadeOut
      const sceneFile: SceneFile = {
        duration: '2s',
        objects: [
          {
            type: 'rect',
            id: 'box',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#00FF00',
            opacity: 0,  // Start invisible
          },
        ],
        animations: [
          { target: 'box', effect: 'fadeIn', start: '0s' },
          { target: 'box', effect: 'fadeOut', start: '1.5s' },
        ],
      };
      await writeFile(join(tempDir, 'multi-effect.json'), JSON.stringify(sceneFile));

      const animation: AnimationFile = {
        project: { width: 200, height: 200, fps: 30, frames: 90 },
        objects: [
          {
            type: 'scene',
            id: 'multi',
            source: './multi-effect.json',
            start: '0s',
          } as SceneObject,
        ],
      };

      const processed = await preprocessAnimation(animation, tempDir);
      const renderer = new Renderer(processed);

      // Frame 0: should be invisible (opacity 0, fadeIn just starting)
      const buffer0 = await renderer.exportFrame(0);
      const pixel0 = await getPixelFromPNG(buffer0, 100, 100);
      expect(pixel0[3]).toBe(0); // Transparent at start

      // Frame 15 (mid fadeIn): should be partially visible
      const buffer15 = await renderer.exportFrame(15);
      const pixel15 = await getPixelFromPNG(buffer15, 100, 100);
      expect(pixel15[3]).toBeGreaterThan(200); // Mostly visible

      // Frame 30 (after fadeIn completes): should be fully visible
      const buffer30 = await renderer.exportFrame(30);
      const pixel30 = await getPixelFromPNG(buffer30, 100, 100);
      expect(pixel30[3]).toBe(255); // Fully opaque

      // Frame 60 (after fadeOut completes at 1.5s + 0.5s = 2s = frame 60)
      const buffer60 = await renderer.exportFrame(60);
      const pixel60 = await getPixelFromPNG(buffer60, 100, 100);
      expect(pixel60[3]).toBe(0); // Should be transparent
    });
  });
});
