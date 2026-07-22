// 50-clip factory for lip-sync-duel EXTREME (TikTok winner: 223 views base).
// 5 seeds (distinct gameplay patterns) × 10 hook overlays = 50 unique videos.
// Audio bed baked in (never ship silent reels). Output: ig/clips/lsd-extreme/
// Usage: node engine/night/make-lsd-extreme-clips.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { captureClip } from '../lib/capture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'ig', 'clips', 'lsd-extreme');
const WORK = path.join(ROOT, 'engine', 'state', 'capture-work', 'lsd-extreme');
const BED = path.join(ROOT, 'ig', 'beds', 'rhythm.m4a');
const FONT = '/System/Library/Fonts/Helvetica.ttc';
fs.mkdirSync(OUT, { recursive: true });

const SEEDS = [7, 13, 21, 34, 55];
const HOOKS = [
  '99% quit EXTREME mode',
  'this game got 10x harder',
  'EXTREME mode is basically impossible',
  'how many bars before you rage quit',
  'my record is 4 bars. beat it.',
  'the decoy words get EVERYONE',
  'tap the wrong word = instant over',
  'nobody has hit 10 bars yet',
  'the hard version. good luck.',
  'POV: normal mode was too easy',
];

// 1) capture 5 base recordings of the EXTREME variant demo
const bases = [];
for (const seed of SEEDS) {
  const base = path.join(WORK, `base-s${seed}.mp4`);
  if (!fs.existsSync(base)) {
    console.log(`capturing extreme demo seed=${seed}…`);
    await captureClip({
      gameId: 'lip-sync-duel/variants/lip-sync-duel-extreme',
      seed,
      outFile: base,
      workDir: path.join(WORK, `w-s${seed}`)
    });
  }
  bases.push({ seed, base });
}

// 2) generate hook overlay PNGs (this ffmpeg lacks drawtext — PIL bakes text)
execFileSync('python3', [path.join(ROOT, 'engine', 'night', 'gen-hook-overlays.py')], { stdio: 'inherit' });
const HOOKDIR = path.join(WORK, 'hooks');

// 3) 10 hook overlays × 5 seeds, bed audio mixed in
let made = 0, skipped = 0;
for (let h = 0; h < HOOKS.length; h++) {
  const png = path.join(HOOKDIR, `hook-${String(h + 1).padStart(2, '0')}.png`);
  for (const { seed, base } of bases) {
    const out = path.join(OUT, `lsd-x-h${String(h + 1).padStart(2, '0')}-s${seed}.mp4`);
    if (fs.existsSync(out)) { skipped++; continue; }
    execFileSync('ffmpeg', [
      '-y', '-i', base, '-i', png, '-i', BED,
      '-filter_complex', `[0:v][1:v]overlay=0:0:enable='between(t,0.3,3.2)'[v]`,
      '-map', '[v]', '-map', '2:a',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      '-c:a', 'aac', '-b:a', '128k', '-shortest',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      out
    ], { stdio: 'pipe' });
    made++;
  }
  console.log(`hook ${h + 1}/10 done`);
}
console.log(`DONE: ${made} made, ${skipped} skipped → ${OUT}`);
