#!/usr/bin/env node
// Bake category-matched music beds onto the silent site clips → IG-ready copies.
// Site clips in web/site/clips/ are NEVER modified. Output: ig/clips/<id>.mp4
// Idempotent: skips outputs that already exist (delete to re-bake).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'engine/state/registry.json'), 'utf8'));
const BEDS = path.join(ROOT, 'ig/beds');
const OUT = path.join(ROOT, 'ig/clips');
fs.mkdirSync(OUT, { recursive: true });

const BED_BY_CAT = {
  reflexes: 'arcade.m4a', competitor: 'arcade.m4a', adhd: 'arcade.m4a',
  face: 'arcade.m4a', curiosity: 'arcade.m4a',
  ocd: 'focus.m4a', autism: 'focus.m4a', perfectionist: 'focus.m4a',
  memory: 'focus.m4a', collector: 'focus.m4a',
  rhythm: 'rhythm.m4a',
  sensory: 'calm.mp3', anxiety: 'calm.mp3', insomnia: 'calm.mp3',
};

let done = 0, skipped = 0, missing = 0, failed = [];
for (const g of REG.games) {
  const src = path.join(ROOT, 'web/site', g.clip || `clips/${g.id}-hook-s7.mp4`);
  if (!fs.existsSync(src)) { missing++; continue; }
  const out = path.join(OUT, `${g.id}.mp4`);
  if (fs.existsSync(out)) { skipped++; continue; }
  const bed = path.join(BEDS, BED_BY_CAT[g.category] || 'arcade.m4a');
  try {
    const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', src]).toString());
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
      '-i', src, '-stream_loop', '-1', '-i', bed,
      '-filter_complex', `[1:a]volume=1.0,afade=t=out:st=${Math.max(0, dur - 1.2)}:d=1.2[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
      '-t', String(dur), '-movflags', '+faststart', out]);
    done++;
  } catch (e) { failed.push(g.id); }
}
console.log(JSON.stringify({ done, skipped, missing, failed }));
