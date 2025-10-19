import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { expandEffectAnimation } from '../preprocessor.js';
import { writeFile, mkdir, rm, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EffectAnimation } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const effectsDir = join(__dirname, '../../effects');

describe('Effect Validation', () => {
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

  it('should reject quoted numeric values in effects', async () => {
    // Create effect with invalid quoted numbers
    const invalidEffect = {
      description: "Invalid effect with quoted numbers",
      duration: 1.0,
      properties: {
        x: [
          {"time": 0.0, "value": "200"},  // Invalid: should be 200
          {"time": 1.0, "value": "0"}     // Invalid: should be 0
        ]
      }
    };

    const effectPath = join(effectsDir, 'invalid-quoted.json');
    await writeFile(effectPath, JSON.stringify(invalidEffect));
    createdEffectFiles.push(effectPath);

    const effectAnim: EffectAnimation = {
      target: 'box',
      effect: 'invalid-quoted',
      start: 0
    };

    await expect(expandEffectAnimation(effectAnim, 30)).rejects.toThrow(
      /value "200" is a string.*Use a number instead/
    );
  });

  it('should reject invalid string values in effects', async () => {
    const invalidEffect = {
      description: "Invalid effect with non-numeric string",
      duration: 1.0,
      properties: {
        x: [
          {"time": 0.0, "value": "foo"},  // Invalid: not a number or percentage
          {"time": 1.0, "value": 0}
        ]
      }
    };

    const effectPath = join(effectsDir, 'invalid-string.json');
    await writeFile(effectPath, JSON.stringify(invalidEffect));
    createdEffectFiles.push(effectPath);

    const effectAnim: EffectAnimation = {
      target: 'box',
      effect: 'invalid-string',
      start: 0
    };

    await expect(expandEffectAnimation(effectAnim, 30)).rejects.toThrow(
      /"foo" is not a valid value/
    );
  });

  it('should accept valid numeric values', async () => {
    const validEffect = {
      description: "Valid effect with numbers",
      duration: 1.0,
      properties: {
        x: [
          {"time": 0.0, "value": 200},
          {"time": 1.0, "value": 0}
        ]
      }
    };

    const effectPath = join(effectsDir, 'valid-numeric.json');
    await writeFile(effectPath, JSON.stringify(validEffect));
    createdEffectFiles.push(effectPath);

    const effectAnim: EffectAnimation = {
      target: 'box',
      effect: 'valid-numeric',
      start: 0
    };

    const result = await expandEffectAnimation(effectAnim, 30);
    expect(result.length).toBe(1);
    expect(result[0].keyframes[0].value).toBe(200);
    expect(result[0].keyframes[1].value).toBe(0);
  });

  it('should accept valid percentage strings', async () => {
    const validEffect = {
      description: "Valid effect with percentages",
      duration: 1.0,
      properties: {
        x: [
          {"time": 0.0, "value": "50%"},
          {"time": 1.0, "value": "-25%"}
        ]
      }
    };

    const effectPath = join(effectsDir, 'valid-percent.json');
    await writeFile(effectPath, JSON.stringify(validEffect));
    createdEffectFiles.push(effectPath);

    const effectAnim: EffectAnimation = {
      target: 'box',
      effect: 'valid-percent',
      start: 0
    };

    const result = await expandEffectAnimation(effectAnim, 30);
    expect(result.length).toBe(1);
    expect(result[0].keyframes[0].value).toBe("50%");
    expect(result[0].keyframes[1].value).toBe("-25%");
  });

  it('should reject non-string, non-number values', async () => {
    const invalidEffect = {
      description: "Invalid effect with boolean",
      duration: 1.0,
      properties: {
        opacity: [
          {"time": 0.0, "value": true},  // Invalid: boolean
          {"time": 1.0, "value": 1}
        ]
      }
    };

    const effectPath = join(effectsDir, 'invalid-bool.json');
    await writeFile(effectPath, JSON.stringify(invalidEffect));
    createdEffectFiles.push(effectPath);

    const effectAnim: EffectAnimation = {
      target: 'box',
      effect: 'invalid-bool',
      start: 0
    };

    await expect(expandEffectAnimation(effectAnim, 30)).rejects.toThrow(
      /value must be a number or percentage string/
    );
  });
});
