/* LOOP event layer v2 — behavioral analytics for pleasure/dopamine/addiction
 * proxies (docs/game-contract-v2.md).
 *
 * Auto-derived (games just emit their normal events):
 *   restart_latency {ms}   game_over → next play_start/restart gap. THE dopamine
 *                          signature: how fast the "one more" reflex fires.
 *                          after_near_miss flag when the death involved a near-miss.
 *   session_end {...}      on tab-hide: runs, play_s, best, fast_restarts, span_s
 *   visit meta             visit_n, hour, late_night (23:00–04:59) on every event
 * A/B: ?v=<variant> (or window.LOOP_VARIANT) tags every event; 'base' default.
 * Sink: ?sink=<url> → sendBeacon; else localStorage buffer. PostHog mirror OFF
 * by default (window.LOOP_POSTHOG). Nothing leaves the device unconfigured.
 */
(function () {
  var qs = new URLSearchParams(location.search);
  var sink = qs.get('sink') || window.LOOP_SINK || null;
  var clipId = qs.get('clip') || null;
  var src = qs.get('src') || (document.referrer ? 'referrer:' + document.referrer : 'direct');
  var mode = qs.get('demo') ? 'demo' : qs.get('bot') ? 'bot' : 'human';
  var variant = qs.get('v') || window.LOOP_VARIANT || 'base';

  var vid = null;
  try {
    vid = localStorage.getItem('loop_vid');
    if (!vid) { vid = 'v-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('loop_vid', vid); }
  } catch (_) { vid = 'v-ephemeral'; }
  if (mode !== 'human') vid = mode + '-' + Math.random().toString(36).slice(2, 10);

  var sid = 's-' + Math.random().toString(36).slice(2, 10);
  var buffer = [];

  // visit meta
  var visitN = 1, hour = new Date().getHours();
  try {
    visitN = (+localStorage.getItem('loop_visits') || 0) + 1;
    localStorage.setItem('loop_visits', String(visitN));
  } catch (_) {}
  var lateNight = hour >= 23 || hour < 5;

  // session accumulators (for session_end)
  var S = { runs: 0, play_s: 0, best: 0, fast_restarts: 0, near_misses: 0, t0: Date.now(), lastGameOver: 0, lastDeathHadNearMiss: false, runNearMiss: false };

  function send(e) {
    if (sink) { try { navigator.sendBeacon(sink, JSON.stringify(e)); } catch (_) {} }
    else {
      buffer.push(e);
      try { localStorage.setItem('loop_events', JSON.stringify(buffer.slice(-500))); } catch (_) {}
    }
    if (window.LOOP_POSTHOG) { try { window.LOOP_POSTHOG.capture(e.event, e); } catch (_) {} }
  }

  function emit(event, props) {
    var e = Object.assign({
      event: event, ts: Date.now(), vid: vid, sid: sid,
      game: window.LOOP_GAME || 'unknown', variant: variant, mode: mode,
      clip_id: clipId, src: src, visit_n: visitN, hour: hour, late_night: lateNight
    }, props || {});

    // ---- auto-derived dopamine/pleasure signals ----
    if (event === 'play_start' || event === 'restart') {
      if (S.lastGameOver) {
        var ms = Date.now() - S.lastGameOver;
        if (ms < 60000) {
          if (ms < 800) S.fast_restarts++;
          send(Object.assign({}, e, { event: 'restart_latency', ms: ms, after_near_miss: S.lastDeathHadNearMiss }));
        }
        S.lastGameOver = 0;
      }
      if (event === 'play_start') { S.runs++; S.runNearMiss = false; }
    }
    if (event === 'near_miss') { S.near_misses++; S.runNearMiss = true; }
    if (event === 'game_over') {
      S.lastGameOver = Date.now();
      S.lastDeathHadNearMiss = S.runNearMiss;
      if (typeof e.dur_s === 'number') S.play_s += e.dur_s;
      if (typeof e.score === 'number' && e.score > S.best) S.best = e.score;
    }
    send(e);
  }

  function sessionEnd() {
    if (S.runs === 0 && S.play_s === 0) return;
    send({
      event: 'session_end', ts: Date.now(), vid: vid, sid: sid,
      game: window.LOOP_GAME || 'unknown', variant: variant, mode: mode,
      clip_id: clipId, src: src, visit_n: visitN, hour: hour, late_night: lateNight,
      runs: S.runs, play_s: +S.play_s.toFixed(1), best: S.best,
      fast_restarts: S.fast_restarts, near_misses: S.near_misses,
      span_s: +((Date.now() - S.t0) / 1000).toFixed(1)
    });
    S.runs = 0; S.play_s = 0; S.fast_restarts = 0; S.near_misses = 0; S.t0 = Date.now();
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) sessionEnd(); });
  window.addEventListener('pagehide', sessionEnd);

  // D1 return
  try {
    var last = +localStorage.getItem('loop_last_visit') || 0;
    var now = Date.now();
    if (last && now - last > 20 * 3600e3 && now - last < 48 * 3600e3) emit('d1_return');
    localStorage.setItem('loop_last_visit', String(now));
  } catch (_) {}

  if (clipId) emit('clip_landed');

  var hb = 0;
  setInterval(function () { hb += 5; emit('session_heartbeat', { t: hb }); }, 5000);

  window.LOOP = { emit: emit, mode: mode, vid: vid, sid: sid, variant: variant };
})();
