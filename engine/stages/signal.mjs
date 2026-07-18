// Stage 1 — SIGNAL: trend mining. MVP (R2): reads the seeded trend feed and
// applies evidence from past Learn outcomes (winners boost a mechanic, losers
// demote it). R4 replaces the seed file with automated scrapers/classifiers.
import fs from 'node:fs';
import path from 'node:path';

export async function run(ctx) {
  const trends = JSON.parse(fs.readFileSync(path.join(ctx.stateDir, 'trends.json'), 'utf8'));
  const evidenceFile = path.join(ctx.stateDir, 'evidence.json');
  const evidence = fs.existsSync(evidenceFile) ? JSON.parse(fs.readFileSync(evidenceFile, 'utf8')) : {};

  const feed = trends.trends.map((t) => {
    const ev = evidence[t.mechanic] || { wins: 0, losses: 0 };
    const boost = Math.max(-0.3, Math.min(0.3, ev.wins * 0.15 - ev.losses * 0.1));
    return { ...t, evidence: { wins: ev.wins || 0, losses: ev.losses || 0, boost: +boost.toFixed(2) }, score: +(t.signal_strength + boost).toFixed(2) };
  }).sort((a, b) => b.score - a.score);

  ctx.log(`signal: ${feed.length} trends, top = ${feed[0].mechanic} (${feed[0].score})`);
  return { feed, source: 'seed:trends.json (R4: automated scrapers)' };
}
