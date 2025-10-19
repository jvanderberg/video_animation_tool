import { createCanvas } from 'canvas';
import { writeFile } from 'fs/promises';

// Create semi-transparent colored squares
const colors = [
  { name: 'red', color: '#FF0000' },
  { name: 'blue', color: '#0000FF' },
  { name: 'green', color: '#00FF00' },
  { name: 'yellow', color: '#FFFF00' },
  { name: 'purple', color: '#FF00FF' },
];

for (const { name, color } of colors) {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');

  // Semi-transparent square
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.6; // 60% opacity
  ctx.fillRect(0, 0, 200, 200);

  const buffer = canvas.toBuffer('image/png');
  await writeFile(`./assets/square-${name}.png`, buffer);
  console.log(`Created assets/square-${name}.png`);
}
