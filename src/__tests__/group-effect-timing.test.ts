import { describe, it, expect } from 'vitest';
import { preprocessAnimation } from '../preprocessor';
import type { AnimationFile } from '../types';

describe('Group effect timing', () => {
  it('should offset effect animations by group start time', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 600 },
      objects: [
        {
          type: 'group',
          id: 'mygroup',
          x: 0,
          y: 0,
          start: '5s',  // Group starts at frame 300
          children: [
            {
              type: 'text',
              id: 'title',
              content: 'Hello',
              x: 100,
              y: 100,
              size: 32,
              color: '#FFFFFF'
            }
          ],
          animations: [
            {
              target: 'title',
              effect: 'slideInRight',
              start: '0s'  // Relative to group start, should be frame 300
            }
          ]
        }
      ]
    };

    const processed = await preprocessAnimation(animation);

    // Find animations for mygroup.title
    const titleAnims = processed.animations?.filter(a => a.target === 'mygroup.title') || [];

    expect(titleAnims.length).toBeGreaterThan(0);

    // slideInRight creates x and opacity animations
    const xAnim = titleAnims.find(a => 'property' in a && a.property === 'x');
    const opacityAnim = titleAnims.find(a => 'property' in a && a.property === 'opacity');

    expect(xAnim).toBeDefined();
    expect(opacityAnim).toBeDefined();

    // Effect should start at group start time (5s = 300 frames)
    // NOT at frame 0
    if (xAnim && 'keyframes' in xAnim) {
      expect(xAnim.keyframes[0].frame).toBe(300);
    }

    if (opacityAnim && 'keyframes' in opacityAnim) {
      expect(opacityAnim.keyframes[0].frame).toBe(300);
    }
  });

  it('should apply property substitution with group children scope', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 600 },
      objects: [
        {
          type: 'group',
          id: 'mygroup',
          x: 0,
          y: 0,
          start: '2s',
          children: [
            {
              type: 'text',
              id: 'title',
              content: 'Hello',
              x: 150,  // This value should be substituted
              y: 100,
              size: 32,
              color: '#FFFFFF'
            }
          ],
          animations: [
            {
              target: 'title',
              effect: 'slideInRight',
              start: '0s'
            }
          ]
        }
      ]
    };

    const processed = await preprocessAnimation(animation);

    const titleAnims = processed.animations?.filter(a => a.target === 'mygroup.title') || [];
    const xAnim = titleAnims.find(a => 'property' in a && a.property === 'x');

    expect(xAnim).toBeDefined();

    // slideInRight animates from 2880 to {x}
    // {x} should be substituted with the object's x value (150)
    if (xAnim && 'keyframes' in xAnim) {
      expect(xAnim.keyframes[1].value).toBe(150);
    }
  });
});
