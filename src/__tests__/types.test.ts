import { describe, it, expect } from 'vitest';
import type {
  AnimationFile,
  AnimationObject,
  TextObject,
  RectObject,
  ImageObject,
  GroupObject,
  ComponentObject,
  Keyframe,
  Animation,
} from '../types.js';

describe('Type Definitions', () => {
  describe('AnimationFile', () => {
    it('should accept a valid animation file structure', () => {
      const animation: AnimationFile = {
        project: {
          width: 1920,
          height: 1080,
          fps: 60,
          frames: 300,
        },
        objects: [],
      };

      expect(animation.project.width).toBe(1920);
      expect(animation.project.height).toBe(1080);
      expect(animation.project.fps).toBe(60);
      expect(animation.project.frames).toBe(300);
    });
  });

  describe('TextObject', () => {
    it('should create a valid text object', () => {
      const text: TextObject = {
        type: 'text',
        content: 'Hello World',
        x: 100,
        y: 200,
        size: 48,
        color: '#FFFFFF',
      };

      expect(text.type).toBe('text');
      expect(text.content).toBe('Hello World');
      expect(text.x).toBe(100);
      expect(text.y).toBe(200);
    });

    it('should support optional properties', () => {
      const text: TextObject = {
        type: 'text',
        content: 'Test',
        id: 'myText',
        rotation: 45,
        opacity: 0.5,
        z: 10,
        anchor: 'center',
      };

      expect(text.id).toBe('myText');
      expect(text.rotation).toBe(45);
      expect(text.opacity).toBe(0.5);
      expect(text.z).toBe(10);
      expect(text.anchor).toBe('center');
    });
  });

  describe('RectObject', () => {
    it('should create a valid rectangle object', () => {
      const rect: RectObject = {
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        fill: '#FF0000',
      };

      expect(rect.type).toBe('rect');
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(50);
      expect(rect.fill).toBe('#FF0000');
    });
  });

  describe('ImageObject', () => {
    it('should create a valid image object', () => {
      const image: ImageObject = {
        type: 'image',
        source: './assets/logo.png',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      };

      expect(image.type).toBe('image');
      expect(image.source).toBe('./assets/logo.png');
    });
  });

  describe('GroupObject', () => {
    it('should create a group with children', () => {
      const group: GroupObject = {
        type: 'group',
        id: 'myGroup',
        x: 100,
        y: 100,
        children: [
          {
            type: 'text',
            content: 'Child 1',
          },
          {
            type: 'rect',
            width: 50,
            height: 50,
          },
        ],
      };

      expect(group.type).toBe('group');
      expect(group.children).toHaveLength(2);
      expect(group.children[0].type).toBe('text');
      expect(group.children[1].type).toBe('rect');
    });
  });

  describe('ComponentObject', () => {
    it('should create a component reference', () => {
      const component: ComponentObject = {
        type: 'component',
        source: './components/title-card.json',
        params: {
          text: 'Hello',
          color: '#FF0000',
        },
      };

      expect(component.type).toBe('component');
      expect(component.source).toBe('./components/title-card.json');
      expect(component.params?.text).toBe('Hello');
    });
  });

  describe('Animation', () => {
    it('should create a valid animation with keyframes', () => {
      const keyframes: Keyframe[] = [
        { start: 0, value: 0 },
        { start: 30, value: 100, easing: 'ease-out' },
        { start: 60, value: 0, easing: 'ease-in' },
      ];

      const animation: Animation = {
        property: 'x',
        keyframes,
      };

      expect(animation.property).toBe('x');
      expect(animation.keyframes).toHaveLength(3);
      expect(animation.keyframes[1].easing).toBe('ease-out');
    });
  });

  describe('Full Animation Example', () => {
    it('should create a complete animation with multiple objects', () => {
      const animation: AnimationFile = {
        project: {
          width: 1920,
          height: 1080,
          fps: 60,
          frames: 300,
        },
        objects: [
          {
            type: 'rect',
            id: 'background',
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            fill: '#000000',
            z: 0,
          },
          {
            type: 'text',
            id: 'title',
            content: 'My Video',
            x: 960,
            y: 540,
            size: 72,
            color: '#FFFFFF',
            anchor: 'center',
            z: 10,
            animations: [
              {
                property: 'opacity',
                keyframes: [
                  { start: 0, value: 0 },
                  { start: 30, value: 1, easing: 'ease-in' },
                ],
              },
              {
                property: 'y',
                keyframes: [
                  { start: 0, value: 400 },
                  { start: 30, value: 540, easing: 'ease-out' },
                ],
              },
            ],
          },
          {
            type: 'group',
            id: 'logo-group',
            x: 100,
            y: 100,
            z: 20,
            children: [
              {
                type: 'image',
                source: './assets/logo.png',
                width: 100,
                height: 100,
              },
              {
                type: 'text',
                content: 'Logo Text',
                y: 110,
                size: 16,
              },
            ],
            animations: [
              {
                property: 'rotation',
                keyframes: [
                  { start: 0, value: 0 },
                  { start: 60, value: 360, easing: 'linear' },
                ],
              },
            ],
          },
        ],
      };

      expect(animation.objects).toHaveLength(3);
      expect(animation.objects[1].type).toBe('text');
      expect((animation.objects[1] as TextObject).animations).toHaveLength(2);
      expect((animation.objects[2] as GroupObject).children).toHaveLength(2);
    });
  });
});
