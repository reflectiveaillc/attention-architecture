/* LOOP face-control — ONE shared, proven face-detection module for every Tilt
 * face game. Games stay thin: call FC.start() on a user gesture, FC.update(now)
 * each frame, then read FC.sig.<signal> (all self-calibrated 0..1, tilt -1..1).
 * Handles: secure-context check (mobile needs https), MediaPipe load, per-frame
 * detect, self-calibration, the webcam PiP draw, and MediaRecorder recording.
 *
 * Signals (from MediaPipe FaceLandmarker 468 landmarks + blendshapes):
 *   mouthOpen  browRaise  smile  blink  cheekPuff  pucker   (0..1, calibrated)
 *   headTilt   (-1 left .. +1 right)
 *
 * Why a shared lib: every per-game hand-written detector had wrong landmark
 * indices / thresholds and only flappy-face worked. This fixes all of them at once.
 */
(function () {
  var V = document.createElement('video');
  V.autoplay = true; V.playsInline = true; V.muted = true; V.style.display = 'none';
  document.body.appendChild(V);

  var landmarker = null, lastVT = -1;
  // Robust calibration: track the resting FLOOR (neutral = minimum) for signals
  // that INCREASE with the expression (mouth, brow, smile, cheek, pucker), and a
  // CEILING (neutral = eyes-open maximum) for blink. The floor drops instantly to
  // new lows but creeps up VERY slowly, so a held expression is NOT absorbed.
  var flo = { mouth: 1, brow: 1, smile: 1, cheek: 1, pucker: 1, roll0: null, yaw0: null, pitch0: null };
  var eyeCeil = 0.001;
  function trackFloor(cur, raw) { return raw < cur ? raw : cur + (raw - cur) * 0.0008; }
  function trackCeil(cur, raw) { return raw > cur ? raw : cur + (raw - cur) * 0.0008; }

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lmY(l, i) { return l[i].y; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  // ---- pulse engine: gesture → discrete tap event ----
  // Runs at video-detect rate on the RAW calibrated signal (no smoothing — EMA
  // attenuates exactly the small/fast gestures we want to catch). Per signal:
  //   base  — adaptive resting baseline (tracks slow drift, frozen mid-gesture)
  //   fire  — while armed, on rel > 0.15 (modest amplitude) OR rel > 0.07 with
  //           fast upward velocity (a small but QUICK gesture counts)
  //   rearm — when the signal falls 45% from its peak (chain gestures without a
  //           full close) or returns near baseline
  var PULSE_SIGS = ['mouthOpen', 'browRaise', 'smile', 'blink', 'cheekPuff', 'pucker'];
  var pd = {};
  PULSE_SIGS.forEach(function (n) { pd[n] = { base: 0, prev: 0, armed: true, peak: 0, queue: 0 }; });
  function stepPulses() {
    for (var i = 0; i < PULSE_SIGS.length; i++) {
      var n = PULSE_SIGS[i], s = pd[n], v = FC.sig[n];
      var vel = v - s.prev; s.prev = v;
      // baseline: adapts at rest, barely moves while gesturing, never absorbs > 0.4
      s.base += (v - s.base) * (v < s.base + 0.06 ? 0.06 : 0.002);
      if (s.base < 0) s.base = 0; if (s.base > 0.4) s.base = 0.4;
      var rel = v - s.base;
      FC.pulse[n] = false;
      if (s.armed) {
        if (rel > 0.15 || (rel > 0.07 && vel > 0.04)) {
          FC.pulse[n] = true; FC.gate[n] = true;
          s.armed = false; s.peak = v;
          if (s.queue < 3) s.queue++;
        }
      } else {
        if (v > s.peak) s.peak = v;
        if (v < s.base + (s.peak - s.base) * 0.45 || rel < 0.05) { s.armed = true; FC.gate[n] = false; }
      }
    }
  }

  var FC = {
    status: 'idle',      // idle | insecure | unsupported | loading | on | blocked | failed
    ready: false,        // model loaded
    faceSeen: false,
    video: V,
    sig: { mouthOpen: 0, browRaise: 0, smile: 0, blink: 0, cheekPuff: 0, pucker: 0, headTilt: 0, headYaw: 0, headPitch: 0 },
    // Edge-triggered gesture events. A gesture = ONE tap (a 1 in a 1/0 world),
    // fired the moment the signal RISES — no game-side smoothing, no waiting for
    // the release. FC.tap(name) consumes one queued gesture (true once per
    // gesture regardless of game/video frame-rate mismatch). FC.gate[name] is a
    // debounced held-level boolean for hold-style games (smile, cheek puff).
    pulse: { mouthOpen: false, browRaise: false, smile: false, blink: false, cheekPuff: false, pucker: false },
    gate:  { mouthOpen: false, browRaise: false, smile: false, blink: false, cheekPuff: false, pucker: false },

    secure: function () {
      return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    },

    // call on a user gesture (the ALLOW button)
    start: async function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { FC.status = 'unsupported'; return; }
      if (!FC.secure()) { FC.status = 'insecure'; return; }   // mobile over http → camera blocked
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } }, audio: false });
        V.srcObject = stream; await V.play();
        FC.status = 'on';
        await FC._initModel();
      } catch (e) {
        FC.status = (e && e.name === 'NotAllowedError') ? 'blocked' : 'failed';
      }
    },

    _initModel: async function () {
      FC.status = 'loading';
      try {
        var vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/vision_bundle.mjs');
        var files = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/wasm');
        landmarker = await vision.FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'GPU' },
          runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true
        });
        FC.ready = true; FC.status = 'on';
      } catch (err) { console.warn('FC model load failed', err); FC.ready = false; FC.status = 'failed'; }
    },

    update: function (nowMs) {
      if (!FC.ready || !landmarker || V.readyState < 2) return;
      if (V.currentTime === lastVT) return;            // strictly-increasing timestamp
      lastVT = V.currentTime;
      try {
        var res = landmarker.detectForVideo(V, nowMs);
        if (!res || !res.faceLandmarks || !res.faceLandmarks.length) { FC.faceSeen = false; return; }
        FC.faceSeen = true;
        var l = res.faceLandmarks[0];
        var faceH = Math.abs(lmY(l, 10) - lmY(l, 152)) || 0.3;   // brow-top to chin
        var faceW = Math.abs(l[234].x - l[454].x) || 0.3;        // cheek to cheek

        var mouthRaw = Math.abs(lmY(l, 13) - lmY(l, 14)) / faceH;              // inner-lip gap (grows open)
        var browRaw = (lmY(l, 159) - lmY(l, 105)) / faceH;                     // eye-top minus brow (grows raised)
        var smileRaw = dist(l[61], l[291]) / faceW;                            // mouth-corner spread (grows smiling)
        var eyeRaw = (Math.abs(lmY(l, 159) - lmY(l, 145)) + Math.abs(lmY(l, 386) - lmY(l, 374))) / 2 / faceH; // eye openness

        // blendshapes (cheek puff / pucker — reliable, already 0..1)
        var cheekBs = 0, puckerBs = 0, browBs = 0, smileBs = 0, jawBs = 0;
        if (res.faceBlendshapes && res.faceBlendshapes.length) {
          var c = res.faceBlendshapes[0].categories;
          for (var i = 0; i < c.length; i++) {
            var n = c[i].categoryName, sc = c[i].score;
            if (n === 'cheekPuff') cheekBs = sc;
            else if (n === 'mouthPucker') puckerBs = sc;
            else if (n === 'browInnerUp') browBs = Math.max(browBs, sc);
            else if (n === 'browOuterUpLeft' || n === 'browOuterUpRight') browBs = Math.max(browBs, sc);
            else if (n === 'mouthSmileLeft' || n === 'mouthSmileRight') smileBs = Math.max(smileBs, sc);
            else if (n === 'jawOpen') jawBs = sc;
          }
        }

        var roll = Math.atan2(l[263].y - l[33].y, l[263].x - l[33].x);        // head roll (radians)

        // head TURN (yaw) and NOD (pitch) from nose-tip offset vs face center.
        // Screen convention matches the mirrored PiP: turning toward screen-left
        // (your left, in the mirror) → headYaw negative; looking up → headPitch positive.
        var yawRaw = (l[1].x - (l[234].x + l[454].x) / 2) / faceW;
        var pitchRaw = (l[1].y - (lmY(l, 10) + lmY(l, 152)) / 2) / faceH;

        // update floors/ceilings (resist absorbing held expressions)
        flo.mouth = trackFloor(flo.mouth, mouthRaw);
        flo.brow = trackFloor(flo.brow, browRaw);
        flo.smile = trackFloor(flo.smile, smileRaw);
        eyeCeil = trackCeil(eyeCeil, eyeRaw);
        if (flo.roll0 === null) flo.roll0 = roll; else flo.roll0 += (roll - flo.roll0) * (Math.abs(roll - flo.roll0) < 0.06 ? 0.01 : 0.0005);
        if (flo.yaw0 === null) flo.yaw0 = yawRaw; else flo.yaw0 += (yawRaw - flo.yaw0) * (Math.abs(yawRaw - flo.yaw0) < 0.03 ? 0.01 : 0.0005);
        if (flo.pitch0 === null) flo.pitch0 = pitchRaw; else flo.pitch0 += (pitchRaw - flo.pitch0) * (Math.abs(pitchRaw - flo.pitch0) < 0.03 ? 0.01 : 0.0005);

        // signals: landmark delta from neutral floor, blended with the blendshape,
        // scaled so a natural expression reaches ~1. max() with blendshape = robust.
        FC.sig.mouthOpen = clamp01(Math.max((mouthRaw - flo.mouth) / 0.10, jawBs));
        FC.sig.browRaise = clamp01(Math.max((browRaw - flo.brow) / 0.035, browBs));
        FC.sig.smile     = clamp01(Math.max((smileRaw - flo.smile) / 0.07, smileBs * 0.9));
        FC.sig.blink     = clamp01((eyeCeil - eyeRaw) / (eyeCeil * 0.55 + 1e-4));  // eyes closed → 1
        FC.sig.cheekPuff = clamp01(cheekBs * 1.6);
        FC.sig.pucker    = clamp01(puckerBs * 1.3);
        FC.sig.headTilt  = Math.max(-1, Math.min(1, (roll - (flo.roll0 || 0)) * 4.5));
        // mirrored-screen convention: raw image is unmirrored, so negate x-based yaw
        FC.sig.headYaw   = Math.max(-1, Math.min(1, -(yawRaw - (flo.yaw0 || 0)) * 6));
        FC.sig.headPitch = Math.max(-1, Math.min(1, -(pitchRaw - (flo.pitch0 || 0)) * 6));
        stepPulses();
      } catch (_) {}
    },

    tap: function (name) {
      var s = pd[name];
      if (s && s.queue > 0) { s.queue--; return true; }
      return false;
    },

    // test hook: inject signals without a camera and run the pulse engine
    injectSig: function (partial) {
      for (var k in partial) FC.sig[k] = partial[k];
      FC.faceSeen = true;
      stepPulses();
    },

    // draw the webcam (mirrored) into the game canvas so recordings capture the face.
    // active = truthy → red border (the control is firing). barVal 0..1 draws a strip.
    drawPiP: function (cx, x, y, w, h, active, barVal, W2, H2) {
      cx.save();
      cx.strokeStyle = active ? '#e8502e' : 'rgba(255,255,255,0.3)'; cx.lineWidth = active ? 3 : 2;
      cx.beginPath(); cx.roundRect ? cx.roundRect(x, y, w, h, 12) : cx.rect(x, y, w, h); cx.stroke();
      cx.clip();
      if (V.readyState >= 2) { cx.translate(x + w, y); cx.scale(-1, 1); cx.drawImage(V, 0, 0, w, h); }
      else { cx.fillStyle = '#12151d'; cx.fillRect(x, y, w, h); }
      cx.restore();
      if (barVal != null) {
        cx.fillStyle = 'rgba(255,255,255,0.12)'; cx.fillRect(x, y + h + 5, w, 5);
        cx.fillStyle = active ? '#e8502e' : '#2ec5b6'; cx.fillRect(x, y + h + 5, w * clamp01(barVal), 5);
      }
    },

    statusLabel: function () {
      switch (FC.status) {
        case 'insecure': return 'camera needs https://';
        case 'unsupported': return 'camera unsupported';
        case 'blocked': return 'camera blocked — allow & reload';
        case 'failed': return 'no camera — tap/space works';
        case 'loading': return 'loading…';
        case 'on': return FC.faceSeen ? '' : 'show your face';
        default: return 'tap allow';
      }
    },

    // recording → downloads a STANDARD MP4 (H.264) viewable on any phone.
    // Prefer an mp4 mimeType (iOS Safari records mp4 natively). If the browser
    // only records webm (Chrome/Android), transcode webm→mp4 via ffmpeg.wasm so
    // the shared file always plays on iPhone.
    _rec: null, _chunks: [], _mime: '', _onProgress: null,
    _bestMime: function () {
      var cands = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
      for (var i = 0; i < cands.length; i++) { try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch (_) {} }
      return '';
    },
    toggleRecord: function (canvas, filename, onStop, onProgress) {
      if (FC._rec && FC._rec.state === 'recording') { FC._rec.stop(); return false; }
      try {
        var stream = canvas.captureStream(30);
        FC._mime = FC._bestMime();
        FC._onProgress = onProgress || null;
        FC._rec = new MediaRecorder(stream, FC._mime ? { mimeType: FC._mime } : undefined);
        FC._chunks = [];
        FC._rec.ondataavailable = function (e) { if (e.data.size) FC._chunks.push(e.data); };
        FC._rec.onstop = async function () {
          var isMp4 = FC._mime.indexOf('mp4') >= 0;
          var base = (filename || 'tilt-face').replace(/\.(webm|mp4)$/, '');
          var blob = new Blob(FC._chunks, { type: isMp4 ? 'video/mp4' : 'video/webm' });
          if (!isMp4) {
            try { blob = await FC._toMp4(blob); } catch (e) { console.warn('mp4 transcode failed, saving webm', e); }
          }
          var ext = blob.type.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a'); a.href = url; a.download = base + '.' + ext; a.click();
          if (FC._onProgress) FC._onProgress(null);
          if (onStop) onStop();
        };
        FC._rec.start(); return true;
      } catch (e) { return false; }
    },
    // lazy-load ffmpeg.wasm and transcode webm → mp4 (H.264, faststart)
    _ff: null,
    _toMp4: async function (webmBlob) {
      if (FC._onProgress) FC._onProgress('converting to mp4…');
      if (!FC._ff) {
        var mod = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
        var util = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
        FC._ff = new mod.FFmpeg();
        var core = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
        await FC._ff.load({ coreURL: await util.toBlobURL(core + '/ffmpeg-core.js', 'text/javascript'), wasmURL: await util.toBlobURL(core + '/ffmpeg-core.wasm', 'application/wasm') });
        FC._ffutil = util;
      }
      await FC._ff.writeFile('in.webm', await FC._ffutil.fetchFile(webmBlob));
      await FC._ff.exec(['-i', 'in.webm', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'out.mp4']);
      var data = await FC._ff.readFile('out.mp4');
      return new Blob([data.buffer], { type: 'video/mp4' });
    },
    isRecording: function () { return FC._rec && FC._rec.state === 'recording'; }
  };

  window.FaceControl = FC;
})();
