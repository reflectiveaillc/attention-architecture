/* LOOP event layer v3 — site-wide engagement loop + per-game behavioral analytics.
 *
 * Contexts: index (home), hub (/g/<id>.html), game (/games/<id>/), variant.
 * Games just emit their moments (play_start, game_over, near_miss, restart); this
 * layer auto-derives the dopamine/pleasure/addiction proxies and the site-wide
 * funnel events.
 *
 * Auto-derived:
 *   restart_latency {ms}    game_over → next play_start/restart gap
 *   session_end {...}       tab-hide summary
 *   browse_end {...}          page-hide summary for index/hub
 *   game_result {...}         standardized summary of a completed run
 *   difficulty_spike          3 fast deaths signal tuning problem
 *   calm_moment               idle after completion (calm-engine wind-down)
 *   clip_play_start / 50pct   hook-video engagement
 *
 * Site funnel:
 *   browse_start {page_type}  index | hub | game
 *   browse_impression         card seen in viewport
 *   card_tapped               index → hub
 *   hub_land                  hub → play intent
 *   category_switch           filter chip used
 *   play_source               hub | dare | share | direct | back
 *   outbound_share {channel}  native share sheet or clipboard
 *
 * Identity:
 *   vid  — visitor id (localStorage), persists until cache clear
 *   vsid — visit session id (sessionStorage), one per tab visit
 *   sid  — page session id, kept for backward compatibility with per-game metrics
 *
 * A/B: ?v=<variant> (or window.LOOP_VARIANT) tags every event; 'base' default.
 * Sink: ?sink=<url> → sendBeacon; else localStorage buffer. PostHog mirror OFF
 * by default (window.LOOP_POSTHOG). Nothing leaves the device unconfigured.
 */
