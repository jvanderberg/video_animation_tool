import { describe, it, expect } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import type { AnimationFile, PropertyAnimation } from '../types.js';

describe('Animation Speed', () => {
  describe('Group animationSpeed', () => {
    it('should speed up group animations by 2x', async () => {
      const animation: AnimationFile = {
        project: { width: 1920, height: 1080, fps: 60, frames: 120 },
        objects: [
          {
            type: 'group',
            id: 'fast-group',
            start: 0,
            animationSpeed: 2.0, // 2x faster
            x: 0,
            y: 0,
            children: [
              {
                type: 'rect',
                id: 'box',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                fill: '#FF0000'
              }
            ],
            animations: [
              {
                target: 'box',
                property: 'x',
                keyframes: [
                  { start: '0s', value: 0 },
                  { start: '2s', value: 100 }  // Should become 1s (2s / 2.0)
                ]
              }
            ]
          }
        ]
      };

      const result = await preprocessAnimation(animation);
      const boxAnim = result.animations?.find(
        a => a.target === 'fast-group.box' && (a as PropertyAnimation).property === 'x'
      ) as PropertyAnimation;

      expect(boxAnim).toBeDefined();
      expect(boxAnim.keyframes).toHaveLength(2);
      expect(boxAnim.keyframes[0].start).toBe(0);
      expect(boxAnim.keyframes[1].start).toBe(60); // 1s at 60fps (was 2s, now 2s/2.0 = 1s)
    });

    it('should slow down group animations by 0.5x', async () => {
      const animation: AnimationFile = {
        project: { width: 1920, height: 1080, fps: 60, frames: 240 },
        objects: [
          {
            type: 'group',
            id: 'slow-group',
            start: 0,
            animationSpeed: 0.5, // Half speed (2x slower)
            x: 0,
            y: 0,
            children: [
              {
                type: 'rect',
                id: 'box',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                fill: '#FF0000'
              }
            ],
            animations: [
              {
                target: 'box',
                property: 'x',
                keyframes: [
                  { start: '0s', value: 0 },
                  { start: '1s', value: 100 }  // Should become 2s (1s / 0.5)
                ]
              }
            ]
          }
        ]
      };

      const result = await preprocessAnimation(animation);
      const boxAnim = result.animations?.find(
        a => a.target === 'slow-group.box' && (a as PropertyAnimation).property === 'x'
      ) as PropertyAnimation;

      expect(boxAnim).toBeDefined();
      expect(boxAnim.keyframes).toHaveLength(2);
      expect(boxAnim.keyframes[0].start).toBe(0);
      expect(boxAnim.keyframes[1].start).toBe(120); // 2s at 60fps (was 1s, now 1s/0.5 = 2s)
    });

    it('should not affect group transitions', async () => {
      const animation: AnimationFile = {
        project: { width: 1920, height: 1080, fps: 60, frames: 120 },
        objects: [
          {
            type: 'group',
            id: 'test-group',
            start: 0,
            duration: '2s',
            animationSpeed: 2.0, // Should NOT affect transitions
            x: 0,
            y: 0,
            children: [
              {
                type: 'rect',
                id: 'box',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                fill: '#FF0000'
              }
            ],
            transition: {
              in: {
                effect: 'fadeIn',
                duration: '0.5s'  // Should stay 0.5s
              },
              out: {
                effect: 'fadeOut',
                duration: '0.5s'  // Should stay 0.5s
              }
            }
          }
        ]
      };

      const result = await preprocessAnimation(animation);

      // Find transition animations - after preprocessing, effects are expanded to property animations
      // fadeIn creates an opacity animation from 0 to 1
      // Check that it starts at frame 0 and ends at frame 30 (0.5s at 60fps)
      const opacityAnims = result.animations?.filter(
        a => a.target === 'test-group' && (a as PropertyAnimation).property === 'opacity'
      ) as PropertyAnimation[];

      expect(opacityAnims).toBeDefined();
      expect(opacityAnims.length).toBeGreaterThan(0);

      // Find fadeIn animation (starts at 0)
      const fadeInAnim = opacityAnims.find(a =>
        a.keyframes[0].start === 0
      );

      // Find fadeOut animation (starts at 120 = 2s duration)
      const fadeOutAnim = opacityAnims.find(a =>
        a.keyframes[0].start === 120
      );

      // Transitions should not be affected by animationSpeed
      // fadeIn should be 0.5s = 30 frames at 60fps
      expect(fadeInAnim).toBeDefined();
      expect(fadeInAnim!.keyframes[0].start).toBe(0);
      expect(fadeInAnim!.keyframes[fadeInAnim!.keyframes.length - 1].start).toBe(30); // 0.5s

      // fadeOut should also be 0.5s = 30 frames
      expect(fadeOutAnim).toBeDefined();
      expect(fadeOutAnim!.keyframes[0].start).toBe(120); // Start of fadeOut
      expect(fadeOutAnim!.keyframes[fadeOutAnim!.keyframes.length - 1].start).toBe(150); // 120 + 30
    });
  });

  describe('Root animationSpeed', () => {
    it('should speed up all root animations by 2x', async () => {
      const animation: AnimationFile = {
        project: { width: 1920, height: 1080, fps: 60, frames: 120 },
        animationSpeed: 2.0, // 2x faster for all animations
        objects: [
          {
            type: 'rect',
            id: 'box',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: '#FF0000'
          }
        ],
        animations: [
          {
            target: 'box',
            property: 'x',
            keyframes: [
              { start: 0, value: 0 },
              { start: 120, value: 100 }  // Should become frame 60 (120 / 2.0)
            ]
          }
        ]
      };

      const result = await preprocessAnimation(animation);
      const boxAnim = result.animations?.find(
        a => a.target === 'box' && (a as PropertyAnimation).property === 'x'
      ) as PropertyAnimation;

      expect(boxAnim).toBeDefined();
      expect(boxAnim.keyframes).toHaveLength(2);
      expect(boxAnim.keyframes[0].start).toBe(0);
      expect(boxAnim.keyframes[1].start).toBe(60); // 120 / 2.0 = 60
    });

    it('should not affect group transitions with root animationSpeed', async () => {
      const animation: AnimationFile = {
        project: { width: 1920, height: 1080, fps: 60, frames: 120 },
        animationSpeed: 2.0, // Should NOT affect transitions
        objects: [
          {
            type: 'group',
            id: 'test-group',
            start: 0,
            duration: '2s',
            x: 0,
            y: 0,
            children: [
              {
                type: 'rect',
                id: 'box',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                fill: '#FF0000'
              }
            ],
            transition: {
              in: {
                effect: 'fadeIn',
                duration: '0.5s'  // Should stay 0.5s
              }
            }
          }
        ]
      };

      const result = await preprocessAnimation(animation);

      // Find transition animations - effects are expanded to property animations
      const opacityAnims = result.animations?.filter(
        a => a.target === 'test-group' && (a as PropertyAnimation).property === 'opacity'
      ) as PropertyAnimation[];

      expect(opacityAnims).toBeDefined();
      expect(opacityAnims.length).toBeGreaterThan(0);

      // Find fadeIn animation (starts at 0)
      const fadeInAnim = opacityAnims.find(a =>
        a.keyframes[0].start === 0
      );

      // Transitions should not be affected by root animationSpeed
      // fadeIn should be 0.5s = 30 frames at 60fps (not affected by 2x speed)
      expect(fadeInAnim).toBeDefined();
      expect(fadeInAnim!.keyframes[0].start).toBe(0);
      expect(fadeInAnim!.keyframes[fadeInAnim!.keyframes.length - 1].start).toBe(30); // 0.5s
    });
  });

  describe('Combined animationSpeed', () => {
    it('should apply both root and group speeds multiplicatively', async () => {
      const animation: AnimationFile = {
        project: { width: 1920, height: 1080, fps: 60, frames: 240 },
        animationSpeed: 2.0, // Root: 2x faster
        objects: [
          {
            type: 'group',
            id: 'test-group',
            start: 0,
            animationSpeed: 2.0, // Group: 2x faster (total 4x)
            x: 0,
            y: 0,
            children: [
              {
                type: 'rect',
                id: 'box',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                fill: '#FF0000'
              }
            ],
            animations: [
              {
                target: 'box',
                property: 'x',
                keyframes: [
                  { start: '0s', value: 0 },
                  { start: '4s', value: 100 }  // Should become 1s (4s / 2.0 / 2.0)
                ]
              }
            ]
          }
        ]
      };

      const result = await preprocessAnimation(animation);
      const boxAnim = result.animations?.find(
        a => a.target === 'test-group.box' && (a as PropertyAnimation).property === 'x'
      ) as PropertyAnimation;

      expect(boxAnim).toBeDefined();
      expect(boxAnim.keyframes).toHaveLength(2);
      expect(boxAnim.keyframes[0].start).toBe(0);
      expect(boxAnim.keyframes[1].start).toBe(60); // 4s / 2.0 / 2.0 = 1s = 60 frames
    });
  });
});
