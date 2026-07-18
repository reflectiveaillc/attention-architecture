// LOOP clip capture — records the game's own demo mode with Playwright and
// encodes a 9:16 1080x1920 mp4 hook clip via ffmpeg (docs/hook-video.md
// "MVP shortcut": the clip IS the game, no separate gen pipeline).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { startCollector } from './collector.mjs';

export async function captureClip({ gameId, seed = 7, outFile, workDir }) {
  const { chromium } = await import('playwright');
  fs.mkdirSync(workDir, { recursive: true });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  const { server, url } = await startCollector({ eventsFile: null });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 405, height: 720 },
    recordVideo: { dir: workDir, size: { width: 405, height: 720 } }
  });
  const page = await context.newPage();
  await page.goto(`${url}/games/${gameId}/?demo=1&seed=${seed}`);
  await page.waitForFunction('window.__demoDone === true', null, { timeout: 90_000 });
  await page.waitForTimeout(300);
  const video = page.video();
  await context.close();
  const webm = await video.path();
  await browser.close();
  server.close();

  // encode: crisp scale to 1080x1920, h264, muted-friendly (no audio track)
  execFileSync('ffmpeg', [
    '-y', '-i', webm,
    '-vf', 'scale=1080:1920:flags=neighbor,setsar=1',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    outFile
  ], { stdio: 'pipe' });

  const probe = execFileSync('ffprobe', [
    '-v', 'quiet', '-print_format', 'json', '-show_format', outFile
  ]).toString();
  const fmt = JSON.parse(probe).format;
  return {
    file: outFile,
    duration_s: +(+fmt.duration).toFixed(1),
    size_kb: Math.round(+fmt.size / 1024),
    resolution: '1080x1920',
    seed
  };
}
