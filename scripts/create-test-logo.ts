import { createCanvas } from 'canvas';
import { writeFile } from 'fs/promises';

// Create a simple logo (200x200 with a circle and text)
const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');

// Background circle
ctx.fillStyle = '#4A90E2';
ctx.beginPath();
ctx.arc(100, 100, 90, 0, 2 * Math.PI);
ctx.fill();

// Inner circle
ctx.fillStyle = '#FFFFFF';
ctx.beginPath();
ctx.arc(100, 100, 60, 0, 2 * Math.PI);
ctx.fill();

// Text
ctx.fillStyle = '#4A90E2';
ctx.font = 'bold 48px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('AT', 100, 100);

// Save
const buffer = canvas.toBuffer('image/png');
await writeFile('./assets/logo.png', buffer);
console.log('Created assets/logo.png');
