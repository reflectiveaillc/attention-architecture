// LOOP behavioral metrics — pleasure / dopamine / addiction indices plus site-wide
// engagement loop analytics. All proxies are documented so they can be argued with.
import fs from 'node:fs';

export function parseEvents(files) {
  const events = [];
  for (const f of [].concat(files)) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').trim().split('\n')) {
      if (!line) continue;
      try { events.push(JSON.parse(line)); } catch (_) {}
    }
  }
  return events;
}

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const percentile = (a, p) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const i = Math.max(0, Math.min(s.length - 1, Math.floor((s.length - 1) * p)));
  return s[i];
};
const dayOf = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Per-game behavioral indices (PLEASURE / DOPAMINE / ADDICTION).
export function computeIndices(events, { modes = ['human', 'bot', 'synthetic'] } = {}) {
  const groups = {};
  for (const e of events) {
    if (!modes.includes(e.mode)) continue;
    const key = `${e.game}::${e.variant || 'base'}`;
    (groups[key] ||= []).push(e);
  }
  const out = [];
  for (const [key, evs] of Object.entries(groups)) {
    const [game, variant] = key.split('::');
    const bySid = {};
    for (const e of evs) (bySid[e.sid] ||= []).push(e);

    const sessionLens = [], runsPerSession = [], runDurs = [];
    const restartMs = [], restartAfterNM = [], restartClean = [];
    let fastRestarts = 0, restartCount = 0, nearMisses = 0, gameOvers = 0;
    const visitors = new Set(), d1 = new Set(), lateEvents = [];
    const visitsByVid = {};
    let shares = 0, daresLanded = 0, daresBeaten = 0;

    for (const [sid, ses] of Object.entries(bySid)) {
      let hb = 0, runs = 0;
      for (const e of ses) {
        visitors.add(e.vid);
        if (e.visit_n) visitsByVid[e.vid] = Math.max(visitsByVid[e.vid] || 1, e.visit_n);
        lateEvents.push(!!e.late_night);
        if (e.event === 'session_heartbeat') hb = Math.max(hb, e.t || 0);
        if (e.event === 'play_start') runs++;
        if (e.event === 'game_over') { gameOvers++; if (typeof e.dur_s === 'number') runDurs.push(e.dur_s); }
        if (e.event === 'near_miss') nearMisses++;
        if (e.event === 'd1_return') d1.add(e.vid);
        if (e.event === 'restart_latency') {
          restartCount++; restartMs.push(e.ms);
          if (e.ms < 800) fastRestarts++;
          (e.after_near_miss ? restartAfterNM : restartClean).push(e.ms);
        }
        if (e.event === 'session_end') { if (e.span_s) sessionLens.push(e.span_s); }
        if (e.event === 'share' || e.event === 'outbound_share') shares++;
        if (e.event === 'challenge_landed') daresLanded++;
        if (e.event === 'challenge_beaten') daresBeaten++;
      }
      if (hb) sessionLens.push(hb);
      if (runs) runsPerSession.push(runs);
    }

    const medSession = median(sessionLens), medRestart = median(restartMs);
    const nmPull = restartAfterNM.length && restartClean.length
      ? clamp01((median(restartClean) - median(restartAfterNM)) / Math.max(1, median(restartClean)))
      : 0;

    const pleasure = Math.round(100 * clamp01(
      0.45 * clamp01(medSession / 150) +
      0.35 * clamp01(median(runsPerSession) / 4) +
      0.20 * clamp01(median(runDurs) / 45)));
    const dopamine = Math.round(100 * clamp01(
      0.40 * clamp01(1 - medRestart / 5000) +
      0.35 * clamp01(restartCount ? fastRestarts / restartCount : 0) +
      0.25 * nmPull));
    const nVisitors = visitors.size || 1;
    const repeatShare = Object.values(visitsByVid).filter((v) => v > 1).length / nVisitors;
    const lateShare = lateEvents.length ? lateEvents.filter(Boolean).length / lateEvents.length : 0;
    const addiction = Math.round(100 * clamp01(
      0.40 * clamp01((d1.size / nVisitors) / 0.25) +
      0.30 * clamp01(repeatShare / 0.5) +
      0.30 * clamp01(lateShare / 0.35)));

    out.push({
      game, variant,
      indices: { pleasure, dopamine, addiction },
      raw: {
        sessions: Object.keys(bySid).length, visitors: nVisitors, runs: runsPerSession.reduce((a, b) => a + b, 0),
        med_session_s: +medSession.toFixed(1), med_runs_per_session: median(runsPerSession),
        med_restart_ms: Math.round(medRestart), fast_restart_share: restartCount ? +(fastRestarts / restartCount).toFixed(2) : 0,
        near_miss_pull: +nmPull.toFixed(2), near_misses: nearMisses, game_overs: gameOvers,
        d1_rate: +(d1.size / nVisitors).toFixed(3), repeat_visit_share: +repeatShare.toFixed(2), late_night_share: +lateShare.toFixed(2),
        shares: shares, dares_landed: daresLanded, dares_beaten: daresBeaten,
        share_rate: +(shares / Math.max(1, Object.keys(bySid).length)).toFixed(3)
      }
    });
  }
  return out.sort((a, b) => (b.indices.pleasure + b.indices.dopamine) - (a.indices.pleasure + a.indices.dopamine));
}

