#!/usr/bin/env node
// A/B stats for the /play "chain of games" experiment.
// Compares the 3 arms (ranked / hookfirst / variety) on engagement per visitor.
// KPI = chain depth (games viewed per session) + session length + play rate.
// Usage: node scripts/ab-stats.mjs [days=14]
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const { POSTHOG_APP_HOST: HOST, POSTHOG_PROJECT_ID: PID, POSTHOG_PERSONAL_API_KEY: KEY } = env;
const DAYS = +(process.argv[2] || 14);

async function q(sql) {
  const r = await fetch(`${HOST}/api/projects/${PID}/query/`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
  });
  const j = await r.json();
  if (j.error || j.detail) { console.error('ERR', (j.error || j.detail).toString().slice(0, 300)); return []; }
  return j.results || [];
}

const rows = await q(`
  SELECT properties.variant AS arm,
    uniq(distinct_id) AS visitors,
    countIf(event='feed_advance') AS swipes,
    countIf(event='feed_game_view') AS game_views,
    countIf(event='play_start') AS plays,
    countIf(event='first_tap') AS taps,
    countIf(event='game_over') AS deaths,
    round(avg(if(event='feed_exit', toFloat64OrNull(properties.games_viewed), null)),2) AS avg_chain_depth,
    round(avg(if(event='feed_exit', toFloat64OrNull(properties.session_s), null)),1) AS avg_session_s
  FROM events
  WHERE properties.variant IN ('ranked','hookfirst','variety')
    AND timestamp > now() - INTERVAL ${DAYS} DAY
  GROUP BY arm ORDER BY arm`);

console.log(`\n=== /play A/B — "chain of games" (last ${DAYS}d) ===`);
if (!rows.length) { console.log('No variant-tagged events yet. Give it traffic (share the /play link) and re-run.'); process.exit(0); }
const H = ['arm', 'visitors', 'chain_depth', 'session_s', 'swipes', 'game_views', 'plays', 'taps', 'deaths'];
console.log(H.map(h => h.padEnd(12)).join(''));
for (const r of rows) {
  const [arm, vis, sw, gv, pl, tp, de, depth, sess] = r;
  const perVis = n => vis ? (n / vis).toFixed(1) : '0';
  console.log([arm, vis, (depth ?? perVis(gv)), (sess ?? '-'), perVis(sw), perVis(gv), perVis(pl), perVis(tp), perVis(de)]
    .map(x => String(x).padEnd(12)).join(''));
}
console.log('\nKPI = chain_depth (games viewed/session) & session_s. Higher = the winning chain.');
console.log('Note: per-visitor rates shown for swipes/views/plays/taps/deaths. Need ~100+ visitors/arm for confidence.');
