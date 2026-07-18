// LOOP behavioral metrics — pleasure / dopamine / addiction indices per
// (game, variant), computed from the event stream. These are PROXIES built
// from observable behavior, documented so they can be argued with:
//
//   PLEASURE  — do sessions feel good enough to stay? session length,
//               runs/session, avg run duration.
//   DOPAMINE  — how hard does the "one more" reflex fire? restart latency
//               (median, share <800ms), and whether near-miss deaths restart
//               FASTER than clean deaths (the slot-machine signature).
//   ADDICTION — compulsive return: d1 rate, repeat visits, late-night share.
//               Two-engine thesis measurable: calm games should score HIGH
//               pleasure + LOW addiction; viral wants all three high.
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
        if (e.event === 'share') shares++;
        if (e.event === 'challenge_landed') daresLanded++;
        if (e.event === 'challenge_beaten') daresBeaten++;
      }
      if (hb) sessionLens.push(hb);
      if (runs) runsPerSession.push(runs);
    }

    const medSession = median(sessionLens), medRestart = median(restartMs);
    const nmPull = restartAfterNM.length && restartClean.length
      ? clamp01((median(restartClean) - median(restartAfterNM)) / Math.max(1, median(restartClean)))
      : 0; // near-miss deaths restarting faster than clean deaths = slot-machine pull

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
