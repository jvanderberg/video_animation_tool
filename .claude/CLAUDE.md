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

## Verification Checklist (CRITICAL)

**After ANY code changes, you MUST run BOTH commands:**

```bash
npm test              # Tests runtime behavior
npm run build         # Tests TypeScript compilation
```

**NEVER skip `npm run build`** - it catches different errors than tests:
- Tests use esbuild/transformers (more lenient)
- Build uses `tsc` (strict type checking)
- Tests can pass while build fails

**Common mistake:**
```
✅ Run npm test → all pass
❌ Declare victory without running npm run build
💥 Build fails with type errors
```

**Correct approach:**
```
✅ Run npm test → all pass
✅ Run npm run build → build succeeds
✅ Now you're done
```

## Debugging Discipline

### TDD When Debugging (Critical)

**When you discover a bug, ALWAYS follow this process:**

1. **STOP** - Don't immediately try to fix it
2. **WRITE TEST** - Create a failing test that reproduces the bug
3. **VERIFY** - Confirm the test fails for the right reason
4. **FIX** - Now implement the fix
5. **VERIFY** - Confirm the test passes

**Why this matters:**
- Forces you to understand the root cause before coding
- Test serves as regression protection forever
- Often reveals the real problem (symptom vs cause)
- Prevents going down wrong debugging paths

**Example from component animations bug:**
- ❌ **Wrong**: "Animations don't work" → immediately code a fix
- ✅ **Right**: Write test for component effect expansion → discover quoted numbers in effect file → add validation with tests → then fix

### Validate Early and Often

**Add validation at load/preprocessing time, not runtime:**

```typescript
// ✅ GOOD - Validate when loading effect
function validateEffectValue(value: any, effectName: string, property: string) {
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
    throw new Error(
      `Effect '${effectName}' has quoted number "${value}" in ${property}. ` +
      `Use number without quotes.`
    );
  }
}

// ❌ BAD - Silent failure at render time
// Value just doesn't animate, user has no idea why
```

**Benefits:**
- Clear error messages at load time
- Fails fast before rendering
- Prevents entire classes of errors
- Better developer experience

### Testing Strategy for Complex Systems

**Prefer real files over complex mocks:**

```typescript
// ✅ GOOD - Simple, reliable, tests real behavior
beforeEach(async () => {
  tempDir = join(tmpdir(), `test-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ❌ BAD - Complex, brittle, doesn't test real behavior
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockImplementation(/* complex mock logic */),
  // Fighting with mock implementation details...
}));
```

**When to use each:**
- **Real files**: File I/O, integration tests, anything touching filesystem
- **Mocks**: External APIs, time-dependent code, expensive operations

### Root Cause Analysis

**Always distinguish between symptoms and causes:**

**Example - Component animations not working:**
- ❌ **Symptom**: "Animations don't work"
- ❌ **Surface cause**: "Component animations aren't being extracted"
- ✅ **Root cause**: "Effect file has quoted numbers instead of numbers"

**Process:**
1. Observe the symptom
2. Write test to reproduce it
3. Test often reveals the real problem
4. Fix the root cause, not the symptom
5. Add validation to prevent similar issues

## Implementation Patterns

### types.ts is GOD - Thou Shalt Not Hallucinate Property Names

**CRITICAL: `src/types.ts` is the single source of truth for all object properties.**

When working with objects, ALWAYS:
1. **Check types.ts FIRST** before assuming property names
2. **Never guess or hallucinate** property names (e.g., guessing `src` when it's actually `source`)
3. **Trust the TypeScript definitions** - if TypeScript says it's wrong, it's wrong

**Common mistakes to avoid:**
- ❌ Seeing an error about `src` and assuming the property should be `src`
- ❌ Using HTML conventions (`src`) when types.ts says `source`
- ❌ Changing types.ts to match your guess instead of checking what's already there

**Correct approach:**
```typescript
// ✅ STEP 1: Check types.ts for the interface
export interface ImageObject extends BaseObject {
  type: 'image';
  source: string;  // <-- Source of truth
  width?: number;
  height?: number;
}