// Site-wide engagement loop metrics.
export function computeSiteMetrics(events, registry = null, { modes = ['human', 'bot', 'synthetic'] } = {}) {
  const human = events.filter((e) => modes.includes(e.mode));

  // ---- visitors & visits ----
  // Visit key: vsid when available (real cross-page visits), else sid+game to
  // avoid artifacts from synthetic cohorts that reused sids across runs.
  const byVid = {};
  const byVsid = {};
  for (const e of human) {
    const id = e.vid || e.vsid || e.sid;
    if (!byVid[id]) byVid[id] = { first: e.ts, last: e.ts, vsids: new Set(), games: new Set(), pageTypes: new Set(), late: false, events: 0 };
    byVid[id].last = Math.max(byVid[id].last, e.ts);
    byVid[id].first = Math.min(byVid[id].first, e.ts);
    if (e.vsid) byVid[id].vsids.add(e.vsid);
    byVid[id].pageTypes.add(e.page_type);
    byVid[id].events++;
    if (e.late_night) byVid[id].late = true;

    const vsid = e.vsid || (e.sid ? `${e.sid}:${e.game || 'unknown'}` : 'no-session');
    if (!byVsid[vsid]) byVsid[vsid] = { vid: e.vid, start: e.ts, end: e.ts, games: new Set(), pageTypes: new Set(), play_s: 0, browse_s: 0, late: false, d1: false, d7: false, d30: false };
    const v = byVsid[vsid];
    v.start = Math.min(v.start, e.ts);
    v.end = Math.max(v.end, e.ts);
    if (e.game && e.game !== 'unknown') v.games.add(e.game);
    v.pageTypes.add(e.page_type);
    if (e.late_night) v.late = true;
  }

  // ---- visits ----
  const visits = Object.values(byVsid);
  for (const v of visits) {
    // attribution from return events
  }

  // ---- attention per visit ----
  for (const e of human) {
    const vsid = e.vsid || (e.sid ? `${e.sid}:${e.game || 'unknown'}` : 'no-session');
    const v = byVsid[vsid];
    if (!v) continue;
    if (e.event === 'session_end' && typeof e.play_s === 'number') v.play_s += e.play_s;
    if (e.event === 'browse_end' && typeof e.browse_s === 'number') v.browse_s += e.browse_s;
    // fallback: heartbeat max gives session length when session_end wasn't captured
    if (e.event === 'session_heartbeat' && typeof e.t === 'number') v.play_s = Math.max(v.play_s, e.t);
    if (e.event === 'd1_return') v.d1 = true;
    if (e.event === 'd7_return') v.d7 = true;
    if (e.event === 'd30_return') v.d30 = true;
  }

  const attentionSeconds = visits.reduce((s, v) => s + v.play_s + v.browse_s, 0);
  const attentionPerVisit = visits.length ? attentionSeconds / visits.length : 0;
  const gamesTriedPerVisit = visits.map((v) => v.games.size);
  const playVisits = visits.filter((v) => v.play_s > 0);
  const bounceVisits = visits.filter((v) => !v.pageTypes.has('game') && v.play_s === 0);

  // ---- TAY by day ----
  const byDay = {};
  for (const v of visits) {
    const d = dayOf(v.start);
    byDay[d] ||= { attention_s: 0, visits: 0, visitors: new Set() };
    byDay[d].attention_s += v.play_s + v.browse_s;
    byDay[d].visits++;
    byDay[d].visitors.add(v.vid);
  }
  const taySeries = Object.entries(byDay).sort().map(([day, o]) => ({ day, attention_min: +(o.attention_s / 60).toFixed(1), visits: o.visits, visitors: o.visitors.size }));
  const totalAttentionMin = attentionSeconds / 60;

  // ---- engine balance ----
  let viralAttention = 0, calmAttention = 0;
  const gameEngine = {};
  if (registry && registry.games) {
    for (const g of registry.games) gameEngine[g.id] = g.engine;
  }
  for (const v of visits) {
    for (const gid of v.games) {
      const engine = gameEngine[gid] || 'viral';
      // approximate: split play_s evenly across games tried in visit
      const share = v.play_s / Math.max(1, v.games.size);
      if (engine === 'calm') calmAttention += share; else viralAttention += share;
    }
  }

  // ---- category filter usage ----
  const filterEvents = human.filter((e) => e.event === 'category_switch');
  const filterUsers = new Set(filterEvents.map((e) => e.vid));

  // ---- clip engagement ----
  const clipStarts = human.filter((e) => e.event === 'clip_play_start').length;
  const clip50 = human.filter((e) => e.event === 'clip_play_50pct').length;

  return {
    north_star: {
      total_attention_min: +totalAttentionMin.toFixed(1),
      attention_per_visit_s: +attentionPerVisit.toFixed(1),
      attention_per_visitor_s: visits.length ? +(attentionSeconds / Object.keys(byVid).length).toFixed(1) : 0,
      tay_series: taySeries
    },
    visitors: {
      total: Object.keys(byVid).length,
      visits: visits.length,
      visits_per_visitor: Object.keys(byVid).length ? visits.length / Object.keys(byVid).length : 0,
      return_rate: computeReturnRate(human),
      late_night_share: visits.length ? visits.filter((v) => v.late).length / visits.length : 0
    },
    discovery: {
      games_tried_per_visit: {
        mean: +mean(gamesTriedPerVisit).toFixed(2),
        median: median(gamesTriedPerVisit),
        p75: percentile(gamesTriedPerVisit, 0.75)
      },
      filter_usage: filterEvents.length ? +(filterUsers.size / Object.keys(byVid).length).toFixed(2) : 0,
      filter_events: filterEvents.length,
      clip_play_start: clipStarts,
      clip_play_50pct: clip50
    },
    funnel: {
      site_bounce_rate: visits.length ? bounceVisits.length / visits.length : 0,
      play_visit_rate: visits.length ? playVisits.length / visits.length : 0,
      hub_to_play_conversion: computeHubToPlayConversion(human),
      card_tap_to_play: computeCardTapToPlay(human)
    },
    engine_balance: {
      viral_attention_s: +viralAttention.toFixed(1),
      calm_attention_s: +calmAttention.toFixed(1),
      viral_share: viralAttention + calmAttention ? +(viralAttention / (viralAttention + calmAttention)).toFixed(2) : 0
    },
    retention: computeRetentionCohorts(human)
  };
}

