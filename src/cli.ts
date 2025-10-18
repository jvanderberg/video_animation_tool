#!/usr/bin/env node

import { readFile, mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { spawn } from 'child_process';
import { Renderer } from './renderer.js';
import type { AnimationFile } from './types.js';

function encodeVideo(framesDir: string, outputPath: string, fps: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // FFmpeg command to encode PNG sequence to video
    // -framerate: input frame rate
    // -i: input pattern
    // -c:v libx264: H.264 codec
    // -pix_fmt yuv420p: pixel format for compatibility
    // -preset fast: encoding speed vs compression
    // -crf 18: quality (lower is better, 18 is visually lossless)
    const ffmpeg = spawn('ffmpeg', [
      '-y', // overwrite output file
      '-framerate', fps.toString(),
      '-i', join(framesDir, 'frame_%04d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '18',
      outputPath
    ]);

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
    const animation: AnimationFile = JSON.parse(data);

    // Validate basic structure
    if (!animation.project || !animation.objects) {
      throw new Error('Invalid animation file: missing project or objects');
    }

    console.log(`Project: ${animation.project.width}x${animation.project.height} @ ${animation.project.fps}fps`);
    console.log(`Frames: ${animation.project.frames}`);
    console.log(`Objects: ${animation.objects.length}`);

    // Determine output directory (temp if video mode)
    const outputDir = videoMode ? './.temp-frames' : outputPath;
    await mkdir(outputDir, { recursive: true });

    // Create renderer
    const renderer = new Renderer(animation);

    // Render all frames
    console.log(`\nRendering frames...`);
    const startTime = Date.now();

    for (let frame = 0; frame < animation.project.frames; frame++) {
      const buffer = await renderer.exportFrame(frame);
      const filename = `frame_${frame.toString().padStart(4, '0')}.png`;
      const filepath = join(outputDir, filename);
      await writeFile(filepath, buffer);

      // Progress indicator
      if ((frame + 1) % 10 === 0 || frame === animation.project.frames - 1) {
        const progress = ((frame + 1) / animation.project.frames * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}% (${frame + 1}/${animation.project.frames} frames)`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n\nRendered ${animation.project.frames} frames in ${elapsed}s`);

    if (videoMode) {
      // Encode video with FFmpeg
      console.log(`\nEncoding video to ${outputPath}...`);
      await encodeVideo(outputDir, outputPath, animation.project.fps);

      // Clean up temp frames
      console.log('Cleaning up temporary frames...');
      await rm(outputDir, { recursive: true, force: true });

      console.log(`\nDone! Video saved to ${outputPath}`);
    } else {
      console.log(`\nTo import into DaVinci Resolve:`);
      console.log(`1. File > Import > Image Sequence`);
      console.log(`2. Select first frame: ${outputDir}/frame_0000.png`);
      console.log(`3. Set frame rate to ${animation.project.fps} fps`);
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
