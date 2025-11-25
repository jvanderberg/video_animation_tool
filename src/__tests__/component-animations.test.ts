import { describe, it, expect, beforeEach } from 'vitest';
import { expandComponent, expandComponents } from '../components.js';
import fs from 'fs/promises';
import { vi } from 'vitest';
import type { ComponentObject, AnimationObject, PropertyAnimation, EffectAnimation } from '../types.js';

// Mock fs.readFile
vi.mock('fs/promises');

describe('Component Bundled Animations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should offset property animation frames by component start time', async () => {
    const component: ComponentObject = {
      type: 'component',
      id: 'animated-comp',
      source: './components/fade.json',
      start: '1s' // 30 frames at 30fps
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' }
      ],
      animations: [
        {
          target: 'box',
          property: 'opacity',
          keyframes: [
            { start: 0, value: 0 },
            { start: 30, value: 1 }
          ]
        }
      ]
    }));

    const result = await expandComponent(component, '.', 30);

    // Should return animations with offset frames
    expect(result.animations).toBeDefined();
    expect(result.animations?.length).toBe(1);

    const anim = result.animations![0] as PropertyAnimation;
    expect(anim.target).toBe('animated-comp.box'); // Namespaced target
    expect(anim.keyframes[0].start).toBe(30); // 0 + 30 offset
    expect(anim.keyframes[1].start).toBe(60); // 30 + 30 offset
  });

  it('should offset effect start time by component start time', async () => {
    const component: ComponentObject = {
      type: 'component',
      id: 'effect-comp',
      source: './components/button.json',
      start: '2s' // 60 frames at 30fps
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', id: 'bg', width: 100, height: 50 }
      ],
      animations: [
        {
          target: 'bg',
          effect: 'fade-in',
          start: 0
        }
      ]
    }));

    const result = await expandComponent(component, '.', 30);

    expect(result.animations).toBeDefined();
    expect(result.animations?.length).toBe(1);

    const effect = result.animations![0] as EffectAnimation;
    expect(effect.target).toBe('effect-comp.bg'); // Namespaced target
    expect(effect.start).toBe(60); // 0 + 60 offset
  });

  it('should handle component with no start time (defaults to 0)', async () => {
    const component: ComponentObject = {
      type: 'component',
      id: 'comp',
      source: './components/test.json'
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', id: 'box', width: 50, height: 50 }
      ],
      animations: [
        {
          target: 'box',
          property: 'x',
          keyframes: [
            { start: 0, value: 0 },
            { start: 60, value: 100 }
          ]
        }
      ]
    }));

    const result = await expandComponent(component, '.', 30);

    expect(result.animations).toBeDefined();
    const anim = result.animations![0] as PropertyAnimation;
    // No offset - frames stay the same
    expect(anim.keyframes[0].start).toBe(0);
    expect(anim.keyframes[1].start).toBe(60);
  });

  it('should handle both animations and effects in same component', async () => {
    const component: ComponentObject = {
      type: 'component',
      id: 'mixed',
      source: './components/mixed.json',
      start: 15 // 15 frames
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', id: 'box1', width: 50, height: 50 },
        { type: 'rect', id: 'box2', width: 50, height: 50 }
      ],
      animations: [
        {
          target: 'box1',
          property: 'x',
          keyframes: [
            { start: 0, value: 0 },
            { start: 30, value: 100 }
          ]
        },
        {
          target: 'box2',
          effect: 'wipe',
          start: 10
        }
      ]
    }));

    const result = await expandComponent(component, '.', 30);

    expect(result.animations?.length).toBe(2);

    const propAnim = result.animations![0] as PropertyAnimation;
    expect(propAnim.keyframes[0].start).toBe(15); // 0 + 15
    expect(propAnim.keyframes[1].start).toBe(45); // 30 + 15

    const effect = result.animations![1] as EffectAnimation;
    expect(effect.start).toBe(25); // 10 + 15
  });

  it('should handle time string formats in effect start times', async () => {
    const component: ComponentObject = {
      type: 'component',
      id: 'comp',
      source: './components/test.json',
      start: '1s' // 30 frames at 30fps
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', id: 'box', width: 50, height: 50 }
      ],
      animations: [
        {
          target: 'box',
          effect: 'fade-in',
          start: '0.5s' // 15 frames at 30fps
        }
      ]
    }));

    const result = await expandComponent(component, '.', 30);

    const effect = result.animations![0] as EffectAnimation;
    // 0.5s (15 frames) + 1s (30 frames) = 1.5s (45 frames)
    expect(effect.start).toBe(45);
  });

  it('should accumulate time offsets in nested components', async () => {
    const innerComponent: ComponentObject = {
      type: 'component',
      id: 'inner',
      source: './components/inner.json',
      start: 10 // 10 frames offset within outer
    };

    const outerComponent: ComponentObject = {
      type: 'component',
      id: 'outer',
      source: './components/outer.json',
      start: 20 // 20 frames offset in scene
    };

    // Mock inner component definition
    vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
      if (path.includes('inner.json')) {
        return JSON.stringify({
          objects: [
            { type: 'rect', id: 'box', width: 50, height: 50 }
          ],
          animations: [
            {
              target: 'box',
              property: 'opacity',
              keyframes: [
                { start: 0, value: 0 },
                { start: 30, value: 1 }
              ]
            }
          ]
        });
      } else if (path.includes('outer.json')) {
        return JSON.stringify({
          objects: [
            {
              type: 'component',
              id: 'inner',
              source: './inner.json',
              start: 10
            }
          ]
        });
      }
      throw new Error('Unknown file');
    });

    const result = await expandComponent(outerComponent, '.', 30);

    // Inner component's animation should be offset by both:
    // - inner component start: 10 frames
    // - outer component start: 20 frames
    // Total offset: 30 frames
    const innerGroup = result.children[0] as any;
    expect(innerGroup.type).toBe('group');
    expect(innerGroup.animations).toBeDefined();

    const anim = innerGroup.animations[0] as PropertyAnimation;
    expect(anim.keyframes[0].start).toBe(30); // 0 + 10 + 20
    expect(anim.keyframes[1].start).toBe(60); // 30 + 10 + 20
  });
});
