#!/usr/bin/env node
// LOOP — the engine behind the 7-stage pipeline (docs/loop-spec.md).
//
//   node engine/loop.mjs run [--seed 7]   run ONE item end to end:
//                                         SIGNAL→IDEATE→QUEUE→PRODUCE→DEPLOY→MEASURE→LEARN
//                                         report → engine/state/runs/<run-id>/report.json
//   node engine/loop.mjs serve            preview web/site at :4620 (events → state/events/dev.jsonl)
//
// ⛔ Nothing external: DEPLOY publishes to web/site only; clip posting and
//    Vercel deploy are gated on Manuel (PLAN.md decisions log).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(ROOT, 'engine', 'state');
const STAGES = ['signal', 'ideate', 'queue', 'produce', 'deploy', 'measure', 'learn'];

console.log(`DIR: ${ROOT}`);

const cmd = process.argv[2] || 'run';
if (cmd === 'site') {
  // regenerate web/site from the registry without a full run
  const { renderSite } = await import('./stages/deploy.mjs');
  const registry = JSON.parse(fs.readFileSync(path.join(STATE, 'registry.json'), 'utf8'));
  renderSite(path.join(ROOT, 'web', 'site'), registry);
  console.log(`site regenerated: ${registry.games.length} games, ${registry.games.reduce((a, g) => a + (g.variants?.length || 0), 0)} variants`);
} else if (cmd === 'experiment') {
  await runExperimentCLI();
} else if (cmd === 'taxonomy') {
  const tax = await import('./lib/posthog-taxonomy.mjs');
  await tax.apply({
    projectId: process.env.POSTHOG_PROJECT_ID || '521236',
    apiKey: process.env.POSTHOG_PERSONAL_API_KEY,
    host: process.env.POSTHOG_APP_HOST || 'https://us.posthog.com'
  });
} else if (cmd === 'ingest') {
  const { run } = await import('./stages/ingest.mjs');
  await run({ stateDir: STATE, log: (msg) => console.log(`  ${msg}`) });
} else if (cmd === 'feed') {
  const { default: runFeed } = await import('./stages/feed.mjs');
  const countArg = process.argv.indexOf('--count');
  const feed = await runFeed({ feedCount: countArg > -1 ? +process.argv[countArg + 1] : 6 });
  console.log(`feed: hot=${feed.hot_circuit}, tilt=${feed.engine_tilt}, rescue=${feed.concepts.find((c) => c.source === 'rescue_bottom')?.id || 'none'}`);
} else if (cmd === 'report') {
  // behavioral indices + site-wide analytics across every event stream (runs + dev)
  const { parseEvents, computeIndices, computeSiteMetrics, computeDistributionMetrics, computeCatalogHealth, computeCircuitMetrics, computeFeatureMetrics, computeTrendSignals } = await import('./lib/metrics.mjs');
  const files = [];
  const runsDir = path.join(STATE, 'runs');
  if (fs.existsSync(runsDir)) for (const d of fs.readdirSync(runsDir)) {
    const f = path.join(runsDir, d, 'events.jsonl');
    if (fs.existsSync(f)) files.push(f);
  }
  const devF = path.join(STATE, 'events', 'dev.jsonl');
  if (fs.existsSync(devF)) files.push(devF);
  const liveF = path.join(STATE, 'events', 'live.jsonl');
  if (fs.existsSync(liveF)) files.push(liveF);

  const events = parseEvents(files);
  const rows = computeIndices(events, { modes: ['human', 'bot', 'synthetic'] });

  const registry = fs.existsSync(path.join(STATE, 'registry.json')) ? JSON.parse(fs.readFileSync(path.join(STATE, 'registry.json'), 'utf8')) : { games: [] };
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'engine', 'config.json'), 'utf8'));

  const site = computeSiteMetrics(events, registry);
  const distribution = computeDistributionMetrics(events, registry);
  const catalog = computeCatalogHealth(events, registry, config);
  const circuits = computeCircuitMetrics(events, registry);
  const features = computeFeatureMetrics(events, registry);
  const trends = computeTrendSignals(events, registry, config);

  // ---- site summary ----
  console.log('\n━━━ SITE LOOP ━━━');
  console.log(`attention yield: ${site.north_star.total_attention_min.toFixed(1)} min · ${site.visitors.visits} visits · ${site.visitors.total} visitors`);
  console.log(`attention/visit: ${site.north_star.attention_per_visit_s.toFixed(0)}s · games/visit: ${site.discovery.games_tried_per_visit.median}`);
  console.log(`bounce rate: ${(site.funnel.site_bounce_rate * 100).toFixed(1)}% · play visit rate: ${(site.funnel.play_visit_rate * 100).toFixed(1)}%`);
  console.log(`D1/D7/D30: ${(site.retention.d1 * 100).toFixed(1)}% / ${(site.retention.d7 * 100).toFixed(1)}% / ${(site.retention.d30 * 100).toFixed(1)}% · repeat: ${(site.retention.repeat_share * 100).toFixed(1)}%`);
  console.log(`engine balance: ${(site.engine_balance.viral_share * 100).toFixed(0)}% viral · ${((1 - site.engine_balance.viral_share) * 100).toFixed(0)}% calm`);
  console.log(`catalog vitality: ${(catalog.catalog_vitality * 100).toFixed(1)}% (${catalog.winners} winners / ${catalog.watch} watch / ${catalog.suspend} suspend)`);

  // ---- per-game indices ----
  console.log('\n━━━ GAME INDICES ━━━');
  console.log('game'.padEnd(22), 'variant'.padEnd(9), 'PLSR', 'DOPA', 'ADDX', ' sessions', 'med_restart', 'nm_pull');
  for (const r of rows) {
    console.log(r.game.padEnd(22), r.variant.padEnd(9),
      String(r.indices.pleasure).padStart(4), String(r.indices.dopamine).padStart(4), String(r.indices.addiction).padStart(4),
      String(r.raw.sessions).padStart(9), String(r.raw.med_restart_ms + 'ms').padStart(11), String(r.raw.near_miss_pull).padStart(7));
  }

  // ---- top/bottom catalog ----
  if (catalog.top.length) {
    console.log('\n━━━ TOP GAMES ━━━');
    for (const g of catalog.top.slice(0, 5)) {
      console.log(`${g.game.padEnd(22)} P${g.indices.pleasure} D${g.indices.dopamine} A${g.indices.addiction} · ${g.grade}`);
    }
  }
  if (catalog.bottom.length) {
    console.log('\n━━━ SUSPEND CANDIDATES ━━━');
    for (const g of catalog.bottom.slice(0, 5)) {
      console.log(`${g.game.padEnd(22)} P${g.indices.pleasure} D${g.indices.dopamine} A${g.indices.addiction} · ${g.grade}`);
    }
  }

  // active experiments (testing/approved variants) for the dashboard
  const experiments = [];
  for (const g of (registry.games || [])) {
    for (const raw of (g.variants || [])) {
      const v = typeof raw === 'string' ? { id: raw, status: 'live' } : raw;
      if (v.status === 'testing' || v.status === 'approved') {
        experiments.push({ game: g.id, game_name: g.name, variant: v.id, status: v.status, hypothesis: v.hypothesis || '' });
      }
    }
  }

  if (experiments.length) {
    console.log('\n━━━ ACTIVE EXPERIMENTS ━━━');
    for (const ex of experiments) console.log(`${ex.game.padEnd(22)} ${ex.variant.padEnd(28)} ${ex.status.padEnd(10)} ${ex.hypothesis}`);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    event_files: files,
    total_events: events.length,
    live_window: trends.live_window,
    site, distribution, catalog, circuits, features, trends, indices: rows, experiments
  };
  const outF = path.join(STATE, 'analytics', 'summary.json');
  fs.mkdirSync(path.dirname(outF), { recursive: true });
  fs.writeFileSync(outF, JSON.stringify(summary, null, 2));
  // copy to web/site so the served dashboard can fetch it
  const siteAnalyticsDir = path.join(ROOT, 'web', 'site', 'analytics');
  fs.mkdirSync(siteAnalyticsDir, { recursive: true });
  fs.writeFileSync(path.join(siteAnalyticsDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(`\nwritten: ${path.relative(process.cwd(), outF)} + web/site/analytics/summary.json`);
} else if (cmd === 'serve') {
  const { startCollector } = await import('./lib/collector.mjs');
  const eventsFile = path.join(STATE, 'events', 'dev.jsonl');
  // HTTP on 4620 (desktop/localhost) + HTTPS on 4643 (mobile — camera needs a secure context)
  const http = await startCollector({ port: 4620, eventsFile, host: '0.0.0.0' });
  const https = await startCollector({ port: 4643, eventsFile, host: '0.0.0.0', https: true });
  console.log(`site:   ${http.url}/\ngame:   ${http.url}/games/flappy-face/\nevents: ${eventsFile}`);
  console.log(`\nDESKTOP (this mac):  http://127.0.0.1:4620/`);
  console.log(`MOBILE (same wifi):  https://<mac-ip>:4643/   ← camera needs HTTPS; accept the self-signed cert warning`);
} else if (cmd === 'run') {
  const seedArg = process.argv.indexOf('--seed');
  const seed = seedArg > -1 ? +process.argv[seedArg + 1] : 7;
  await runLoop({ seed });
} else {
  console.error(`unknown command: ${cmd} (use: run | serve | site | report | experiment | ingest | feed)`);
  process.exit(1);
}

async function runLoop({ seed }) {
  const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + `-s${seed}`;
  const runDir = path.join(STATE, 'runs', runId);
  fs.mkdirSync(runDir, { recursive: true });

  const ctx = {
    root: ROOT, stateDir: STATE, siteDir: path.join(ROOT, 'web', 'site'),
    runId, runDir, seed,
    config: JSON.parse(fs.readFileSync(path.join(ROOT, 'engine', 'config.json'), 'utf8')),
    results: {},
    log: (msg) => console.log(`  ${msg}`)
  };

  const report = { run_id: runId, seed, started_at: new Date().toISOString(), stages: {}, config: ctx.config };
  console.log(`run: ${runId}\n`);

  for (const name of STAGES) {
    const t0 = Date.now();
    console.log(`▸ ${name.toUpperCase()}`);
    try {
      const stage = await import(`./stages/${name}.mjs`);
      ctx.results[name] = await stage.run(ctx);
      report.stages[name] = { ok: true, ms: Date.now() - t0, ...ctx.results[name] };
    } catch (err) {
      report.stages[name] = { ok: false, ms: Date.now() - t0, error: String(err && err.message || err) };
      report.failed_at = name;
      fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2));
      console.error(`✗ ${name} failed: ${report.stages[name].error}`);
      process.exit(1);
    }
  }

  report.finished_at = new Date().toISOString();
  report.verdict = ctx.results.learn.verdict;
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2));

  // summary
  const m = ctx.results.measure.metrics;
  const pct = (x) => (x * 100).toFixed(1) + '%';
  console.log(`\n━━━ RUN COMPLETE — ${ctx.results.ideate.concept.name} ━━━`);
  for (const c of ctx.results.learn.checks) {
    const val = c.metric === 'avg_session_s' ? c.value + 's' : pct(c.value);
    const bar = c.metric === 'avg_session_s' ? c.bar + 's' : pct(c.bar);
    console.log(`  ${c.pass ? '✓' : '✗'} ${c.label.padEnd(24)} ${String(val).padStart(8)}  (bar ${bar})`);
  }
  console.log(`  verdict: ${report.verdict.toUpperCase()}`);
  console.log(`  action:  ${ctx.results.learn.action}`);
  console.log(`  report:  ${path.relative(process.cwd(), path.join(runDir, 'report.json'))}`);
  console.log(`  events:  ${m.clip_impressions} impressions → ${m.clip_landings} landings → ${m.players} players (real bot events: ${ctx.results.measure.provenance.real_events})`);
}

