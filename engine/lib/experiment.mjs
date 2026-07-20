// LOOP experiment driver — deterministic assignment + lightweight stopping rules.
// No heavy dependencies; uses a deterministic hash of vid for assignment and
// simple z/t tests for evaluation. Designed for the high-velocity variant
// breeding pattern in docs/game-contract-v2.md.
import fs from 'node:fs';
import path from 'node:path';
import { parseEvents, computeGameReport } from './metrics.mjs';

// Deterministic but effectively random assignment: same visitor always gets
// the same variant for the same game. Returns variant id or 'base'.
export function assignVariant(vid, gameId, variants, { seed = '' } = {}) {
  if (!variants || !variants.length) return 'base';
  const live = variants.filter((v) => !v.status || v.status === 'live' || v.status === 'testing');
  if (!live.length) return 'base';
  const s = hashString(`${seed}::${vid}::${gameId}`);
  return live[s % live.length].id;
}

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return Math.abs(h);
}

// Simple two-proportion z-test (for binary metrics like play_rate, d1, share_rate).
function zTestProp(aHits, aN, bHits, bN) {
  if (!aN || !bN) return { z: 0, p: 1 };
  const p1 = aHits / aN, p2 = bHits / bN;
  const p = (aHits + bHits) / (aN + bN);
  const se = Math.sqrt(p * (1 - p) * (1 / aN + 1 / bN));
  const z = se ? (p2 - p1) / se : 0;
  return { z, p: twoSidedP(z) };
}

// Simple two-sample t-test for difference of means (for continuous metrics).
function tTestMeans(a, b) {
  const ma = mean(a), mb = mean(b), sa = std(a), sb = std(b);
  const n1 = a.length, n2 = b.length;
  if (!n1 || !n2) return { t: 0, p: 1 };
  const se = Math.sqrt((sa * sa) / n1 + (sb * sb) / n2);
  const t = se ? (mb - ma) / se : 0;
  // Welch-Satterthwaite df
  const df = Math.max(1, Math.floor((sa * sa / n1 + sb * sb / n2) ** 2 / (((sa * sa / n1) ** 2) / (n1 - 1) + ((sb * sb / n2) ** 2) / (n2 - 1))));
  return { t, p: twoSidedP(t, df) };
}

