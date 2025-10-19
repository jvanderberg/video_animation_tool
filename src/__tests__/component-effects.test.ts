import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { expandComponent, expandComponents, extractAnimationsFromGroups } from '../components.js';
import { expandEffectAnimation } from '../preprocessor.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ComponentObject, EffectAnimation, PropertyAnimation } from '../types.js';

describe('Component Effects', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), 'component-effects-unit-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should extract effect animations from components', async () => {
    const componentDef = {
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' }
      ],
      animations: [
        {
          target: 'box',
          effect: 'test-slide',
          start: 0
        }
      ]
    };

    const componentPath = join(tempDir, 'test.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const component: ComponentObject = {
      type: 'component',
      id: 'test-comp',
      source: './test.json',
      start: 0
    };

    const result = await expandComponent(component, tempDir, 30);

    // Should have animations
    expect(result.animations).toBeDefined();
    expect(result.animations?.length).toBe(1);

    // Animation should be an effect animation
    const anim = result.animations![0] as EffectAnimation;
    expect(anim.effect).toBe('test-slide');
    expect(anim.target).toBe('test-comp.box'); // Namespaced
  });

  it('should extract compound effect animations (multiple properties)', async () => {
    const componentDef = {
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' }
      ],
      animations: [
        {
          target: 'box',
          effect: 'test-slide-fade',
          start: 0
        }
      ]
    };

    const componentPath = join(tempDir, 'test.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const component: ComponentObject = {
      type: 'component',
      id: 'comp',
      source: './test.json',
      start: '1s' // 30 frames at 30fps
    };

    const result = await expandComponent(component, tempDir, 30);

    expect(result.animations).toBeDefined();
    expect(result.animations?.length).toBe(1);

    const anim = result.animations![0] as EffectAnimation;
    expect(anim.effect).toBe('test-slide-fade');
    expect(anim.target).toBe('comp.box');
    expect(anim.start).toBe(30); // Offset by component start time
  });

  it('should expand effect animations into property animations', async () => {
    const effectAnim: EffectAnimation = {
      target: 'comp.box',
      effect: 'test-slide',
      start: 0
    };

    const propertyAnims = await expandEffectAnimation(effectAnim, 30);

    // test-slide effect has 1 property (x)
    expect(propertyAnims.length).toBe(1);

    const xAnim = propertyAnims[0];
    expect(xAnim.target).toBe('comp.box');
    expect(xAnim.property).toBe('x');
    expect(xAnim.keyframes.length).toBe(2);
    expect(xAnim.keyframes[0].frame).toBe(0);
    expect(xAnim.keyframes[0].value).toBe(0);
    expect(xAnim.keyframes[1].frame).toBe(30); // 1s at 30fps
    expect(xAnim.keyframes[1].value).toBe(100);
  });

  it('should expand compound effects into multiple property animations', async () => {
    const effectAnim: EffectAnimation = {
      target: 'comp.box',
      effect: 'test-slide-fade',
      start: 0
    };

    const propertyAnims = await expandEffectAnimation(effectAnim, 30);

    // test-slide-fade has 2 properties (x and opacity)
    expect(propertyAnims.length).toBe(2);

    // Check x property
    const xAnim = propertyAnims.find(a => a.property === 'x');
    expect(xAnim).toBeDefined();
    expect(xAnim!.target).toBe('comp.box');
    expect(xAnim!.keyframes[0].value).toBe(0);
    expect(xAnim!.keyframes[1].value).toBe(100);

    // Check opacity property
    const opacityAnim = propertyAnims.find(a => a.property === 'opacity');
    expect(opacityAnim).toBeDefined();
    expect(opacityAnim!.target).toBe('comp.box');
    expect(opacityAnim!.keyframes[0].value).toBe(0);
    expect(opacityAnim!.keyframes[1].value).toBe(1);
  });

  it('should extract and expand effects from nested components', async () => {
    const componentDef = {
      objects: [
        { type: 'rect', id: 'box', width: 50, height: 50 }
      ],
      animations: [
        {
          target: 'box',
          effect: 'test-slide',
          start: 0
        }
      ]
    };

    const componentPath = join(tempDir, 'test.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const objects = [
      {
        type: 'group',
        children: [
          {
            type: 'component',
            id: 'nested-comp',
            source: './test.json',
            start: 15
          }
        ]
      }
    ];

    const expanded = await expandComponents(objects as any, tempDir, 30);
    const animations = extractAnimationsFromGroups(expanded);

    expect(animations.length).toBeGreaterThan(0);

    // Should have effect animation with correct offset
    const effectAnim = animations[0] as EffectAnimation;
    expect(effectAnim.effect).toBe('test-slide');
    expect(effectAnim.start).toBe(15); // Offset by component start
  });
});
