// Stage — FEED-ORDER: produce /play page ranking from real signal, not a
// hand-committed artifact. Blends PostHog unique visitors (real engagement),
// real IG like-rate (market verdict from ig-ingest), and the prior ranking
// (stability so a re-run is a re-rank, not a reset). Face games are excluded
// (camera friction), infinite-fall is downweighted (bot self-play dominates its
// synthetic numbers and crowds out real-engagement winners).
//
// Output is a superset of the legacy feed-order.json: `.order` is preserved for
// web/site/play/index.html (which only reads .order), and a `.scores` map is
// added so the basis is inspectable. Mirrored to web/site/feed-order.json.
import fs from 'node:fs';
import path from 'node:path';

const readJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return dflt; } };
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// min-max normalize an array of {game, value} to [0,1]; returns map game→norm.
// values missing/zero get 0; a single non-zero value gets 1 (it's the max AND min
// above zero, so it normalizes to 1 — the winner surfaces even with n=1).
function normalize(values) {
  const present = values.filter((v) => v.value > 0);
  if (present.length === 0) return Object.fromEntries(values.map((v) => [v.game, 0]));
  const min = Math.min(...present.map((v) => v.value));
  const max = Math.max(...present.map((v) => v.value));
  const span = max - min;
  return Object.fromEntries(values.map((v) =>
    [v.game, span > 0 && v.value > 0 ? (v.value - min) / span : (v.value > 0 ? 1 : 0)]
  ));
}

export async function run({ stateDir, log = (m) => console.log(`  ${m}`) }) {
  const root = path.resolve(stateDir, '..', '..'); // attention-architecture/
  const registry = readJson(path.join(stateDir, 'registry.json'), { games: [] });
  const summary = readJson(path.join(stateDir, 'analytics', 'summary.json'), {});
  const igSignals = readJson(path.join(stateDir, 'ig-signals.json'), {});
  const prior = readJson(path.join(stateDir, 'feed-order.json'), { order: [] });

  // Prior rank inverse: position 1 → 1.0, last → ~0. Stability term.
  const priorRank = {};
  const priorOrder = prior.order || [];
  priorOrder.forEach((id, i) => { priorRank[id] = priorOrder.length > 1 ? 1 - (i / (priorOrder.length - 1)) : 1; });

  // Per-game visitors from summary.indices[].raw.visitors (PostHog real engagement).
  const visitors = {};
  for (const row of (summary.indices || [])) {
    const id = row.game;
    if (!id) continue;
    visitors[id] = (row.raw && typeof row.raw.visitors === 'number') ? row.raw.visitors : 0;
  }

  // Pool: every live registry game (face games filtered below).
  const pool = (registry.games || []).filter((g) => g.status && g.status.startsWith('live'));
  const ids = pool.map((g) => g.id);

  const visNorm = normalize(ids.map((id) => ({ game: id, value: visitors[id] || 0 })));
  // IG term: only concepts with >=5 likes count (a 1/20 fluke shouldn't move the feed).
  const igValues = ids.map((id) => {
    const s = igSignals[id] || {};
    return { game: id, value: (s.likes || 0) >= 5 ? (s.like_rate || 0) : 0 };
  });
  const igNorm = normalize(igValues);
  const priorNorm = normalize(ids.map((id) => ({ game: id, value: priorRank[id] ?? 0 })));

  const W = { visitors: 0.45, ig: 0.30, prior: 0.25 };
  const INFINITE_FALL_PENALTY = 0.15;

  const scores = {};
  for (const g of pool) {
    const id = g.id;
    const blended = W.visitors * (visNorm[id] || 0)
      + W.ig * (igNorm[id] || 0)
      + W.prior * (priorNorm[id] || 0);
    let score = blended;
    if (id === 'infinite-fall') score -= INFINITE_FALL_PENALTY;
    scores[id] = {
      visitors: visitors[id] || 0,
      ig_like_rate: igSignals[id]?.like_rate || 0,
      ig_likes: igSignals[id]?.likes || 0,
      prior_rank: priorOrder.indexOf(id),
      blended: +blended.toFixed(3),
      score: +score.toFixed(3),
      engine: g.engine || null,
      category: g.category || null
    };
  }

  // Exclude face games (camera friction) — they don't belong on the /play ranking.
  const eligible = pool.filter((g) => g.category !== 'face');
  const order = eligible
    .map((g) => ({ id: g.id, score: scores[g.id].score }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);

  const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    basis: 'PostHog visitors (45%) + real IG like-rate (30%, gated >=5 likes) + prior rank (25%); face games excluded; infinite-fall self-play downweighted -0.15',
    count: order.length,
    order,
    scores
  };

  const stateFile = path.join(stateDir, 'feed-order.json');
  const siteFile = path.join(root, 'web', 'site', 'feed-order.json');
  fs.writeFileSync(stateFile, JSON.stringify(out, null, 2));
  fs.writeFileSync(siteFile, JSON.stringify(out, null, 2));

  const topId = order[0];
  const winner = topId ? scores[topId] : null;
  log(`feed-order: ${order.length} games ranked; top = ${topId} (blended ${winner?.blended}, ig ${Math.round((winner?.ig_like_rate || 0) * 1000) / 10}%, ${winner?.ig_likes} likes, ${winner?.visitors} visitors)`);
  const gb = order.indexOf('grid-breathe');
  log(`feed-order: grid-breathe at position ${gb >= 0 ? gb + 1 : 'n/a'} (was ${priorOrder.indexOf('grid-breathe') + 1 || 'n/a'})`);
  return { count: order.length, top: topId, grid_breathe_position: gb + 1, written: [stateFile, siteFile] };
}