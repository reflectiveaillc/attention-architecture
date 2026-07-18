// Integrate a freshly-built backlog game: validate → capture clip → register
// (trick/challenge/circuits from the design) → regenerate site.
// usage: node engine/night/integrate.mjs <design-id>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { captureClip } from '../lib/capture.mjs';
import { renderSite } from '../stages/deploy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const id = process.argv[2];
const bl = JSON.parse(fs.readFileSync(path.join(ROOT, 'engine/state/design-backlog.json'), 'utf8'));
const d = bl.designs.find((x) => x.id === id);
if (!d) { console.error('no design', id); process.exit(1); }

// 1. validate
try {
  execFileSync('node', ['engine/night/validate-game.mjs', id], { cwd: ROOT, stdio: 'pipe' });
} catch (e) {
  console.log(JSON.stringify({ id, ok: false, stage: 'validate', detail: (e.stdout || '').toString().slice(-400) }));
  process.exit(1);
}

// 2. capture clip
let clip;
try {
  clip = await captureClip({ gameId: id, seed: 7, outFile: path.join(ROOT, 'web/site/clips', `${id}-hook-s7.mp4`), workDir: `/tmp/drain-${id}` });
} catch (e) {
  console.log(JSON.stringify({ id, ok: false, stage: 'clip', detail: String(e.message).slice(0, 200) }));
  process.exit(1);
}

// 3. register
const regFile = path.join(ROOT, 'engine/state/registry.json');
const registry = JSON.parse(fs.readFileSync(regFile, 'utf8'));
const challenge = d.dare_unit ? `beat the ${d.dare_unit} record` : null;
const entry = {
  id: d.id, name: d.name, engine: d.engine, circuits: d.circuits || [],
  category: d.category || null,
  tagline: d.conditioned_path, trick: d.video_trick, challenge,
  variants: [],
  clip: `clips/${id}-hook-s7.mp4`,
  status: 'live_local', deployed_at: new Date().toISOString(), from_backlog: true
};
const i = registry.games.findIndex((g) => g.id === id);
if (i >= 0) registry.games[i] = { ...registry.games[i], ...entry }; else registry.games.push(entry);
fs.writeFileSync(regFile, JSON.stringify(registry, null, 2));

// 4. regen site
renderSite(path.join(ROOT, 'web', 'site'), registry);

console.log(JSON.stringify({ id, ok: true, clip_s: clip.duration_s, games: registry.games.length }));
