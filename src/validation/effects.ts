/**
 * Validation functions for effects (easing, property values)
 */

/**
 * Validate easing function
 */
export function validateEasing(easing: any, effectName: string, property: string, keyframeIndex: number): void {
  if (!easing) return; // No easing is valid (defaults to linear)

  // Valid preset easing names
  const validEasings = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce', 'elastic'];

  if (typeof easing === 'string') {
    // Check if it's a valid preset
    if (validEasings.includes(easing)) {
      return;
    }

    // Check if it's cubic-bezier format
    if (easing.startsWith('cubic-bezier(')) {
      const match = easing.match(/cubic-bezier\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
      if (!match) {
        throw new Error(
          `Invalid easing in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
          `"${easing}" is not a valid cubic-bezier format. Expected: "cubic-bezier(x1, y1, x2, y2)"`
        );
      }

      const x1 = parseFloat(match[1].trim());
      const y1 = parseFloat(match[2].trim());
      const x2 = parseFloat(match[3].trim());
      const y2 = parseFloat(match[4].trim());

      if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
        throw new Error(
          `Invalid easing in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
          `cubic-bezier parameters must be numbers`
        );
      }

      // x1 and x2 must be in range [0, 1]
      // y1 and y2 can be outside [0, 1] for overshoot effects
      if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
        throw new Error(
          `Invalid easing in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
          `cubic-bezier x1 and x2 must be between 0 and 1. Got: x1=${x1}, x2=${x2}`
        );
      }

      return;
    }

    // Unknown easing name
    throw new Error(
      `Invalid easing in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
      `unknown easing "${easing}". Valid easings: ${validEasings.join(', ')}, or cubic-bezier(...)`
    );
  }

  if (typeof easing === 'object' && easing.type === 'cubic-bezier') {
    // Object format: {type: 'cubic-bezier', points: [x1, y1, x2, y2]}
    if (!Array.isArray(easing.points) || easing.points.length !== 4) {
      throw new Error(
        `Invalid easing in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
        `cubic-bezier object must have points array with 4 values`
      );
    }

    const [x1, y1, x2, y2] = easing.points;

    if (typeof x1 !== 'number' || typeof y1 !== 'number' ||
        typeof x2 !== 'number' || typeof y2 !== 'number') {
      throw new Error(
        `Invalid easing in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
        `cubic-bezier points must be numbers`
      );
    }

    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
      throw new Error(
        `Invalid easing in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
        `cubic-bezier x1 and x2 must be between 0 and 1. Got: x1=${x1}, x2=${x2}`
      );
    }

    return;
  }

  throw new Error(
    `Invalid easing in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
    `easing must be a string or cubic-bezier object, got ${typeof easing}`
  );
}

/**
 * Validate effect property value
 * Values must be numbers or percentage strings (e.g., "50%", "-50%")
 */
export function validateEffectValue(value: any, effectName: string, property: string, keyframeIndex: number): void {
  if (typeof value === 'number') {
    return; // Valid
  }

  if (typeof value === 'string') {
    // Check if it's a valid percentage string
    if (/^-?\d+(\.\d+)?%$/.test(value)) {
      return; // Valid percentage
    }
    // Check if it's a quoted number (invalid)
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      throw new Error(
        `Invalid value in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
        `value "${value}" is a string. Use a number instead (without quotes).`
      );
    }
    throw new Error(
      `Invalid value in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
      `"${value}" is not a valid value. Use a number or percentage string (e.g., "50%").`
    );
  }

  throw new Error(
    `Invalid value in effect '${effectName}', property '${property}', keyframe ${keyframeIndex}: ` +
    `value must be a number or percentage string, got ${typeof value}.`
  );
}
