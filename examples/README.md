# Animation Examples

This directory contains example animations to demonstrate the animation tool's capabilities.

## Running Examples

**Render as PNG sequence:**
```bash
npm run dev examples/simple-box.json ./frames
# The frames will be output to the ./frames directory
```

**Render directly to video:**
```bash
npm run dev examples/simple-box.json output.mp4
# Creates an MP4 video file (requires FFmpeg)
```

You can also use the `--video` flag or `.mov` extension for video output.

## Examples

### simple-box.json

A basic animation demonstrating:
- Static background rectangle
- Animated box with position and rotation
- Easing functions (ease-in-out, linear)
- 2 seconds at 60fps (120 frames)

The box moves from left to right while rotating 360 degrees.

### text-animation.json

A text-based title sequence demonstrating:
- Text rendering with custom fonts and sizes
- Multiple text objects with different styles
- Fade-in animations with position movement
- Animated accent box with width animation
- Anchor points for centered text
- 3 seconds at 60fps (180 frames)

Creates a professional-looking title card with animated text and graphics.

### group-animation.json

A complex group animation demonstrating:
- Groups as containers for multiple objects
- Group-level rotation animation affecting all children
- Individual child animations within the group
- Nested transforms (group rotation + child rotation)
- Opacity animations for fade-in effects
- 4 seconds at 60fps (240 frames)

Creates a rotating logo with orbiting elements that each spin independently while the entire group rotates.

### inflation-chart.json

An animated bar chart demonstrating:
- **Spring bounce animation** - chart slides up with overshoot and settles (damped spring effect)
- **Master group animation** - entire chart moves as one unit
- **Height animations** - bars grow from 0 to final height
- Staggered animation timing (bars animate in sequence)
- Nested groups (master chart group contains individual bar groups)
- Text labels for axis and values
- Color-coded bars (teal for low, red for high inflation)
- Dark background (#1a1a2e)
- 5 seconds at 60fps (300 frames)

Creates an animated bar chart showing U.S. inflation rates from 2015-2024. The entire chart slides up with a spring bounce (overshoots to y=-40, bounces back to y=15, then settles at y=0), then each bar grows upward with ease-out, followed by its percentage label fading in. Demonstrates the 2022 inflation spike (8.0%) and how multi-keyframe animations can create natural, physics-like motion.

### bezier-bounce.json

A comparison of easing functions demonstrating:
- **Cubic bezier curves** - custom animation timing with precise control
- **Overshoot effects** - bezier curves with y values > 1.0
- **Anticipation** - bezier curves with y values < 0.0
- Side-by-side comparison of linear, ease-out, and various bezier curves
- Both string format (`"cubic-bezier(0.68, -0.55, 0.265, 1.55)"`) and object format
- 3 seconds at 60fps (180 frames)

Shows five boxes moving across the screen with different timing functions: linear (constant speed), ease-out (decelerate), overshoot (goes past target then returns), elastic (bounces past target multiple times), and anticipation (moves backward before going forward).

## Importing into DaVinci Resolve

After rendering:

1. Open DaVinci Resolve
2. Go to **File > Import > Image Sequence**
3. Navigate to your frames directory
4. Select the first frame (`frame_0000.png`)
5. Set the frame rate to match your animation (e.g., 60 fps)
6. Click Import

The image sequence will appear in your media pool as a single clip ready to use in your timeline.
