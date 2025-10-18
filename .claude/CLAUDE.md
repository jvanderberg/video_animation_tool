# Animation Tool - Development Guidelines

## Testing Methodology

### Red/Green TDD Process
**Always follow this process when adding new features:**

1. **RED** - Write failing tests first
   - Create test file with comprehensive test cases
   - Run tests to verify they fail
   - Confirm test failures are for the right reasons

2. **GREEN** - Implement the feature
   - Write minimal code to make tests pass
   - Run tests frequently
   - Only move forward when all tests pass

3. **REFACTOR** (if needed)
   - Clean up implementation
   - Ensure tests still pass

### Visual Testing with Pixel Validation

For canvas/rendering features, we use pixel-level validation:

**Test helpers available** (`src/test-helpers.ts`):
- `getPixelFromPNG(buffer, x, y)` - Read RGBA values from PNG buffer
- `hexToRgb(hex)` - Convert hex colors to RGB
- `colorMatches(actual, expected, tolerance)` - Compare colors with anti-aliasing tolerance

**Testing strategy:**
```typescript
// Example: Test that a rectangle appears at correct position
const buffer = await renderer.exportFrame(0);
const pixel = await getPixelFromPNG(buffer, centerX, centerY);
expect(colorMatches(pixel, hexToRgb('#FF0000'))).toBe(true);
expect(pixel[3]).toBeGreaterThan(0); // Check opacity
```

**Important: Don't rely on buffer existence tests**
```typescript
// ❌ BAD - Only checks that rendering didn't crash
expect(buffer).toBeInstanceOf(Buffer);
expect(buffer.length).toBeGreaterThan(0);

// ✅ GOOD - Validates actual visual output
const pixel = await getPixelFromPNG(buffer, x, y);
expect(pixel[3]).toBeGreaterThan(0); // Check pixel is not transparent
expect(colorMatches(pixel, expectedColor)).toBe(true);
```

### Text Rendering Quirks

**Font baseline offsets:**
Canvas text rendering has font metrics that cause vertical offsets:
- Text at `y: 100` may actually render at `y: 102-105` depending on font and size
- Always use debugging scripts to find actual pixel positions
- Account for ~3-5px vertical offset in tests

**Text whitespace:**
- Don't test pixels in character gaps (e.g., between letters)
- Sample pixels where glyphs actually exist
- For "Hello" at x:100, pixels exist at x:105-108, then gap, then x:126-131

**Debugging approach:**
```typescript
// Create a debug script to find where text actually renders
for (let y = 95; y < 115; y += 1) {
  for (let x = 95; x < 150; x += 1) {
    const pixel = await getPixelFromPNG(buffer, x, y);
    if (pixel[3] > 0) {
      console.log(`(${x}, ${y}): alpha=${pixel[3]}`);
    }
  }
}
```

### Test Organization

**Structure:**
- `src/*.test.ts` - Unit tests for individual features
- `src/renderer-pixel.test.ts` - Pixel validation tests for renderer
- `src/text.test.ts` - Text-specific rendering tests

**Test categories:**
1. Type definitions and structure
2. Basic functionality (does it work at all?)
3. Property validation (correct values applied?)
4. Position and layout (right place?)
5. Animations (interpolation correct?)
6. Edge cases and interactions

### Running Tests

```bash
npm test              # Watch mode
npm run test:once     # Single run (CI)
npm run test:ui       # Visual UI
npm run build         # TypeScript compilation
```

**Always verify:**
- All tests pass before committing
- Build succeeds without errors
- New features have comprehensive test coverage

## Implementation Patterns

### Renderer Extension

When adding new object types:

1. Add type definition to `src/types.ts`
2. Import type in `renderer.ts`
3. Add case to `renderObject()` switch statement
4. Implement private render method (e.g., `renderText()`)
5. Handle anchor points using `getAnchorOffset()`
6. Apply transforms (opacity, rotation) via canvas context

### Animation Support

**Core animatable properties (all objects):**
- `x`, `y` - Position
- `rotation` - Rotation in degrees
- `opacity` - Transparency (0-1)

**Object-specific animatable properties:**
- `width`, `height` - Dimensions (rectangles, images, etc.)
- Any numeric property can be made animatable

**Design principle: Make all numeric properties animatable when possible**

To add animation support for a new property:
1. Add the property to `getPropertiesAtFrame()` base values (if it exists on the object)
2. Use `props.propertyName ?? obj.propertyName` in the render method
3. Animations automatically apply via the keyframe system

Example:
```typescript
// In getPropertiesAtFrame()
if ('width' in obj) {
  props.width = obj.width;
}

// In renderRect()
const width = props.width ?? obj.width;
```

### Group Implementation

Groups are containers that apply transforms to all children:

**Key implementation details:**
- Use canvas save/restore for context isolation
- Transforms automatically inherit via canvas context
- **Opacity must multiply**, not replace: `ctx.globalAlpha *= opacity`
- Recursively call `renderObject()` for each child
- Children can have their own animations that combine with group transforms

**Common pitfall:**
```typescript
// ❌ WRONG - Overwrites parent opacity
ctx.globalAlpha = props.opacity;

// ✅ CORRECT - Multiplies with parent
ctx.globalAlpha *= props.opacity;
```

**Transform inheritance:**
- Position: Translates are additive (child at (20,30) in group at (100,100) = (120,130))
- Rotation: Rotates around current origin (group's position)
- Opacity: Multiplies (group 0.5 * child 0.5 = 0.25 final)
- Nested groups: All transforms compose correctly

## Code Style

- Use TypeScript strict mode
- Export types from `types.ts`
- Export implementations from `index.ts`
- Keep renderer methods private unless needed for testing
- Use descriptive variable names
- Add JSDoc comments for public APIs