(function () {
  var qs = new URLSearchParams(location.search);
  var cfg = window.LOOP_ANALYTICS || {};
  var sink = qs.get('sink') || window.LOOP_SINK || cfg.sink || null;
  var clipId = qs.get('clip') || null;
  var meta = window.LOOP_GAME_META || {};
  var gameId = meta.id || window.LOOP_GAME || 'unknown';
  var src = qs.get('src') || (document.referrer ? 'referrer:' + document.referrer : 'direct');
  var mode = qs.get('demo') ? 'demo' : qs.get('bot') ? 'bot' : 'human';
  var variant = qs.get('v') || window.LOOP_VARIANT || 'base';
  var dare = qs.get('dare') ? parseFloat(qs.get('dare')) : null;

  // ---- page context ----
  var path = location.pathname.replace(/\/$/, '');
  var pageType = 'game';
  if (path.indexOf('/games/') !== -1) pageType = 'game';
  else if (path.indexOf('/g/') !== -1) pageType = 'hub';
  else if (path === '' || path.endsWith('index.html') || path.split('/').pop() === 'site') pageType = 'index';

  // ---- identity ----
  var vid = null;
  try {
    vid = localStorage.getItem('loop_vid');
    if (!vid) { vid = 'v-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('loop_vid', vid); }
  } catch (_) { vid = 'v-ephemeral'; }
  if (mode !== 'human') vid = mode + '-' + Math.random().toString(36).slice(2, 10);

  var vsid = null;
  try {
    vsid = sessionStorage.getItem('loop_vsid');
    if (!vsid) {
      vsid = 'vs-' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('loop_vsid', vsid);
    }
  } catch (_) { vsid = 'vs-ephemeral'; }

  var sid = 's-' + Math.random().toString(36).slice(2, 10);
  var buffer = [];

  // ---- visit meta ----
  var visitN = 1, hour = new Date().getHours();
  try {
    visitN = (+localStorage.getItem('loop_visits') || 0) + 1;
    localStorage.setItem('loop_visits', String(visitN));
  } catch (_) {}
  var lateNight = hour >= 23 || hour < 5;

  // ---- session accumulators ----
  var S = {
    runs: 0, play_s: 0, best: 0, fast_restarts: 0, near_misses: 0,
    t0: Date.now(), lastGameOver: 0, lastDeathHadNearMiss: false, runNearMiss: false,
    browse_t0: Date.now(), browse_maxScroll: 0,
    gameOvers: [], // recent dur_s for difficulty-spike detection
    deathTs: [],   // recent death timestamps for rage-quit detection
    lastComplete: 0, calmNoted: false,
    journey: []    // one emoji per run this session: 🟥 fail · 🟧 near-miss · 🟩 personal record
  };
  // spoiler-free session story for the share artifact (Wordle-grid mechanic)
  window.LOOP_JOURNEY = function () { return S.journey.slice(-10); };

  // Single transport decision point. PostHog SDK is primary (rich sessions,
  // persons, autocapture); the /api/collect sink is a FALLBACK for when the
  // SDK is blocked or not yet loaded — never both, so events count once.
  function send(e) {
    var ph = window.LOOP_POSTHOG || (window.posthog && window.posthog.capture ? window.posthog : null);
    if (ph) {
      try {
        var ev = Object.assign({}, e);
        delete ev.ts; // PostHog sets its own timestamp
        ph.capture(e.event, ev);
        return;
      } catch (_) {}
    }
    if (sink) { try { navigator.sendBeacon(sink, JSON.stringify(e)); } catch (_) {} }
    else {
      buffer.push(e);
      try { localStorage.setItem('loop_events', JSON.stringify(buffer.slice(-500))); } catch (_) {}
    }
  }

  // ---- core emit ----
  var firstPlaySource = null;
  function baseProps() {
    return {
      game: gameId, variant: variant, mode: mode,
      clip_id: clipId, src: src, visit_n: visitN, hour: hour, late_night: lateNight,
      page_type: pageType,
      circuits: meta.circuits || [],
      features: meta.features || {},
      trick: meta.trick || '',
      variant_hypothesis: window.LOOP_VARIANT_HYPOTHESIS || ''
    };
  }

  var tapNoted = false;
  function noteFirstTap() {
    if (tapNoted) return;
    tapNoted = true;
    emit('first_tap');
  }
  window.addEventListener('pointerdown', noteFirstTap, { once: true, passive: true });
  window.addEventListener('keydown', noteFirstTap, { once: true, passive: true });

  function emit(event, props) {
    var e = Object.assign({
      event: event, ts: Date.now(), vid: vid, vsid: vsid, sid: sid
    }, baseProps(), props || {});

    // auto-derived dopamine/pleasure signals
    if (event === 'play_start' || event === 'restart') {
      if (!firstPlaySource) {
        firstPlaySource = dare ? 'dare' : (src && src.indexOf('/g/') !== -1 ? 'hub' : 'direct');
        send(Object.assign({}, e, { event: 'play_source', source: firstPlaySource, dare: dare }));
      }
      if (S.lastGameOver) {
        var ms = Date.now() - S.lastGameOver;
        if (ms < 60000) {
          if (ms < 800) S.fast_restarts++;
          send(Object.assign({}, e, { event: 'restart_latency', ms: ms, after_near_miss: S.lastDeathHadNearMiss }));
          if (ms < 1000) send(Object.assign({}, e, { event: 'compulsive_return', ms: ms }));
        }
        S.lastGameOver = 0;
      }
      if (event === 'play_start') {
        S.runs++; S.runNearMiss = false;
        resetEarlyQuit();
        earlyQuitTimer = setTimeout(function () {
          earlyQuitTimer = 0;
          emit('early_quit', { after_s: 10 });
        }, 10000);
      }
    }
    if (event === 'near_miss') { S.near_misses++; S.runNearMiss = true; }
    if (event === 'game_over') {
      resetEarlyQuit();
      S.lastGameOver = Date.now();
      S.lastDeathHadNearMiss = S.runNearMiss;
      // journey: record this run's story (PR beats near-miss beats fail);
      // first run is baseline — greens only for beating an earlier run
      var pr2 = typeof e.score === 'number' && S.journey.length > 0 && e.score > S.best;
      S.journey.push(pr2 ? '🟩' : (S.runNearMiss ? '🟧' : '🟥'));
      if (typeof e.dur_s === 'number') {
        S.play_s += e.dur_s;
        S.gameOvers.push(e.dur_s);
        S.deathTs.push(Date.now() / 1000);
        if (S.gameOvers.length > 5) S.gameOvers.shift();
        if (S.deathTs.length > 5) S.deathTs.shift();
        // standardized game result summary
        var engine = window.LOOP_ENGINE || (meta.engine || 'viral');
        var pr = typeof e.score === 'number' && e.score >= S.best;
        send(Object.assign({}, e, {
          event: 'game_result',
          score: e.score, dur_s: e.dur_s, stage: e.stage || null,
          best: S.best, personal_record: pr,
          engine: engine
        }));
        if (pr) {
          var wm = Object.assign({}, e, { event: 'win_moment', score: e.score });
          send(wm);
          fireCircuits('win_moment', wm);
        }
        // difficulty spike: last 3 runs all under 8s or under half median
        if (S.gameOvers.length >= 3) {
          var last3 = S.gameOvers.slice(-3);
          var med = last3.slice().sort(function (a, b) { return a - b; })[1];
          if (last3.every(function (d) { return d < 8 || d < med * 0.5; })) {
            send(Object.assign({}, e, { event: 'difficulty_spike', last_3: last3, median_3: med }));
          }
        }
      }
      if (typeof e.score === 'number' && e.score > S.best) S.best = e.score;
    }

    // circuit activation signals
    fireCircuits(event, e);

    send(e);
  }

  function fireCircuits(event, e) {
    var circuits = meta.circuits || [];
    if (!circuits.length) return;
    var map = {
      'near_miss': ['04-loss', '06-zeigarnik'],
      'share': ['03-social'],
      'outbound_share': ['03-social'],
      'challenge_landed': ['03-social', '06-zeigarnik'],
      'challenge_beaten': ['01-rpe', '03-social'],
      'calm_moment': ['05-ease', '07-timing'],
      'd1_return': ['08-garden', '06-zeigarnik'],
      'd7_return': ['08-garden'],
      'win_moment': ['01-rpe', '03-social']
    };
    var list = map[event];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      if (circuits.indexOf(list[i]) !== -1) {
        send(Object.assign({}, e, { event: 'circuit_fired', circuit: list[i], trigger_event: event }));
      }
    }
  }

  // early-quit detection: play_start with no game_over within 10s
  var earlyQuitTimer = 0;
  function resetEarlyQuit() { if (earlyQuitTimer) clearTimeout(earlyQuitTimer); earlyQuitTimer = 0; }

  // ---- session / browse end ----
  function sessionEnd() {
    var nowTs = Date.now();
    var span = +((nowTs - S.t0) / 1000).toFixed(1);
    var browseS = +((nowTs - S.browse_t0) / 1000).toFixed(1);

    // rage-quit: 3+ deaths within 30s before leaving
    var recentDeaths = S.gameOvers.filter(function (d) { return (nowTs / 1000) - d < 30; });
    var isRage = recentDeaths.length >= 3;

    if (S.runs > 0 || S.play_s > 0) {
      var endProps = {
        runs: S.runs, play_s: +S.play_s.toFixed(1), best: S.best,
        fast_restarts: S.fast_restarts, near_misses: S.near_misses,
        span_s: span, rage_quit: isRage
      };
      if (meta.features && meta.features.engine === 'calm') {
        endProps.calm_exit = true;
        emit('calm_exit', { after_run: S.runs, span_s: span });
      }
      emit('session_end', endProps);
      if (isRage) emit('rage_quit', { deaths_30s: recentDeaths.length });
    }
    if (pageType === 'index' || pageType === 'hub') {
      emit('browse_end', { browse_s: browseS, max_scroll: S.browse_maxScroll });
    }
    S.runs = 0; S.play_s = 0; S.fast_restarts = 0; S.near_misses = 0; S.t0 = nowTs;
    S.browse_t0 = nowTs; S.browse_maxScroll = 0; S.deathTs = []; S.calmNoted = false;
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) sessionEnd(); });
  window.addEventListener('pagehide', sessionEnd);

  // ---- D1 / D7 / D30 return ----
  try {
    var last = +localStorage.getItem('loop_last_visit') || 0;
    var now = Date.now();
    var gap = last ? now - last : 0;
    if (gap > 20 * 3600e3 && gap < 48 * 3600e3) emit('d1_return');
    else if (gap >= 6 * 24 * 3600e3 && gap <= 8 * 24 * 3600e3) emit('d7_return');
    else if (gap >= 27 * 24 * 3600e3 && gap <= 32 * 24 * 3600e3) emit('d30_return');
    localStorage.setItem('loop_last_visit', String(now));
  } catch (_) {}

  // ---- visit start ----
  try {
    var lastVs = sessionStorage.getItem('loop_vs_last');
    if (!lastVs) {
      emit('visit_start');
      sessionStorage.setItem('loop_vs_last', String(Date.now()));
    }
  } catch (_) {}

  // ---- browse start for index/hub/game ----
  emit('browse_start');

  // ---- keyboard → tap shim (school Chromebooks / desktop) ----
  // one-tap games listen for pointerdown; Space/Enter synthesizes one so the
  // whole catalog is keyboard-playable without per-game changes. Progressive:
  // games with native key handling are unaffected (their handler fires first).
  if (pageType === 'game') {
    document.addEventListener('keydown', function (ev) {
      if (ev.code !== 'Space' && ev.code !== 'Enter') return;
      if (ev.repeat) return;
      var a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'BUTTON' || a.isContentEditable)) return;
      ev.preventDefault();
      var target = document.querySelector('canvas') || document.body;
      var r = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
      var opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 999, pointerType: 'touch', isPrimary: true };
      try {
        target.dispatchEvent(new PointerEvent('pointerdown', opts));
        setTimeout(function () {
          try { target.dispatchEvent(new PointerEvent('pointerup', opts)); } catch (_) {}
        }, 60);
      } catch (_) {}
    });
  }

  // ---- clip landed / heartbeat ----
  if (clipId) emit('clip_landed');

  var hb = 0;
  setInterval(function () { hb += 5; emit('session_heartbeat', { t: hb }); }, 5000);

  // ---- index/hub instrumentation (only when not in an iframe/game) ----
  if (pageType === 'index' || pageType === 'hub') {
    // card impressions + taps
    document.addEventListener('click', function (ev) {
      var card = ev.target.closest && ev.target.closest('.card');
      if (card) {
        var href = card.getAttribute('href') || '';
        var cid = extractGameId(href) || (card.querySelector('h2') && card.querySelector('h2').textContent) || 'unknown';
        emit('card_tapped', {
          game: cid,
          engine: card.dataset.engine, category: card.dataset.category, position: cardIndex(card)
        });
      }
      var chip = ev.target.closest && ev.target.closest('nav button');
      if (chip && chip.dataset && (chip.dataset.t || chip.dataset.v)) {
        emit('category_switch', { filter_type: chip.dataset.t, filter_value: chip.dataset.v });
      }
    });

    // scroll depth
    var depthMarks = { 25: false, 50: false, 75: false, 100: false };
    window.addEventListener('scroll', function () {
      var y = window.scrollY || window.pageYOffset || 0;
      S.browse_maxScroll = Math.max(S.browse_maxScroll, y);
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      if (!docH) return;
      var pct = Math.round((y / docH) * 100);
      for (var k in depthMarks) {
        if (!depthMarks[k] && pct >= +k) {
          depthMarks[k] = true;
          emit('scroll_' + k, { depth_pct: pct });
        }
      }
    }, { passive: true });

    // video engagement on hook clips
    function trackVideo(v) {
      var started = false, half = false;
      v.addEventListener('play', function () {
        if (started) return;
        started = true;
        var cg = clipGameFromSrc(v.dataset.src || v.src || '');
        emit('clip_play_start', { game: cg, video_src: v.dataset.src || v.src || '' });
      });
      v.addEventListener('timeupdate', function () {
        if (half) return;
        if (v.duration && v.currentTime / v.duration >= 0.5) {
          half = true;
          var cg = clipGameFromSrc(v.dataset.src || v.src || '');
          emit('clip_play_50pct', { game: cg, video_src: v.dataset.src || v.src || '' });
        }
      });
    }
    function clipGameFromSrc(src) {
      if (!src) return 'unknown';
      var m = src.match(/clips\/([a-z0-9-]+)-hook/);
      return m ? m[1] : 'unknown';
    }
    document.querySelectorAll('video.clip, video').forEach(trackVideo);

    // browse impressions on cards (IntersectionObserver)
    if ('IntersectionObserver' in window) {
      var seen = new Set();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var card = en.target.closest('.card');
          if (!en.isIntersecting || !card || seen.has(card)) return;
          seen.add(card);
          var href = card.getAttribute('href') || '';
          var cid = extractGameId(href) || 'unknown';
          emit('browse_impression', {
            game: cid,
            engine: card.dataset.engine, category: card.dataset.category, position: cardIndex(card)
          });
        });
      }, { rootMargin: '0px', threshold: 0.5 });
      document.querySelectorAll('.card').forEach(function (c) { io.observe(c); });
    }

    // hub land (if we are on a hub page)
    if (pageType === 'hub') {
      emit('hub_land');
    }
  }

  function extractGameId(hrefOrPath) {
    if (!hrefOrPath) return null;
    var m = hrefOrPath.match(/[/\\]g(?:ames)?[/\\]([a-z0-9-]+)/);
    if (!m) m = hrefOrPath.match(/[/\\]g\/([a-z0-9-]+)\.html/);
    return m ? m[1].replace(/\.html$/, '') : null;
  }

  function cardIndex(card) {
    var all = document.querySelectorAll('.card');
    for (var i = 0; i < all.length; i++) if (all[i] === card) return i;
    return -1;
  }

  // ---- calm-moment detection (calm games) ----
  if (pageType === 'game' && meta.engine === 'calm') {
    setInterval(function () {
      if (S.lastGameOver && !S.calmNoted && Date.now() - S.lastGameOver > 5000 && S.runs > 0) {
        S.calmNoted = true;
        emit('calm_moment', { after_run: S.runs });
      }
    }, 1000);
  }

  // ---- deterministic variant assignment (mirrors engine/lib/experiment.mjs) ----
  function assignVariant(vid, gameId, variants, seed) {
    if (!variants || !variants.length) return 'base';
    var live = [];
    for (var i = 0; i < variants.length; i++) if (!variants[i].status || variants[i].status === 'live' || variants[i].status === 'testing') live.push(variants[i]);
    if (!live.length) return 'base';
    var s = hashString((seed || '') + '::' + vid + '::' + gameId);
    return live[s % live.length].id;
  }
  function hashString(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return Math.abs(h);
  }

  // ---- PostHog identity + super properties ----
  function wirePostHog() {
    var ph = window.posthog;
    if (!ph || !ph.identify) return;
    try {
      ph.identify(vid);
      ph.register({
        visit_n: visitN,
        mode: mode,
        clip_id: clipId,
        src: src,
        late_night: lateNight,
        game_count: typeof window.LOOP_GAME_COUNT === 'number' ? window.LOOP_GAME_COUNT : 383,
        site_domain: location.hostname,
        game: gameId,
        engine: meta.engine || 'unknown',
        variant: variant,
        features: meta.features || {}
      });
      if (variant && variant !== 'base' && window.LOOP_VARIANT_HYPOTHESIS) {
        ph.capture('$experiment_started', {
          experiment_id: gameId,
          variant_id: variant,
          hypothesis: window.LOOP_VARIANT_HYPOTHESIS
        });
      }
    } catch (_) {}
  }

  // ---- public API ----
  window.LOOP = {
    emit: emit,
    mode: mode,
    vid: vid,
    vsid: vsid,
    sid: sid,
    variant: variant,
    pageType: pageType,
    setCalm: function () { window.LOOP_CALM = true; },
    assignVariant: assignVariant
  };

  // ---- load shared analytics (Vercel Web Analytics + Hotjar + PostHog) on every page ----
  (function () {
    var s = document.createElement('script');
    s.src = '/js/analytics.js';
    s.async = true;
    document.head.appendChild(s);
  })();

  // Hook into PostHog when it finishes loading
  document.addEventListener('loop_posthog_ready', wirePostHog);
  if (window.posthog && window.posthog.identify) wirePostHog();
})();
