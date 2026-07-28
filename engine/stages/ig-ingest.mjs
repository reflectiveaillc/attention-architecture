// Stage 0b — IG-INGEST: pull real Instagram engagement from social-autopilot's
// metrics.jsonl into engine/state/ig-signals.json, keyed by game concept id.
//
// This is the real-world signal the loop was missing. learn.mjs reads
// ig-signals.json to verdict against an IG like-rate bar; signal.mjs boosts
// mechanics whose runs won on IG; feed-order.mjs blends it into the /play ranking.
//
// Join (two-tier):
//   primary   — row.id is the queue id (e.g. "tilt-grid-breathe") once
//               capture-metrics.mjs resolves it; strip "tilt-" → concept id.
//   fallback  — for historical rows with id:null, match takenAt to queue.json
//               items[].postedAt within ±30s (the IG server taken_at vs local
//               postedAt skew is ~13s; 30s is safe given ~7min posting gaps).
//
// Pure file I/O, no network. Runs from `loop.mjs ig-ingest` and from
// scripts/refresh-analytics.sh between ingest and report.
import fs from 'node:fs';
import path from 'node:path';

const TILT_PREFIX = 'tilt-';
const FALLBACK_WINDOW_MS = 30 * 1000;

const readJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return dflt; } };

export async function run({ stateDir, log = (m) => console.log(`  ${m}`) }) {
  const root = path.resolve(stateDir, '..', '..'); // attention-architecture/
  const autopilotDir = path.join(root, '..', 'content-studio', 'social-autopilot');
  const metricsFile = path.join(autopilotDir, 'clients', 'tilt', 'metrics.jsonl');
  const queueFile = path.join(autopilotDir, 'clients', 'tilt', 'queue.json');
  const registry = readJson(path.join(stateDir, 'registry.json'), { games: [] });
  const engineByGame = {};
  for (const g of registry.games || []) engineByGame[g.id] = g.engine;

  if (!fs.existsSync(metricsFile)) {
    log('ig-ingest: no metrics.jsonl yet — writing empty ig-signals.json');
    fs.writeFileSync(path.join(stateDir, 'ig-signals.json'), '{}');
    return { concepts: 0, posts: 0, rows: 0 };
  }

  // Fallback join index: queue items by postedAt ms → concept id
  const queue = readJson(queueFile, { items: [] });
  const byPostedMs = (queue.items || [])
    .filter((x) => x.postedAt && x.id?.startsWith(TILT_PREFIX))
    .map((x) => ({ ms: Date.parse(x.postedAt), concept: x.id.slice(TILT_PREFIX.length) }));

  const rows = fs.readFileSync(metricsFile, 'utf8').trim().split('\n')
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && r.kind === 'post');

  const perConcept = {};
  for (const r of rows) {
    let concept = null;
    if (r.id && typeof r.id === 'string' && r.id.startsWith(TILT_PREFIX)) {
      concept = r.id.slice(TILT_PREFIX.length);
    } else if (r.takenAt) {
      const takenMs = Date.parse(r.takenAt);
      let best = null, bestDist = FALLBACK_WINDOW_MS;
      for (const q of byPostedMs) {
        const d = Math.abs(q.ms - takenMs);
        if (d < bestDist) { best = q.concept; bestDist = d; }
      }
      concept = best;
    }
    if (!concept) continue;
    const views = r.views || 0;
    const likes = r.likes || 0;
    const likeRate = views > 0 ? likes / views : 0;
    perConcept[concept] = perConcept[concept] || { concept, likes: 0, views: 0, comments: 0, posts: 0, peak_like_rate: 0, snapshots: [] };
    const entry = perConcept[concept];
    // accumulate the LATEST snapshot per concept (max capturedAt wins)
    entry.snapshots.push({ capturedAt: r.capturedAt, takenAt: r.takenAt, likes, views, comments: r.comments || 0, like_rate: likeRate, shortcode: r.shortcode });
    entry.posts += 1;
    entry.peak_like_rate = Math.max(entry.peak_like_rate, likeRate);
  }

  // collapse to latest snapshot per concept + sum totals
  const out = {};
  for (const [concept, e] of Object.entries(perConcept)) {
    const latest = e.snapshots.sort((a, b) => (a.capturedAt > b.capturedAt ? 1 : -1)).pop();
    const totalLikes = e.snapshots.reduce((s, x) => s + x.likes, 0);
    const totalViews = e.snapshots.reduce((s, x) => s + x.views, 0);
    out[concept] = {
      likes: latest.likes,
      views: latest.views,
      like_rate: latest.like_rate,
      comments: latest.comments,
      posts: e.posts,
      total_likes: totalLikes,
      total_views: totalViews,
      peak_like_rate: +e.peak_like_rate.toFixed(4),
      last_takenAt: latest.takenAt,
      last_shortcode: latest.shortcode,
      engine: engineByGame[concept] || null,
    };
  }

  const outFile = path.join(stateDir, 'ig-signals.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  const winners = Object.values(out).filter((x) => x.likes >= 5 && x.like_rate >= 0.04);
  log(`ig-ingest: ${Object.keys(out).length} concepts, ${rows.length} post rows, ${winners.length} IG-bar winner(s)`);
  if (winners.length) log(`ig-ingest: top winner ${winners[0].likes} likes @ ${Math.round(winners[0].like_rate * 1000) / 10}% → ${Object.keys(out).find((k) => out[k] === winners[0])}`);
  return { concepts: Object.keys(out).length, posts: rows.length, rows: rows.length, winners: winners.length };
}