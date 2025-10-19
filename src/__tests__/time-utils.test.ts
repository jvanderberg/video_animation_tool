import { describe, it, expect } from 'vitest';
import { parseTime } from '../time-utils.js';

describe('Time Parsing Utilities', () => {
  const fps = 30;

  it('should parse frame numbers directly', () => {
    expect(parseTime(60, fps)).toBe(60);
    expect(parseTime(0, fps)).toBe(0);
    expect(parseTime(120, fps)).toBe(120);
  });

  it('should parse seconds with "s" suffix', () => {
    expect(parseTime('1s', fps)).toBe(30);
    expect(parseTime('2s', fps)).toBe(60);
    expect(parseTime('0.5s', fps)).toBe(15);
    expect(parseTime('1.5s', fps)).toBe(45);
  });

  it('should parse milliseconds with "ms" suffix', () => {
    expect(parseTime('1000ms', fps)).toBe(30);
    expect(parseTime('500ms', fps)).toBe(15);
    expect(parseTime('100ms', fps)).toBe(3);
  });

  it('should parse minutes with "m" suffix', () => {
    expect(parseTime('1m', fps)).toBe(1800);  // 60 seconds * 30 fps
    expect(parseTime('0.5m', fps)).toBe(900); // 30 seconds * 30 fps
    expect(parseTime('2m', fps)).toBe(3600);  // 120 seconds * 30 fps
  });

  it('should round to nearest frame', () => {
    expect(parseTime('0.033s', fps)).toBe(1);  // 0.99 frames -> 1
    expect(parseTime('0.034s', fps)).toBe(1);  // 1.02 frames -> 1
    expect(parseTime('1.033s', fps)).toBe(31); // 30.99 frames -> 31
  });

  it('should handle different fps values', () => {
    expect(parseTime('1s', 60)).toBe(60);
    expect(parseTime('1s', 24)).toBe(24);
    expect(parseTime('0.5s', 60)).toBe(30);
  });

  it('should handle edge cases', () => {
    expect(parseTime(0, fps)).toBe(0);
    expect(parseTime('0s', fps)).toBe(0);
    expect(parseTime('0ms', fps)).toBe(0);
  });

  describe('Validation', () => {
    it('should reject negative frame numbers', () => {
      expect(() => parseTime(-10, fps)).toThrow(/negative/i);
      expect(() => parseTime(-1, fps)).toThrow(/negative/i);
    });

    it('should reject negative time values', () => {
      expect(() => parseTime('-1s', fps)).toThrow(/negative/i);
      expect(() => parseTime('-500ms', fps)).toThrow(/negative/i);
      expect(() => parseTime('-0.5m', fps)).toThrow(/negative/i);
    });

    it('should reject invalid time formats', () => {
      expect(() => parseTime('abc', fps)).toThrow(/invalid.*format/i);
      expect(() => parseTime('5x', fps)).toThrow(/invalid.*format/i);
      expect(() => parseTime('hello', fps)).toThrow(/invalid.*format/i);
    });

    it('should reject empty strings', () => {
      expect(() => parseTime('', fps)).toThrow(/invalid.*format/i);
    });

    it('should reject strings with only units', () => {
      expect(() => parseTime('s', fps)).toThrow(/invalid.*format/i);
      expect(() => parseTime('ms', fps)).toThrow(/invalid.*format/i);
      expect(() => parseTime('m', fps)).toThrow(/invalid.*format/i);
    });

    it('should reject invalid numeric strings', () => {
      expect(() => parseTime('5.3.2s', fps)).toThrow(/invalid.*format/i);
      expect(() => parseTime('1.2.3', fps)).toThrow(/invalid.*format/i);
    });
  });
});
