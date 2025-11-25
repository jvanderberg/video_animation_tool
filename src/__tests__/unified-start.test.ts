/**
 * Tests for unified 'start' property in keyframes
 *
 * Goal: All keyframes use 'start: TimeValue' instead of 'frame: number'
 * - 'start' can be a number (frames) or string ("1s", "500ms", etc.)
 * - After preprocessing, 'start' is converted to numeric frames
 * - Relative timing in groups still works (start is relative to parent)
 */

import { describe, it, expect } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import { Renderer } from '../renderer.js';
import type { AnimationFile, PropertyAnimation } from '../types.js';

describe('Unified start property', () => {
  describe('PropertyAnimation keyframes', () => {
    it('should accept start as frame number', async () => {
      const animation: AnimationFile = {
        project: { width: 100, height: 100, fps: 30, frames: 90 },
        objects: [{ id: 'box', type: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#FF0000' }],
        animations: [{
          target: 'box',
          property: 'x',
          keyframes: [
            { start: 0, value: 0 },
            { start: 30, value: 100 }
          ]
        }]
      };

      const processed = await preprocessAnimation(animation);
      const anim = processed.animations![0] as PropertyAnimation;

      expect(anim.keyframes[0].start).toBe(0);
      expect(anim.keyframes[1].start).toBe(30);
    });

    it('should accept start as time string (seconds)', async () => {
      const animation: AnimationFile = {
        project: { width: 100, height: 100, fps: 30, frames: 90 },
        objects: [{ id: 'box', type: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#FF0000' }],
        animations: [{
          target: 'box',
          property: 'x',
          keyframes: [
            { start: '0s', value: 0 },
            { start: '1s', value: 100 }
          ]
        }]
      };

      const processed = await preprocessAnimation(animation);
      const anim = processed.animations![0] as PropertyAnimation;

      // At 30fps, 0s = frame 0, 1s = frame 30
      expect(anim.keyframes[0].start).toBe(0);
      expect(anim.keyframes[1].start).toBe(30);
    });

    it('should accept start as time string (milliseconds)', async () => {
      const animation: AnimationFile = {
        project: { width: 100, height: 100, fps: 60, frames: 120 },
        objects: [{ id: 'box', type: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#FF0000' }],
        animations: [{
          target: 'box',
          property: 'x',
          keyframes: [
            { start: '0ms', value: 0 },
            { start: '500ms', value: 100 }
          ]
        }]
      };

      const processed = await preprocessAnimation(animation);
      const anim = processed.animations![0] as PropertyAnimation;

      // At 60fps, 0ms = frame 0, 500ms = frame 30
      expect(anim.keyframes[0].start).toBe(0);
      expect(anim.keyframes[1].start).toBe(30);
    });

    it('should mix frame numbers and time strings in same animation', async () => {
      const animation: AnimationFile = {
        project: { width: 100, height: 100, fps: 30, frames: 120 },
        objects: [{ id: 'box', type: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#FF0000' }],
        animations: [{
          target: 'box',
          property: 'x',
          keyframes: [
            { start: 0, value: 0 },        // frame 0
            { start: '1s', value: 50 },    // frame 30
            { start: 60, value: 100 },     // frame 60
            { start: '3s', value: 150 }    // frame 90
          ]
        }]
      };

      const processed = await preprocessAnimation(animation);
      const anim = processed.animations![0] as PropertyAnimation;

      expect(anim.keyframes[0].start).toBe(0);
      expect(anim.keyframes[1].start).toBe(30);
      expect(anim.keyframes[2].start).toBe(60);
      expect(anim.keyframes[3].start).toBe(90);
    });
  });

  describe('Rendering with start property', () => {
    it('should correctly interpolate animation using start', async () => {
      const animation: AnimationFile = {
        project: { width: 100, height: 100, fps: 30, frames: 60 },
        objects: [{ id: 'box', type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#FF0000' }],
        animations: [{
          target: 'box',
          property: 'x',
          keyframes: [
            { start: '0s', value: 0 },
            { start: '1s', value: 90 }
          ]
        }]
      };

      const processed = await preprocessAnimation(animation);
      const renderer = new Renderer(processed);

      // At frame 15 (0.5s at 30fps), x should be 45 (halfway)
      const props = renderer.getPropertiesAtFrame(processed.objects[0], 15);
      expect(props.x).toBe(45);
    });
  });

  describe('Group relative timing', () => {
    it('should interpret start relative to group start', async () => {
      const animation: AnimationFile = {
        project: { width: 100, height: 100, fps: 30, frames: 180 },
        objects: [{
          id: 'mygroup',
          type: 'group',
          start: '2s',  // Group starts at frame 60
          children: [
            { id: 'box', type: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#FF0000' }
          ],
          animations: [{
            target: 'box',
            property: 'x',
            keyframes: [
              { start: '0s', value: 0 },   // Relative: 0s after group start = frame 60
              { start: '1s', value: 100 }  // Relative: 1s after group start = frame 90
            ]
          }]
        }]
      };

      const processed = await preprocessAnimation(animation);
      const anim = processed.animations!.find(a =>
        (a as PropertyAnimation).property === 'x'
      ) as PropertyAnimation;

      // Group starts at 2s = frame 60
      // Child animation: 0s relative = frame 60, 1s relative = frame 90
      expect(anim.keyframes[0].start).toBe(60);
      expect(anim.keyframes[1].start).toBe(90);
    });

    it('should work with nested groups and relative timing', async () => {
      const animation: AnimationFile = {
        project: { width: 100, height: 100, fps: 30, frames: 300 },
        objects: [{
          id: 'outer',
          type: 'group',
          start: '1s',  // Frame 30
          children: [{
            id: 'inner',
            type: 'group',
            start: '1s',  // Frame 30 + 30 = 60 (relative to outer)
            children: [
              { id: 'box', type: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#FF0000' }
            ],
            animations: [{
              target: 'box',
              property: 'x',
              keyframes: [
                { start: '0s', value: 0 },   // Relative to inner: frame 60
                { start: '1s', value: 100 }  // Relative to inner: frame 90
              ]
            }]
          }]
        }]
      };

      const processed = await preprocessAnimation(animation);
      const anim = processed.animations!.find(a =>
        (a as PropertyAnimation).property === 'x'
      ) as PropertyAnimation;

      // Outer: 1s = frame 30
      // Inner: 1s relative to outer = frame 60
      // Animation: 0s relative to inner = frame 60, 1s relative = frame 90
      expect(anim.keyframes[0].start).toBe(60);
      expect(anim.keyframes[1].start).toBe(90);
    });
  });

  describe('Effect animations still work', () => {
    it('should expand effects to use start property', async () => {
      const animation: AnimationFile = {
        project: { width: 100, height: 100, fps: 30, frames: 60 },
        objects: [{ id: 'box', type: 'rect', x: 0, y: 0, width: 50, height: 50, fill: '#FF0000' }],
        animations: [{
          target: 'box',
          effect: 'fadeIn',
          start: '0.5s'  // Frame 15
        }]
      };

      const processed = await preprocessAnimation(animation);

      // fadeIn should expand to opacity animation with start property
      const opacityAnim = processed.animations!.find(a =>
        (a as PropertyAnimation).property === 'opacity'
      ) as PropertyAnimation;

      expect(opacityAnim).toBeDefined();
      // First keyframe should be at frame 15 (0.5s at 30fps)
      expect(opacityAnim.keyframes[0].start).toBe(15);
    });
  });
});
