import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import type { AnimationFile, PropertyAnimation } from '../types.js';
import { writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const effectsDir = join(__dirname, '../../effects');

describe('Effect Property Substitution', () => {
  // We'll create test effects in the real effects directory and clean them up after
  const testEffects = ['testSlide', 'testMulti', 'testDefaults', 'testString'];

  afterAll(async () => {
    // Clean up test effects
    for (const effectName of testEffects) {
      try {
        await rm(join(effectsDir, `${effectName}.json`), { force: true });
      } catch (e) {
        // Ignore errors
      }
    }
  });

  it('should substitute {x} with object\'s current x value', async () => {
    // Create a test effect that uses {x} substitution
    const effectDef = {
      description: 'Slide to current position',
      duration: 0.5,
      properties: {
        x: [
          { time: 0.0, value: -200 },
          { time: 1.0, value: '{x}', easing: 'ease-out' }
        ],
        opacity: [
          { time: 0.0, value: 0 },
          { time: 1.0, value: 1 }
        ]
      }
    };

    await writeFile(
      join(effectsDir, 'testSlide.json'),
      JSON.stringify(effectDef)
    );

    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'text',
          id: 'text1',
          content: 'Hello',
          x: 500,  // Object is at x=500
          y: 100,
          size: 48,
          color: '#FFFFFF'
        }
      ],
      animations: [
        {
          target: 'text1',
          effect: 'testSlide',
          start: 0
        }
      ]
    };

    const result = await preprocessAnimation(animation);

    // Find the x animation
    const xAnim = result.animations?.find(
      a => a.target === 'text1' && (a as PropertyAnimation).property === 'x'
    ) as PropertyAnimation;

    expect(xAnim).toBeDefined();
    expect(xAnim.keyframes).toHaveLength(2);
    expect(xAnim.keyframes[0].value).toBe(-200); // Start value unchanged
    expect(xAnim.keyframes[1].value).toBe(500);  // {x} substituted with object's x=500
  });

  it('should substitute multiple properties in same effect', async () => {
    const effectDef = {
      description: 'Scale and position effect',
      duration: 0.5,
      properties: {
        x: [
          { time: 0.0, value: 0 },
          { time: 1.0, value: '{x}' }
        ],
        y: [
          { time: 0.0, value: 0 },
          { time: 1.0, value: '{y}' }
        ],
        scale: [
          { time: 0.0, value: 0 },
          { time: 1.0, value: '{scale}' }
        ]
      }
    };

    await writeFile(
      join(effectsDir, 'testMulti.json'),
      JSON.stringify(effectDef)
    );

    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 300,
          y: 400,
          width: 100,
          height: 100,
          fill: '#FF0000',
          scale: 1.5
        }
      ],
      animations: [
        {
          target: 'box',
          effect: 'testMulti',
          start: 0
        }
      ]
    };

    const result = await preprocessAnimation(animation);

    const xAnim = result.animations?.find(
      a => a.target === 'box' && (a as PropertyAnimation).property === 'x'
    ) as PropertyAnimation;
    const yAnim = result.animations?.find(
      a => a.target === 'box' && (a as PropertyAnimation).property === 'y'
    ) as PropertyAnimation;
    const scaleAnim = result.animations?.find(
      a => a.target === 'box' && (a as PropertyAnimation).property === 'scale'
    ) as PropertyAnimation;

    expect(xAnim.keyframes[1].value).toBe(300);
    expect(yAnim.keyframes[1].value).toBe(400);
    expect(scaleAnim.keyframes[1].value).toBe(1.5);
  });

  it('should use default value of 1 for undefined numeric properties', async () => {
    const effectDef = {
      description: 'Test default values',
      duration: 0.5,
      properties: {
        scale: [
          { time: 0.0, value: 0 },
          { time: 1.0, value: '{scale}' }
        ],
        opacity: [
          { time: 0.0, value: 0 },
          { time: 1.0, value: '{opacity}' }
        ]
      }
    };

    await writeFile(
      join(effectsDir, 'testDefaults.json'),
      JSON.stringify(effectDef)
    );

    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'rect',
          id: 'box',
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          fill: '#FF0000'
          // scale and opacity not defined - should default to 1
        }
      ],
      animations: [
        {
          target: 'box',
          effect: 'testDefaults',
          start: 0
        }
      ]
    };

    const result = await preprocessAnimation(animation);

    const scaleAnim = result.animations?.find(
      a => a.target === 'box' && (a as PropertyAnimation).property === 'scale'
    ) as PropertyAnimation;
    const opacityAnim = result.animations?.find(
      a => a.target === 'box' && (a as PropertyAnimation).property === 'opacity'
    ) as PropertyAnimation;

    expect(scaleAnim.keyframes[1].value).toBe(1); // Default scale
    expect(opacityAnim.keyframes[1].value).toBe(1); // Default opacity
  });

  it('should work with string values for substitution tokens', async () => {
    const effectDef = {
      description: 'Test with literal numeric strings',
      duration: 0.5,
      properties: {
        x: [
          { time: 0.0, value: 0 },
          { time: 1.0, value: '{x}' }  // String token
        ]
      }
    };

    await writeFile(
      join(effectsDir, 'testString.json'),
      JSON.stringify(effectDef)
    );

    const animation: AnimationFile = {
      project: { width: 1920, height: 1080, fps: 60, frames: 60 },
      objects: [
        {
          type: 'text',
          id: 'text1',
          content: 'Test',
          x: 750,
          y: 100,
          size: 48,
          color: '#FFFFFF'
        }
      ],
      animations: [
        {
          target: 'text1',
          effect: 'testString',
          start: 0
        }
      ]
    };

    const result = await preprocessAnimation(animation);

    const xAnim = result.animations?.find(
      a => a.target === 'text1' && (a as PropertyAnimation).property === 'x'
    ) as PropertyAnimation;

    expect(xAnim.keyframes[1].value).toBe(750);
  });
});
