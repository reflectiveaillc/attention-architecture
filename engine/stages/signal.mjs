// Stage 1 — SIGNAL: trend mining. MVP (R2): reads the seeded trend feed and
// applies evidence from past Learn outcomes (winners boost a mechanic, losers
// demote it). R4 replaces the seed file with automated scrapers/classifiers.
import fs from 'node:fs';
import path from 'node:path';

export async function run(ctx) {
  const trends = JSON.parse(fs.readFileSync(path.join(ctx.stateDir, 'trends.json'), 'utf8'));
  const evidenceFile = path.join(ctx.stateDir, 'evidence.json');
  const evidence = fs.existsSync(evidenceFile) ? JSON.parse(fs.readFileSync(evidenceFile, 'utf8')) : {};

  // IG bars — a mechanic whose runs won on real Instagram gets an extra boost on
  // top of the synthetic win/loss tally. This is the "grow what the market loves"
  // lever: calm+behavior-mirror winners rise in signal → ideate picks them more.
  const igBar = ctx.config.bars.ig_like_rate ?? 0.04;
  const igMinLikes = ctx.config.bars.ig_min_likes ?? 5;

  // One scoring rule for every feed source, so evidence affects template trends,
  // analytics concepts, and IG-winner variants identically.
  const scoreFor = (mechKey) => {
    const ev = evidence[mechKey] || { wins: 0, losses: 0, runs: [] };
    const synthBoost = (ev.wins || 0) * 0.15 - (ev.losses || 0) * 0.1;
    const igWins = (ev.runs || []).filter((r) =>
      (r.metrics?.ig_like_rate ?? 0) >= igBar && (r.metrics?.ig_likes ?? 0) >= igMinLikes
    ).length;
    const igBoost = Math.min(igWins * 0.1, 0.2); // cap IG contribution at +0.2
    return {
      boost: Math.max(-0.3, Math.min(0.3, synthBoost + igBoost)),
      evidence: { wins: ev.wins || 0, losses: ev.losses || 0, ig_wins: igWins }
    };
  };

  const feed = trends.trends.map((t) => {
    const { boost, evidence: evInfo } = scoreFor(t.mechanic);
    return {
      ...t,
      evidence: { ...evInfo, boost: +boost.toFixed(2) },
      score: +(t.signal_strength + boost).toFixed(2)
    };
  }).sort((a, b) => b.score - a.score);

  // Inject analytics-derived concepts as high-confidence signal candidates.
  // Evidence key MUST match what learn.mjs writes: ideate.mjs builds the card
  // with the same composite (input:primary_circuit, or an explicit mechanic_key
  // for IG-winner variants where the family IS the winning game).
  const mechKeyOf = (c) => c.mechanic_key || `${c.input || 'tap'}:${c.primary_circuit || 'unknown'}`;
  const nextConceptsFile = path.join(ctx.stateDir, 'next-concepts.json');
  if (fs.existsSync(nextConceptsFile)) {
    const { concepts } = JSON.parse(fs.readFileSync(nextConceptsFile, 'utf8'));
    for (const c of (concepts || [])) {
      const mechKey = mechKeyOf(c);
      const { boost, evidence: evInfo } = scoreFor(mechKey);
      feed.unshift({
        mechanic: mechKey,
        theme: c.prompt_seed?.slice(0, 120),
        signal_strength: 0.95,
        evidence: { ...evInfo, boost: +boost.toFixed(2) },
        score: +(0.95 + boost).toFixed(2),
        source: 'analytics_feed',
        analytics_concept: c
      });
    }
    ctx.log(`signal: injected ${concepts.length} analytics concept(s)`);
  }

  // IG-winner variants: every game ig-learn verdicted approve_scale_ig gets a
  // "make a variant of the winner" concept injected at high confidence. This is
  // the link that turns a real market win into more of the winning family.
  const registry = fs.existsSync(path.join(ctx.stateDir, 'registry.json'))
    ? JSON.parse(fs.readFileSync(path.join(ctx.stateDir, 'registry.json'), 'utf8')) : { games: [] };
  const gameById = Object.fromEntries((registry.games || []).map((g) => [g.id, g]));
  const alreadyVarianted = new Set(feed.map((f) => f.mechanic));
  for (const [mechKey, ev] of Object.entries(evidence)) {
    const igWins = (ev.runs || []).filter((r) =>
      r.verdict === 'approve_scale_ig' && (r.metrics?.ig_like_rate ?? 0) >= igBar && (r.metrics?.ig_likes ?? 0) >= igMinLikes
    );
    if (!igWins.length || alreadyVarianted.has(mechKey)) continue;
    const g = gameById[mechKey];
    if (!g) continue; // evidence key isn't a registry game — template/composite, skip
    const best = igWins[igWins.length - 1];
    const variantConcept = {
      id: `variant-${mechKey}`,
      source: 'ig_winner_variant',
      engine: g.engine || 'viral',
      input: best.metrics?.ig_input || 'tap',
      face_control: false,
      has_sound: true,
      primary_circuit: (g.circuits || [])[0] || 'unknown',
      mechanic_key: mechKey,
      variant_of: mechKey,
      rationale: `IG winner: ${best.metrics.ig_likes} likes @ ${(best.metrics.ig_like_rate * 100).toFixed(1)}% — market picked a ${g.engine} game; produce a variant of the family.`,
      prompt_seed: `Build a NEW browser mini-game that is a variant of "${g.name}" (${g.tagline || g.id}). It won on Instagram (${best.metrics.ig_likes} likes @ ${(best.metrics.ig_like_rate * 100).toFixed(1)}% like-rate, engine=${g.engine}). Keep the core mechanic (${g.trick || g.category}), change the skin, the hook frame, and one tuning dimension. Engine: ${g.engine}. Single session <90s. No install.`
    };
    const { boost, evidence: evInfo } = scoreFor(mechKey);
    feed.unshift({
      mechanic: mechKey,
      theme: variantConcept.rationale.slice(0, 120),
      signal_strength: 1.0,
      evidence: { ...evInfo, boost: +boost.toFixed(2) },
      score: +(1.0 + boost).toFixed(2),
      source: 'ig_winner_variant',
      analytics_concept: variantConcept
    });
    ctx.log(`signal: injected IG-winner variant for ${mechKey} (${best.metrics.ig_likes} likes @ ${(best.metrics.ig_like_rate * 100).toFixed(1)}%)`);
  }

  // Re-sort so analytics concepts compete with mined trends.
  feed.sort((a, b) => b.score - a.score);

  ctx.log(`signal: ${feed.length} trends, top = ${feed[0].mechanic} (${feed[0].score})`);
  return { feed, source: 'seed:trends.json + analytics feed (R4: automated scrapers)' };
}
