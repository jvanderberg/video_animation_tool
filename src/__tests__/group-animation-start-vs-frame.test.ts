import { describe, it, expect } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import type { AnimationFile, PropertyAnimation } from '../types.js';

describe('Group animation start vs frame keyframes', () => {
  it('should process group animations with frame-based keyframes', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 300 },
      objects: [
        {
          type: 'group',
          id: 'mygroup',
          x: 0,
          y: 0,
          animationSpeed: 0.5,  // Half speed
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { frame: 60, value: 0 },
                { frame: 120, value: 100 }
              ]
            }
          ],
          children: [
            {
              type: 'rect',
              id: 'box',
              x: 0,
              y: 0,
              width: 50,
              height: 50,
              fill: '#FF0000'
            }
          ]
        }
      ]
    };

    const processed = await preprocessAnimation(animation);
    const xAnim = processed.animations?.find(
      a => a.target === 'mygroup.box' && a.property === 'x'
    ) as PropertyAnimation;

    expect(xAnim).toBeDefined();
    expect(xAnim.keyframes[0].frame).toBe(120);  // 60 / 0.5 = 120
    expect(xAnim.keyframes[1].frame).toBe(240);  // 120 / 0.5 = 240
  });

  it('should process group animations with start-based keyframes (time strings)', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 300 },
      objects: [
        {
          type: 'group',
          id: 'mygroup',
          x: 0,
          y: 0,
          animationSpeed: 0.5,  // Half speed
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { start: '1.0s', value: 0 },      // 1.0s = 60 frames
                { start: '2.0s', value: 100 }     // 2.0s = 120 frames
              ]
            }
          ],
          children: [
            {
              type: 'rect',
              id: 'box',
              x: 0,
              y: 0,
              width: 50,
              height: 50,
              fill: '#FF0000'
            }
          ]
        }
      ]
    };

    const processed = await preprocessAnimation(animation);
    const xAnim = processed.animations?.find(
      a => a.target === 'mygroup.box' && a.property === 'x'
    ) as PropertyAnimation;

    expect(xAnim).toBeDefined();
    // start: "1.0s" = 60 frames, then divided by animationSpeed 0.5 = 120
    expect(xAnim.keyframes[0].frame).toBe(120);
    // start: "2.0s" = 120 frames, then divided by animationSpeed 0.5 = 240
    expect(xAnim.keyframes[1].frame).toBe(240);
  });

  it('should produce identical results for frame vs start with same timing', async () => {
    // Animation 1: Using frame-based keyframes
    const anim1: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 300 },
      objects: [
        {
          type: 'group',
          id: 'mygroup',
          x: 0,
          y: 0,
          animationSpeed: 0.5,
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { frame: 60, value: 0 },
                { frame: 90, value: 100 }
              ]
            }
          ],
          children: [
            {
              type: 'rect',
              id: 'box',
              x: 0,
              y: 0,
              width: 50,
              height: 50,
              fill: '#FF0000'
            }
          ]
        }
      ]
    };

    // Animation 2: Using start-based keyframes with equivalent timing
    const anim2: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 300 },
      objects: [
        {
          type: 'group',
          id: 'mygroup',
          x: 0,
          y: 0,
          animationSpeed: 0.5,
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { start: '1.0s', value: 0 },      // 60 frames at 60fps
                { start: '1.5s', value: 100 }     // 90 frames at 60fps
              ]
            }
          ],
          children: [
            {
              type: 'rect',
              id: 'box',
              x: 0,
              y: 0,
              width: 50,
              height: 50,
              fill: '#FF0000'
            }
          ]
        }
      ]
    };

    const processed1 = await preprocessAnimation(anim1);
    const processed2 = await preprocessAnimation(anim2);

    const xAnim1 = processed1.animations?.find(
      a => a.target === 'mygroup.box' && a.property === 'x'
    ) as PropertyAnimation;
    const xAnim2 = processed2.animations?.find(
      a => a.target === 'mygroup.box' && a.property === 'x'
    ) as PropertyAnimation;

    // Both should produce identical frame timings
    expect(xAnim1.keyframes[0].frame).toBe(xAnim2.keyframes[0].frame);
    expect(xAnim1.keyframes[1].frame).toBe(xAnim2.keyframes[1].frame);
    expect(xAnim1.keyframes[0].value).toBe(xAnim2.keyframes[0].value);
    expect(xAnim1.keyframes[1].value).toBe(xAnim2.keyframes[1].value);
  });
});
