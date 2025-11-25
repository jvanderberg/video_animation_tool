import { preprocessAnimation } from './src/preprocessor.js';
import { Renderer } from './src/renderer.js';
import { readFile, writeFile } from 'fs/promises';
import { getPixelFromPNG } from './src/test-helpers.js';

const content = await readFile('examples/efficiency-chart.json', 'utf-8');
const animation = JSON.parse(content);
const processed = await preprocessAnimation(animation);

console.log('Rendering frame 200...');
const renderer = new Renderer(processed);
const buffer = await renderer.exportFrame(200);
await writeFile('/tmp/frame-200.png', buffer);

// Check if there's any orange color (first bar #FF9F43) around where bar should be
// Bar at x=310 (after animation), y=850, height growing
const pixel1 = await getPixelFromPNG(buffer, 360, 600);
console.log(`Pixel at (360, 600): R=${pixel1[0]} G=${pixel1[1]} B=${pixel1[2]} A=${pixel1[3]}`);

const pixel2 = await getPixelFromPNG(buffer, 360, 750);
console.log(`Pixel at (360, 750): R=${pixel2[0]} G=${pixel2[1]} B=${pixel2[2]} A=${pixel2[3]}`);

console.log('\nSaved to /tmp/frame-200.png');