function computeReturnRate(events) {
  const byVid = {};
  for (const e of events) {
    if (!byVid[e.vid]) byVid[e.vid] = { visits: 0, d1: false, d7: false, d30: false };
    if (e.event === 'visit_start') byVid[e.vid].visits++;
    if (e.event === 'd1_return') byVid[e.vid].d1 = true;
    if (e.event === 'd7_return') byVid[e.vid].d7 = true;
    if (e.event === 'd30_return') byVid[e.vid].d30 = true;
  }
  const vids = Object.values(byVid);
  if (!vids.length) return { d1: 0, d7: 0, d30: 0, repeat_share: 0 };
  return {
    d1: +(vids.filter((v) => v.d1).length / vids.length).toFixed(3),
    d7: +(vids.filter((v) => v.d7).length / vids.length).toFixed(3),
    d30: +(vids.filter((v) => v.d30).length / vids.length).toFixed(3),
    repeat_share: +(vids.filter((v) => v.visits > 1).length / vids.length).toFixed(3)
  };
}

function computeHubToPlayConversion(events) {
  const hubVids = new Set(events.filter((e) => e.event === 'hub_land').map((e) => `${e.vid}::${e.vsid}`));
  const played = new Set(events.filter((e) => e.event === 'play_start').map((e) => `${e.vid}::${e.vsid}`));
  if (!hubVids.size) return 0;
  let converted = 0;
  for (const id of hubVids) if (played.has(id)) converted++;
  return +(converted / hubVids.size).toFixed(3);
}

