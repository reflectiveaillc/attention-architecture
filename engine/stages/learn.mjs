// Stage 7 — LEARN: verdict against the four bars (PLAN.md §5), then write the
// outcome back to evidence.json so the next Signal pass inherits it. Winners
// scale; losers suspend; both are evidence.
import fs from 'node:fs';
import path from 'node:path';

export async function run(ctx) {
  const bars = ctx.config.bars;
  const m = ctx.results.measure.metrics;
  const concept = ctx.results.ideate.concept;

  // Real-IG signal: like-rate per concept from ig-ingest's ig-signals.json.
  // This is the market verdict the synthetic cohort can't see.
  const igSignalsFile = path.join(ctx.stateDir, 'ig-signals.json');
  const igSignals = fs.existsSync(igSignalsFile) ? JSON.parse(fs.readFileSync(igSignalsFile, 'utf8')) : {};
  const ig = igSignals[concept.id] || {};
  const igLikeRate = ig.like_rate || 0;
  const igMinLikes = bars.ig_min_likes ?? 5;
  const igBar = bars.ig_like_rate ?? 0.04;
  const igPass = (ig.likes || 0) >= igMinLikes && igLikeRate >= igBar;

  const avail = m.availability || { clip_ctr: true, play_rate: true, avg_session_s: true, d1_retention: true };
  const mk = (metric, label, value, bar) => {
    const na = avail[metric] === false;
    return { metric, label, value, bar, na, pass: na ? null : value >= bar };
  };
  const checks = [
    mk('clip_ctr', 'Hook-clip CTR (IG→hub)', m.clip_ctr, bars.clip_ctr),
    mk('play_rate', 'Play rate (visit→play)', m.play_rate, bars.play_rate),
    mk('avg_session_s', 'Avg session (s)', m.avg_session_s, bars.avg_session_s),
    mk('d1_retention', 'D1 retention', m.d1_retention, bars.d1_retention),
    // IG check is na too when the concept simply has no IG data yet (new
    // concept, clip not posted) — "unjudged" must not display as a market fail.
    { metric: 'ig_like_rate', label: 'IG like-rate', value: igLikeRate, bar: igBar, na: !(ig.posts > 0 || (ig.likes || 0) > 0), pass: igPass }
  ];
  // Only REAL bars judge the run. na bars (not enough live data — typically a
  // brand-new concept) are excluded, never counted as failures.
  const liveChecks = checks.filter((c) => c.metric !== 'ig_like_rate' && !c.na);
  const failed = liveChecks.filter((c) => !c.pass);
  // Verdict: every available live bar passes → approve_scale. Live bars fail
  // (or none exist yet) but IG passes → approve_scale_ig (market over cohort).
  // No live data AND no IG win → insufficient_data: recorded, no win/loss —
  // the concept's verdict comes from IG later (ig-learn), not from a fake suspend.
  const verdict = failed.length === 0 && liveChecks.length > 0 ? 'approve_scale'
    : igPass ? 'approve_scale_ig'
    : liveChecks.length === 0 ? 'insufficient_data'
    : 'suspend_learn';

  // recommended next action per mvp.md: cheapest fix first
  let action;
  if (verdict === 'approve_scale') action = 'scale: more distribution budget + clip variants; mechanic promoted in Signal';
  else if (verdict === 'approve_scale_ig') action = `scale on IG signal: ${ig.likes} likes @ ${Math.round(igLikeRate * 1000) / 10}% like-rate — market over cohort; more clip variants of this mechanic`;
  else if (verdict === 'insufficient_data') action = 'no live-data verdict (new concept) — post the clip, let ig-learn verdict on real IG signal';
  else if (failed.some((c) => c.metric === 'clip_ctr')) action = 're-cut the clip first (different hook frame / near-miss) — cheaper than rebuilding the game';
  else if (failed.some((c) => c.metric === 'd1_retention')) action = 'iterate the retention mechanic (streak/daily hook — Circuit 08) before more distribution spend';
  else action = 'iterate the game loop, then re-measure';

  // evidence feeds back to Signal — attach the IG signal so signal.mjs can boost
  // IG-winning mechanics separately from the live win/loss tally.
  const evidenceFile = path.join(ctx.stateDir, 'evidence.json');
  const evidence = fs.existsSync(evidenceFile) ? JSON.parse(fs.readFileSync(evidenceFile, 'utf8')) : {};
  const ev = evidence[concept.mechanic] || { wins: 0, losses: 0, runs: [] };
  if (verdict === 'approve_scale' || verdict === 'approve_scale_ig') ev.wins++;
  else if (verdict === 'suspend_learn') ev.losses++;
  // insufficient_data increments nothing — an unjudged concept is not a loser.
  const metricsWithIg = { ...m, availability: m.availability, ig_like_rate: igLikeRate, ig_likes: ig.likes || 0, ig_views: ig.views || 0 };
  ev.runs.push({ run_id: ctx.runId, game: concept.id, verdict, metrics: metricsWithIg, at: new Date().toISOString() });
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
