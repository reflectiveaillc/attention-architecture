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
} else if (cmd === 'report') {
  // behavioral indices across every event stream (runs + dev)
  const { parseEvents, computeIndices } = await import('./lib/metrics.mjs');
  const files = [];
  const runsDir = path.join(STATE, 'runs');
  if (fs.existsSync(runsDir)) for (const d of fs.readdirSync(runsDir)) {
    const f = path.join(runsDir, d, 'events.jsonl');
    if (fs.existsSync(f)) files.push(f);
  }
  const devF = path.join(STATE, 'events', 'dev.jsonl');
  if (fs.existsSync(devF)) files.push(devF);
  const rows = computeIndices(parseEvents(files));
  console.log('game'.padEnd(22), 'variant'.padEnd(9), 'PLSR', 'DOPA', 'ADDX', ' sessions', 'med_restart', 'nm_pull');
  for (const r of rows) {
    console.log(r.game.padEnd(22), r.variant.padEnd(9),
      String(r.indices.pleasure).padStart(4), String(r.indices.dopamine).padStart(4), String(r.indices.addiction).padStart(4),
      String(r.raw.sessions).padStart(9), String(r.raw.med_restart_ms + 'ms').padStart(11), String(r.raw.near_miss_pull).padStart(7));
  }
  const outF = path.join(STATE, 'analytics', 'summary.json');
  fs.mkdirSync(path.dirname(outF), { recursive: true });
  fs.writeFileSync(outF, JSON.stringify({ generated_at: new Date().toISOString(), rows }, null, 2));
  console.log(`\nwritten: ${path.relative(process.cwd(), outF)}`);
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
  console.error(`unknown command: ${cmd} (use: run | serve)`);
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