function computeCardTapToPlay(events) {
  const tapped = new Set(events.filter((e) => e.event === 'card_tapped').map((e) => `${e.vid}::${e.vsid}`));
  const played = new Set(events.filter((e) => e.event === 'play_start').map((e) => `${e.vid}::${e.vsid}`));
  if (!tapped.size) return 0;
  let converted = 0;
  for (const id of tapped) if (played.has(id)) converted++;
  return +(converted / tapped.size).toFixed(3);
}

export function computeRetentionCohorts(events) {
  return computeReturnRate(events);
}

// Distribution metrics: how clips perform and which angles work.
export function computeDistributionMetrics(events, registry = null) {
  const human = events.filter((e) => e.mode === 'human');

  // by platform
  const platformStats = {};
  for (const e of human) {
    const platform = e.src ? e.src.replace(/^referrer:/, '').split('.')[0] : 'direct';
    platformStats[platform] ||= { landings: new Set(), plays: new Set(), attention_s: 0 };
    if (e.event === 'clip_landed') platformStats[platform].landings.add(e.vid);
    if (e.event === 'play_start') platformStats[platform].plays.add(e.vid);
    if (e.event === 'session_end' && typeof e.play_s === 'number') platformStats[platform].attention_s += e.play_s;
  }

  // by trick (need registry)
  const trickStats = {};
  const gameTrick = {};
  if (registry && registry.games) {
    for (const g of registry.games) gameTrick[g.id] = g.trick || g.tagline || 'unknown';
  }
  for (const e of human) {
    const trick = gameTrick[e.game] || 'unknown';
    trickStats[trick] ||= { landings: new Set(), plays: new Set(), attention_s: 0, shares: 0 };
    if (e.event === 'clip_landed') trickStats[trick].landings.add(e.vid);
    if (e.event === 'play_start') trickStats[trick].plays.add(e.vid);
    if (e.event === 'session_end' && typeof e.play_s === 'number') trickStats[trick].attention_s += e.play_s;
    if (e.event === 'share' || e.event === 'outbound_share') trickStats[trick].shares++;
  }

  const toArr = (stats) => Object.entries(stats).map(([key, o]) => ({
    key,
    landings: o.landings.size,
    plays: o.plays.size,
    play_rate: o.landings.size ? +(o.plays.size / o.landings.size).toFixed(3) : 0,
    attention_min: +(o.attention_s / 60).toFixed(1),
    shares: o.shares || 0
  })).sort((a, b) => b.attention_min - a.attention_min);

  return {
    by_platform: toArr(platformStats),
    by_trick: toArr(trickStats)
  };
}

