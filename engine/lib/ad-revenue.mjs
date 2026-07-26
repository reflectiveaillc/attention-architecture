// Shadow-ads revenue model — "what would ads have paid us yesterday?"
//
// NOTHING IN HERE RENDERS AN AD. This is a pure replay: it walks the real event
// stream, re-simulates an ad placement policy (engine/config/ad-model.json) over
// it, and reports the revenue those placements WOULD have produced. Because it is
// a replay and not client code, it works retroactively over every event ever
// collected, costs nothing to run, and cannot degrade the live site.
//
// The placement thesis (docs/ad-revenue.md): the money moment in a casual game is
// the instant AFTER a loss, when the player is still inside the loop — they are
// looking at a dead screen, their thumb is already moving to restart, and their
// attention is at its peak. We score every death for engagement and only place an
// ad on the ones the player demonstrably came back from.
import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = new URL('../config/ad-model.json', import.meta.url);

export function loadModel(overridePath) {
  const raw = fs.readFileSync(overridePath ? overridePath : CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

// Apply a named appetite preset (conservative | standard | aggressive) on top of
// the base policy. Returns a copy — the caller can price several appetites over
// the same history without reloading anything.
export function withPolicy(model, presetName) {
  if (!presetName || presetName === 'default') return model;
  const preset = model.policy_presets && model.policy_presets[presetName];
  if (!preset) throw new Error(`unknown policy preset: ${presetName}`);
  return { ...model, policy: { ...model.policy, ...preset }, policy_name: presetName };
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const clamp01 = (x) => clamp(x, 0, 1);
const round = (x, n = 4) => Math.round(x * 10 ** n) / 10 ** n;

// ---------------------------------------------------------------- local days
// "Yesterday" means yesterday where Manuel is, not UTC. Every day bucket in this
// module is a wall-clock day in model.timezone.
export function localDay(ts, tz) {
  const d = new Date(ts);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Epoch ms of local midnight for a YYYY-MM-DD in tz.
function startOfDay(dayStr, tz) {
  const [y, m, d] = dayStr.split('-').map(Number);
  const wallUTC = Date.UTC(y, m - 1, d, 0, 0, 0);
  // Guess, then correct by the zone offset at the guessed instant. Two passes
  // settle it even when the correction itself crosses a DST boundary.
  let guess = wallUTC;
  for (let i = 0; i < 3; i++) {
    const corrected = wallUTC - tzOffsetMs(guess, tz);
    if (corrected === guess) break;
    guess = corrected;
  }
  return guess;
}

// [start, end) for a local day. The end is the NEXT day's local midnight, not
// start+24h — on DST days the local day is 23 or 25 hours long and a fixed 24h
// would clip an hour of traffic off one day and double-count it on another.
export function dayBounds(dayStr, tz) {
  const [y, m, d] = dayStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextStr = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  return { start: startOfDay(dayStr, tz), end: startOfDay(nextStr, tz) };
}

function tzOffsetMs(ts, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - ts;
}

// ------------------------------------------------------------------ sessions
// Group by visitor, then split on inactivity. vsid is unreliable (null on feed
// events, resets per tab), so the gap rule is the source of truth.
const SESSION_GAP_MS = 30 * 60e3;

export function buildSessions(events) {
  const byVid = new Map();
  for (const e of events) {
    if (!e || !e.ts) continue;
    const vid = e.vid || 'unknown';
    if (!byVid.has(vid)) byVid.set(vid, []);
    byVid.get(vid).push(e);
  }
  const sessions = [];
  for (const [vid, evs] of byVid) {
    evs.sort((a, b) => a.ts - b.ts);
    let cur = null;
    for (const e of evs) {
      if (!cur || e.ts - cur.last_ts > SESSION_GAP_MS) {
        cur = { vid, events: [], start_ts: e.ts, last_ts: e.ts };
        sessions.push(cur);
      }
      cur.events.push(e);
      cur.last_ts = e.ts;
    }
  }
  return sessions;
}

// --------------------------------------------------------------------- geo
export function geoTier(country, model) {
  if (!country) return model.geo.default_tier;
  const c = String(country).toUpperCase();
  if (model.geo.tier1.includes(c)) return 'tier1';
  if (model.geo.tier2.includes(c)) return 'tier2';
  if (model.geo.tier3.includes(c)) return 'tier3';
  return 'tier3';
}

// Resolve a session's country/device from the events themselves, falling back to
// the geo map built by scripts/backfill-geo.mjs for history collected before the
// ingest stage started carrying geo.
function resolveContext(session, model, geoMap) {
  let country = null, device = null;
  for (const e of session.events) {
    if (!country && e.country) country = e.country;
    if (!device && e.device_type) device = e.device_type;
  }
  const fromMap = geoMap && geoMap[session.vid];
  if (!country && fromMap) country = fromMap.country || null;
  if (!device && fromMap) device = fromMap.device_type || null;
  return {
    country: country || null,
    device: device || 'unknown',
    tier: geoTier(country, model),
    geo_known: !!country
  };
}

// ------------------------------------------------------------ moment scoring
// How engaged was this player at the instant they lost? 0..1.
export function scoreMoment(death, model) {
  const w = model.moment_score.weights;
  const cfg = model.moment_score;
  const depth = clamp01(death.run_index / cfg.session_depth_saturate_runs);
  const invested = clamp01(death.play_s_before / cfg.time_invested_saturate_s);
  const nearMiss = death.after_near_miss ? 1 : 0;
  const compulsive = death.restart_ms == null
    ? 0
    : clamp01((cfg.compulsive_restart_saturate_ms - death.restart_ms) / cfg.compulsive_restart_saturate_ms);
  const pr = death.personal_record ? 1 : 0;
  const score = w.session_depth * depth
    + w.time_invested * invested
    + w.after_near_miss * nearMiss
    + w.compulsive_restart * compulsive
    + w.personal_record * pr;
  return {
    score: round(clamp01(score), 4),
    parts: { depth: round(depth, 3), invested: round(invested, 3), near_miss: nearMiss, compulsive: round(compulsive, 3), personal_record: pr }
  };
}

// --------------------------------------------------------------- one session
// Walk a session in time order and emit the shadow impressions the policy would
// have produced. Returns impressions + the diagnostics behind them.
export function replaySession(session, model, ctx) {
  const P = model.policy;
  const impressions = [];
  const deaths = [];

  let runIndex = 0;
  let playS = 0;
  let best = null;
  let nearMissThisRun = false;
  let recentSpike = false;
  let heartbeats = 0;
  let feedAdvances = 0;
  let pendingDeath = null;
  let lastAdTs = 0;
  let adsPlaced = 0;

  const finalizeDeath = (d) => {
    if (!d) return;
    const m = scoreMoment(d, model);
    d.moment_score = m.score;
    d.score_parts = m.parts;
    deaths.push(d);
  };

  for (const e of session.events) {
    switch (e.event) {
      case 'near_miss':
        nearMissThisRun = true;
        break;

      case 'difficulty_spike':
        recentSpike = true;
        break;

      case 'session_heartbeat':
        heartbeats++;
        break;

      case 'play_start':
      case 'restart': {
        // A restart resolves the previous death: it is the proof the player was
        // still inside the loop, which is exactly the moment we want to monetize.
        if (pendingDeath && e.ts - pendingDeath.ts <= P.continued_play_window_s * 1000) {
          if (pendingDeath.restart_ms == null) pendingDeath.restart_ms = e.ts - pendingDeath.ts;
          pendingDeath.continued = true;
        }
        finalizeDeath(pendingDeath);
        pendingDeath = null;
        if (e.event === 'play_start') runIndex++;
        nearMissThisRun = false;
        break;
      }

      case 'restart_latency':
        // Explicit signal from the client — more precise than inferring the gap.
        if (pendingDeath && typeof e.ms === 'number') {
          pendingDeath.restart_ms = e.ms;
          if (e.ms <= P.continued_play_window_s * 1000) pendingDeath.continued = true;
          if (e.after_near_miss) pendingDeath.after_near_miss = true;
        }
        break;

      case 'win_moment':
        if (pendingDeath) pendingDeath.personal_record = true;
        break;

      case 'game_result':
        if (pendingDeath && e.personal_record) pendingDeath.personal_record = true;
        break;

      case 'game_over': {
        finalizeDeath(pendingDeath);
        const dur = typeof e.dur_s === 'number' ? e.dur_s : 0;
        const isPR = typeof e.score === 'number' && best != null && e.score > best;
        if (typeof e.score === 'number') best = best == null ? e.score : Math.max(best, e.score);
        playS += dur;
        pendingDeath = {
          ts: e.ts,
          game: e.game || 'unknown',
          run_index: Math.max(runIndex, 1),
          play_s_before: round(playS, 2),
          dur_s: dur,
          after_near_miss: nearMissThisRun,
          personal_record: isPR,
          restart_ms: null,
          continued: false,
          after_difficulty_spike: recentSpike
        };
        recentSpike = false;
        nearMissThisRun = false;
        break;
      }

      case 'feed_advance':
        feedAdvances++;
        break;
    }
  }
  finalizeDeath(pendingDeath);

  // ---- post-death interstitials, in time order, under the caps ----
  for (const d of deaths) {
    if (adsPlaced >= P.max_ads_per_session) { d.skipped = 'session_cap'; continue; }
    if (d.run_index < P.min_run_index) { d.skipped = 'too_early_in_session'; continue; }
    if (P.require_continued_play && !d.continued) { d.skipped = 'player_left'; continue; }
    if (P.skip_after_difficulty_spike && d.after_difficulty_spike) { d.skipped = 'frustration_guard'; continue; }
    if (d.moment_score < P.min_moment_score) { d.skipped = 'low_engagement'; continue; }
    if (lastAdTs && d.ts - lastAdTs < P.cooldown_s * 1000) { d.skipped = 'cooldown'; continue; }

    // A death worth a rewarded offer (record chase / near miss at depth) is worth
    // more as an opt-in continue than as an interruption. Take the better one.
    const rewardedWorthy = d.personal_record || (d.after_near_miss && d.moment_score >= 0.55);
    const placement = rewardedWorthy ? 'rewarded_continue' : 'interstitial_post_death';

    impressions.push({
      placement, ts: d.ts, game: d.game, moment_score: d.moment_score,
      run_index: d.run_index, after_near_miss: d.after_near_miss,
      personal_record: d.personal_record, restart_ms: d.restart_ms,
      score_parts: d.score_parts
    });
    d.placed = placement;
    lastAdTs = d.ts;
    adsPlaced++;
  }

  // ---- feed-swipe interstitials ----
  const feedAds = Math.floor(feedAdvances / model.policy.feed_swipe_every_n);
  for (let i = 0; i < feedAds; i++) {
    impressions.push({
      placement: 'interstitial_feed_swipe', ts: session.last_ts, game: 'feed',
      moment_score: 0.35, run_index: 0, after_near_miss: false, personal_record: false, restart_ms: null
    });
  }

  // ---- sticky banner: page-open time / refresh interval ----
  // Each heartbeat is 5s of a visible tab (loop-events.js emits one every 5s).
  const pageOpenS = heartbeats * 5;
  const bannerImps = Math.min(
    Math.floor(pageOpenS / model.policy.banner_refresh_s),
    model.policy.max_banner_impressions_per_session
  );
  for (let i = 0; i < bannerImps; i++) {
    impressions.push({
      placement: 'banner_sticky', ts: session.start_ts + i * model.policy.banner_refresh_s * 1000,
      game: session.events[0]?.game || 'unknown', moment_score: 0.3,
      run_index: 0, after_near_miss: false, personal_record: false, restart_ms: null
    });
  }

  return {
    impressions,
    diagnostics: {
      vid: session.vid,
      start_ts: session.start_ts,
      deaths: deaths.length,
      deaths_continued: deaths.filter((d) => d.continued).length,
      runs: runIndex,
      play_s: round(playS, 1),
      page_open_s: pageOpenS,
      feed_advances: feedAdvances,
      ads_placed: adsPlaced,
      skips: deaths.reduce((acc, d) => { if (d.skipped) acc[d.skipped] = (acc[d.skipped] || 0) + 1; return acc; }, {}),
      death_detail: deaths
    },
    context: ctx
  };
}

// ------------------------------------------------------------------ pricing
// One impression → { low, mid, high } USD + modeled clicks.
export function priceImpression(imp, ctx, model) {
  const p = model.placements[imp.placement];
  if (!p) return null;
  const ecpm = p.ecpm_usd[ctx.tier] || p.ecpm_usd.tier3;
  const M = model.multipliers;

  const engMult = clamp(1 + M.engagement_ecpm.slope * (imp.moment_score - 0.5),
    M.engagement_ecpm.min, M.engagement_ecpm.max);
  const devMult = M.device[ctx.device] != null ? M.device[ctx.device] : M.device.unknown;
  const ctrMult = clamp(M.engagement_ctr.intercept + M.engagement_ctr.slope * imp.moment_score,
    M.engagement_ctr.min, M.engagement_ctr.max);

  // Rewarded is opt-in: only the accepted share is an impression at all. The
  // curve is normalised so an average moment (0.5) accepts at base_accept_rate.
  let shown = 1;
  if (imp.placement === 'rewarded_continue') {
    const a = M.rewarded_accept;
    const atAvg = a.intercept + a.slope * 0.5;
    const atThis = a.intercept + a.slope * imp.moment_score;
    shown = clamp(p.base_accept_rate * (atThis / atAvg), a.min, a.max);
  }

  const effective = shown * p.fill_rate * p.viewability;
  const band = ecpm.map((c) => (c / 1000) * effective * engMult * devMult);
  const clicks = shown * p.fill_rate * p.base_ctr * ctrMult;
  const clickRev = clicks * (p.cpc_usd[ctx.tier] || 0);

  return {
    low: band[0], mid: band[1], high: band[2],
    clicks,
    click_revenue: clickRev,
    effective_impressions: effective
  };
}

// ------------------------------------------------------------------- report
export function computeRevenue(events, model, opts = {}) {
  const geoMap = opts.geoMap || null;
  const tz = model.timezone || 'America/New_York';
  const humanOnly = opts.humanOnly !== false;

  const filtered = events.filter((e) => e && e.ts && (!humanOnly || (e.mode || 'human') === 'human'));
  const sessions = buildSessions(filtered);

  const perDay = new Map();
  const perPlacement = new Map();
  const perGame = new Map();
  const allImpressions = [];
  const sessionDiag = [];
  let geoKnown = 0;

  for (const session of sessions) {
    const ctx = resolveContext(session, model, geoMap);
    if (ctx.geo_known) geoKnown++;
    const { impressions, diagnostics } = replaySession(session, model, ctx);
    sessionDiag.push({ ...diagnostics, ...ctx });

    // A session is attributed to the day it started, so a session that crosses
    // midnight is not split in half.
    const sessionDay = localDay(session.start_ts, tz);
    if (!perDay.has(sessionDay)) perDay.set(sessionDay, emptyBucket());
    perDay.get(sessionDay).sessions++;
    perDay.get(sessionDay).visitors.add(session.vid);

    for (const imp of impressions) {
      const priced = priceImpression(imp, ctx, model);
      if (!priced) continue;
      const day = localDay(imp.ts, tz);
      if (!perDay.has(day)) perDay.set(day, emptyBucket());
      addTo(perDay.get(day), imp, priced);
      if (!perPlacement.has(imp.placement)) perPlacement.set(imp.placement, emptyBucket());
      addTo(perPlacement.get(imp.placement), imp, priced);
      if (!perGame.has(imp.game)) perGame.set(imp.game, emptyBucket());
      addTo(perGame.get(imp.game), imp, priced);
      allImpressions.push({ ...imp, day, tier: ctx.tier, device: ctx.device, revenue_mid: priced.mid });
    }
  }

  const share = model.costs.network_revenue_share;
  const days = [...perDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, b]) => ({ day, ...finalizeBucket(b, share) }));

  const totals = finalizeBucket(mergeBuckets([...perDay.values()]), share);
  totals.sessions = sessions.length;
  totals.visitors = new Set(sessions.map((s) => s.vid)).size;

  return {
    generated_at: new Date().toISOString(),
    timezone: tz,
    model_version: model.version,
    window: opts.windowLabel || 'all',
    totals,
    geo_coverage: sessions.length ? round(geoKnown / sessions.length, 3) : 0,
    days,
    by_placement: Object.fromEntries([...perPlacement.entries()].map(([k, b]) => [k, finalizeBucket(b, share)])),
    by_game: Object.fromEntries(
      [...perGame.entries()]
        .map(([k, b]) => [k, finalizeBucket(b, share)])
        .sort((a, b) => b[1].net_mid - a[1].net_mid)
        .slice(0, 25)
    ),
    sessions: sessionDiag.sort((a, b) => b.start_ts - a.start_ts).slice(0, 200),
    impressions_sample: allImpressions.sort((a, b) => b.ts - a.ts).slice(0, 100)
  };
}

function emptyBucket() {
  return { impressions: 0, low: 0, mid: 0, high: 0, clicks: 0, click_revenue: 0, effective_impressions: 0, sessions: 0, visitors: new Set(), moment_sum: 0 };
}

function addTo(b, imp, priced) {
  b.impressions++;
  b.low += priced.low;
  b.mid += priced.mid;
  b.high += priced.high;
  b.clicks += priced.clicks;
  b.click_revenue += priced.click_revenue;
  b.effective_impressions += priced.effective_impressions;
  b.moment_sum += imp.moment_score;
}

function mergeBuckets(list) {
  const out = emptyBucket();
  for (const b of list) {
    out.impressions += b.impressions; out.low += b.low; out.mid += b.mid; out.high += b.high;
    out.clicks += b.clicks; out.click_revenue += b.click_revenue;
    out.effective_impressions += b.effective_impressions;
    out.sessions += b.sessions; out.moment_sum += b.moment_sum;
    for (const v of b.visitors) out.visitors.add(v);
  }
  return out;
}

function finalizeBucket(b, share) {
  const visitors = b.visitors instanceof Set ? b.visitors.size : (b.visitors || 0);
  return {
    impressions: b.impressions,
    sessions: b.sessions,
    visitors,
    gross_low: round(b.low, 6),
    gross_mid: round(b.mid, 6),
    gross_high: round(b.high, 6),
    net_low: round(b.low * share, 6),
    net_mid: round(b.mid * share, 6),
    net_high: round(b.high * share, 6),
    predicted_clicks: round(b.clicks, 3),
    click_revenue: round(b.click_revenue, 6),
    avg_moment_score: b.impressions ? round(b.moment_sum / b.impressions, 3) : 0,
    rpm_mid: b.impressions ? round((b.mid / b.impressions) * 1000, 3) : 0
  };
}

// ------------------------------------------------------------------ scaling
// The number that actually matters: per-session economics × the traffic we could
// have. Today's traffic is small; this says what it is worth once it is not.
export function scalingTable(totals, model) {
  const perSession = totals.sessions ? totals.net_mid / totals.sessions : 0;
  const rows = [1e3, 1e4, 1e5, 1e6].map((n) => ({
    sessions_per_month: n,
    net_usd_per_month: round(perSession * n, 2)
  }));
  return { net_per_session: round(perSession, 6), rows };
}

// ------------------------------------------------------ persistence helpers
export function writeReports({ report, root, stateDir, siteDir, model }) {
  const outDir = path.join(stateDir, 'analytics');
  fs.mkdirSync(outDir, { recursive: true });

  // full latest snapshot
  const fullPath = path.join(outDir, 'ad-revenue.json');
  fs.writeFileSync(fullPath, JSON.stringify(report, null, 2));

  // Append-merge the per-day history so "how much did yesterday make?" is always
  // answerable, even after the raw event window rolls off. A day computed from a
  // window that only partly covers it (`partial`) must never overwrite a day that
  // was computed in full — otherwise a `--since 24h` run at noon would silently
  // halve yesterday's recorded number.
  const histPath = path.join(outDir, 'ad-revenue-daily.json');
  const hist = fs.existsSync(histPath) ? JSON.parse(fs.readFileSync(histPath, 'utf8')) : { timezone: report.timezone, days: {} };
  for (const d of report.days) {
    const prev = hist.days[d.day];
    if (prev && prev.partial === false && d.partial !== false) continue;
    if (prev && prev.partial !== false && d.partial !== false && (prev.sessions || 0) > (d.sessions || 0)) continue;
    hist.days[d.day] = { ...d, model_version: report.model_version, updated_at: report.generated_at };
  }
  hist.timezone = report.timezone;
  hist.updated_at = report.generated_at;
  fs.writeFileSync(histPath, JSON.stringify(hist, null, 2));

  // Optional compact snapshot. NOT written by default: this repo and web/site/
  // are public, and revenue modeling is not something to publish. Pass an
  // explicit siteDir only if you have decided otherwise.
  if (!siteDir) return { fullPath, histPath };
  const pub = {
    generated_at: report.generated_at,
    timezone: report.timezone,
    model_version: report.model_version,
    window: report.window,
    totals: report.totals,
    days: report.days.slice(-30),
    by_placement: report.by_placement,
    by_game: report.by_game,
    scaling: scalingTable(report.totals, model),
    confidence: report.confidence,
    retention_cost: report.retention_cost
  };
  const siteAnalytics = path.join(siteDir, 'analytics');
  fs.mkdirSync(siteAnalytics, { recursive: true });
  fs.writeFileSync(path.join(siteAnalytics, 'ad-revenue.json'), JSON.stringify(pub, null, 2));
  return { fullPath, histPath, publicPath: path.join(siteAnalytics, 'ad-revenue.json') };
}

export function assessConfidence(report, model) {
  const g = model.quality_gates;
  const adMoments = (report.by_placement.interstitial_post_death?.impressions || 0)
    + (report.by_placement.rewarded_continue?.impressions || 0);
  const ok = report.totals.sessions >= g.min_sessions_for_confidence && adMoments >= g.min_ad_moments_for_confidence;
  return {
    level: ok ? 'usable' : 'low',
    sessions: report.totals.sessions,
    ad_moments: adMoments,
    needs_sessions: g.min_sessions_for_confidence,
    needs_ad_moments: g.min_ad_moments_for_confidence,
    geo_coverage: report.geo_coverage,
    note: ok
      ? 'Enough volume to treat the per-session economics as a real signal.'
      : 'Traffic is below the volume where this estimate is more than an order-of-magnitude sketch. The per-session number is the useful output, not the daily total.'
  };
}

export function assessRetentionCost(report, model) {
  const rc = model.retention_cost;
  const interstitials = report.by_placement.interstitial_post_death?.impressions || 0;
  const perSession = report.totals.sessions ? interstitials / report.totals.sessions : 0;
  return {
    interstitials_per_session: round(perSession, 3),
    modeled_session_length_loss: round(clamp01(perSession * rc.session_length_loss_per_interstitial), 4),
    modeled_d1_return_loss: round(clamp01(perSession * rc.d1_return_loss_per_interstitial), 4),
    note: 'Modeled cost of turning ads ON, not measured. Weigh it against the revenue before flipping the switch.'
  };
}

export function loadGeoMap(stateDir) {
  const p = path.join(stateDir, 'analytics', 'geo-map.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')).vids || null; } catch (_) { return null; }
}
