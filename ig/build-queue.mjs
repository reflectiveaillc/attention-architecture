#!/usr/bin/env node
// Build the social-autopilot queue for the tilt client: one reel per game,
// 4/day (engine hard cap), staggered ET slots. Face games lead (they're the
// differentiator), then the tester-locked drop-dodge, then the rest interleaved
// by category so the feed isn't monotone.
// usage: node ig/build-queue.mjs [--start 2026-07-20]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AP = '/Users/manuel/coo/content-studio/social-autopilot';
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'engine/state/registry.json'), 'utf8'));
const CLIPS = path.join(ROOT, 'ig/clips');

const argStart = process.argv.indexOf('--start');
const startDay = argStart >= 0 ? process.argv[argStart + 1] : '2026-07-20';
const SLOTS = ['10:00', '13:30', '17:00', '20:30']; // ET, 4/day = engine cap

function caption(g) {
  const cp = path.join(ROOT, 'web/site/games', g.id, 'copy.md');
  let line = null, tags = null, hook = null;
  if (fs.existsSync(cp)) {
    const md = fs.readFileSync(cp, 'utf8');
    const reels = md.match(/## Reels[^\n]*\n1\. ([^\n]+)/);
    if (reels) line = reels[1].trim();
    const sh = md.match(/## Social hook[^\n]*\n([^\n]+)/);
    if (sh) hook = sh[1].trim();
    const ht = md.match(/## Hashtags[^\n]*\n([^\n]+)/);
    if (ht) tags = ht[1].trim();
  }
  const base = hook || line || `${g.name} — ${g.tagline || 'can you beat it?'}`;
  const t = tags || '#games #freegames #browsergame #arcade #fyp';
  return `${base}\n\n🎮 Play FREE in your browser — link in bio\n\n${t} #viralgames #freeonlinegames`;
}

// ordering: face first, then drop-dodge, then category round-robin
const games = REG.games.filter((g) => fs.existsSync(path.join(CLIPS, `${g.id}.mp4`)));
const face = games.filter((g) => g.face);
const dd = games.filter((g) => !g.face && g.id === 'drop-dodge');
const rest = games.filter((g) => !g.face && g.id !== 'drop-dodge');
const byCat = {};
for (const g of rest) (byCat[g.category || 'misc'] ||= []).push(g);
const cats = Object.keys(byCat);
const interleaved = [];
for (let i = 0; interleaved.length < rest.length; i++)
  for (const c of cats) { if (byCat[c][i]) interleaved.push(byCat[c][i]); }
const ordered = [...face, ...dd, ...interleaved];

const items = ordered.map((g, i) => {
  const day = new Date(`${startDay}T00:00:00-04:00`);
  day.setDate(day.getDate() + Math.floor(i / SLOTS.length));
  const [hh, mm] = SLOTS[i % SLOTS.length].split(':');
  const iso = `${day.toISOString().slice(0, 10)}T${hh}:${mm}:00-04:00`;
  return {
    id: `tilt-${g.id}`,
    type: 'reel',
    files: [path.join(CLIPS, `${g.id}.mp4`)],
    scheduledAt: iso,
    caption: caption(g),
    status: 'pending',
  };
});

const outDir = path.join(AP, 'clients/tilt');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'queue.json'), JSON.stringify({
  note: 'Tilt games launch queue — one reel per game, 4/day. Built by attention-architecture/ig/build-queue.mjs (re-run to rebuild; posted items are protected by the autopilot ledger).',
  items,
}, null, 2));
console.log(JSON.stringify({ queued: items.length, first: items[0]?.id, firstAt: items[0]?.scheduledAt, lastAt: items[items.length - 1]?.scheduledAt, runwayDays: Math.ceil(items.length / 4) }));
