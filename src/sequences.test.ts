import { describe, it, expect } from 'vitest';
import { Renderer } from './renderer.js';
import type { AnimationFile } from './types.js';

describe('Animation Sequences', () => {
  it('should animate object using sequence targeting', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          id: 'box',
          type: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#FF0000'
        }
      ],
      sequences: [
        {
          name: 'move-right',
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 50 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // At start, box should be at x=0
    renderer.renderFrame(0);
    expect(renderer.getPixel(5, 5)[0]).toBeGreaterThan(200); // Red

    // At frame 30, box should be around x=25
    renderer.renderFrame(30);
    expect(renderer.getPixel(25, 5)[0]).toBeGreaterThan(200); // Red
    expect(renderer.getPixel(5, 5)[0]).toBeLessThan(100); // Not at start anymore

    // At end, box should be at x=50
    renderer.renderFrame(60);
    expect(renderer.getPixel(55, 5)[0]).toBeGreaterThan(200); // Red
  });

  it('should run sequences in order', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 100, fps: 30, frames: 90 },
      objects: [
        {
          id: 'box',
          type: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#00FF00'
        }
      ],
      sequences: [
        {
          name: 'first-move',
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 30, value: 50 }
              ]
            }
          ]
        },
        {
          name: 'second-move',
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { frame: 30, value: 50 },
                { frame: 60, value: 100 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Frame 0: x=0
    renderer.renderFrame(0);
    expect(renderer.getPixel(5, 5)[1]).toBeGreaterThan(200); // Green

    // Frame 30: x=50 (end of first sequence)
    renderer.renderFrame(30);
    expect(renderer.getPixel(55, 5)[1]).toBeGreaterThan(200); // Green

    // Frame 60: x=100 (end of second sequence)
    renderer.renderFrame(60);
    expect(renderer.getPixel(105, 5)[1]).toBeGreaterThan(200); // Green
  });

  it('should handle pause sequences', async () => {
    const animation: AnimationFile = {
      project: { width: 200, height: 100, fps: 30, frames: 90 },
      objects: [
        {
          id: 'box',
          type: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#0000FF'
        }
      ],
      sequences: [
        {
          name: 'move',
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 30, value: 50 }
              ]
            }
          ]
        },
        {
          name: 'pause',
          duration: 30  // Hold for 30 frames
        },
        {
          name: 'continue',
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { frame: 60, value: 50 },
                { frame: 90, value: 100 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Frame 30: x=50
    renderer.renderFrame(30);
    expect(renderer.getPixel(55, 5)[2]).toBeGreaterThan(200); // Blue at x=50

    // Frame 45: Still x=50 (pause)
    renderer.renderFrame(45);
    expect(renderer.getPixel(55, 5)[2]).toBeGreaterThan(200); // Blue still at x=50

    // Frame 60: Still x=50 (end of pause, start of next animation)
    renderer.renderFrame(60);
    expect(renderer.getPixel(55, 5)[2]).toBeGreaterThan(200); // Blue at x=50

    // Frame 90: x=100
    renderer.renderFrame(90);
    expect(renderer.getPixel(105, 5)[2]).toBeGreaterThan(200); // Blue at x=100
  });

  it('should run animations within a sequence in parallel', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          id: 'box',
          type: 'rect',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: '#FF00FF',
          opacity: 0
        }
      ],
      sequences: [
        {
          name: 'intro',
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 50 }
              ]
            },
            {
              target: 'box',
              property: 'opacity',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 1 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Frame 0: invisible
    renderer.renderFrame(0);
    expect(renderer.getPixel(5, 5)[3]).toBe(0);

    // Frame 30: partially visible, halfway across
    renderer.renderFrame(30);
    const pixel = renderer.getPixel(27, 5);
    expect(pixel[0]).toBeGreaterThan(100); // Magenta (red component)
    expect(pixel[2]).toBeGreaterThan(100); // Magenta (blue component)
    expect(pixel[3]).toBeGreaterThan(50); // Partially opaque
    expect(pixel[3]).toBeLessThan(255); // Not fully opaque

    // Frame 60: fully visible at x=50
    renderer.renderFrame(60);
    const endPixel = renderer.getPixel(55, 5);
    expect(endPixel[0]).toBeGreaterThan(200);
    expect(endPixel[2]).toBeGreaterThan(200);
    expect(endPixel[3]).toBe(255);
  });

  it('should handle multiple objects in same sequence', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          id: 'red-box',
          type: 'rect',
          x: 0,
          y: 10,
          width: 10,
          height: 10,
          fill: '#FF0000'
        },
        {
          id: 'blue-box',
          type: 'rect',
          x: 0,
          y: 30,
          width: 10,
          height: 10,
          fill: '#0000FF'
        }
      ],
      sequences: [
        {
          name: 'move-both',
          animations: [
            {
              target: 'red-box',
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 50 }
              ]
            },
            {
              target: 'blue-box',
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 80 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    renderer.renderFrame(60);

    // Red box at x=50
    expect(renderer.getPixel(55, 15)[0]).toBeGreaterThan(200);

    // Blue box at x=80
    expect(renderer.getPixel(85, 35)[2]).toBeGreaterThan(200);
  });

  it('should work with groups', async () => {
    const animation: AnimationFile = {
      project: { width: 100, height: 100, fps: 30, frames: 60 },
      objects: [
        {
          id: 'my-group',
          type: 'group',
          x: 0,
          y: 0,
          children: [
            {
              id: 'child',
              type: 'rect',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              fill: '#FFFF00'
            }
          ]
        }
      ],
      sequences: [
        {
          name: 'move-group',
          animations: [
            {
              target: 'my-group',
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 60, value: 50 }
              ]
            }
          ]
        }
      ]
    };

    const renderer = new Renderer(animation);

    // Group at x=0, child renders at (0,0)
    renderer.renderFrame(0);
    expect(renderer.getPixel(5, 5)[0]).toBeGreaterThan(200); // Yellow (red)
    expect(renderer.getPixel(5, 5)[1]).toBeGreaterThan(200); // Yellow (green)

    // Group at x=50, child renders at (50,0)
    renderer.renderFrame(60);
    expect(renderer.getPixel(55, 5)[0]).toBeGreaterThan(200); // Yellow
    expect(renderer.getPixel(55, 5)[1]).toBeGreaterThan(200); // Yellow
  });
});
