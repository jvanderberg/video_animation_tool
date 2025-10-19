import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Renderer } from '../renderer.js';
import { preprocessAnimation, expandEffectAnimation } from '../preprocessor.js';
import { expandComponents, extractAnimationsFromGroups } from '../components.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { AnimationFile, SequenceAnimation, EffectAnimation } from '../types.js';

describe('Component Effects Rendering', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), 'component-effects-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should render a component with effect animation (visual test)', async () => {
    // Create a simple component with a red box that slides
    const componentDef = {
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 0,
          y: 50,
          width: 50,
          height: 50,
          fill: '#FF0000'
        }
      ],
      animations: [
        {
          target: 'box',
          effect: 'test-slide',
          start: 0
        }
      ]
    };

    const componentPath = join(tempDir, 'test-comp.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    // Create animation using the component
    let animation: AnimationFile = {
      project: {
        width: 200,
        height: 200,
        fps: 30,
        frames: 31
      },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          fill: '#000000' // Black background
        },
        {
          type: 'component',
          id: 'test-comp',
          source: './test-comp.json',
          x: 0,
          y: 0,
          start: 0
        }
      ]
    };

    // Preprocess
    animation = await preprocessAnimation(animation);

    // Expand components
    animation.objects = await expandComponents(animation.objects, tempDir, animation.project.fps);

    // Extract and expand effect animations from components
    const componentAnimations = extractAnimationsFromGroups(animation.objects);
    if (componentAnimations.length > 0) {
      const expandedAnimations: SequenceAnimation[] = [];
      for (const anim of componentAnimations) {
        if ('effect' in anim && typeof anim.effect === 'string') {
          const propAnims = await expandEffectAnimation(anim as EffectAnimation, animation.project.fps);
          expandedAnimations.push(...propAnims);
        } else {
          expandedAnimations.push(anim);
        }
      }

      if (!animation.sequences) {
        animation.sequences = [];
      }
      animation.sequences.push({
        name: 'component-animations',
        animations: expandedAnimations
      });
    }

    // Create renderer
    const renderer = new Renderer(animation);

    // Render frame 0 - box should be at x=0
    const canvas0 = renderer.renderFrame(0);
    const ctx0 = canvas0.getContext('2d')!;
    const pixel0 = ctx0.getImageData(25, 75, 1, 1).data; // Center of box at x=0
    expect(pixel0[0]).toBe(255); // Red
    expect(pixel0[1]).toBe(0);   // Green
    expect(pixel0[2]).toBe(0);   // Blue

    // Render frame 15 - box should be at x=50 (halfway)
    const canvas15 = renderer.renderFrame(15);
    const ctx15 = canvas15.getContext('2d')!;
    const pixel15_left = ctx15.getImageData(25, 75, 1, 1).data; // Old position
    const pixel15_middle = ctx15.getImageData(75, 75, 1, 1).data; // New position
    expect(pixel15_left[0]).toBe(0); // Should be black (box moved away)
    expect(pixel15_middle[0]).toBe(255); // Should be red (box is here)

    // Render frame 30 - box should be at x=100 (end)
    const canvas30 = renderer.renderFrame(30);
    const ctx30 = canvas30.getContext('2d')!;
    const pixel30_middle = ctx30.getImageData(75, 75, 1, 1).data; // Middle position
    const pixel30_end = ctx30.getImageData(125, 75, 1, 1).data; // Final position
    expect(pixel30_middle[0]).toBe(0); // Should be black
    expect(pixel30_end[0]).toBe(255); // Should be red
  });

  it('should render compound effect animation (x + opacity)', async () => {
    // Component with red box using compound effect
    const componentDef = {
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 0,
          y: 50,
          width: 50,
          height: 50,
          fill: '#FF0000'
        }
      ],
      animations: [
        {
          target: 'box',
          effect: 'test-slide-fade',
          start: 0
        }
      ]
    };

    const componentPath = join(tempDir, 'fade-comp.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    let animation: AnimationFile = {
      project: {
        width: 200,
        height: 200,
        fps: 30,
        frames: 31
      },
      objects: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          fill: '#000000'
        },
        {
          type: 'component',
          id: 'fade-comp',
          source: './fade-comp.json',
          x: 0,
          y: 0,
          start: 0
        }
      ]
    };

    // Process animation
    animation = await preprocessAnimation(animation);
    animation.objects = await expandComponents(animation.objects, tempDir, animation.project.fps);

    const componentAnimations = extractAnimationsFromGroups(animation.objects);
    if (componentAnimations.length > 0) {
      const expandedAnimations: SequenceAnimation[] = [];
      for (const anim of componentAnimations) {
        if ('effect' in anim && typeof anim.effect === 'string') {
          const propAnims = await expandEffectAnimation(anim as EffectAnimation, animation.project.fps);
          expandedAnimations.push(...propAnims);
        } else {
          expandedAnimations.push(anim);
        }
      }

      if (!animation.sequences) {
        animation.sequences = [];
      }
      animation.sequences.push({
        name: 'component-animations',
        animations: expandedAnimations
      });
    }

    const renderer = new Renderer(animation);

    // Frame 0 - box at x=0, opacity=0 (invisible)
    const canvas0 = renderer.renderFrame(0);
    const ctx0 = canvas0.getContext('2d')!;
    const pixel0 = ctx0.getImageData(25, 75, 1, 1).data;
    expect(pixel0[0]).toBe(0); // Should be black (invisible box)

    // Frame 15 - box at x=50, opacity=0.5 (semi-transparent red)
    const canvas15 = renderer.renderFrame(15);
    const ctx15 = canvas15.getContext('2d')!;
    const pixel15 = ctx15.getImageData(75, 75, 1, 1).data;
    expect(pixel15[0]).toBeGreaterThan(0); // Should have some red
    expect(pixel15[0]).toBeLessThan(255); // But not fully opaque

    // Frame 30 - box at x=100, opacity=1 (fully visible)
    const canvas30 = renderer.renderFrame(30);
    const ctx30 = canvas30.getContext('2d')!;
    const pixel30 = ctx30.getImageData(125, 75, 1, 1).data;
    expect(pixel30[0]).toBe(255); // Should be fully red
  });
});
