import { describe, it, expect } from 'vitest';
import { expandComponent, expandComponents } from '../components.js';
import type { ComponentObject, AnimationObject, GroupObject } from '../types.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Component System', () => {
  it('should load and expand a simple component', async () => {
    // Create a temporary component file
    const tempDir = join(tmpdir(), 'component-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });

    const componentDef = {
      parameters: {
        text: { type: 'string', default: 'Default' },
        color: { type: 'string', default: '#FFFFFF' }
      },
      objects: [
        {
          type: 'text',
          content: '{{text}}',
          x: 0,
          y: 0,
          color: '{{color}}'
        }
      ]
    };

    const componentPath = join(tempDir, 'test.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    // Create a component object
    const component: ComponentObject = {
      type: 'component',
      id: 'test-comp',
      source: './test.json',
      x: 100,
      y: 200,
      params: {
        text: 'Hello',
        color: '#FF0000'
      }
    };

    // Expand the component
    const expanded = await expandComponent(component, tempDir);

    // Should be a group
    expect(expanded.type).toBe('group');
    expect(expanded.x).toBe(100);
    expect(expanded.y).toBe(200);

    // Should have substituted children
    expect(expanded.children).toHaveLength(1);
    expect(expanded.children[0].type).toBe('text');
    expect((expanded.children[0] as any).content).toBe('Hello');
    expect((expanded.children[0] as any).color).toBe('#FF0000');
  });

  it('should use default parameter values', async () => {
    const tempDir = join(tmpdir(), 'component-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });

    const componentDef = {
      parameters: {
        text: { type: 'string', default: 'Default Text' }
      },
      objects: [
        {
          type: 'text',
          content: '{{text}}',
          x: 0,
          y: 0
        }
      ]
    };

    const componentPath = join(tempDir, 'test.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const component: ComponentObject = {
      type: 'component',
      id: 'test-comp',
      source: './test.json',
      x: 0,
      y: 0
    };

    const expanded = await expandComponent(component, tempDir);

    // Should use default value
    expect((expanded.children[0] as any).content).toBe('Default Text');
  });

  it('should substitute multiple template variables', async () => {
    const tempDir = join(tmpdir(), 'component-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });

    const componentDef = {
      parameters: {
        label: { type: 'string', default: 'Label' },
        color: { type: 'string', default: '#000000' },
        size: { type: 'number', default: 16 }
      },
      objects: [
        {
          type: 'text',
          content: '{{label}}',
          color: '{{color}}',
          size: '{{size}}',
          x: 0,
          y: 0
        }
      ]
    };

    const componentPath = join(tempDir, 'test.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const component: ComponentObject = {
      type: 'component',
      id: 'test-comp',
      source: './test.json',
      x: 0,
      y: 0,
      params: {
        label: 'My Label',
        color: '#FF00FF',
        size: 24
      }
    };

    const expanded = await expandComponent(component, tempDir);

    const textObj = expanded.children[0] as any;
    expect(textObj.content).toBe('My Label');
    expect(textObj.color).toBe('#FF00FF');
    expect(textObj.size).toBe(24); // Type preserved when entire value is a template variable
  });

  it('should preserve component transforms', async () => {
    const tempDir = join(tmpdir(), 'component-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });

    const componentDef = {
      objects: [
        { type: 'rect', x: 0, y: 0, width: 10, height: 10 }
      ]
    };

    const componentPath = join(tempDir, 'test.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const component: ComponentObject = {
      type: 'component',
      id: 'test-comp',
      source: './test.json',
      x: 100,
      y: 200,
      scale: 2,
      rotation: 45,
      opacity: 0.5
    };

    const expanded = await expandComponent(component, tempDir);

    expect(expanded.x).toBe(100);
    expect(expanded.y).toBe(200);
    expect(expanded.scale).toBe(2);
    expect(expanded.rotation).toBe(45);
    expect(expanded.opacity).toBe(0.5);
  });

  it('should expand components in an array of objects', async () => {
    const tempDir = join(tmpdir(), 'component-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });

    const componentDef = {
      objects: [
        { type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#FF0000' }
      ]
    };

    const componentPath = join(tempDir, 'box.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const objects: AnimationObject[] = [
      { type: 'rect', x: 0, y: 0, width: 100, height: 100 },
      {
        type: 'component',
        id: 'test-comp',
        source: './box.json',
        x: 50,
        y: 50
      },
      { type: 'text', content: 'Test', x: 100, y: 100 }
    ];

    const expanded = await expandComponents(objects, tempDir);

    expect(expanded).toHaveLength(3);
    expect(expanded[0].type).toBe('rect');
    expect(expanded[1].type).toBe('group'); // Component expanded to group
    expect(expanded[2].type).toBe('text');
  });

  it('should recursively expand components in groups', async () => {
    const tempDir = join(tmpdir(), 'component-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });

    const componentDef = {
      objects: [
        { type: 'circle', x: 0, y: 0, radius: 5, fill: '#0000FF' }
      ]
    };

    const componentPath = join(tempDir, 'dot.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const objects: AnimationObject[] = [
      {
        type: 'group',
        x: 100,
        y: 100,
        children: [
          { type: 'rect', x: 0, y: 0, width: 50, height: 50 },
          {
            type: 'component',
            id: 'test-comp',
            source: './dot.json',
            x: 25,
            y: 25
          }
        ]
      }
    ];

    const expanded = await expandComponents(objects, tempDir);

    expect(expanded).toHaveLength(1);
    expect(expanded[0].type).toBe('group');
    const group = expanded[0] as GroupObject;
    expect(group.children).toHaveLength(2);
    expect(group.children[0].type).toBe('rect');
    expect(group.children[1].type).toBe('group'); // Component expanded to group
  });

  it('should handle components with multiple objects', async () => {
    const tempDir = join(tmpdir(), 'component-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });

    const componentDef = {
      parameters: {
        label: { type: 'string', default: 'Button' }
      },
      objects: [
        { type: 'rect', x: 0, y: 0, width: 80, height: 30, fill: '#4ECDC4', anchor: 'center' },
        { type: 'text', content: '{{label}}', x: 0, y: 0, anchor: 'center' }
      ]
    };

    const componentPath = join(tempDir, 'button.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const component: ComponentObject = {
      type: 'component',
      id: 'test-comp',
      source: './button.json',
      x: 200,
      y: 300,
      params: {
        label: 'Click Me'
      }
    };

    const expanded = await expandComponent(component, tempDir);

    expect(expanded.children).toHaveLength(2);
    expect(expanded.children[0].type).toBe('rect');
    expect(expanded.children[1].type).toBe('text');
    expect((expanded.children[1] as any).content).toBe('Click Me');
  });

  it('should preserve component ID', async () => {
    const tempDir = join(tmpdir(), 'component-test-' + Date.now());
    await mkdir(tempDir, { recursive: true });

    const componentDef = {
      objects: [
        { type: 'rect', x: 0, y: 0, width: 10, height: 10 }
      ]
    };

    const componentPath = join(tempDir, 'test.json');
    await writeFile(componentPath, JSON.stringify(componentDef));

    const component: ComponentObject = {
      type: 'component',
      id: 'my-component',
      source: './test.json',
      x: 0,
      y: 0
    };

    const expanded = await expandComponent(component, tempDir);

    expect(expanded.id).toBe('my-component');
  });
});