async function runExperimentCLI() {
  const sub = process.argv[3];
  const registryPath = path.join(STATE, 'registry.json');
  const { loadExperimentState, addVariant, resolveVariant, evaluateVariant, suggestVariants } = await import('./lib/experiment.mjs');
  const { parseEvents, computeGameReport } = await import('./lib/metrics.mjs');

  // gather all events
  const files = [];
  const runsDir = path.join(STATE, 'runs');
  if (fs.existsSync(runsDir)) for (const d of fs.readdirSync(runsDir)) {
    const f = path.join(runsDir, d, 'events.jsonl');
    if (fs.existsSync(f)) files.push(f);
  }
  const devF = path.join(STATE, 'events', 'dev.jsonl');
  if (fs.existsSync(devF)) files.push(devF);
  const events = parseEvents(files);

  if (sub === 'list') {
    const gameId = process.argv[4];
    const normV = (v) => typeof v === 'string' ? { id: v, status: 'live' } : v;
    if (!gameId) {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      for (const g of registry.games) {
        if (!g.variants || !g.variants.length) continue;
        console.log(`\n${g.id}: ${g.name}`);
        for (const raw of g.variants) {
          const v = normV(raw);
          console.log(`  ${v.id.padEnd(32)} ${(v.status || 'live').padEnd(12)} ${v.hypothesis || ''}`);
        }
      }
      return;
    }
    const state = loadExperimentState(registryPath, gameId);
    if (!state) { console.error('game not found'); process.exit(1); }
    for (const v of state.variants) console.log(`${v.id.padEnd(32)} ${(v.status || 'live').padEnd(12)} ${v.hypothesis || ''}`);
  } else if (sub === 'suggest') {
    const gameId = process.argv[4];
    if (!gameId) { console.error('usage: experiment suggest <gameId>'); process.exit(1); }
    const report = computeGameReport(events, gameId, { modes: ['human', 'bot', 'synthetic'] });
    const ideas = suggestVariants(report);
    console.log(`${gameId} · ${report.indices.pleasure}/${report.indices.dopamine}/${report.indices.addiction} · ideas:`);
    for (const idea of ideas) console.log(`  - ${idea.id}: ${idea.hypothesis}`);
  } else if (sub === 'start') {
    const gameId = process.argv[4];
    const variantId = process.argv[5];
    if (!gameId || !variantId) { console.error('usage: experiment start <gameId> <variantId>'); process.exit(1); }
    const report = computeGameReport(events, gameId, { modes: ['human', 'bot', 'synthetic'] });
    const ideas = suggestVariants(report);
    const idea = ideas.find((i) => i.id === variantId);
    if (!idea) { console.error('unknown variant idea; run `experiment suggest` first'); process.exit(1); }
    addVariant(registryPath, gameId, idea);
    console.log(`started ${variantId} on ${gameId}`);
  } else if (sub === 'evaluate') {
    const gameId = process.argv[4];
    if (!gameId) { console.error('usage: experiment evaluate <gameId> [--metric play_rate|d1_retention|avg_session_s|runs_per_session|share_rate]'); process.exit(1); }
    const metricArg = process.argv.indexOf('--metric');
    const metric = metricArg > -1 ? process.argv[metricArg + 1] : 'play_rate';
    const state = loadExperimentState(registryPath, gameId);
    if (!state) { console.error('game not found'); process.exit(1); }
    const testing = state.variants.filter((v) => v.status === 'testing');
    if (!testing.length) { console.log('no testing variants'); return; }
    for (const v of testing) {
      const res = evaluateVariant(events, gameId, 'base', v.id, metric);
      console.log(`\n${gameId} · ${v.id} · ${metric}`);
      console.log(`  base: ${JSON.stringify(res.base)}`);
      console.log(`  test: ${JSON.stringify(res.test)}`);
      console.log(`  lift: ${(res.lift * 100).toFixed(1)}% · p: ${res.p.toFixed(3)} · n: ${res.n_base}/${res.n_test}`);
      console.log(`  verdict: ${res.verdict}`);
      if (res.verdict === 'approve' || res.verdict === 'reject') {
        resolveVariant(registryPath, gameId, v.id, res.verdict === 'approve' ? 'approved' : 'rejected');
        console.log(`  resolved → ${res.verdict === 'approve' ? 'approved' : 'rejected'}`);
      }
    }
  } else {
    console.error('usage: experiment [list|suggest|start|evaluate]');
    process.exit(1);
  }
}
