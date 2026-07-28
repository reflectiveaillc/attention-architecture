// Stage 6 — MEASURE: compute the four bars from REAL HUMAN events, not a
// seeded synthetic cohort.
//
// History: until 2026-07-28 this stage graded each concept with a Playwright
// bot + a seeded cohort whose dials were global constants (d1_prob 0.12 vs bar
// 0.18, session_median 140s vs bar 150s — both structurally below the bars).
// The result was identical metrics for every game and 14/14 runs verdicted
// suspend_learn: the loop was grading the PRNG seed, not the market.
//
// Now: read engine/state/events/live.jsonl (the PostHog ingest stream, all
// mode:'human') and compute each bar per game. Metrics without enough real
// data are reported as na (learn.mjs excludes them — a brand-new concept
// defers to the IG bar instead of eating a fake suspend).
import fs from 'node:fs';
import path from 'node:path';

const MIN_VISITORS = 10;   // below this, play_rate / avg_session are noise
const MIN_D1_BASE = 20;    // below this many players, d1_retention is noise

// Live events sometimes carry the display name ('DM Typing') instead of the id
// ('dm-typing') depending on which page fired them. Normalize both sides.
const normGame = (g) => (g || '').toLowerCase().trim().replace(/\s+/g, '-');

export async function run(ctx) {
  const concept = ctx.results.ideate.concept;
  const liveFile = path.join(ctx.stateDir, 'events', 'live.jsonl');
  const events = fs.existsSync(liveFile)
    ? fs.readFileSync(liveFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];

  const gid = normGame(concept.id);
  const gameEvents = events.filter((e) => normGame(e.game) === gid);
  const metrics = computeLiveMetrics(events, gameEvents, gid, ctx.stateDir);

  // persist the concept's real event slice for provenance + learn's variant suggester
  fs.writeFileSync(
    path.join(ctx.runDir, 'events.jsonl'),
    gameEvents.map((e) => JSON.stringify(e)).join('\n') + (gameEvents.length ? '\n' : '')
  );

  const avail = Object.entries(metrics.availability).filter(([, a]) => a).map(([k]) => k);
  const na = Object.entries(metrics.availability).filter(([, a]) => !a).map(([k]) => k);
  const provenance = {
    source: 'live.jsonl (PostHog ingest, mode human) — synthetic cohort REMOVED 2026-07-28',
    total_live_events: events.length,
    game_events: gameEvents.length,
    bars_available: avail,
    bars_na: na,
    note: 'na bars mean not enough real data — learn defers those (usually a new concept, verdict comes from IG instead).'
  };
  const fmt = (k, v) => metrics.availability[k] ? v : 'na';
  ctx.log(`measure(live): CTR ${fmt('clip_ctr', (metrics.clip_ctr * 100).toFixed(1) + '%')} · play ${fmt('play_rate', (metrics.play_rate * 100).toFixed(1) + '%')} · session ${fmt('avg_session_s', metrics.avg_session_s + 's')} · D1 ${fmt('d1_retention', (metrics.d1_retention * 100).toFixed(1) + '%')} (${metrics.visitors} visitors on ${gameEvents.length} events)`);
  return { metrics, provenance, events_file: path.relative(ctx.root, path.join(ctx.runDir, 'events.jsonl')), total_events: gameEvents.length };
}

export function computeLiveMetrics(allEvents, gameEvents, gid, stateDir) {
  const uniq = (evs) => new Set(evs.map((e) => e.vid).filter(Boolean)).size;

  const players = gameEvents.filter((e) => e.event === 'play_start');
  const playerVids = new Set(players.map((e) => e.vid).filter(Boolean));
  const visitorVids = new Set(gameEvents.map((e) => e.vid).filter(Boolean));

  // --- play_rate: of the real visitors this game touched, how many played.
  let play_rate = 0;
  const playOk = visitorVids.size >= MIN_VISITORS;
  if (playOk) play_rate = +(playerVids.size / visitorVids.size).toFixed(4);

  // --- avg_session_s: longest heartbeat per session, per game; fall back to
  // session_end.play_s when a game's page doesn't emit heartbeats.
  const bySession = {};
  for (const e of gameEvents) {
    if (e.event === 'session_heartbeat' && e.sid) bySession[e.sid] = Math.max(bySession[e.sid] || 0, e.t || 0);
  }
  let sessionLens = Object.values(bySession).filter((t) => t > 0);
  if (!sessionLens.length) {
    sessionLens = gameEvents.filter((e) => e.event === 'session_end' && typeof e.play_s === 'number').map((e) => e.play_s);
  }
  let avg_session_s = 0;
  const sessOk = sessionLens.length >= 3;
  if (sessOk) avg_session_s = +(sessionLens.reduce((a, b) => a + b, 0) / sessionLens.length).toFixed(1);

  // --- d1_retention: d1_return events fire site-wide (game:'unknown'), so
  // attribute a return to this game if the same visitor played it BEFORE the
  // return timestamp.
  const firstPlayByVid = {};
  for (const e of players) {
    if (!e.vid) continue;
    firstPlayByVid[e.vid] = Math.min(firstPlayByVid[e.vid] ?? Infinity, e.ts || 0);
  }
  const returns = allEvents.filter((e) => e.event === 'd1_return' && e.vid
    && firstPlayByVid[e.vid] !== undefined && (e.ts || 0) > firstPlayByVid[e.vid]);
  let d1_retention = 0;
  const d1Ok = playerVids.size >= MIN_D1_BASE;
  if (d1Ok) d1_retention = +(new Set(returns.map((e) => e.vid)).size / playerVids.size).toFixed(4);

  // --- clip_ctr: clips aren't distributed through the live pipe; the real
  // clip funnel is IG reel views → UTM-tagged hub_land. Numerator: hub_land
  // visitors for this game that arrived from IG. Denominator: the concept's IG
  // reel views from ig-signals (market-side truth).
  let clip_ctr = 0;
  const igLandingVids = new Set(gameEvents
    .filter((e) => e.event === 'hub_land' && /utm_source=ig|l\.instagram\.com/.test(e.src || ''))
    .map((e) => e.vid).filter(Boolean));
  let igViews = 0;
  try {
    const igSignals = stateDir ? JSON.parse(fs.readFileSync(path.join(stateDir, 'ig-signals.json'), 'utf8')) : {};
    igViews = igSignals[gid]?.views || 0;
  } catch { /* no ig-signals yet — clip_ctr stays na */ }
  const ctrOk = igViews >= 50 && igLandingVids.size >= 1;
  if (ctrOk) clip_ctr = +(igLandingVids.size / igViews).toFixed(4);

  return {
    clip_impressions: igViews,
    clip_landings: igLandingVids.size,
    visitors: visitorVids.size,
    players: playerVids.size,
    clip_ctr,
    play_rate,
    avg_session_s,
    d1_retention,
    availability: { clip_ctr: ctrOk, play_rate: playOk, avg_session_s: sessOk, d1_retention: d1Ok },
    live_sessions: sessionLens.length
  };
}