// ✅ STEP 2: Use the exact property name from types.ts
const image: ImageObject = {
  type: 'image',
  source: './path/to/image.png',  // Not 'src'!
  x: 100,
  y: 100
};
```

**When you see a validation error:**
1. Read the error message
2. Check types.ts for the correct property name
3. Update the CODE to match types.ts (not the other way around)
4. Only change types.ts if you're intentionally changing the API

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
- `scale`, `scaleX`, `scaleY` - Scaling factors
- `blur` - Blur radius in pixels
- `clip.x`, `clip.y`, `clip.width`, `clip.height` - Clipping region (nested properties)

**Object-specific animatable properties:**
- `width`, `height` - Dimensions (rectangles, images, etc.)
- `radius`, `radiusX`, `radiusY` - Circle/ellipse dimensions
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

### Clipping Implementation

**Coordinate system is critical:**
- Clip coordinates use object's **natural bounding box space**
- (0, 0) = top-left corner of object bounds
- **Not** relative to transformed position or anchor point
- This makes clips intuitive: `{x: 0, y: 0, width: "100%", height: "100%"}` always means "full object"

**Implementation approach:**
1. Calculate object dimensions (width, height)
2. Get anchor offset for the object
3. Apply clip rectangle with anchor adjustment:
   ```typescript
   ctx.rect(
     clip.x + offsetX,  // Adjust for anchor
     clip.y + offsetY,
     clip.width,
     clip.height
   );
   ctx.clip();
   ```

**Why this matters:**
- User shouldn't need to know if text is center-anchored or top-left anchored
- Clip always starts at (0, 0) regardless of anchor
- Avoids negative coordinates in clip definitions

**Percentage resolution:**
- Resolve percentages at preprocessing time, not render time
- Use object dimensions (measure text with canvas.measureText())
- `clip.width: "100%"` → resolved to pixel width before rendering
- Supports both clip properties and animation keyframe values

### Blur Implementation

**node-canvas limitation:**
- node-canvas doesn't support CSS `filter` property
- Must use external library: `stackblur-canvas`

**Implementation approach:**
1. Detect blur in renderObject (check `props.blur > 0`)
2. Create temporary canvas with padding for blur spread
3. Render object to temp canvas (without blur applied)
4. Apply stackblur: `canvasRGBA(tempCanvas, 0, 0, w, h, radius)`
5. Composite blurred result back to main canvas

**Padding calculation:**
- Blur spreads beyond object bounds
- Padding = `Math.ceil(blurRadius * 2)`
- Temp canvas size = object size + padding on all sides

**Transform handling:**
- Apply position transform on main canvas (when compositing back)
- Apply scale/rotation/opacity on temp canvas (before blur)
- Keep transforms separate to avoid blurring artifacts

**Performance note:**
- Each blurred object creates a temporary canvas
- Blur is relatively expensive (pixel operation)
- Consider this when animating blur on many objects

## File Size Guidelines

**Target file sizes:**
- **Ideal: 200-400 lines** - Sweet spot for maintainability
- **Acceptable: 400-600 lines** - Starting to get large, consider splitting
- **Too large: 600+ lines** - Should be split into multiple files

**Why file size matters:**
- **For AI assistants**: Smaller, well-named files are easier to locate and work with
  - Finding "validation logic" in `src/validation/objects.ts` is instant
  - Searching through 600+ lines requires more context and tokens
- **For developers**: Easier to navigate, understand scope, and maintain
- **For reviews**: Smaller files = smaller, focused PRs

**When to split a file:**
- File exceeds 600 lines
- File has multiple distinct concerns (validation + preprocessing + formatting)
- You find yourself scrolling frequently to find related code
- File name doesn't clearly describe what's inside anymore

**How to split:**
- Group by feature/domain: `validation/`, `rendering/`, `preprocessing/`
- Use descriptive names: `object-validation.ts`, `shape-renderer.ts`
- Keep related code together: don't split just to hit a line count
- Maintain clear module boundaries with well-defined exports

**Example split:**
```
❌ Before:
src/preprocessor.ts (631 lines)
  - Object validation
  - Effect validation
  - Animation validation
  - Preprocessing logic
  - Percentage resolution

✅ After:
src/validation/
  - objects.ts (150 lines)
  - effects.ts (120 lines)
  - animations.ts (100 lines)
src/preprocessor.ts (250 lines)
  - Core preprocessing
  - Percentage resolution
```

**Proactive suggestions:**
When you notice a file approaching 500 lines during development, suggest splitting it before implementing new features. This prevents the "boiling frog" problem where files gradually become unmaintainable.

## Code Style

- Use TypeScript strict mode
- Export types from `types.ts`
- Export implementations from `index.ts`
- Keep renderer methods private unless needed for testing
- Use descriptive variable names
- Add JSDoc comments for public APIs
