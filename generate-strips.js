// Generate 147 LED strips with staggered timing
// Canvas: 3840 × 2160px
// Physical: 4.3m wide × 2m tall
// Need to fit in safe area with header (200px) and margins

// Available space for strips: 2160 - 300 (header) - 50 (footer) = 1810px height
// Strip height at base: 900px, need scale to fit: 1810 / 900 = 2.01

// Width: 3600px safe area for 430cm = 8.37 px/cm
// But with scale 2.0: component is at 4.465 px/cm base, so we get 8.93 px/cm at 2x
// Strip spacing: 430cm / 147 = 2.925cm → at 2x scale with base component = 2.925 × 4.465 × 2 = 26.1px

const stripSpacing = 26.1; // pixels between strip centers at 2x scale
const totalWidth = 146 * stripSpacing; // Width of all 147 strips (146 gaps)
const canvasWidth = 4200;
const startX = (canvasWidth - totalWidth) / 2; // Center the strips
const startY = 300; // Below header
const scale = 2.0; // Fits height: 900 × 2 = 1800px

const strips = [];

for (let i = 0; i < 147; i++) {
  const randomOffset = Math.floor(Math.random() * 5) - 2; // -2 to +2 frames
  const startFrame = Math.max(0, i * 2 + randomOffset);

  strips.push({
    type: "component",
    id: `strip-${i + 1}`,
    source: "./components/led-strip.json",
    x: startX + (i * stripSpacing),
    y: startY,
    scale: scale,
    start: startFrame, // 2 frame delay + random offset
    params: {
      opacity: 0.5
    }
  });
}

console.log(JSON.stringify(strips, null, 2));
