// Stage 7 — LEARN: verdict against the four bars (PLAN.md §5), then write the
// outcome back to evidence.json so the next Signal pass inherits it. Winners
// scale; losers suspend; both are evidence.
import fs from 'node:fs';
import path from 'node:path';

export async function run(ctx) {
  const bars = ctx.config.bars;
  const m = ctx.results.measure.metrics;
  const concept = ctx.results.ideate.concept;

  const checks = [
    { metric: 'clip_ctr', label: 'Hook-clip CTR', value: m.clip_ctr, bar: bars.clip_ctr, pass: m.clip_ctr >= bars.clip_ctr },
    { metric: 'play_rate', label: 'Play rate (clip→game)', value: m.play_rate, bar: bars.play_rate, pass: m.play_rate >= bars.play_rate },
    { metric: 'avg_session_s', label: 'Avg session (s)', value: m.avg_session_s, bar: bars.avg_session_s, pass: m.avg_session_s >= bars.avg_session_s },
    { metric: 'd1_retention', label: 'D1 retention', value: m.d1_retention, bar: bars.d1_retention, pass: m.d1_retention >= bars.d1_retention }
  ];
  const failed = checks.filter((c) => !c.pass);
  const verdict = failed.length === 0 ? 'approve_scale' : 'suspend_learn';

  // recommended next action per mvp.md: cheapest fix first
  let action;
  if (verdict === 'approve_scale') action = 'scale: more distribution budget + clip variants; mechanic promoted in Signal';
  else if (failed.some((c) => c.metric === 'clip_ctr')) action = 're-cut the clip first (different hook frame / near-miss) — cheaper than rebuilding the game';
  else if (failed.some((c) => c.metric === 'd1_retention')) action = 'iterate the retention mechanic (streak/daily hook — Circuit 08) before more distribution spend';
  else action = 'iterate the game loop, then re-measure';

  // evidence feeds back to Signal
  const evidenceFile = path.join(ctx.stateDir, 'evidence.json');
  const evidence = fs.existsSync(evidenceFile) ? JSON.parse(fs.readFileSync(evidenceFile, 'utf8')) : {};
  const ev = evidence[concept.mechanic] || { wins: 0, losses: 0, runs: [] };
  if (verdict === 'approve_scale') ev.wins++; else ev.losses++;
  ev.runs.push({ run_id: ctx.runId, game: concept.id, verdict, metrics: m, at: new Date().toISOString() });
  evidence[concept.mechanic] = ev;
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  // experiment recommendations from the full behavioral report
  let recommended_variants = [];
  try {
    const { parseEvents } = await import('../lib/metrics.mjs');
    const { suggestVariants } = await import('../lib/experiment.mjs');
    const runEventsFile = path.join(ctx.runDir, 'events.jsonl');
    const events = fs.existsSync(runEventsFile) ? parseEvents([runEventsFile]) : [];
    const report = events.length ? { meta: { engine: concept.engine }, game: concept.id, indices: deriveIndicesFromEvents(events, concept.id), behavioral: {}, raw: {} } : null;
    if (report) {
      // enrich indices from metrics layer if possible
      const { computeGameReport } = await import('../lib/metrics.mjs');
      const fullReport = computeGameReport(events, concept.id, { modes: ['human', 'bot', 'synthetic'] });
      recommended_variants = suggestVariants(fullReport).slice(0, 3);
    }
  } catch (err) {
    ctx.log('learn: variant suggestion skipped — ' + (err.message || err));
  }
  if (recommended_variants.length) {
    for (const v of recommended_variants) ctx.log(`learn: suggested variant ${v.id} — ${v.hypothesis}`);
  }

  ctx.log(`learn: ${verdict.toUpperCase()} (${checks.length - failed.length}/${checks.length} bars) → ${action}`);
  return { verdict, checks, action, recommended_variants, evidence_written: `evidence.json[${concept.mechanic}] (wins ${ev.wins} / losses ${ev.losses})`, feeds_back_to: 'signal' };
}

function deriveIndicesFromEvents(events, gameId) {
  // minimal fallback so suggestVariants gets plausible shape
  return { pleasure: 50, dopamine: 50, addiction: 30 };
}
