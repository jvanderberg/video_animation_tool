# TODO - Animation Tool

## Current Task: ✅ COMPLETED - Remove 'sequences' entirely from API

**Goal**: Remove the `sequences` concept completely and use `animations` consistently throughout the entire codebase.

**Status**: ✅ **COMPLETE** - All tasks finished

### Progress Summary

✅ **All Completed:**
- Type definitions updated (removed Sequence interface, renamed SequenceAnimation to Animation)
- Preprocessor updated (removed sequences handling)
- Components system updated (all references to SequenceAnimation changed to Animation)
- All test files updated (30 test files converted to animations format)
- All example JSON files updated (22 files converted from sequences to animations format)
- Documentation updated (CLAUDE.md and README.md now use animations format)
- Build verified (TypeScript compiles successfully)
- Tests verified (225/226 tests pass - 1 pre-existing unrelated failure in components.test.ts)

### What Was Done

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
