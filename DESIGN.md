# Animation Tool Design Document

## Overview
A declarative animation tool for creating video content, designed to be both hand-editable and LLM-generatable. Outputs PNG image sequences for import into DaVinci Resolve.

## Core Decisions

### Format: JSON
- **Not YAML** - JSON is more reliable, better LLM compatibility, fewer edge cases
- Strict syntax catches errors early
- Native support in all languages and editors
- JSON Schema for validation

### Coordinate System & Units
- **Origin**: Top-left (0, 0)
- **Units**: Pixels only
- **Time**: Frame numbers (not seconds)
- **Layering**: Document order (first = bottom), explicit z-index optional

### Output Format
- **PNG image sequence** - e.g., `frame_0001.png`, `frame_0002.png`
- Alpha channel support for transparency
- Import directly into DaVinci Resolve as image sequence
- Frame-perfect, no compression artifacts

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

### Animation System

#### Keyframe-based
```json
{
  "animations": [
    {
      "property": "x",
      "keyframes": [
        {"frame": 0, "value": 0},
        {"frame": 30, "value": 100, "easing": "ease-out"},
        {"frame": 60, "value": 200}
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
- `width`, `height` - Dimensions (for rectangles)
- Any numeric property

**Note on scaling:** When both `scale` and `scaleX`/`scaleY` are specified, they multiply together. For example, `scale: 0.5` and `scaleX: 2.0` results in a final X-scale of 1.0. This allows combining uniform scaling with directional squash & stretch effects.

### Effects Library

Pre-composed animations stored in `effects/library.json` that can be referenced by name. Effects use time-based definitions (0.0 to 1.0 normalized) which are converted to frames at load time based on the project's fps. This allows effects to work consistently across different frame rates.

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
  "sequences": [
    {
      "name": "main",
      "animations": [
        {
          "target": "title",
          "effect": "pop",
          "startTime": 0.5
        }
      ]
    }
  ]
}
```

**Key points:**
- `target` - ID of the object to animate
- `effect` - Name of effect from library
- `startTime` - When to start the effect (in seconds)
- Effects are expanded to property animations during preprocessing
- Time values are converted to frames based on project fps

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

#### Creating Custom Effects

Effects are defined in `effects/library.json`:

```json
{
  "myEffect": {
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
}
```

**Structure:**
- `duration` - Effect duration in seconds
- `properties` - Map of property names to time-based keyframes
- Each keyframe has:
  - `time` - Normalized time from 0.0 to 1.0
  - `value` - Property value at that time
  - `easing` - Optional easing function

#### Mixing Effects and Property Animations

You can combine effects with traditional property animations in the same sequence:

```json
{
  "sequences": [{
    "animations": [
      {
        "target": "title",
        "effect": "pop",
        "startTime": 0.0
      },
      {
        "target": "title",
        "property": "rotation",
        "keyframes": [
          {"frame": 30, "value": 0},
          {"frame": 90, "value": 360}
        ]
      }
    ]
  }]
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
  "frame": 60,
  "value": 100,
  "easing": "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
}
```

Object format:
```json
{
  "frame": 60,
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
        {"frame": 0, "value": 0},
        {"frame": 60, "value": 360}
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
            {"frame": 0, "value": 0},
            {"frame": 30, "value": 1, "easing": "ease-in"}
          ]
        }
      ]
    }
  ]
}
```

## CLI Usage (Planned)

```bash
# Render animation to PNG sequence
animate render animation.json --output ./frames/

# Validate animation file
animate validate animation.json

# Preview in browser
animate preview animation.json
```

## Implementation Plan

1. Define JSON schema
2. Build core renderer (Canvas + PNG export)
3. Implement basic primitives (rect, text, image, line, point)
4. Add animation system with keyframes and easing
5. Implement groups with transform inheritance
6. Add component system with parameters
7. CLI tool for rendering
8. Validation and error handling

## Design Goals
- **LLM-friendly**: Easy for AI to generate and modify
- **Human-editable**: Clear, readable JSON structure
- **Composable**: Components for reusability
- **Flexible**: Support both simple and complex animations
- **Production-ready**: Output directly usable in DaVinci Resolve
