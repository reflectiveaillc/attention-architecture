// Stage 4 — PRODUCE: build the game + capture the hook clip.
// MVP: most games are hand-built at web/site/games/<id>/ (R4: AI codegen hook
// point here), EXCEPT IG-winner variants (concept.variant_of set): an existing
// market winner is cloned and deterministically reskinned — new name + rotated
// palette, same mechanic. That is exactly what the winner's prompt_seed asks
// for, and it's what lets a real IG win become a real new game in one cycle.
// The clip is captured from the game's own demo mode → 9:16 1080x1920 mp4.
import fs from 'node:fs';
import path from 'node:path';
import { captureClip } from '../lib/capture.mjs';

export async function run(ctx) {
  const concept = ctx.results.ideate.concept;
  let gameFile = path.join(ctx.siteDir, 'games', concept.id, 'index.html');
  if (!fs.existsSync(gameFile)) {
    if (!concept.variant_of) {
      throw new Error(`produce: no game at web/site/games/${concept.id}/ and concept is not a variant — MVP games are hand-built (R4: codegen)`);
    }
    const built = buildVariant(ctx, concept);
    ctx.log(`produce: variant built — ${built.source} → ${concept.id} ("${built.prettyName}", hue ${built.hue}°, ${(built.bytes / 1024).toFixed(1)} KB)`);
    gameFile = built.file;
  }
  const gameBytes = fs.statSync(gameFile).size;
  ctx.log(`produce: game present (${(gameBytes / 1024).toFixed(1)} KB) — capturing hook clip…`);

  const clipId = `${concept.id}-hook-s${ctx.seed}`;
  const outFile = path.join(ctx.siteDir, 'clips', `${clipId}.mp4`);
  const clip = await captureClip({
    gameId: concept.id, seed: ctx.seed, outFile,
    workDir: path.join(ctx.runDir, 'capture')
  });
  ctx.log(`produce: clip ${clip.duration_s}s ${clip.resolution} (${clip.size_kb} KB)`);
  return {
    game: { file: path.relative(ctx.root, gameFile), bytes: gameBytes, builder: concept.variant_of ? `clone-reskin of ${concept.variant_of}` : 'hand-built (R4: AI codegen)' },
    clip: { id: clipId, ...clip, file: path.relative(ctx.root, outFile), concept: concept.hook_clip_concept }
  };
}

// --- IG-winner variant builder ---------------------------------------------
// Clone web/site/games/<variant_of>/index.html (every game is one self-contained
// file), swap the identity tokens, and rotate the palette via CSS hue-rotate.
// Deterministic in the concept id — re-running regenerates the same variant.
const ADJECTIVES = ['Neon', 'Lumen', 'Velvet', 'Ember', 'Aster', 'Onyx', 'Moss', 'Iris'];

function hashOf(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildVariant(ctx, concept) {
  const srcId = concept.variant_of;
  const srcFile = path.join(ctx.siteDir, 'games', srcId, 'index.html');
  if (!fs.existsSync(srcFile)) throw new Error(`produce: variant source missing — web/site/games/${srcId}/index.html`);
  const registry = JSON.parse(fs.readFileSync(path.join(ctx.stateDir, 'registry.json'), 'utf8'));
  const src = registry.games.find((g) => g.id === srcId) || {};
  const srcName = (src.name || srcId).toUpperCase(); // registry names are shouty ("GRID BREATHE")

  const h = hashOf(concept.id);
  const words = srcName.split(/\s+/);
  const pretty = [ADJECTIVES[h % ADJECTIVES.length], ...words.slice(1)].join(' '); // "LUMEN BREATHE"
  const title = pretty.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' '); // "Lumen Breathe"
  const srcTitle = words.map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
  const hue = 90 + (h % 200); // 90–289°, visibly distinct skin, avoids near-identity rotations

  let html = fs.readFileSync(srcFile, 'utf8');
  const swaps = [
    // identity tokens (longest/most-specific first so partial swaps can't double-hit)
    [`"id":"${srcId}"`, `"id":"${concept.id}"`],
    [`/g/${srcId}`, `/g/${concept.id}`],
    [`"name":"${srcName}"`, `"name":"${pretty}"`],
    [srcName, pretty],
    [srcTitle, title],
  ];
  for (const [from, to] of swaps) html = html.split(from).join(to);
  // palette rotation — zero knowledge of the game's internals required
  html = html.replace('</head>', `<style>html{filter:hue-rotate(${hue}deg)}</style>\n</head>`);
  html = `<!-- VARIANT of ${srcId}: auto reskin by produce (hue ${hue}°, name ${pretty}) — ${concept.rationale?.slice(0, 200) || ''} -->\n` + html;

  const outDir = path.join(ctx.siteDir, 'games', concept.id);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'index.html');
  fs.writeFileSync(outFile, html);

  // downstream stages render the pretty name on cards/registry
  concept.name = title;
  concept.trick = concept.trick || src.trick || '';
  return { file: outFile, bytes: html.length, prettyName: title, hue, source: srcId };
}
