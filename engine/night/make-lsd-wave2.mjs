// Wave 2: 20 clips from the measured winners of wave 1 (IG data Jul-23):
//   hook angle winner = social-proof difficulty (h01 "99% quit" → 11% like
//   rate on s34; h02 "10x harder" → 119v top-3 account-wide)
//   seed winners = s13 (views magnet ×2), s34 (likes magnet)
// 10 new hooks in the winning angle family × 2 winning seeds = 20 clips.
// Reuses wave-1 base captures. Usage: node engine/night/make-lsd-wave2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'ig', 'clips', 'lsd-extreme');
const WORK = path.join(ROOT, 'engine', 'state', 'capture-work', 'lsd-extreme');
const BED = path.join(ROOT, 'ig', 'beds', 'rhythm.m4a');
const SEEDS = [13, 34];

const HOOKS2 = [
  '94% quit before bar 3',
  'EXTREME mode has a 1% pass rate',
  'you won’t survive 20 seconds',
  'we doubled the speed. sorry.',
  'bar 5 is where everyone dies',
  'quit rate: 99%. your move.',
  'not even the dev can beat it',
  'hit 6 bars = top 1%',
  'hardest rhythm game on the internet',
  'everyone rage quits at the same word',
];

// overlay PNGs via PIL (ffmpeg lacks drawtext) — write hooks file for the py gen
const HOOKDIR = path.join(WORK, 'hooks2');
fs.mkdirSync(HOOKDIR, { recursive: true });
const py = `
from PIL import Image, ImageDraw, ImageFont
import textwrap
HOOKS = ${JSON.stringify(HOOKS2)}
FONT = "/System/Library/Fonts/Helvetica.ttc"
for i, text in enumerate(HOOKS, 11):
    img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, 64, index=1)
    y = 330
    for line in textwrap.wrap(text, width=22):
        w = d.textlength(line, font=font)
        x = (1080 - w) / 2
        pad = 26
        d.rounded_rectangle([x-pad, y-pad+8, x+w+pad, y+64+pad-2], radius=18, fill=(0,0,0,165))
        d.text((x, y), line, font=font, fill=(255,255,255,255))
        y += 98
    img.save("${HOOKDIR}/hook-%02d.png" % i)
    print("hook-%02d.png" % i, text)
`;
execFileSync('python3', ['-c', py], { stdio: 'inherit' });

let made = 0, skipped = 0;
for (let h = 11; h <= 20; h++) {
  const png = path.join(HOOKDIR, `hook-${String(h).padStart(2, '0')}.png`);
  for (const seed of SEEDS) {
    const base = path.join(WORK, `base-s${seed}.mp4`);
    const out = path.join(OUT, `lsd-x-h${h}-s${seed}.mp4`);
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
}
console.log(`DONE wave2: ${made} made, ${skipped} skipped`);
