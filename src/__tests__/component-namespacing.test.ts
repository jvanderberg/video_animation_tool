import { describe, it, expect, beforeEach } from 'vitest';
import { expandComponent } from '../components.js';
import fs from 'fs/promises';
import { vi } from 'vitest';
import type { ComponentObject } from '../types.js';

// Mock fs.readFile
vi.mock('fs/promises');

describe('Component Namespacing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require id on component objects', async () => {
    const component: ComponentObject = {
      type: 'component',
      source: './components/button.json'
    } as any;

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', id: 'bg', width: 100, height: 50 }
      ]
    }));

    // Should throw error when component has no id
    await expect(expandComponent(component, '.')).rejects.toThrow(
      'Component objects must have an id for namespacing'
    );
  });

  it('should prefix component object IDs with component id', async () => {
    const component: ComponentObject = {
      type: 'component',
      id: 'btn-1',
      source: './components/button.json'
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', id: 'background', width: 100, height: 50, fill: '#000' },
        { type: 'text', id: 'label', content: 'Click me', x: 50, y: 25 }
      ]
    }));

    const result = await expandComponent(component, '.');

    // Result is a group with children
    expect(result.type).toBe('group');
    expect(result.children.length).toBe(2);

    // IDs should be prefixed with component id
    expect(result.children[0].id).toBe('btn-1.background');
    expect(result.children[1].id).toBe('btn-1.label');
  });

  it('should allow same component to be used multiple times with different IDs', async () => {
    const component1: ComponentObject = {
      type: 'component',
      id: 'button-1',
      source: './components/button.json'
    };

    const component2: ComponentObject = {
      type: 'component',
      id: 'button-2',
      source: './components/button.json'
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', id: 'bg', width: 100, height: 50, fill: '#000' }
      ]
    }));

    const result1 = await expandComponent(component1, '.');
    const result2 = await expandComponent(component2, '.');

    // Different namespaces
    expect(result1.children[0].id).toBe('button-1.bg');
    expect(result2.children[0].id).toBe('button-2.bg');
  });

  it('should handle nested groups within components', async () => {
    const component: ComponentObject = {
      type: 'component',
      id: 'comp-1',
      source: './components/test.json'
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        {
          type: 'group',
          id: 'container',
          children: [
            { type: 'rect', id: 'child1', width: 50, height: 50 },
            { type: 'rect', id: 'child2', width: 50, height: 50 }
          ]
        }
      ]
    }));

    const result = await expandComponent(component, '.');

    // Group ID should be prefixed
    expect(result.children[0].id).toBe('comp-1.container');

    // Children IDs should be prefixed
    const group = result.children[0] as any;
    expect(group.children[0].id).toBe('comp-1.child1');
    expect(group.children[1].id).toBe('comp-1.child2');
  });

  it('should handle objects without IDs by not adding them', async () => {
    const component: ComponentObject = {
      type: 'component',
      id: 'comp-1',
      source: './components/test.json'
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({
      objects: [
        { type: 'rect', width: 100, height: 50, fill: '#000' }, // No ID
        { type: 'rect', id: 'named', width: 100, height: 50, fill: '#FFF' }
      ]
    }));

    const result = await expandComponent(component, '.');

    // First object has no id (undefined or not set)
    expect(result.children[0].id).toBeUndefined();

    // Second object gets prefixed
    expect(result.children[1].id).toBe('comp-1.named');
  });
});
