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
 */
export function parseTime(value: TimeValue, fps: number): number {
  if (typeof value === 'number') {
    return value; // Already in frames
  }

  // Parse string with unit suffix
  if (value.endsWith('ms')) {
    const ms = parseFloat(value.slice(0, -2));
    return Math.round((ms / 1000) * fps);
  }

  if (value.endsWith('m')) {
    const minutes = parseFloat(value.slice(0, -1));
    return Math.round(minutes * 60 * fps);
  }

  if (value.endsWith('s')) {
    const seconds = parseFloat(value.slice(0, -1));
    return Math.round(seconds * fps);
  }

  // If no recognized suffix, treat as frames
  return parseFloat(value);
}
