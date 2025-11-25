// Generate LED strip component with animations
const animations = [];

// Drop in animation for the backing strip
animations.push({
  target: "strip-backing",
  effect: "dropIn",
  start: 0
});

// Slide in animations for each LED from (0,0), staggered by 1 frame each
// Each LED's natural position is (0, y) where y = i * 15
// We want them to start at (0, 0) and move to their natural position
// Add random offset (+/- 2 frames) to break up standing wave pattern
for (let i = 0; i < 60; i++) {
  const naturalY = i * 15;
  const randomOffset = Math.floor(Math.random() * 5) - 2; // -2 to +2 frames
  const startFrame = Math.max(0, i + randomOffset);
  const endFrame = startFrame + 20;

  animations.push({
    target: `led-${i}`,
    property: "y",
    keyframes: [
      { frame: startFrame, value: 0 },
      { frame: endFrame, value: naturalY, easing: "ease-out" }
    ]
  });

  // Keep LED invisible until animation starts
  animations.push({
    target: `led-${i}`,
    property: "opacity",
    keyframes: [
      { frame: 0, value: 0 },
      { frame: startFrame, value: 1 }
    ]
  });
}

console.log(JSON.stringify(animations, null, 2));
