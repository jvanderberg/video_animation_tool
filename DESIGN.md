# Animation Tool Design Document

## Overview
A declarative animation tool for creating video content, designed to be both hand-editable and LLM-generatable. Outputs PNG image sequences or MP4 video files.

## Core Decisions

### Format: JSON
- **Not YAML** - JSON is more reliable, better LLM compatibility, fewer edge cases
- Strict syntax catches errors early
- Native support in all languages and editors
- JSON Schema for validation

### Coordinate System & Units
- **Origin**: Top-left (0, 0)
- **Units**: Pixels only
- **Time**: TimeValue format - frame numbers (e.g., `30`) or time strings (e.g., `"1s"`, `"500ms"`, `"0.5m"`)
- **Layering**: Document order (first = bottom), explicit z-index optional

### Output Format
- **PNG image sequence** - e.g., `frame_0001.png`, `frame_0002.png`
  - Alpha channel support for transparency
  - Import directly into DaVinci Resolve as image sequence
  - Frame-perfect, no compression artifacts
- **MP4 video** - Direct video encoding via FFmpeg
  - H.264 codec with yuv420p pixel format
  - Configurable quality (CRF 18, fast preset)
  - Streams frames directly to FFmpeg (no temp files)

### Rendering Engine
- HTML5 Canvas in Node.js (using `canvas` package)
- Straightforward rendering, mature ecosystem

## Component System

### File Structure
```
project/
├── animation.json          # Main timeline/composition
├── components/
│   ├── title-card.json    # Reusable components
│   ├── lower-third.json
│   └── transition.json
└── assets/
    ├── logo.png
    └── background.jpg
```

### Component Definition
Components are JSON files with parameters and object definitions:

```json
{
  "parameters": {
    "text": {"type": "string", "default": "Title"},
    "color": {"type": "string", "default": "#FFFFFF"},
    "startFrame": {"type": "number", "default": 0}
  },
  "objects": [
    {
      "type": "text",
      "content": "{{text}}",
      "color": "{{color}}",
      "animations": [...]
    }
  ]
}
```

### Component Usage
```json
{
  "type": "component",
  "source": "./components/title-card.json",
  "params": {
    "text": "Episode 1",
    "color": "#FF6B35",
    "startFrame": 0
  }
}
```

## Main Animation Format

### Project Structure
```json
{
  "project": {
    "width": 1920,
    "height": 1080,
    "fps": 60,
    "frames": 300
  },
  "objects": [...]
}
```

### Object Types
- **text** - Text with font, size, color
- **image** - PNG (with alpha), JPG
- **rect** - Rectangles/boxes
- **line** - Lines
- **circle** - Circles with radius, fill, and stroke
- **ellipse** - Ellipses with radiusX/radiusY, fill, and stroke
- **path** - Custom shapes using canvas path commands (moveTo, lineTo, bezierCurveTo, etc.)
- **point** - Points/dots
- **group** - Container for multiple objects (transforms apply to children)
- **component** - Reference to external component file

### Object Properties
Common properties across all object types:
- `id` - Optional identifier
- `x`, `y` - Position (top-left origin)
- `rotation` - Degrees
- `opacity` - 0.0 to 1.0
- `scale` - Uniform scale factor (1.0 = 100%, default)
- `scaleX` - X-axis scale factor (1.0 = 100%, default)
- `scaleY` - Y-axis scale factor (1.0 = 100%, default)
- `z` - Explicit layer order (optional, defaults to document order)
- `anchor` - For positioning: `"top-left"`, `"center"`, etc.
- `clip` - Optional clipping region (see Clipping section below)
- `blur` - Blur radius in pixels (uses stackblur algorithm)

### Animation System

#### Where Animations Can Be Defined

Animations can be defined in three places:

1. **Root level** - For animating any object in the file:
   ```json
   {
     "project": {...},
     "objects": [...],
     "animations": [
       {"target": "objectId", "property": "x", "keyframes": [...]}
     ]
   }
   ```

2. **Inline on objects** - Scoped to that object (no `target` needed):
   ```json
   {
     "type": "text",
     "id": "title",
     "content": "Hello",
     "animations": [
       {"property": "opacity", "keyframes": [...]}
     ]
   }
   ```