// Full per-game report (the four bars + indices + funnel + behavioral details).
export function computeGameReport(events, gameId, registryEntry = null, { modes = ['human', 'bot', 'synthetic'] } = {}) {
  const evs = events.filter((e) => e.game === gameId);
  const human = evs.filter((e) => modes.includes(e.mode));

  const landers = new Set(human.filter((e) => e.event === 'clip_landed').map((e) => e.vid));
  const players = new Set(human.filter((e) => e.event === 'play_start').map((e) => e.vid));
  const d1 = new Set(human.filter((e) => e.event === 'd1_return').map((e) => e.vid));

  const bySid = {};
  for (const e of human) (bySid[e.sid] ||= []).push(e);

  const sessionLens = [], runsPerSession = [], runDurs = [], scores = [];
  const restartMs = [], restartAfterNM = [], restartClean = [];
  let fastRestarts = 0, restartCount = 0, nearMisses = 0, gameOvers = 0, shares = 0, daresLanded = 0, daresBeaten = 0;
  const stages = {};

  for (const ses of Object.values(bySid)) {
    let hb = 0, runs = 0;
    for (const e of ses) {
      if (e.event === 'session_heartbeat') hb = Math.max(hb, e.t || 0);
      if (e.event === 'play_start') runs++;
      if (e.event === 'game_over') {
        gameOvers++;
        if (typeof e.dur_s === 'number') runDurs.push(e.dur_s);
        if (typeof e.score === 'number') scores.push(e.score);
        if (e.stage) stages[e.stage] = (stages[e.stage] || 0) + 1;
      }
      if (e.event === 'near_miss') nearMisses++;
      if (e.event === 'restart_latency') {
        restartCount++; restartMs.push(e.ms);
        if (e.ms < 800) fastRestarts++;
        (e.after_near_miss ? restartAfterNM : restartClean).push(e.ms);
      }
      if (e.event === 'session_end' && e.span_s) sessionLens.push(e.span_s);
      if (e.event === 'share' || e.event === 'outbound_share') shares++;
      if (e.event === 'challenge_landed') daresLanded++;
      if (e.event === 'challenge_beaten') daresBeaten++;
    }
    if (hb) sessionLens.push(hb);
    if (runs) runsPerSession.push(runs);
  }

  const medSession = median(sessionLens);
  const medRestart = median(restartMs);
  const nmPull = restartAfterNM.length && restartClean.length
    ? clamp01((median(restartClean) - median(restartAfterNM)) / Math.max(1, median(restartClean)))
    : 0;

  const nLanders = landers.size || 1;
  return {
    game: gameId,
    meta: registryEntry || null,
    bars: {
      play_rate: +(players.size / nLanders).toFixed(3),
      avg_session_s: +medSession.toFixed(1),
      d1_retention: +(d1.size / nLanders).toFixed(3),
      clip_ctr: null // needs external impression data
    },
    indices: {
      pleasure: Math.round(100 * clamp01(0.45 * clamp01(medSession / 150) + 0.35 * clamp01(median(runsPerSession) / 4) + 0.20 * clamp01(median(runDurs) / 45))),
      dopamine: Math.round(100 * clamp01(0.40 * clamp01(1 - medRestart / 5000) + 0.35 * clamp01(restartCount ? fastRestarts / restartCount : 0) + 0.25 * nmPull)),
      addiction: Math.round(100 * clamp01(0.40 * clamp01((d1.size / nLanders) / 0.25) + 0.30 * clamp01(0) + 0.30 * clamp01(0)))
    },
    behavioral: {
      sessions: Object.keys(bySid).length,
      visitors: nLanders,
      runs: runsPerSession.reduce((a, b) => a + b, 0),
      med_runs_per_session: median(runsPerSession),
      med_run_dur_s: median(runDurs),
      score_p50: median(scores),
      score_p95: percentile(scores, 0.95),
      med_restart_ms: Math.round(medRestart),
      fast_restart_share: restartCount ? +(fastRestarts / restartCount).toFixed(2) : 0,
      near_miss_pull: +nmPull.toFixed(2),
      near_misses: nearMisses,
      shares: shares,
      dares_landed: daresLanded,
      dares_beaten: daresBeaten,
      death_stages: stages
    }
  };
}

// Catalog health: which games clear the bars and which should be suspended.
export function computeCatalogHealth(events, registry, config, { modes = ['human', 'bot', 'synthetic'] } = {}) {
  const bars = config.bars || { play_rate: 0.12, avg_session_s: 150, d1_retention: 0.18, clip_ctr: 0.06 };
  const minSessions = 10; // don't grade until we have enough signal
  const reports = (registry.games || []).map((g) => computeGameReport(events, g.id, g, { modes }));
  const graded = reports.map((r) => {
    if (r.behavioral.sessions < minSessions) return { ...r, grade: 'insufficient', checks: [], passed: 0, insufficient_reason: `${r.behavioral.sessions} sessions` };
    const checks = [
      { metric: 'play_rate', pass: r.bars.play_rate >= bars.play_rate },
      { metric: 'avg_session_s', pass: r.bars.avg_session_s >= bars.avg_session_s },
      { metric: 'd1_retention', pass: r.bars.d1_retention >= bars.d1_retention }
      // clip_ctr omitted until real clip impressions exist
    ];
    const passed = checks.filter((c) => c.pass).length;
    return { ...r, grade: passed >= 3 ? 'winner' : passed >= 2 ? 'watch' : 'suspend', checks, passed };
  });
  const gradable = graded.filter((g) => g.grade !== 'insufficient');
  return {
    total: graded.length,
    insufficient: graded.filter((g) => g.grade === 'insufficient').length,
    winners: graded.filter((g) => g.grade === 'winner').length,
    watch: graded.filter((g) => g.grade === 'watch').length,
    suspend: graded.filter((g) => g.grade === 'suspend').length,
    catalog_vitality: gradable.length ? +(gradable.filter((g) => g.grade === 'winner').length / gradable.length).toFixed(2) : 0,
    top: gradable.slice().sort((a, b) => (b.indices.pleasure + b.indices.dopamine) - (a.indices.pleasure + a.indices.dopamine)).slice(0, 10),
    bottom: gradable.slice().sort((a, b) => (a.indices.pleasure + a.indices.dopamine) - (b.indices.pleasure + b.indices.dopamine)).slice(0, 10)
  };
}
