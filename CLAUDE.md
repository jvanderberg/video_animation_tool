- I'd like you to use red/green test methodology in this, before making a feature make a test that fails and then code that feature, always validate that all tests pass
- Maintain a `TODO.md` file in the project root with:
  - Current task being worked on (with context about progress)
  - Prospective tasks for future work
  - This ensures continuity if sessions crash or restart

---

# Architecture & Development Patterns

## Transform System

Transforms are applied in this specific order:
1. **Translate** to (x, y)
2. **Scale** (uniform `scale`, then `scaleX`/`scaleY` multiply together)
3. **Rotate** (in degrees)
4. **Opacity** (multiplies with parent opacity)

**Critical insight for relative coordinates**: After translate, the point (x, y) becomes the new origin (0, 0). For objects with endpoints like lines:
- Store as absolute coordinates: `{x: 50, y: 100, x2: 150, y2: 100}`
- Render as relative: Draw from (0, 0) to (x2-x, y2-y)

## Animation Architecture

**Declarative animations** (not inline):
- Animations stored separately in `animations` array
- Each animation targets an object by `id` and `property` name
- Keyframes: `{frame: number, value: number, easing?: string}`
- Objects must have an `id` to be animated

### Traditional Property Animation

```json
{
  "objects": [{"id": "box", "type": "rect", ...}],
  "animations": [{
    "target": "box",
    "property": "x",
    "keyframes": [{"frame": 0, "value": 0}, {"frame": 60, "value": 100}]
  }]
}
```

### Effects System

Pre-composed effects stored in `effects/library.json`. Use time-based references that convert to frame-based at load time.

**Using effects:**
```json
{
  "animations": [{
    "target": "title",
    "effect": "pop",
    "startTime": 0.0  // seconds - converts to frames based on fps
  }]
}
```

**Built-in effects:**
- `pop` - Scale and fade in with bounce (0.33s)
- `fadeIn` - Simple fade in (0.5s)
- `fadeOut` - Simple fade out (0.5s)
- `slideInLeft` - Slide in from left with fade (0.5s)
- `slideOutRight` - Slide out to right with fade (0.5s)
- `bounce` - Bounce in place (0.6s)
- `spin` - 360 degree rotation (1.0s)

**Why effects:**
- Same effect works at any fps (30fps, 60fps, etc.)
- Consistent timing across projects
- Reusable animations
- Less verbose than manual keyframes

**Mixing effects and properties:**
```json
{
  "animations": [
    {"target": "title", "effect": "pop", "startTime": 0.0},
    {"target": "title", "property": "x", "keyframes": [{"frame": 0, "value": 50}, {"frame": 60, "value": 150}]}
  ]
}
```

**Effect preprocessing:**
- CLI loads `effects/library.json`
- Expands effect references into property animations
- Converts `startTime` (seconds) to `startFrame` using fps
- Renderer always receives frame-based animations

## Rendering Engine

- Uses `node-canvas` (server-side Canvas API)
- **Degenerate matrix issue**: `scale=0` or negative causes canvas errors → skip rendering entirely with early return
- Transform state saved/restored per object for isolation
- Group transforms automatically inherited by children

## Adding New Object Types

```typescript
// 1. Add interface in types.ts
export interface NewObject extends BaseObject {
  type: 'new';
  specificProp: number;
}

// 2. Add to AnimationObject union
export type AnimationObject = ... | NewObject;

// 3. Add render case in renderObject()
case 'new':
  this.renderNew(obj, props);
  break;

// 4. Implement render method
private renderNew(obj: NewObject, props: any): void {
  const value = props.specificProp ?? obj.specificProp;
  // rendering logic using canvas context
}

// 5. If property is animatable, add to getPropertiesAtFrame()
if ('specificProp' in obj) {
  props.specificProp = obj.specificProp;
}
```

## Testing Patterns

Use `getPixelFromPNG()` for pixel-level assertions:

```typescript
const animation: AnimationFile = {
  project: { width: 200, height: 200, fps: 60, frames: 1 },
  objects: [/* test objects */]
};
const renderer = new Renderer(animation);
const buffer = await renderer.exportFrame(0);
const pixel = await getPixelFromPNG(buffer, x, y);
// RGBA values 0-255
expect(pixel[0]).toBeGreaterThan(200); // Red
expect(pixel[3]).toBe(0); // Transparent
```

**Always test transform combinations:**
- Basic rendering
- With opacity (partial alpha)
- With rotation
- With scale/scaleX/scaleY
- Animated properties (check multiple frames)
- In groups (inherited transforms)
- Default values

**Pixel testing tolerance**: Use `toBeGreaterThan(200)` not exact values due to antialiasing.

## Performance

- **Video rendering**: FFmpeg streaming is 12.3x faster (6s vs 76s for 1920 frames)
  - Pipes JPEG frames directly to FFmpeg stdin
  - No temp files on disk
- **PNG sequences**: Parallel rendering with `cpus().length * 4` batch size
- **Use JPEG quality 0.95** for FFmpeg pipe (much faster than PNG encoding)

## Coordinate System

- **Origin**: Top-left (0, 0)
- **Units**: Pixels only (no percentages)
- **Time**: Frame numbers (0-indexed), not seconds
- **Z-order**: Document order by default, explicit `z` property optional

## Common Gotchas

1. **Line coordinates**: Lines use absolute (x, y) and (x2, y2), converted to relative during rendering
2. **Scale=0**: Must skip rendering entirely with early return, not just apply transform
3. **Opacity inheritance**: Multiply by parent's `globalAlpha`, don't replace it
4. **Pixel testing**: Use tolerance ranges, not exact values (antialiasing)
5. **Frame indexing**: 0-indexed (frame 0 is first frame)
6. **Easing**: Associated with target keyframe (where we're going TO), not source
7. **Background transparency vs video encoding**:
   - PNG frames render with transparent backgrounds (alpha channel)
   - Video encoding (MP4) may render transparency as black background
   - **Issue**: Black text on transparent background is visible in PNGs but invisible in video when rendered on black
   - **Solution**: Always ask user about intended background OR set explicit background color
   - **Best practice**: Default to non-black colors (white text, colored objects) unless background is explicitly specified
   - If unsure, prompt user: "What background will this animation appear on?" or "Should I add a background color?"

## Commands

```bash
# Rendering
npm run dev examples/file.json output.mp4   # Video (fast, 12x speedup)
npm run dev examples/file.json ./frames     # PNG sequence (parallel)

# Testing
npm test                      # All tests
npm test src/feature.test.ts  # Specific test
npx tsc --noEmit             # Type check
```