3. **In groups** - For animating the group or its children:
   ```json
   {
     "type": "group",
     "children": [...],
     "animations": [
       {"target": "childId", "property": "x", "keyframes": [...]}
     ]
   }
   ```

#### Keyframe-based
```json
{
  "animations": [
    {
      "property": "x",
      "keyframes": [
        {"start": 0, "value": 0},
        {"start": 30, "value": 100, "easing": "ease-out"},
        {"start": 60, "value": 200}
      ]
    }
  ]
}
```

#### Animatable Properties
- `x`, `y` - Position
- `rotation` - Rotation in degrees
- `opacity` - Transparency (0-1)
- `scale` - Uniform scale factor (1.0 = 100%, default)
- `scaleX` - X-axis scale factor (1.0 = 100%, default)
- `scaleY` - Y-axis scale factor (1.0 = 100%, default)
- `blur` - Blur radius in pixels
- `width`, `height` - Dimensions (for rectangles)
- Any numeric property

**Note on scaling:** When both `scale` and `scaleX`/`scaleY` are specified, they multiply together. For example, `scale: 0.5` and `scaleX: 2.0` results in a final X-scale of 1.0. This allows combining uniform scaling with directional squash & stretch effects.

### Clipping

Clipping allows you to reveal only a portion of an object, creating effects like wipes and reveals. The clip region is defined in the object's natural bounding box coordinate space, where (0, 0) is the top-left corner of the object's bounds, regardless of anchor positioning or transforms.

#### Basic Clipping

```json
{
  "type": "text",
  "content": "Hello World",
  "x": 960,
  "y": 540,
  "clip": {
    "x": 0,
    "y": 0,
    "width": 100,
    "height": 50
  }
}
```

#### Animated Clipping

Clip properties can be animated using nested property paths:

```json
{
  "objects": [
    {
      "type": "text",
      "id": "title",
      "content": "REVEAL",
      "x": 960,
      "y": 540,
      "anchor": "center",
      "clip": {
        "x": -480,
        "y": -100,
        "width": 0,
        "height": 200
      }
    }
  ],
  "animations": [
    {
      "target": "title",
      "property": "clip.width",
      "keyframes": [
        {"start": 0, "value": 0},
        {"start": 30, "value": 960}
      ]
    }
  ]
}
```

**Animatable clip properties:**
- `clip.x` - X position of clip region
- `clip.y` - Y position of clip region
- `clip.width` - Width of clip region
- `clip.height` - Height of clip region

**Percentage values:**
Clip dimensions can use percentages (resolved at preprocessing time):
- `"100%"` in `clip.width` → object's width
- `"50%"` in `clip.height` → 50% of object's height
- Supports both pixels (numbers) and percentages (strings)
- For text objects, width is measured automatically

Example:
```json
{
  "property": "clip.width",
  "keyframes": [
    {"start": 0, "value": 0},
    {"start": 30, "value": "100%"}  // Resolves to object's width
  ]
}
```

**Notes:**
- Clipping is applied in object's natural bounding box space (0,0 = top-left, regardless of anchor)
- Works on all object types including groups (clips all children)
- Useful for wipe reveals, iris effects, and progressive disclosure
- Combine with transforms for creative reveal animations

### Effects Library

Pre-composed animations stored as individual JSON files in the `effects/` directory. Each effect can be referenced by name (its filename without `.json` extension). Effects use time-based definitions (0.0 to 1.0 normalized) which are converted to frames at load time based on the project's fps. This allows effects to work consistently across different frame rates.

Effects are loaded on-demand and cached for performance.

#### Using Effects

Effects are applied through sequences using the `effect` property:

```json
{
  "objects": [
    {
      "type": "text",
      "id": "title",
      "content": "Hello World",
      "x": 960,
      "y": 540,
      "scale": 0,
      "opacity": 0
    }
  ],
  "animations": [
    {
      "target": "title",
      "effect": "pop",
      "start": "0.5s"
    }
  ]
}
```

**Key points:**
- `target` - ID of the object to animate
- `effect` - Name of effect from library
- `start` - When to start the effect (supports multiple formats, see below)
- `duration` - Optional duration override (supports multiple formats, uses effect default if not specified)
- Effects are expanded to property animations during preprocessing
- Time values are converted to frames based on project fps

