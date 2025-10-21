import { describe, it, expect } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import { Renderer } from '../renderer.js';
import { getPixelFromPNG, hexToRgb, colorMatches } from '../test-helpers.js';
import type { AnimationFile } from '../types.js';

describe('Start-based times in nested groups', () => {
  it('should render animations with start times in seconds', async () => {
    const animation: AnimationFile = {
      project: {
        width: 400,
        height: 400,
        fps: 60,
        frames: 200
      },
      objects: [
        {
          type: 'rect',
          id: 'background',
          x: 0,
          y: 0,
          width: 400,
          height: 400,
          fill: '#1a1a2e'
        },
        {
          type: 'group',
          id: 'parent',
          x: 0,
          y: 0,
          animationSpeed: 0.5,
          animations: [
            {
              target: 'child-group',
              property: 'x',
              keyframes: [
                { start: '1.0s', value: 0 },
                { start: '2.0s', value: 100 }
              ]
            },
            {
              target: 'box',
              property: 'height',
              keyframes: [
                { start: '1.0s', value: 0 },
                { start: '2.0s', value: 50 }
              ]
            }
          ],
          children: [
            {
              type: 'group',
              id: 'child-group',
              x: 0,
              y: 100,
              children: [
                {
                  type: 'rect',
                  id: 'box',
                  x: 0,
                  y: 0,
                  width: 50,
                  height: 0,
                  anchor: 'bottom-left',
                  fill: '#FF0000'
                }
              ]
            }
          ]
        }
      ]
    };

    const processed = await preprocessAnimation(animation);

    // Check that animations were extracted
    const childGroupXAnim = processed.animations?.find(
      a => a.target === 'parent.child-group' && a.property === 'x'
    );
    const boxHeightAnim = processed.animations?.find(
      a => a.target === 'parent.child-group.box' && a.property === 'height'
    );

    expect(childGroupXAnim).toBeDefined();
    expect(boxHeightAnim).toBeDefined();

    // At frame 150 (2.5 seconds at 60fps):
    // - With animationSpeed 0.5:
    //   - start "1.0s" = 60 frames / 0.5 = frame 120
    //   - start "2.0s" = 120 frames / 0.5 = frame 240
    //   - At frame 150, we're between 120 and 240, so animations should be in progress

    const renderer = new Renderer(processed);
    const buffer = await renderer.exportFrame(150);

    // Check that red box is visible somewhere
    // Box should be at x=50 (halfway between 0 and 100), y=100, height=25 (halfway between 0 and 50)
    const redColor = hexToRgb('#FF0000');

    // Sample a pixel in the middle of where the box should be
    const testX = 50;  // x position after partial animation
    const testY = 90;  // y=100 (group) - 10 (halfway up the box)

    const pixel = await getPixelFromPNG(buffer, testX, testY);

    console.log(`Pixel at (${testX}, ${testY}):`, pixel);
    console.log('Expected red:', redColor);

    // The box should be visible (red with full opacity)
    expect(pixel[3]).toBeGreaterThan(200); // Alpha should be high
    expect(colorMatches(pixel, redColor)).toBe(true);
  });

  it('should show preprocessed animation frames', async () => {
    const animation: AnimationFile = {
      project: {
        width: 400,
        height: 400,
        fps: 60,
        frames: 200
      },
      objects: [
        {
          type: 'group',
          id: 'parent',
          x: 0,
          y: 0,
          animationSpeed: 0.5,
          animations: [
            {
              target: 'child-group',
              property: 'x',
              keyframes: [
                { start: '1.0s', value: 0 },
                { start: '2.0s', value: 100 }
              ]
            }
          ],
          children: [
            {
              type: 'group',
              id: 'child-group',
              x: 0,
              y: 100,
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
        }
      ]
    };

    const processed = await preprocessAnimation(animation);

    const childGroupXAnim = processed.animations?.find(
      a => a.target === 'parent.child-group' && a.property === 'x'
    );

    if (childGroupXAnim && 'keyframes' in childGroupXAnim) {
      console.log('child-group x animation keyframes:', childGroupXAnim.keyframes);
      // With animationSpeed 0.5:
      // start "1.0s" = 60 frames, divided by 0.5 = 120 frames
      // start "2.0s" = 120 frames, divided by 0.5 = 240 frames
      expect(childGroupXAnim.keyframes[0].frame).toBe(120);
      expect(childGroupXAnim.keyframes[1].frame).toBe(240);
    }
  });
});
