# Face-Game Contract — webcam-controlled, recordable games

> The "Face Control" category. Reference implementation: `web/site/games/flappy-face/index.html`.
> These games are played with the FACE (mouth, eyebrows, head tilt, smile, blink)
> and RECORD the player's funny face + gameplay into one shareable clip — the
> content makes itself. This is the social-media-algorithm thesis at its purest:
> TikTok/IG farm funny-face reaction content; these games manufacture it, then end.

## Tech stack (copy from flappy-face)

- **Face tracking:** MediaPipe FaceLandmarker, loaded in-browser (ESM from CDN):
  `import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.20/vision_bundle.mjs')`
  → `FilesetResolver.forVisionTasks(.../wasm)` → `FaceLandmarker.createFromOptions({..., outputFaceBlendshapes:true, runningMode:'VIDEO', numFaces:1})`.
  Per frame: `landmarker.detectForVideo(video, timestampMs)` → `res.faceBlendshapes[0].categories`.
  Useful blendshapes: `jawOpen` (mouth), `browInnerUp`/`browOuterUpLeft` (eyebrows),
  `mouthSmileLeft/Right` (smile), `eyeBlinkLeft/Right` (blink), `cheekPuff`,
  `mouthPucker` (kiss). Head pose via `res.facialTransformationMatrixes` (roll/pitch/yaw)
  for tilt-steer — enable `outputFacialTransformationMatrixes:true`.
- **Camera:** `getUserMedia({video:{facingMode:'user'}})` on a user gesture (the ALLOW button).
- **PiP:** draw the `<video>` into the game canvas (mirrored, corner box) EVERY frame so the recording captures the face. Border pulses/reddens on the active expression.
- **Recording:** `cv.captureStream(30)` → `MediaRecorder(stream,{mimeType:'video/webm'})` →
  on stop, Blob → download `.webm`. A ● RECORD / ■ STOP button. Emit `recording_saved`.

## Contract requirements

- Includes order: `LOOP_GAME` → loop-events.js → juice.js → share.js. Canvas 405x720 dpr-aware.
- **Permission gate:** a `#perm` overlay with the title + "▶ ALLOW CAMERA & PLAY" (camera only starts on tap). Copy must reassure: "camera stays on your device — nothing is uploaded."
- **Graceful fallback:** if camera/model fails, keyboard (Space) + tap still flap/act, so the game is never bricked.
- **AUTO modes (`?demo=1` / `?bot=1`):** NO camera, NO MediaPipe import (never hit the CDN headless). An `AUTO` autopilot drives the game directly + animates a SIMULATED face in the PiP (a canvas-drawn smiley whose mouth/brows match the action). Demo = mirror-neuron arc that clears ~6 obstacles then "chokes" → SPLAT + CTA; sets `window.__demoScore` + `window.__demoDone`. Bot = N runs → `window.__botDone`. This lets validate-game.mjs + clip capture work without a webcam.
- **Autopilot rule (learned):** only apply lift when BELOW target AND not already rising (`y>target && vy>-1`) or it overshoots into the ceiling. Give-up after the demo cap so the clip ends cleanly.
- Events: `play_start`, `game_over {score,dur_s}`, `restart`, plus expression-specific verbs. `recording_saved {score}`.
- ⚠️ These games DO use external resources (MediaPipe CDN) — that's expected and allowed for face games ONLY. validate-game.mjs will flag `no_external_resources:false`; for face games, treat a pass as: file_exists + uses_event_layer + bot_done + demo_done + no_page_errors + emits play_start/game_over (ignore the external-resources check). Use `validate-game.mjs --face` if added, else eyeball the 6 relevant checks.

## ⚠️ CRITICAL FIXES (learned 2026-07-17 from Manuel's cross-platform test)

1. **Mobile camera needs HTTPS.** `getUserMedia` only works in a secure context
   (https:// or localhost). On a LAN IP over http:// it's silently blocked → the
   symptom is "camera never starts." BEFORE calling getUserMedia, check
   `window.isSecureContext || location.hostname==='localhost'` and if false, set a
   visible status like "camera needs https://" and fall back to tap/space.
   (Infra: `npm run serve` now also serves HTTPS on :4643 with a self-signed cert.)
2. **Drive the control from LANDMARKS, not blendshapes alone** — more robust and
   loads reliably. `outputFaceBlendshapes:true` still helps, but compute the signal
   from `res.faceLandmarks[0]`:
   - mouth-open: `|lm[13].y - lm[14].y| / |lm[10].y - lm[152].y|` (inner lips / face height)
   - eyebrow-raise: brow (lm[105]/lm[334]) to eye (lm[159]/lm[386]) distance / face height
   - smile: mouth-corner spread `|lm[61].x - lm[291].x| / face width`
   - head tilt (roll): `atan2(lm[263].y-lm[33].y, lm[263].x-lm[33].x)` (eye corners)
   - cheek puff / pucker: blendshapes cheekPuff / mouthPucker are OK fallbacks
   **Self-calibrate** the neutral baseline (track the running minimum) so it works
   across faces, and normalize to 0..1.
3. **One detect per video frame:** skip if `video.currentTime===lastVideoTime`
   (detectForVideo needs strictly-increasing timestamps; re-detecting a frame throws).
4. **Low threshold + hysteresis** so the control is responsive and doesn't flutter:
   e.g. trigger at 0.22, release at 0.12.
5. **Visible feedback:** draw a live control-strength BAR under the PiP + a status
   line ("OPEN WIDE!" / "show your face" / "camera needs https"). The player must
   SEE that their face is being read, or they think it's broken.
6. `delegate:'GPU'` in baseOptions for smoother detection.

## Face-game concepts (the batch)

| id | control | game | funny-face payoff |
|---|---|---|---|
| flappy-face | mouth-open (jawOpen) | flappy bird | gaping like a fish (DONE, reference) |
| brow-lift | eyebrow-raise (browInnerUp) | lift a platform / levitate a ball over gaps | permanent surprised face |
| head-dodge | head-tilt L/R (roll) | dodge falling blocks by leaning | frantic head-bobbing |
| big-smile | smile intensity (mouthSmile) | grow a plant / fill a meter by smiling wider | forced maniacal grin |
| blink-shoot | blink (eyeBlink) | shoot / blink-to-jump | twitchy over-blinking |
| kiss-cam | pucker (mouthPucker) | pop hearts by kissing the air | duck-face on camera |
| cheek-puff-float | cheek puff | float a balloon by puffing | chipmunk cheeks |
| brow-mouth-combo | brows + mouth | two-channel: brows steer, mouth thrusts | maximum face contortion |

All are recordable + dare-shareable. Build with flappy-face as the reference.