**Time Value Formats:**

The `start` and `duration` parameters support flexible time formats:

```json
{
  "start": 30           // Frame number (30 frames)
  "start": "1s"         // Seconds (1 second)
  "start": "500ms"      // Milliseconds (500ms = 0.5 seconds)
  "start": "0.5m"       // Minutes (0.5 minutes = 30 seconds)

  "duration": 60        // Frame number (60 frames)
  "duration": "2s"      // Seconds (2 seconds)
  "duration": "1.5s"    // Fractional seconds (1.5 seconds)
}
```

**Which format to use:**
- **Time strings ("1s", "500ms")** - Recommended for most cases. Intuitive and works across different frame rates.
- **Frame numbers** - Use when you need precise frame-level control or when timing relates to other frame-based animations.

#### Custom Effect Duration

You can override the default duration of any effect by specifying a `duration` property:

```json
{
  "animations": [
    {
      "target": "title",
      "effect": "pop",
      "start": "0.5s",
      "duration": "0.8s"  // Override default 0.33s with 0.8s
    }
  ]
}
```

This allows you to stretch or compress effects to match your desired timing while still benefiting from the pre-composed animation curves. The effect's keyframes are scaled proportionally to the new duration.

**Example use cases:**
- Speed up effects for fast-paced content: `"duration": 0.2`
- Slow down effects for dramatic emphasis: `"duration": 1.0`
- Synchronize effect timing with audio or other animations

#### Built-in Effects

**pop** (0.33s)
- Scale from 0 to 1 with bounce overshoot
- Fade from 0 to 1
- Great for titles appearing

**fadeIn** (0.5s)
- Simple opacity 0 to 1 transition
- Ease-out easing

**fadeOut** (0.5s)
- Simple opacity 1 to 0 transition
- Ease-in easing

**slideInLeft** (0.5s)
- Slide from off-screen left to center
- Fade in simultaneously
- Positions are centered at x: 960 for 1920px width

**slideOutRight** (0.5s)
- Slide from center to off-screen right
- Fade out simultaneously

**bounce** (0.6s)
- Vertical squash and stretch animation
- ScaleY oscillates: 1.0 → 0.8 → 1.1 → 1.0
- Creates landing or jumping effect

**spin** (1.0s)
- Full 360° rotation
- Linear easing for constant speed

**dropIn** (0.6s)
- Scale from 10.0 (fills screen) to 1.0
- Bounce overshoot on landing
- Quick fade in during first 20%

**wipe** (0.5s)
- Reveal from left to right using clipping
- Animates clip.width from 0 to 100% (object width)
- Ease-out for smooth reveal
- Works on any object size automatically
- Great for title reveals and transitions

**wipe-right** (0.5s)
- Reveal from right to left
- Animates clip.x and clip.width together

**wipe-up** (0.5s)
- Reveal from top to bottom
- Animates clip.height from 0 to 100%

**wipe-down** (0.5s)
- Reveal from bottom to top
- Animates clip.y and clip.height together

**wipe-right-up** (0.5s)
- Diagonal reveal from bottom-right to top-left
- Combines horizontal and vertical wipe motion

**blur-in** (0.5s)
- Reveal from blurry to sharp
- Animates blur from 20px to 0
- Ease-out for smooth focus

**blur-out** (0.5s)
- Transition from sharp to blurry
- Animates blur from 0 to 20px
- Ease-in for smooth defocus

**fade-blur** (0.8s)
- Combined fade in + blur in effect
- Animates both opacity (0→1) and blur (15px→0)
- Creates dreamy, soft entrance

#### Creating Custom Effects

Each effect is defined in its own JSON file in the `effects/` directory. For example, `effects/myEffect.json`:

```json
{
  "description": "Custom effect description",
  "duration": 0.5,
  "properties": {
    "scale": [
      {"time": 0.0, "value": 0},
      {"time": 1.0, "value": 1, "easing": "ease-out"}
    ],
    "rotation": [
      {"time": 0.0, "value": 0},
      {"time": 1.0, "value": 90}
    ]
  }
}
```

