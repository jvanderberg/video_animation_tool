#!/usr/bin/env node

import { readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import { cpus } from 'os';
import { Renderer } from './renderer.js';
import { preprocessAnimation } from './preprocessor.js';
import type { AnimationFile } from './types.js';

function streamToFFmpeg(renderer: Renderer, animation: AnimationFile, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Spawn FFmpeg with stdin pipe
    // -f image2pipe: read images from pipe
    // -vcodec mjpeg: JPEG codec for input
    // -framerate: output frame rate
    const ffmpeg = spawn('ffmpeg', [
      '-y', // overwrite output file
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', animation.project.fps.toString(),
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '18',
      outputPath
    ], {
      stdio: ['pipe', 'inherit', 'pipe']
    });

    ffmpeg.stderr.on('data', (data) => {
      // FFmpeg outputs to stderr, only show errors
      const str = data.toString();
      if (str.includes('Error') || str.includes('error')) {
        process.stderr.write(data);
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg: ${err.message}. Make sure FFmpeg is installed.`));
    });

    // Render and stream frames
    (async () => {
      try {
        for (let frame = 0; frame < animation.project.frames; frame++) {
          // Render frame as JPEG (much faster than PNG)
          const canvas = renderer.renderFrame(frame);
          const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });

          // Write to FFmpeg stdin
          if (!ffmpeg.stdin.write(buffer)) {
            // Wait for drain if buffer is full
            await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
          }

          // Progress indicator
          if ((frame + 1) % 10 === 0 || frame === animation.project.frames - 1) {
            const progress = ((frame + 1) / animation.project.frames * 100).toFixed(1);
            process.stdout.write(`\rProgress: ${progress}% (${frame + 1}/${animation.project.frames} frames)`);
          }
        }

        // Close stdin to signal end of input
        ffmpeg.stdin.end();
      } catch (error) {
        ffmpeg.kill();
        reject(error);
      }
    })();
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm run dev <animation.json> [output-path] [--video]');
    console.log('');
    console.log('Examples:');
    console.log('  npm run dev examples/simple-box.json ./frames');
    console.log('  npm run dev examples/simple-box.json output.mp4 --video');
    process.exit(1);
  }

  const animationPath = args[0];
  const outputPath = args[1] || './frames';
  const videoMode = args.includes('--video') || outputPath.endsWith('.mp4') || outputPath.endsWith('.mov');

  try {
    // Load animation file
    console.log(`Loading animation from ${animationPath}...`);
    const data = await readFile(animationPath, 'utf-8');
    let animation: AnimationFile = JSON.parse(data);

    // Validate basic structure
    if (!animation.project || !animation.objects) {
      throw new Error('Invalid animation file: missing project or objects');
    }

    // Preprocess: expand effects and convert time to frames
    animation = await preprocessAnimation(animation);

    console.log(`Project: ${animation.project.width}x${animation.project.height} @ ${animation.project.fps}fps`);
    console.log(`Frames: ${animation.project.frames}`);
    console.log(`Objects: ${animation.objects.length}`);

    // Create renderer
    const renderer = new Renderer(animation);

    if (videoMode) {
      // Stream directly to FFmpeg (no temp files)
      console.log(`\nRendering and encoding video...`);
      const startTime = Date.now();

      await streamToFFmpeg(renderer, animation, outputPath);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n\nRendered and encoded ${animation.project.frames} frames in ${elapsed}s`);
      console.log(`\nDone! Video saved to ${outputPath}`);
    } else {
      // Render PNG sequence with parallel processing
      await mkdir(outputPath, { recursive: true });

      console.log(`\nRendering frames in parallel...`);
      const startTime = Date.now();

      // Render in batches to avoid overwhelming memory
      const batchSize = cpus().length * 4; // 4x CPU cores for maximum throughput
      let completed = 0;

      for (let batchStart = 0; batchStart < animation.project.frames; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, animation.project.frames);
        const batch = [];

        // Create batch of rendering promises
        for (let frame = batchStart; frame < batchEnd; frame++) {
          const promise = (async () => {
            const buffer = await renderer.exportFrame(frame);
            const filename = `frame_${frame.toString().padStart(4, '0')}.png`;
            const filepath = join(outputPath, filename);
            await writeFile(filepath, buffer);
            return frame;
          })();
          batch.push(promise);
        }

        // Wait for batch to complete
        await Promise.all(batch);
        completed += batch.length;

        // Progress indicator
        const progress = (completed / animation.project.frames * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}% (${completed}/${animation.project.frames} frames)`);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n\nRendered ${animation.project.frames} frames in ${elapsed}s`);

      console.log(`\nTo import into DaVinci Resolve:`);
      console.log(`1. File > Import > Image Sequence`);
      console.log(`2. Select first frame: ${outputPath}/frame_0000.png`);
      console.log(`3. Set frame rate to ${animation.project.fps} fps`);
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
