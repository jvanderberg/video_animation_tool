/**
 * Debug tool: Scan a region for non-transparent pixels
 *
 * Useful for finding where text or objects actually render (accounting for
 * font baseline offsets, anti-aliasing, etc.)
 *
 * Usage:
 *   npx tsx debug/pixel-scan.ts <file> <frame> <x> <y> <width> <height>
 *
 * Example:
 *   npx tsx debug/pixel-scan.ts examples/text-animation.json 0 95 95 60 30
 */

import { loadAndPreprocess } from '../src/test-helpers.js';
import { Renderer } from '../src/renderer.js';
import { getPixelFromPNG } from '../src/test-helpers.js';

async function main() {
  const [filePath, frameStr, xStr, yStr, widthStr, heightStr] = process.argv.slice(2);

  if (!filePath || !frameStr || !xStr || !yStr || !widthStr || !heightStr) {
    console.error('Usage: npx tsx debug/pixel-scan.ts <file> <frame> <x> <y> <width> <height>');
    console.error('Example: npx tsx debug/pixel-scan.ts examples/demo.json 0 95 95 60 30');
    process.exit(1);
  }

  const frame = parseInt(frameStr);
  const x = parseInt(xStr);
  const y = parseInt(yStr);
  const width = parseInt(widthStr);
  const height = parseInt(heightStr);

  console.log(`Loading and preprocessing: ${filePath}`);
  const processed = await loadAndPreprocess(filePath);

  console.log(`Rendering frame ${frame}...`);
  const renderer = new Renderer(processed);
  const buffer = await renderer.exportFrame(frame);

  console.log(`\nScanning region: (${x}, ${y}) to (${x + width}, ${y + height})\n`);

  let foundPixels = 0;

  for (let scanY = y; scanY < y + height; scanY++) {
    for (let scanX = x; scanX < x + width; scanX++) {
      const pixel = await getPixelFromPNG(buffer, scanX, scanY);
      const [r, g, b, a] = pixel;

      // Only show pixels with non-zero alpha
      if (a > 0) {
        console.log(`(${scanX}, ${scanY}): rgba(${r}, ${g}, ${b}, ${a})`);
        foundPixels++;
      }
    }
  }

  if (foundPixels === 0) {
    console.log('No non-transparent pixels found in region');
  } else {
    console.log(`\nFound ${foundPixels} non-transparent pixel(s)`);
  }
}

main().catch(console.error);
