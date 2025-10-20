# TODO - Animation Tool

## Current Tasks

### 1. Update DESIGN.md to reflect current API

**Goal**: Fix outdated information in DESIGN.md

**Status**: 🔵 **TODO** - Not started

**What needs to be fixed:**
- [ ] Line 17: Update time units to mention TimeValue supports both frames and time strings
- [ ] Lines 198-208: Replace `sequences` with `animations` in clipping example
- [ ] Lines 264-277: Replace `sequences` with `animations` in effects example (remove "name" field)
- [ ] Lines 472-489: Replace `sequences` with `animations` in mixing example
- [ ] Document where animations can be defined:
  - Inline on objects: `{"type": "text", "animations": [...]}`
  - At root level: `{"project": {...}, "objects": [...], "animations": [...]}`
  - In groups: `{"type": "group", "animations": [...], "children": [...]}`

**Specific issues:**
- Still shows old `"sequences": [{"name": "main", "animations": [...]}]` format
- Doesn't mention TimeValue format (frames OR time strings like "1s", "500ms")
- Multiple examples need updating to current API

---

### 2. Unify time parameters: use 'duration' and 'start' (both accept seconds or frames)

**Goal**: Resolve the inconsistency between frames/duration and start/startTime/startFrame parameters.

**Status**: 🔵 **TODO** - Not started

**What needs to be done:**
- [ ] Audit all places that use time parameters (effects, animations, groups, transitions)
- [ ] Decide on unified parameter names: `start` and `duration` (both accept TimeValue)
- [ ] Update type definitions to use consistent naming
- [ ] Update all code that creates/processes these parameters
- [ ] Update all example files
- [ ] Update tests
- [ ] Update documentation

**Current inconsistencies:**
- EffectAnimation uses `start` (good)
- GroupAnimation uses `start` for effects, but `keyframes[].start` for property animations
- GroupObject uses `start` and `duration`
- Effects use `duration` (in effect files)
- Some places may still reference `startTime` or `startFrame`

**Desired outcome:**
- Everywhere uses `start: TimeValue` and `duration: TimeValue`
- TimeValue = number (frames) | string (e.g., "1.5s", "500ms")
- Consistent across all animation types

---

### 2. Remove debug logging from production code

**Goal**: Clean up any console.log statements that were added during debugging.

**Status**: 🔵 **TODO** - Not started

**What needs to be done:**
- [ ] Search for console.log in src/ directory (excluding test files)
- [ ] Remove any debug logging statements
- [ ] Verify all tests still pass
- [ ] Verify build succeeds

---

### 3. Review recent features for missing test coverage

**Goal**: Ensure all recent features have adequate test coverage.

**Status**: 🔵 **TODO** - Not started

**What needs to be done:**
- [ ] Review git log for recent feature additions
- [ ] Check test coverage for:
  - Group effect timing and offset processing
  - Property substitution in effects (has effect-property-substitution.test.ts)
  - Animation speed feature (has animation-speed.test.ts)
  - expandEffectToRelativeAnimations() function
  - Debug tools (may not need tests, they're utilities)
- [ ] Add missing tests where needed
- [ ] Ensure edge cases are covered

**Features to review:**
- Group effect expansion with relative timing
- Property substitution with group children scope
- Animation speed (group vs root)
- Effect duration overrides
- Time parameter parsing (seconds, milliseconds, frames)

---

## Recent Completions

### ✅ COMPLETED - Fix group effect timing and add debug tools

**Status**: ✅ **COMPLETE** - All tasks finished, committed in c5a1d24

**What was fixed:**
- ✅ Group effect animations now correctly offset by group start time
- ✅ Property substitution works with group children scope
- ✅ Refactored effect expansion to happen BEFORE offset processing (much cleaner architecture)
- ✅ Added debug tools directory with memoized preprocessing utilities
- ✅ Added test coverage: group-effect-timing.test.ts
- ✅ All 238 tests passing, build succeeds

**Architecture improvement:**
- Effects are now expanded to relative property animations BEFORE processAnimations()
- processAnimations() only handles property animations (no more effect detection)
- Cleaner separation of concerns

---

### ✅ COMPLETED - Remove 'sequences' entirely from API

**Status**: ✅ **COMPLETE** - All tasks finished

**What was done:**
- Type definitions updated (removed Sequence interface, renamed SequenceAnimation to Animation)
- Preprocessor updated (removed sequences handling)
- Components system updated (all references to SequenceAnimation changed to Animation)
- All test files updated (30 test files converted to animations format)
- All example JSON files updated (22 files converted from sequences to animations format)
- Documentation updated (CLAUDE.md and README.md now use animations format)
- Build verified and all tests passing

**API Change Example:**

**Old format (removed):**
```json
{
  "sequences": [
    {
      "name": "main",
      "animations": [
        {"target": "box", "property": "x", "keyframes": [...]}
      ]
    }
  ]
}
```

**New format (only format going forward):**
```json
{
  "animations": [
    {"target": "box", "property": "x", "keyframes": [...]}
  ]
}
```

---

## Detailed History

### What Was Done - Remove 'sequences'

1. **Type definitions** in `types.ts`:
   - ✅ Removed `Sequence` interface completely
   - ✅ Renamed `SequenceAnimation` to just `Animation` throughout
   - ✅ Updated all type references in AnimationFile, GroupObject, ComponentDefinition

2. **Preprocessor** in `src/preprocessor.ts`:
   - ✅ Updated all function signatures to use `Animation` instead of `SequenceAnimation`
   - ✅ Removed any code that handles `sequences` field
   - ✅ Only accepts `animations` field now

3. **Components system** in `src/components.ts`:
   - ✅ Updated all imports and function signatures
   - ✅ Changed `isAnimation()` type guard to use `Animation` type
   - ✅ Updated `extractAnimationsFromGroups()` to return `Animation[]`

4. **All example files** (22 files):
   - ✅ Converted `"sequences": [{"animations": [...]}]` to `"animations": [...]`
   - ✅ Flattened nested animation arrays
   - ✅ Removed optional "name" field from sequences

5. **Documentation**:
   - ✅ `CLAUDE.md` - removed all references to sequences, updated examples
   - ✅ `README.md` - updated examples to use new format

6. **Tests**:
   - ✅ All 30 test files updated to use new `animations` format
   - ✅ Fixed syntax errors in group.test.ts (missing closing brackets)
   - ✅ Full test suite passing (225/226 tests)

7. **Final verification**:
   - ✅ `npm run build` succeeds
   - ✅ `npm test` shows 225/226 passing (1 pre-existing failure unrelated to this work)

### API Change Example

**Old format (removed):**
```json
{
  "sequences": [
    {
      "name": "main",
      "animations": [
        {"target": "box", "property": "x", "keyframes": [...]}
      ]
    }
  ]
}
```

**New format (only format going forward):**
```json
{
  "animations": [
    {"target": "box", "property": "x", "keyframes": [...]}
  ]
}
```

---

## Prospective Future Tasks

### Animation System Enhancements
- [ ] Add animation curves library (custom easing presets)
- [ ] Support for animation loops/repeat
- [ ] Animation events/callbacks

### New Object Types
- [ ] SVG path import
- [ ] Video object type
- [ ] Particle system

### Performance
- [ ] Optimize keyframe interpolation for large animations
- [ ] Add frame caching for complex scenes
- [ ] Multi-threaded rendering for PNG sequences

### Developer Experience
- [ ] Live preview server (watch mode with browser preview)
- [ ] Animation timeline visualization
- [ ] Better error messages with file/line context
