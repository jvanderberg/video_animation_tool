import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { preprocessAnimation } from '../preprocessor.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AnimationFile } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const effectsDir = join(__dirname, '../../effects');

describe('Easing Validation', () => {
  let createdEffectFiles: string[] = [];

  afterEach(async () => {
    // Clean up created effect files
    for (const file of createdEffectFiles) {
      try {
        await rm(file);
      } catch {}
    }
    createdEffectFiles = [];
  });

  it('should reject invalid easing function names', async () => {
    const effect = {
      description: "Effect with invalid easing",
      duration: 1.0,
      properties: {
        x: [
          {"time": 0.0, "value": 0},
          {"time": 1.0, "value": 100, "easing": "invalid-easing"}
        ]
      }
    };

    const effectPath = join(effectsDir, 'invalid-easing.json');
    await writeFile(effectPath, JSON.stringify(effect));
    createdEffectFiles.push(effectPath);

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
              effect: 'invalid-easing',
              start: 0
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /unknown easing.*invalid-easing/i
    );
  });

  it('should accept valid easing function names', async () => {
    const validEasings = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce', 'elastic'];

    for (const easing of validEasings) {
      const effect = {
        description: `Effect with ${easing}`,
        duration: 1.0,
        properties: {
          x: [
            {"time": 0.0, "value": 0},
            {"time": 1.0, "value": 100, "easing": easing}
          ]
        }
      };

      const effectPath = join(effectsDir, `test-${easing}.json`);
      await writeFile(effectPath, JSON.stringify(effect));
      createdEffectFiles.push(effectPath);

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
                effect: `test-${easing}`,
                start: 0
              }
            ]
          }
        ]
      };

      await expect(preprocessAnimation(animation)).resolves.toBeDefined();
    }
  });

  it('should validate cubic-bezier parameters are in valid range', async () => {
    const effect = {
      description: "Effect with invalid cubic-bezier",
      duration: 1.0,
      properties: {
        x: [
          {"time": 0.0, "value": 0},
          {"time": 1.0, "value": 100, "easing": "cubic-bezier(2, 0, 1, 1)"} // x1 > 1
        ]
      }
    };

    const effectPath = join(effectsDir, 'invalid-cubic.json');
    await writeFile(effectPath, JSON.stringify(effect));
    createdEffectFiles.push(effectPath);

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
              effect: 'invalid-cubic',
              start: 0
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).rejects.toThrow(
      /cubic-bezier.*x1.*x2.*must be between 0 and 1/i
    );
  });

  it('should accept valid cubic-bezier parameters', async () => {
    const effect = {
      description: "Effect with valid cubic-bezier",
      duration: 1.0,
      properties: {
        x: [
          {"time": 0.0, "value": 0},
          {"time": 1.0, "value": 100, "easing": "cubic-bezier(0.4, 0, 0.6, 1)"}
        ]
      }
    };

    const effectPath = join(effectsDir, 'valid-cubic.json');
    await writeFile(effectPath, JSON.stringify(effect));
    createdEffectFiles.push(effectPath);

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
              effect: 'valid-cubic',
              start: 0
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).resolves.toBeDefined();
  });

  it('should accept cubic-bezier with y values outside 0-1 for overshoot', async () => {
    const effect = {
      description: "Effect with overshoot cubic-bezier",
      duration: 1.0,
      properties: {
        x: [
          {"time": 0.0, "value": 0},
          {"time": 1.0, "value": 100, "easing": "cubic-bezier(0.4, -0.5, 0.6, 1.5)"}
        ]
      }
    };

    const effectPath = join(effectsDir, 'overshoot-cubic.json');
    await writeFile(effectPath, JSON.stringify(effect));
    createdEffectFiles.push(effectPath);

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
              effect: 'overshoot-cubic',
              start: 0
            }
          ]
        }
      ]
    };

    await expect(preprocessAnimation(animation)).resolves.toBeDefined();
  });
});
