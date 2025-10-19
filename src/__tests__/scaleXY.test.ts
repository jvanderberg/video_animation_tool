import { describe, it, expect } from 'vitest';
import { Renderer } from '../renderer.js';
import { getPixelFromPNG } from '../test-helpers.js';
import type { AnimationFile } from '../types.js';

describe('ScaleX/ScaleY Transform', () => {
  it('should apply scaleX to stretch horizontally', async () => {
    const animation: AnimationFile = {
      project: { width: 300, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 150,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          scaleX: 2.0,  // Stretch horizontally
          fill: '#FF0000'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // At 2x scaleX, 40x40 rect becomes 80x40, centered at (150, 100)
    // Horizontally spans from (110, 100) to (190, 100)
    // Vertically spans from (80, 100) to (120, 100)

    // Center should be red
    const center = await getPixelFromPNG(buffer, 150, 100);
    expect(center[0]).toBeGreaterThan(200);

    // Extended horizontal boundary (170, 100) should be red
    const horzEdge = await getPixelFromPNG(buffer, 170, 100);
    expect(horzEdge[0]).toBeGreaterThan(200);

    // Outside horizontal boundary (195, 100) should be transparent
    const outside = await getPixelFromPNG(buffer, 195, 100);
    expect(outside[3]).toBe(0);

    // Vertical boundary should NOT be extended (remains 40 high)
    const vertOutside = await getPixelFromPNG(buffer, 150, 130);
    expect(vertOutside[3]).toBe(0);
  });

  it('should apply scaleY to stretch vertically', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 300, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 150,
          width: 40,
          height: 40,
          anchor: 'center',
          scaleY: 2.0,  // Stretch vertically
          fill: '#00FF00'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // At 2x scaleY, 40x40 rect becomes 40x80, centered at (100, 150)

    // Center should be green
    const center = await getPixelFromPNG(buffer, 100, 150);
    expect(center[1]).toBeGreaterThan(200);

    // Extended vertical boundary (100, 170) should be green
    const vertEdge = await getPixelFromPNG(buffer, 100, 170);
    expect(vertEdge[1]).toBeGreaterThan(200);

    // Outside vertical boundary (100, 195) should be transparent
    const outside = await getPixelFromPNG(buffer, 100, 195);
    expect(outside[3]).toBe(0);

    // Horizontal boundary should NOT be extended (remains 40 wide)
    const horzOutside = await getPixelFromPNG(buffer, 130, 150);
    expect(horzOutside[3]).toBe(0);
  });

  it('should apply both scaleX and scaleY', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 20,
          anchor: 'center',
          scaleX: 2.0,  // Stretch horizontally
          scaleY: 3.0,  // Stretch vertically even more
          fill: '#0000FF'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // At 2x scaleX and 3x scaleY, 40x20 rect becomes 80x60
    // Horizontally: (60, 140)
    // Vertically: (70, 130)

    // Center should be blue
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[2]).toBeGreaterThan(200);

    // Extended horizontal boundary (130, 100) should be blue
    const horzEdge = await getPixelFromPNG(buffer, 130, 100);
    expect(horzEdge[2]).toBeGreaterThan(200);

    // Extended vertical boundary (100, 120) should be blue
    const vertEdge = await getPixelFromPNG(buffer, 100, 120);
    expect(vertEdge[2]).toBeGreaterThan(200);
  });

  it('should combine scaleX/scaleY with uniform scale', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          scale: 0.5,   // Scale down to half
          scaleX: 2.0,  // Then stretch horizontally
          fill: '#FF00FF'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // First uniform scale: 40x40 -> 20x20
    // Then scaleX: 20x20 -> 40x20
    // Result: 40x20 centered at (100, 100)

    // Center should be magenta
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[0]).toBeGreaterThan(200);
    expect(center[2]).toBeGreaterThan(200);

    // Horizontal edge at (115, 100) should be magenta
    const horzEdge = await getPixelFromPNG(buffer, 115, 100);
    expect(horzEdge[0]).toBeGreaterThan(200);

    // Vertical should be smaller (105, 100) should be magenta but (115, 100) vertically out
    const vertNear = await getPixelFromPNG(buffer, 100, 105);
    expect(vertNear[0]).toBeGreaterThan(200);
  });

  it('should animate scaleX property', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 60 },
      objects: [
        {
          id: 'box',
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          scaleX: 1,
          fill: '#FFFF00'
        }
      ],
      sequences: [
        {
          name: 'stretch',
          animations: [
            {
              target: 'box',
              property: 'scaleX',
              keyframes: [
                { frame: 0, value: 1 },
                { frame: 60, value: 2.0 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Frame 0: scaleX = 1.0 (normal)
    const buffer0 = await renderer.exportFrame(0);
    const pixel0 = await getPixelFromPNG(buffer0, 130, 100);
    expect(pixel0[3]).toBe(0); // Outside 40x40

    // Frame 30: scaleX = 1.5 (40x40 -> 60x40)
    const buffer30 = await renderer.exportFrame(30);
    const pixel30 = await getPixelFromPNG(buffer30, 125, 100);
    expect(pixel30[0]).toBeGreaterThan(200); // Inside 60x40

    // Frame 60: scaleX = 2.0 (40x40 -> 80x40)
    const buffer60 = await renderer.exportFrame(60);
    const pixel60 = await getPixelFromPNG(buffer60, 135, 100);
    expect(pixel60[0]).toBeGreaterThan(200); // Inside 80x40
  });

  it('should animate scaleY property', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 60 },
      objects: [
        {
          id: 'box',
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          scaleY: 1,
          fill: '#00FFFF'
        }
      ],
      sequences: [
        {
          name: 'stretch',
          animations: [
            {
              target: 'box',
              property: 'scaleY',
              keyframes: [
                { frame: 0, value: 1 },
                { frame: 60, value: 2.0 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Frame 0: scaleY = 1.0 (normal)
    const buffer0 = await renderer.exportFrame(0);
    const pixel0 = await getPixelFromPNG(buffer0, 100, 130);
    expect(pixel0[3]).toBe(0); // Outside 40x40

    // Frame 60: scaleY = 2.0 (40x40 -> 40x80)
    const buffer60 = await renderer.exportFrame(60);
    const pixel60 = await getPixelFromPNG(buffer60, 100, 130);
    expect(pixel60[1]).toBeGreaterThan(200); // Inside 40x80
  });

  it('should apply scaleX/scaleY to groups', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'group',
          x: 100,
          y: 100,
          scaleX: 2.0,
          scaleY: 0.5,
          children: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              width: 20,
              height: 40,
              anchor: 'center',
              fill: '#FF0000'
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // Child is 20x40, with group scaleX=2.0 and scaleY=0.5
    // Result: 40x20 centered at (100, 100)

    // Center should be red
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[0]).toBeGreaterThan(200);

    // Horizontally extended (115, 100) should be red
    const horzEdge = await getPixelFromPNG(buffer, 115, 100);
    expect(horzEdge[0]).toBeGreaterThan(200);

    // Vertically compressed, so (100, 115) should be transparent
    const vertOutside = await getPixelFromPNG(buffer, 100, 115);
    expect(vertOutside[3]).toBe(0);
  });

  it('should use scaleX=1 and scaleY=1 as defaults', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          // No scaleX/scaleY specified
          fill: '#FFFFFF'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // Should be normal 40x40
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[0]).toBe(255);

    // Edge at (119, 100) should be white
    const edge = await getPixelFromPNG(buffer, 119, 100);
    expect(edge[0]).toBe(255);

    // Outside at (125, 100) should be transparent
    const outside = await getPixelFromPNG(buffer, 125, 100);
    expect(outside[3]).toBe(0);
  });

  it('should create squash and stretch effect', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 200, fps: 60, frames: 1 },
      objects: [
        {
          type: 'rect',
          x: 100,
          y: 100,
          width: 40,
          height: 40,
          anchor: 'center',
          scaleX: 1.5,  // Wider
          scaleY: 0.5,  // Shorter (squashed)
          fill: '#00FF00'
        }
      ]
    };

    const renderer = new Renderer(animation);
    const buffer = await renderer.exportFrame(0);

    // 40x40 -> 60x20 (squashed)
    const center = await getPixelFromPNG(buffer, 100, 100);
    expect(center[1]).toBeGreaterThan(200); // Green

    // Wide but short
    const wide = await getPixelFromPNG(buffer, 125, 100);
    expect(wide[1]).toBeGreaterThan(200);

    const tall = await getPixelFromPNG(buffer, 100, 115);
    expect(tall[3]).toBe(0); // Transparent
  });
});
