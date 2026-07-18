// Stage 6 — MEASURE: compute the four bars from events flowing through the
// real event pipe (game → loop-events.js → sendBeacon → collector → jsonl).
// Two sources, both through the same pipe and clearly labeled:
//   real      — a Playwright bot session actually playing the deployed game
//   synthetic — a seeded cohort standing in for platform traffic (clips are
//               not posted anywhere yet — posting is gated on Manuel)
import fs from 'node:fs';
import path from 'node:path';
import { startCollector } from '../lib/collector.mjs';
import { runBotSession, generateSyntheticCohort, DEFAULT_COHORT } from '../lib/traffic.mjs';

export async function run(ctx) {
  const concept = ctx.results.ideate.concept;
  const clipId = ctx.results.produce.clip.id;
  const eventsFile = path.join(ctx.runDir, 'events.jsonl');
  const { server, url } = await startCollector({ eventsFile });
  const sinkUrl = `${url}/e`;

  ctx.log('measure: real bot session playing the deployed game…');
  const bot = await runBotSession({ siteUrl: url, sinkUrl, gameId: concept.id, clipId, runs: 3, seed: ctx.seed });

  ctx.log('measure: synthetic platform cohort through the same pipe…');
  const cohort = await generateSyntheticCohort({ sinkUrl, clipId, gameId: concept.id, seed: ctx.seed, params: DEFAULT_COHORT });
  await new Promise((r) => setTimeout(r, 300));
  server.close();

  const events = fs.readFileSync(eventsFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const metrics = computeMetrics(events);
  const provenance = {
    real_events: events.filter((e) => e.mode === 'bot').length,
    synthetic_events: events.filter((e) => e.mode === 'synthetic').length,
    bot_session: bot,
    cohort_assumptions: cohort.params,
    note: 'synthetic cohort stands in for platform traffic until clips are posted (gated); re-run with different dials in lib/traffic.mjs DEFAULT_COHORT'
  };
  ctx.log(`measure: CTR ${(metrics.clip_ctr * 100).toFixed(1)}% · play ${(metrics.play_rate * 100).toFixed(1)}% · session ${metrics.avg_session_s}s · D1 ${(metrics.d1_retention * 100).toFixed(1)}%`);
  return { metrics, provenance, events_file: path.relative(ctx.root, eventsFile), total_events: events.length };
}

export function computeMetrics(events) {
  const impressions = events.filter((e) => e.event === 'clip_impressions').reduce((s, e) => s + (e.count || 0), 0);
  const uniq = (evName) => new Set(events.filter((e) => e.event === evName).map((e) => e.vid)).size;
  const landed = uniq('clip_landed');
  const played = uniq('play_start');
  const returned = uniq('d1_return');

  // session length = max heartbeat t per session id (heartbeats every 5s)
  const bySession = {};
  for (const e of events) {
    if (e.event === 'session_heartbeat') bySession[e.sid] = Math.max(bySession[e.sid] || 0, e.t || 0);
  }
  const sessions = Object.values(bySession).filter((t) => t > 0);
  const avgSession = sessions.length ? sessions.reduce((a, b) => a + b, 0) / sessions.length : 0;

  return {
    clip_impressions: impressions,
    clip_landings: landed,
    players: played,
    clip_ctr: impressions ? +(landed / impressions).toFixed(4) : 0,
    play_rate: landed ? +(played / landed).toFixed(4) : 0,
    avg_session_s: +avgSession.toFixed(1),
    d1_retention: landed ? +(returned / landed).toFixed(4) : 0
  };
}
