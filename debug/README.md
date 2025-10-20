# Debug Tools

Utilities for debugging animation files and inspecting preprocessed output.

## Available Tools

### inspect-animations.ts
Inspect all animations targeting a specific object ID.

**Usage:**
```bash
npx tsx debug/inspect-animations.ts <file> <targetId>
```

**Example:**
```bash
npx tsx debug/inspect-animations.ts examples/current-limit-instability.json solutions.solution-title
```

**Output:**
- Lists all animations for the target
- Shows property being animated
- Displays first 3 keyframes with values and easing

### list-targets.ts
List all object IDs and animation targets in a file.

**Usage:**
```bash
npx tsx debug/list-targets.ts <file>
```

**Example:**
```bash
npx tsx debug/list-targets.ts examples/current-limit-instability.json
```

**Output:**
- All object IDs (first 20)
- All animation targets with count
- Summary statistics

### pixel-scan.ts
Scan a rectangular region for non-transparent pixels.

**Usage:**
```bash
npx tsx debug/pixel-scan.ts <file> <frame> <x> <y> <width> <height>
```

**Example:**
```bash
# Scan 60x30 region starting at (95, 95) on frame 0
npx tsx debug/pixel-scan.ts examples/text-animation.json 0 95 95 60 30
```

**Output:**
- RGBA values for each non-transparent pixel
- Useful for debugging text positioning, anti-aliasing, font baseline offsets

**When to use:**
- Finding where text actually renders (font metrics cause vertical offsets)
- Debugging pixel tests (finding exact pixel coordinates)
- Verifying object positions visually

## Using in Your Own Debug Scripts

The `test-helpers.ts` file provides utilities for loading and querying animations:

```typescript
import { loadAndPreprocess, findAnimationsForTarget } from '../src/test-helpers.js';

// Load and preprocess (memoized - loads once, caches result)
const processed = await loadAndPreprocess('./examples/demo.json');

// Find animations for a target
const anims = findAnimationsForTarget(processed, 'myObject');

// Find animations by property
import { findAnimationsByProperty } from '../src/test-helpers.js';
const xAnims = findAnimationsByProperty(processed, 'x');

// Find object by ID
import { findObjectById } from '../src/test-helpers.js';
const obj = findObjectById(processed, 'myObject');
```

## Test Helpers API

### loadAndPreprocess(filePath: string)
Load and preprocess an animation file. Results are memoized.

### clearPreprocessCache()
Clear the memoization cache (useful between test runs).

### findAnimationsForTarget(processed, targetId)
Find all animations targeting a specific object ID.

### findAnimationsByProperty(processed, property)
Find all animations for a specific property (e.g., 'x', 'opacity').

### findObjectById(processed, id)
Find an object by ID (handles namespaced IDs like "group.child").

## Common Debug Patterns

### Check if effect expanded correctly
```typescript
const processed = await loadAndPreprocess('./examples/demo.json');
const anims = findAnimationsForTarget(processed, 'myObject');
console.log(anims.map(a => ({ property: a.property, keyframes: a.keyframes })));
```

### Find missing animations
```typescript
const processed = await loadAndPreprocess('./examples/demo.json');
const allTargets = new Set(processed.animations.map(a => a.target));
const allIds = processed.objects.map(o => o.id);
console.log('Objects without animations:', allIds.filter(id => !allTargets.has(id)));
```

### Verify property substitution
```typescript
const obj = findObjectById(processed, 'myObject');
const anims = findAnimationsForTarget(processed, 'myObject');
const xAnim = anims.find(a => a.property === 'x');
console.log(`Object x: ${obj.x}, Animation start: ${xAnim?.keyframes[0].value}`);
```
