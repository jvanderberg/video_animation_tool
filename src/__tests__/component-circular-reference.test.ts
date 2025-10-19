import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { expandComponents } from '../components.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Component Circular Reference Detection', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), 'circular-ref-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should detect direct circular reference (A -> A)', async () => {
    // Component that references itself
    const componentA = {
      objects: [
        {
          type: 'component',
          id: 'self',
          source: './component-a.json',
          start: 0
        }
      ]
    };

    await writeFile(join(tempDir, 'component-a.json'), JSON.stringify(componentA));

    const objects = [
      {
        type: 'component',
        id: 'a',
        source: './component-a.json',
        start: 0
      }
    ];

    await expect(expandComponents(objects as any, tempDir, 30)).rejects.toThrow(
      /circular.*reference.*component-a\.json/i
    );
  });

  it('should detect indirect circular reference (A -> B -> A)', async () => {
    // Component A references B
    const componentA = {
      objects: [
        {
          type: 'component',
          id: 'b-instance',
          source: './component-b.json',
          start: 0
        }
      ]
    };

    // Component B references A
    const componentB = {
      objects: [
        {
          type: 'component',
          id: 'a-instance',
          source: './component-a.json',
          start: 0
        }
      ]
    };

    await writeFile(join(tempDir, 'component-a.json'), JSON.stringify(componentA));
    await writeFile(join(tempDir, 'component-b.json'), JSON.stringify(componentB));

    const objects = [
      {
        type: 'component',
        id: 'a',
        source: './component-a.json',
        start: 0
      }
    ];

    await expect(expandComponents(objects as any, tempDir, 30)).rejects.toThrow(
      /circular.*reference/i
    );
  });

  it('should detect longer circular reference (A -> B -> C -> A)', async () => {
    const componentA = {
      objects: [
        {
          type: 'component',
          id: 'b',
          source: './component-b.json',
          start: 0
        }
      ]
    };

    const componentB = {
      objects: [
        {
          type: 'component',
          id: 'c',
          source: './component-c.json',
          start: 0
        }
      ]
    };

    const componentC = {
      objects: [
        {
          type: 'component',
          id: 'a',
          source: './component-a.json',
          start: 0
        }
      ]
    };

    await writeFile(join(tempDir, 'component-a.json'), JSON.stringify(componentA));
    await writeFile(join(tempDir, 'component-b.json'), JSON.stringify(componentB));
    await writeFile(join(tempDir, 'component-c.json'), JSON.stringify(componentC));

    const objects = [
      {
        type: 'component',
        id: 'a',
        source: './component-a.json',
        start: 0
      }
    ];

    await expect(expandComponents(objects as any, tempDir, 30)).rejects.toThrow(
      /circular.*reference/i
    );
  });

  it('should allow valid nested components without cycles', async () => {
    const componentB = {
      objects: [
        { type: 'rect', id: 'box', width: 50, height: 50, fill: '#FF0000' }
      ]
    };

    const componentA = {
      objects: [
        {
          type: 'component',
          id: 'b1',
          source: './component-b.json',
          start: 0
        },
        {
          type: 'component',
          id: 'b2',
          source: './component-b.json',
          start: 30
        }
      ]
    };

    await writeFile(join(tempDir, 'component-a.json'), JSON.stringify(componentA));
    await writeFile(join(tempDir, 'component-b.json'), JSON.stringify(componentB));

    const objects = [
      {
        type: 'component',
        id: 'a',
        source: './component-a.json',
        start: 0
      }
    ];

    // Should not throw - it's valid to use the same component multiple times
    await expect(expandComponents(objects as any, tempDir, 30)).resolves.toBeDefined();
  });

  it('should allow diamond dependency (A -> B, A -> C, B -> D, C -> D)', async () => {
    const componentD = {
      objects: [
        { type: 'rect', id: 'box', width: 50, height: 50, fill: '#FF0000' }
      ]
    };

    const componentB = {
      objects: [
        {
          type: 'component',
          id: 'd',
          source: './component-d.json',
          start: 0
        }
      ]
    };

    const componentC = {
      objects: [
        {
          type: 'component',
          id: 'd',
          source: './component-d.json',
          start: 0
        }
      ]
    };

    const componentA = {
      objects: [
        {
          type: 'component',
          id: 'b',
          source: './component-b.json',
          start: 0
        },
        {
          type: 'component',
          id: 'c',
          source: './component-c.json',
          start: 30
        }
      ]
    };

    await writeFile(join(tempDir, 'component-a.json'), JSON.stringify(componentA));
    await writeFile(join(tempDir, 'component-b.json'), JSON.stringify(componentB));
    await writeFile(join(tempDir, 'component-c.json'), JSON.stringify(componentC));
    await writeFile(join(tempDir, 'component-d.json'), JSON.stringify(componentD));

    const objects = [
      {
        type: 'component',
        id: 'a',
        source: './component-a.json',
        start: 0
      }
    ];

    // Diamond dependencies are valid - not a cycle
    await expect(expandComponents(objects as any, tempDir, 30)).resolves.toBeDefined();
  });
});
