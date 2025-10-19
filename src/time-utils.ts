/**
 * Time parsing utilities
 *
 * Supports multiple time formats:
 * - Numbers: interpreted as frames
 * - "1.5s": seconds
 * - "500ms": milliseconds
 * - "0.5m": minutes
 */

export type TimeValue = number | string;

/**
 * Parse a time value into frame number
 *
 * @param value - Time value (number = frames, string with unit suffix)
 * @param fps - Frames per second for conversion
 * @returns Frame number
 * @throws Error if value is negative or invalid format
 */
export function parseTime(value: TimeValue, fps: number): number {
  if (typeof value === 'number') {
    if (value < 0) {
      throw new Error(`Time value cannot be negative: ${value}`);
    }
    return value; // Already in frames
  }

  // Validate non-empty string
  if (value.length === 0) {
    throw new Error('Invalid time format: empty string. Expected a number, or string with unit suffix (s, ms, m)');
  }

  // Helper to validate numeric string (must be valid float format)
  const isValidNumber = (str: string): boolean => {
    if (str.trim() === '') return false;
    const num = parseFloat(str);
    if (isNaN(num)) return false;
    // Ensure the entire string was consumed (no trailing garbage)
    // parseFloat("5x") returns 5, but "5x".trim() !== String(5)
    return str.trim() === String(num) || /^-?\d+\.?\d*$/.test(str.trim());
  };

  let numericValue: number;
  let result: number;

  // Parse string with unit suffix
  if (value.endsWith('ms')) {
    const numStr = value.slice(0, -2);
    if (!isValidNumber(numStr)) {
      throw new Error(`Invalid time format: "${value}". Expected format: "500ms"`);
    }
    numericValue = parseFloat(numStr);
    if (numericValue < 0) {
      throw new Error(`Time value cannot be negative: ${value}`);
    }
    result = Math.round((numericValue / 1000) * fps);
  } else if (value.endsWith('m')) {
    const numStr = value.slice(0, -1);
    if (!isValidNumber(numStr)) {
      throw new Error(`Invalid time format: "${value}". Expected format: "1.5m"`);
    }
    numericValue = parseFloat(numStr);
    if (numericValue < 0) {
      throw new Error(`Time value cannot be negative: ${value}`);
    }
    result = Math.round(numericValue * 60 * fps);
  } else if (value.endsWith('s')) {
    const numStr = value.slice(0, -1);
    if (!isValidNumber(numStr)) {
      throw new Error(`Invalid time format: "${value}". Expected format: "1.5s"`);
    }
    numericValue = parseFloat(numStr);
    if (numericValue < 0) {
      throw new Error(`Time value cannot be negative: ${value}`);
    }
    result = Math.round(numericValue * fps);
  } else {
    // If no recognized suffix, treat as frames
    if (!isValidNumber(value)) {
      throw new Error(`Invalid time format: "${value}". Expected a number, or string with unit suffix (s, ms, m)`);
    }
    numericValue = parseFloat(value);
    if (numericValue < 0) {
      throw new Error(`Time value cannot be negative: ${value}`);
    }
    result = numericValue;
  }

  return result;
}