To use your custom effect, reference it by its filename (without the `.json` extension):

```json
{
  "target": "title",
  "effect": "myEffect",
  "start": "1s"
}
```

**Effect Structure:**
- `description` - Optional description of the effect
- `duration` - Effect duration in seconds (can be overridden when used)
- `properties` - Map of property names to time-based keyframes
- Each keyframe has:
  - `time` - Normalized time from 0.0 to 1.0
  - `value` - Property value at that time
  - `easing` - Optional easing function

**Built-in effects:**
- `effects/pop.json`
- `effects/fadeIn.json`
- `effects/fadeOut.json`
- `effects/slideInLeft.json`
- `effects/slideOutRight.json`
- `effects/bounce.json`
- `effects/spin.json`
- `effects/dropIn.json`
- `effects/wipe.json`
- `effects/wipe-right.json`
- `effects/wipe-up.json`
- `effects/wipe-down.json`
- `effects/wipe-right-up.json`
- `effects/blur-in.json`
- `effects/blur-out.json`
- `effects/fade-blur.json`

#### Mixing Effects and Property Animations

You can combine effects with traditional property animations in the same sequence:

```json
{
  "animations": [
    {
      "target": "title",
      "effect": "pop",
      "start": 0
    },
    {
      "target": "title",
      "property": "rotation",
      "keyframes": [
        {"start": 30, "value": 0},
        {"start": 90, "value": 360}
      ]
    }
  ]
}
```

#### Easing Functions

**Presets:**
- `linear` (default)
- `ease-in`
- `ease-out`
- `ease-in-out`
- `bounce`
- `elastic`

**Cubic Bezier (Custom Curves):**

String format (CSS-style):
```json
{
  "start": 60,
  "value": 100,
  "easing": "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
}
```

Object format:
```json
{
  "start": 60,
  "value": 100,
  "easing": {
    "type": "cubic-bezier",
    "points": [0.68, -0.55, 0.265, 1.55]
  }
}
```

Control points are `[x1, y1, x2, y2]` where:
- `x1`, `x2` should be in range 0-1
- `y1`, `y2` can be outside 0-1 to create overshoot/undershoot effects
- The curve always starts at (0, 0) and ends at (1, 1)

### Image Objects

Images support PNG, JPEG, and other formats supported by the `canvas` library:

```json
{
  "type": "image",
  "source": "../assets/logo.png",
  "x": 960,
  "y": 540,
  "width": 200,
  "height": 200,
  "anchor": "center",
  "opacity": 1.0
}
```

