/* LOOP juice layer — synthesized SFX + feel helpers (zero audio files).
 * Social-media-grade feedback: every reward has a sound, tension has a riser,
 * death has a boom. All WebAudio synthesis; unlocked on first gesture (iOS).
 *
 * Games call SEMANTIC hooks:
 *   J.hit(combo)      reward pop, pitch climbs with combo (the dopamine ladder)
 *   J.perfect(streak) brighter chime ladder
 *   J.gold()          two-note sparkle
 *   J.near()          tense whoosh (near-miss)
 *   J.tension(x)      0..1 — riser drone intensity (stakes rising)
 *   J.death(mag)      boom + downward gliss; mag 0..1 scales it
 *   J.fanfare()       new-best / big payoff
 *   J.tick()          tiny UI tick
 *   J.calm(step)      soft bell for calm-engine games (no percussive edge)
 *   J.muted / J.toggleMute()
 * Clips stay silent (Playwright doesn't capture audio; feeds autoplay muted) —
 * this layer is for the PLAY experience.
 */
(function () {
  var ctx = null, master = null, riser = null, riserGain = null;
  var muted = false;
  try { muted = localStorage.getItem('loop_muted') === '1'; } catch (_) {}

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    return true;
  }
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  function env(node, t0, a, peak, d) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function fin(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; } // guard non-finite → default (protects every game from a NaN crash)
  function osc(type, f0, f1, t0, dur, peak, dest) {
    f0 = fin(f0, 440); f1 = fin(f1, 0); peak = fin(peak, 0.3); dur = Math.max(0.01, fin(dur, 0.1));
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    env(g, t0, 0.008, peak, dur);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, peak, hp) {
    var len = Math.ceil(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || 900;
    var g = ctx.createGain(); env(g, t0, 0.004, peak, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }
  // pentatonic ladder — combo climbs it; caps musical, never shrill
  var SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
  function ladderFreq(step) {
    var s = SCALE[Math.min(step, SCALE.length - 1)];
    return 330 * Math.pow(2, s / 12);
  }

  var J = {
    get muted() { return muted; },
    toggleMute: function () {
      muted = !muted;
      try { localStorage.setItem('loop_muted', muted ? '1' : '0'); } catch (_) {}
      if (master) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    hit: function (combo) {
      if (!ensure()) return; var t = ctx.currentTime;
      osc('triangle', ladderFreq(combo || 1), null, t, 0.11, 0.5);
      noise(t, 0.05, 0.18, 2400);
      // variable-ratio auditory reward: ~1 in 8 hits carries an unpredictable
      // extra sparkle — the reward-prediction-error spike lives in the SOUND
      if (Math.random() < 0.125) {
        osc('sine', ladderFreq((combo || 1) + 5), null, t + 0.06, 0.16, 0.32);
        osc('sine', ladderFreq((combo || 1) + 7), null, t + 0.13, 0.2, 0.22);
      }
    },
    perfect: function (streak) {
      if (!ensure()) return; var t = ctx.currentTime;
      osc('sine', ladderFreq((streak || 1) + 2), null, t, 0.16, 0.5);
      osc('sine', ladderFreq((streak || 1) + 4), null, t + 0.07, 0.2, 0.35);
    },
    gold: function () {
      if (!ensure()) return; var t = ctx.currentTime;
      osc('sine', 880, null, t, 0.09, 0.4);
      osc('sine', 1318, null, t + 0.08, 0.18, 0.45);
    },
    near: function () {
      if (!ensure()) return; var t = ctx.currentTime;
      noise(t, 0.16, 0.3, 1200);
      osc('sawtooth', 240, 170, t, 0.16, 0.12);
    },
    tension: function (x) {
      if (!ensure()) return;
      if (!riser) {
        riser = ctx.createOscillator(); riserGain = ctx.createGain();
        var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        riser.type = 'sawtooth'; riser.frequency.value = 55;
        riserGain.gain.value = 0;
        riser.connect(f); f.connect(riserGain); riserGain.connect(master);
        riser.start();
      }
      var v = Math.max(0, Math.min(1, fin(x, 0)));
      riserGain.gain.linearRampToValueAtTime(v * 0.16, ctx.currentTime + 0.15);
      riser.frequency.linearRampToValueAtTime(55 + v * 40, ctx.currentTime + 0.15);
    },
    death: function (mag) {
      if (!ensure()) return; var t = ctx.currentTime, m = Math.max(0.2, Math.min(1, mag || 0.5));
      J.tension(0);
      noise(t, 0.28 * m + 0.12, 0.5 * m, 700);
      osc('sine', 160, 42, t, 0.5, 0.6 * m);
      osc('sawtooth', 420, 60, t + 0.03, 0.4, 0.2 * m);
    },
    fanfare: function () {
      if (!ensure()) return; var t = ctx.currentTime;
      [0, 4, 7, 12].forEach(function (s, i) {
        osc('triangle', 330 * Math.pow(2, s / 12), null, t + i * 0.09, 0.22, 0.4);
      });
    },
    tick: function () {
      if (!ensure()) return;
      noise(ctx.currentTime, 0.025, 0.12, 3200);
    },
    calm: function (step) {
      if (!ensure()) return; var t = ctx.currentTime;
      var f = 262 * Math.pow(2, (SCALE[(step || 0) % 6]) / 12);
      osc('sine', f, null, t, 0.9, 0.22);
      osc('sine', f * 2, null, t, 0.5, 0.06);
    }
  };
  window.J = J;
})();
