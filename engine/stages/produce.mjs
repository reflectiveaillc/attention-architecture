// Stage 4 — PRODUCE: build the game + capture the hook clip.
// MVP: the game is hand-built at web/site/games/<id>/ (R4: AI codegen hook
// point here). The clip is captured from the game's own demo mode →
// 9:16 1080x1920 mp4 (docs/hook-video.md "MVP shortcut").
import fs from 'node:fs';
import path from 'node:path';
import { captureClip } from '../lib/capture.mjs';

export async function run(ctx) {
  const concept = ctx.results.ideate.concept;
  const gameFile = path.join(ctx.siteDir, 'games', concept.id, 'index.html');
  if (!fs.existsSync(gameFile)) {
    throw new Error(`produce: no game at web/site/games/${concept.id}/ — MVP games are hand-built (R4: codegen)`);
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
    game: { file: path.relative(ctx.root, gameFile), bytes: gameBytes, builder: 'hand-built (R4: AI codegen)' },
    clip: { id: clipId, ...clip, file: path.relative(ctx.root, outFile), concept: concept.hook_clip_concept }
  };
}