**Properties:**
- `source` - Path to image file (relative to animation file)
- `width` - Display width in pixels (optional, defaults to image's natural width)
- `height` - Display height in pixels (optional, defaults to image's natural height)
- `x`, `y` - Position
- `anchor` - Anchor point for positioning (default: `"top-left"`)
- All standard transform properties: `scale`, `scaleX`, `scaleY`, `rotation`, `opacity`

**Supported formats:**
- PNG (with alpha channel transparency)
- JPEG
- GIF
- BMP
- SVG (via canvas library)

**Notes:**
- Images are preloaded before rendering begins
- Images are cached to avoid redundant loading
- Paths are resolved relative to the animation file location
- Width and height can be animated via keyframes

### Shape Objects

#### Circle
```json
{
  "type": "circle",
  "x": 960,
  "y": 540,
  "radius": 50,
  "fill": "#FF0000",
  "stroke": "#FFFFFF",
  "strokeWidth": 2
}
```

**Properties:**
- `radius` - Circle radius in pixels
- `fill` - Fill color (optional)
- `stroke` - Stroke color (optional)
- `strokeWidth` - Stroke width in pixels (default: 1)

#### Ellipse
```json
{
  "type": "ellipse",
  "x": 960,
  "y": 540,
  "radiusX": 80,
  "radiusY": 40,
  "fill": "#00FF00",
  "stroke": "#000000",
  "strokeWidth": 3
}
```

**Properties:**
- `radiusX` - Horizontal radius in pixels
- `radiusY` - Vertical radius in pixels
- `fill` - Fill color (optional)
- `stroke` - Stroke color (optional)
- `strokeWidth` - Stroke width in pixels (default: 1)

#### Path
Custom shapes using canvas path commands:

```json
{
  "type": "path",
  "x": 100,
  "y": 100,
  "commands": [
    {"type": "moveTo", "x": 0, "y": 0},
    {"type": "lineTo", "x": 100, "y": 0},
    {"type": "lineTo", "x": 50, "y": 86.6},
    {"type": "closePath"}
  ],
  "fill": "#0000FF",
  "stroke": "#FFFFFF",
  "strokeWidth": 2
}
```

**Supported commands:**
- `moveTo` - Move to point: `{type: "moveTo", x, y}`
- `lineTo` - Line to point: `{type: "lineTo", x, y}`
- `bezierCurveTo` - Cubic Bézier curve: `{type: "bezierCurveTo", cp1x, cp1y, cp2x, cp2y, x, y}`
- `quadraticCurveTo` - Quadratic Bézier curve: `{type: "quadraticCurveTo", cpx, cpy, x, y}`
- `arc` - Arc: `{type: "arc", x, y, radius, startAngle, endAngle, counterclockwise?}`
- `arcTo` - Arc to point: `{type: "arcTo", x1, y1, x2, y2, radius}`
- `closePath` - Close path: `{type: "closePath"}`

### Groups
Groups allow animating multiple objects together:
```json
{
  "type": "group",
  "id": "title-group",
  "x": 960,
  "y": 540,
  "rotation": 0,
  "children": [
    {"type": "text", "content": "Hello"},
    {"type": "rect", "width": 200, "height": 50}
  ],
  "animations": [
    {
      "property": "rotation",
      "keyframes": [
        {"start": 0, "value": 0},
        {"start": 60, "value": 360}
      ]
    }
  ]
}
```

## Example Full Animation

```json
{
  "project": {
    "width": 1920,
    "height": 1080,
    "fps": 60,
    "frames": 300
  },
  "objects": [
    {
      "id": "background",
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080,
      "fill": "#000000",
      "z": 0
    },
    {
      "type": "component",
      "source": "./components/title-card.json",
      "params": {
        "text": "My Video Title",
        "color": "#FF6B35",
        "startFrame": 0
      },
      "z": 10
    },
    {
      "id": "logo",
      "type": "image",
      "source": "./assets/logo.png",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 200,
      "opacity": 0,
      "z": 20,
      "animations": [
        {
          "property": "opacity",
          "keyframes": [
            {"start": 0, "value": 0},
            {"start": 30, "value": 1, "easing": "ease-in"}
          ]
        }
      ]
    }
  ]
}
```

## CLI Usage

```bash
# Render animation to PNG sequence
npm run dev examples/animation.json ./output-frames

# Render directly to MP4 video
npm run dev examples/animation.json output.mp4 --video

# Or use .mp4 extension (--video flag is auto-detected)
npm run dev examples/animation.json output.mp4
```

**Output modes:**
- PNG sequence: Specify a directory path (e.g., `./frames`)
- MP4 video: Use `.mp4` extension or add `--video` flag
- MOV video: Use `.mov` extension

**Requirements:**
- FFmpeg must be installed for video output
- PNG sequence mode works without external dependencies

## Implementation Status

✅ **Completed:**
1. JSON schema and type definitions
2. Core renderer (Canvas + PNG export)
3. Basic primitives (rect, text, image, line, point, circle, ellipse, path)
4. Animation system with keyframes and easing (including cubic-bezier)
5. Groups with transform inheritance
6. Component system with parameter substitution
7. CLI tool for rendering (PNG sequences and MP4 video)
8. Effects library with time-based definitions
9. Preprocessor for expanding effects and converting time to frames
10. Comprehensive test suite

**Future Enhancements:**
- JSON Schema validation
- Additional easing functions (elastic, bounce improvements)
- Browser-based preview mode
- Animation curve editor
- More complex path operations

## Design Goals
- **LLM-friendly**: Easy for AI to generate and modify
- **Human-editable**: Clear, readable JSON structure
- **Composable**: Components for reusability
- **Flexible**: Support both simple and complex animations
- **Production-ready**: Output directly usable in DaVinci Resolve
