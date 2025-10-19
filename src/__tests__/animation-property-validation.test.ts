import { describe, it, expect } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import type { AnimationFile } from '../types.js';

describe('Animation Property Validation', () => {
  it('should reject animating non-existent property on rect', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' }
      ],
      sequences: [
        {
          name: 'test',
          animations: [
            {
              target: 'box',
              property: 'radius', // rect doesn't have radius
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 30, value: 50 }
              ]
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /property 'radius'.*not valid.*rect/i
    );
  });

  it('should reject animating non-existent property on circle', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'circle', id: 'circle', radius: 50, fill: '#FF0000' }
      ],
      sequences: [
        {
          name: 'test',
          animations: [
            {
              target: 'circle',
              property: 'width', // circle doesn't have width
              keyframes: [
                { frame: 0, value: 50 },
                { frame: 30, value: 100 }
              ]
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /property 'width'.*not valid.*circle/i
    );
  });

  it('should reject animating property on non-existent target', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' }
      ],
      sequences: [
        {
          name: 'test',
          animations: [
            {
              target: 'nonexistent',
              property: 'x',
              keyframes: [
                { frame: 0, value: 0 },
                { frame: 30, value: 100 }
              ]
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /target.*nonexistent.*not found/i
    );
  });

  it('should accept animating common properties on any object', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' },
        { type: 'circle', id: 'circle', radius: 50, fill: '#00FF00' }
      ],
      sequences: [
        {
          name: 'test',
          animations: [
            {
              target: 'box',
              property: 'x',
              keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 100 }]
            },
            {
              target: 'box',
              property: 'opacity',
              keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }]
            },
            {
              target: 'circle',
              property: 'rotation',
              keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 360 }]
            },
            {
              target: 'circle',
              property: 'scale',
              keyframes: [{ frame: 0, value: 1 }, { frame: 30, value: 2 }]
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).resolves.toBeDefined();
  });

  it('should accept animating object-specific properties', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' },
        { type: 'circle', id: 'circle', radius: 50, fill: '#00FF00' },
        { type: 'ellipse', id: 'ellipse', radiusX: 50, radiusY: 30, fill: '#0000FF' }
      ],
      sequences: [
        {
          name: 'test',
          animations: [
            {
              target: 'box',
              property: 'width',
              keyframes: [{ frame: 0, value: 100 }, { frame: 30, value: 200 }]
            },
            {
              target: 'circle',
              property: 'radius',
              keyframes: [{ frame: 0, value: 50 }, { frame: 30, value: 100 }]
            },
            {
              target: 'ellipse',
              property: 'radiusX',
              keyframes: [{ frame: 0, value: 50 }, { frame: 30, value: 100 }]
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).resolves.toBeDefined();
  });

  it('should accept animating nested clip properties', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' }
      ],
      sequences: [
        {
          name: 'test',
          animations: [
            {
              target: 'box',
              property: 'clip.width',
              keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 100 }]
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).resolves.toBeDefined();
  });

  it('should validate properties in groups', async () => {
    const animation: AnimationFile = {
      project: { width: 800, height: 600, fps: 30 },
      objects: [
        {
          type: 'group',
          children: [
            { type: 'rect', id: 'box', width: 100, height: 100, fill: '#FF0000' }
          ]
        }
      ],
      sequences: [
        {
          name: 'test',
          animations: [
            {
              target: 'box',
              property: 'radius', // invalid for rect
              keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 50 }]
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /property 'radius'.*not valid/i
    );
  });
});