function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function std(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

// Approximate two-sided tail probability from normal / t distribution.
function twoSidedP(z, df = null) {
  // Abramowitz & Stegun approximation for normal CDF
  const x = Math.abs(z) / Math.sqrt(2);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  // For t, we approximate with normal; acceptable for n > 30 per group.
  return Math.max(0, Math.min(1, 2 * (1 - 0.5 * (1 + erf))));
}

// Evaluate one variant against its base for a given metric.
// Supported metrics: play_rate, d1_retention, avg_session_s, runs_per_session,
// share_rate, fast_restart_share, near_miss_pull.
export function evaluateVariant(events, gameId, baseVariant, testVariant, metric) {
  const baseEvents = events.filter((e) => e.game === gameId && (e.variant || 'base') === baseVariant);
  const testEvents = events.filter((e) => e.game === gameId && (e.variant || 'base') === testVariant);

  const baseSids = groupBy(baseEvents, 'sid');
  const testSids = groupBy(testEvents, 'sid');

  function values(group, fn) { return Object.values(group).map(fn).filter((x) => x !== null); }

  let result = { metric, base: {}, test: {}, lift: 0, p: 1, n_base: 0, n_test: 0, verdict: 'inconclusive' };

  if (metric === 'play_rate') {
    const baseLanders = new Set(baseEvents.filter((e) => e.event === 'clip_landed').map((e) => e.vid)).size;
    const testLanders = new Set(testEvents.filter((e) => e.event === 'clip_landed').map((e) => e.vid)).size;
    const basePlayers = new Set(baseEvents.filter((e) => e.event === 'play_start').map((e) => e.vid)).size;
    const testPlayers = new Set(testEvents.filter((e) => e.event === 'play_start').map((e) => e.vid)).size;
    const st = zTestProp(basePlayers, baseLanders, testPlayers, testLanders);
    result = { ...result, base: { landers: baseLanders, players: basePlayers, rate: baseLanders ? basePlayers / baseLanders : 0 },
      test: { landers: testLanders, players: testPlayers, rate: testLanders ? testPlayers / testLanders : 0 },
      lift: baseLanders && testLanders ? ((testPlayers / testLanders) - (basePlayers / baseLanders)) / (basePlayers / baseLanders || 1) : 0,
      p: st.p, n_base: baseLanders, n_test: testLanders };
  } else if (metric === 'd1_retention') {
    const baseLanders = new Set(baseEvents.filter((e) => e.event === 'clip_landed').map((e) => e.vid)).size;
    const testLanders = new Set(testEvents.filter((e) => e.event === 'clip_landed').map((e) => e.vid)).size;
    const baseReturns = new Set(baseEvents.filter((e) => e.event === 'd1_return').map((e) => e.vid)).size;
    const testReturns = new Set(testEvents.filter((e) => e.event === 'd1_return').map((e) => e.vid)).size;
    const st = zTestProp(baseReturns, baseLanders, testReturns, testLanders);
    result = { ...result, base: { landers: baseLanders, returns: baseReturns, rate: baseLanders ? baseReturns / baseLanders : 0 },
      test: { landers: testLanders, returns: testReturns, rate: testLanders ? testReturns / testLanders : 0 },
      lift: baseLanders && testLanders ? ((testReturns / testLanders) - (baseReturns / baseLanders)) / (baseReturns / baseLanders || 1) : 0,
      p: st.p, n_base: baseLanders, n_test: testLanders };
  } else if (metric === 'avg_session_s') {
    const baseVals = values(baseSids, (s) => {
      const hb = s.filter((e) => e.event === 'session_heartbeat').reduce((m, e) => Math.max(m, e.t || 0), 0);
      const end = s.find((e) => e.event === 'session_end' && e.span_s);
      return end ? end.span_s : (hb || null);
    });
    const testVals = values(testSids, (s) => {
      const hb = s.filter((e) => e.event === 'session_heartbeat').reduce((m, e) => Math.max(m, e.t || 0), 0);
      const end = s.find((e) => e.event === 'session_end' && e.span_s);
      return end ? end.span_s : (hb || null);
    });
    const st = tTestMeans(baseVals, testVals);
    result = { ...result, base: { mean: mean(baseVals), n: baseVals.length }, test: { mean: mean(testVals), n: testVals.length },
      lift: mean(baseVals) ? (mean(testVals) - mean(baseVals)) / mean(baseVals) : 0, p: st.p, n_base: baseVals.length, n_test: testVals.length };
  } else if (metric === 'runs_per_session') {
    const baseVals = values(baseSids, (s) => s.filter((e) => e.event === 'play_start').length || null);
    const testVals = values(testSids, (s) => s.filter((e) => e.event === 'play_start').length || null);
    const st = tTestMeans(baseVals, testVals);
    result = { ...result, base: { mean: mean(baseVals), n: baseVals.length }, test: { mean: mean(testVals), n: testVals.length },
      lift: mean(baseVals) ? (mean(testVals) - mean(baseVals)) / mean(baseVals) : 0, p: st.p, n_base: baseVals.length, n_test: testVals.length };
  } else if (metric === 'share_rate') {
    const baseSessions = Object.keys(baseSids).length;
    const testSessions = Object.keys(testSids).length;
    const baseShares = baseEvents.filter((e) => e.event === 'share' || e.event === 'outbound_share').length;
    const testShares = testEvents.filter((e) => e.event === 'share' || e.event === 'outbound_share').length;
    const st = zTestProp(baseShares, baseSessions, testShares, testSessions);
    result = { ...result, base: { sessions: baseSessions, shares: baseShares, rate: baseSessions ? baseShares / baseSessions : 0 },
      test: { sessions: testSessions, shares: testShares, rate: testSessions ? testShares / testSessions : 0 },
      lift: baseSessions && testSessions ? ((testShares / testSessions) - (baseShares / baseSessions)) / (baseShares / baseSessions || 1) : 0,
      p: st.p, n_base: baseSessions, n_test: testSessions };
  }

  if (result.p < 0.05 && result.lift > 0.05) result.verdict = 'approve';
  else if (result.p < 0.20 && result.lift < -0.05) result.verdict = 'reject';
  else if (Math.max(result.n_base, result.n_test) > 2000) result.verdict = 'inconclusive_max_samples';
  else result.verdict = 'keep_running';
  return result;
}

function groupBy(arr, key) {
  const o = {};
  for (const x of arr) (o[x[key]] ||= []).push(x);
  return o;
}

// Auto-suggest variant hypotheses from a game report's index profile.
export function suggestVariants(report) {
  const { indices, behavioral, bars } = report;
  const ideas = [];

  // High dopamine, low pleasure → soften early difficulty
  if (indices.dopamine >= 60 && indices.pleasure <= 45) {
    ideas.push({
      id: `${report.game}-soft-early`,
      hypothesis: 'softer first 30s increases pleasure without killing dopamine',
      target_index: 'pleasure',
      min_samples: 200,
      expected_lift: 0.15,
      guardrail: 'addiction',
      changes: ['reduce early error windows', 'extend first reward feedback']
    });
  }

  // High pleasure, low dopamine → tighten the one-more loop
  if (indices.pleasure >= 60 && indices.dopamine <= 40) {
    ideas.push({
      id: `${report.game}-tighter-loop`,
      hypothesis: 'faster restart + louder near-miss increases dopamine',
      target_index: 'dopamine',
      min_samples: 200,
      expected_lift: 0.15,
      guardrail: 'pleasure',
      changes: ['cut death-to-restart latency', 'amplify sliver saves']
    });
  }

  // Near-miss pull near zero → near-misses aren't felt
  if (behavioral.near_miss_pull < 0.1 && behavioral.near_misses > 10) {
    ideas.push({
      id: `${report.game}-loud-near-miss`,
      hypothesis: 'make near-miss moments visually and audibly salient',
      target_index: 'dopamine',
      min_samples: 200,
      expected_lift: 0.10,
      guardrail: 'pleasure',
      changes: ['add “SO CLOSE” flash', 'near-miss sound + haptic']
    });
  }

  // Calm game with high addiction → failed calm intent
  if (report.meta && report.meta.engine === 'calm' && indices.addiction >= 50) {
    ideas.push({
      id: `${report.game}-explicit-end`,
      hypothesis: 'add a clear ending to reduce compulsive replay',
      target_index: 'addiction',
      min_samples: 200,
      expected_lift: -0.20,
      guardrail: 'pleasure',
      changes: ['soft conclusion screen', 'bloom-complete state']
    });
  }

  // Low session length → speed up the core loop
  if (bars.avg_session_s < 60) {
    ideas.push({
      id: `${report.game}-tighter-pacing`,
      hypothesis: 'shorter runs with faster feedback increase session length',
      target_index: 'pleasure',
      min_samples: 200,
      expected_lift: 0.15,
      guardrail: 'dopamine',
      changes: ['reduce intro friction', 'tighter death-to-restart']
    });
  }

  return ideas;
}

function normalizeVariants(variants) {
  return (variants || []).map((v) => typeof v === 'string' ? { id: v, status: 'live' } : v);
}

// Load registry, find game, list variants and their status.
export function loadExperimentState(registryPath, gameId) {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const game = (registry.games || []).find((g) => g.id === gameId);
  if (!game) return null;
  return { game, variants: normalizeVariants(game.variants), registryPath };
}

// Persist a new variant hypothesis to the registry.
export function addVariant(registryPath, gameId, variant) {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const game = registry.games.find((g) => g.id === gameId);
  if (!game) throw new Error('game not found: ' + gameId);
  if (!game.variants) game.variants = [];
  game.variants = normalizeVariants(game.variants);
  if (game.variants.find((v) => v.id === variant.id)) throw new Error('variant already exists: ' + variant.id);
  game.variants.push({ ...variant, status: 'testing', created_at: new Date().toISOString() });
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  return game.variants;
}

// Resolve a variant by updating its status in the registry.
export function resolveVariant(registryPath, gameId, variantId, status) {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const game = registry.games.find((g) => g.id === gameId);
  if (!game || !game.variants) throw new Error('game/variants not found');
  game.variants = normalizeVariants(game.variants);
  const v = game.variants.find((x) => x.id === variantId);
  if (!v) throw new Error('variant not found: ' + variantId);
  v.status = status;
  v.resolved_at = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  return v;
}
