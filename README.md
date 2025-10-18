# Animation Tool

A declarative animation tool for creating video content, designed to be both hand-editable and LLM-generatable. Outputs PNG image sequences for import into DaVinci Resolve.

## Features

- **Declarative JSON format** - Easy for both humans and LLMs to read and write
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
      "content": "Hello World",
      "x": 960,
      "y": 540,
      "size": 72,
      "color": "#FFFFFF",
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

See [DESIGN.md](./DESIGN.md) for complete documentation.

## License

ISC
