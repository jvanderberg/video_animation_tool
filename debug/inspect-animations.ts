/**
 * Debug tool: Inspect preprocessed animations for a specific target
 *
 * Usage:
 *   npx tsx debug/inspect-animations.ts <file> <targetId>
 *
 * Example:
 *   npx tsx debug/inspect-animations.ts examples/current-limit-instability.json solutions.solution-title
 */

import { loadAndPreprocess, findAnimationsForTarget, clearPreprocessCache } from '../src/test-helpers.js';

async function main() {
  const [filePath, targetId] = process.argv.slice(2);

  if (!filePath || !targetId) {
    console.error('Usage: npx tsx debug/inspect-animations.ts <file> <targetId>');
    console.error('Example: npx tsx debug/inspect-animations.ts examples/demo.json box1');
    process.exit(1);
  }

  // Clear cache to ensure we get fresh preprocessing with debug logs
  clearPreprocessCache();

  console.log(`Loading and preprocessing: ${filePath}`);
  const processed = await loadAndPreprocess(filePath);

  console.log(`\n=== Animations for target: ${targetId} ===`);
  const animations = findAnimationsForTarget(processed, targetId);

  if (animations.length === 0) {
    console.log('No animations found');
    return;
  }

  console.log(`Found ${animations.length} animation(s)\n`);

  for (const anim of animations) {
    console.log(`Property: ${anim.property}`);
    console.log(`Keyframes (showing first 3):`);
    console.log(JSON.stringify(anim.keyframes.slice(0, 3), null, 2));
    console.log('');
  }
}

main().catch(console.error);
