# Animation Tool

A declarative animation tool for creating video content, designed to be both hand-editable and LLM-generatable. Outputs PNG image sequences for import into DaVinci Resolve.

## Features

- **Declarative JSON format** - Easy for both humans and LLMs to read and write
- **Effects library** - Pre-composed animations with time-based definitions (pop, fadeIn, slideIn, etc.)
- **Component system** - Reusable animation components with parameters
- **Full animation support** - Keyframe-based animations with easing functions
- **Multiple object types** - Text, images, rectangles, lines, points, and groups
- **PNG sequence output** - Direct import into DaVinci Resolve

## Installation

```bash
npm install
```

## Usage

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests with UI
npm test:ui

# Run tests once (no watch)
npm test:once
```

## Project Structure

```
animation_tool/
├── src/
│   ├── types.ts          # Core type definitions
│   └── index.ts          # Main entry point
├── DESIGN.md             # Detailed design document
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Quick Example

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
      "type": "text",
      "id": "title",
      "content": "Hello World",
      "x": 960,
      "y": 540,
      "size": 72,
      "color": "#FFFFFF",
      "anchor": "center",
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

### Using Effects

The tool includes a library of pre-composed effects that work at any frame rate:

```json
{
  "sequences": [{
    "animations": [
      {"target": "title", "effect": "pop", "startTime": 0.0},
      {"target": "subtitle", "effect": "fadeIn", "startTime": 1.0},
      {"target": "logo", "effect": "slideInLeft", "startTime": 2.0}
    ]
  }]
}
```

**Built-in effects:**
- `pop` - Scale and fade in with bounce
- `fadeIn` / `fadeOut` - Simple opacity transitions
- `slideInLeft` / `slideOutRight` - Slide with fade
- `bounce` - Bounce in place
- `spin` - 360° rotation
- `dropIn` - Drop from huge scale with bounce

See [DESIGN.md](./DESIGN.md) for complete documentation.

## License

ISC
