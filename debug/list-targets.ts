/**
 * Debug tool: List all object IDs and animation targets
 *
 * Useful for debugging animation targeting issues - shows what objects exist
 * and what animations are targeting them.
 *
 * Usage:
 *   npx tsx debug/list-targets.ts <file>
 *
 * Example:
 *   npx tsx debug/list-targets.ts examples/current-limit-instability.json
 */

import { loadAndPreprocess } from '../src/test-helpers.js';

async function main() {
  const [filePath] = process.argv.slice(2);

  if (!filePath) {
    console.error('Usage: npx tsx debug/list-targets.ts <file>');
    console.error('Example: npx tsx debug/list-targets.ts examples/demo.json');
    process.exit(1);
  }

  console.log(`Loading and preprocessing: ${filePath}`);
  const processed = await loadAndPreprocess(filePath);

  // List all object IDs
  console.log('\n=== Object IDs (first 20) ===');
  const objectIds = processed.objects
    .map(obj => obj.id || '<no-id>')
    .slice(0, 20);
  objectIds.forEach(id => console.log(`  ${id}`));
  if (processed.objects.length > 20) {
    console.log(`  ... and ${processed.objects.length - 20} more`);
  }

  // List all unique animation targets
  console.log('\n=== Animation Targets (unique) ===');
  const targets = [...new Set(processed.animations.map(a => a.target))];
  targets.forEach(target => {
    const count = processed.animations.filter(a => a.target === target).length;
    console.log(`  ${target} (${count} animation${count > 1 ? 's' : ''})`);
  });

  // Show summary
  console.log(`\n=== Summary ===`);
  console.log(`Total objects: ${processed.objects.length}`);
  console.log(`Total animations: ${processed.animations.length}`);
  console.log(`Unique targets: ${targets.length}`);
}

main().catch(console.error);
