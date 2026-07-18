export const meta = {
  name: 'tilt-face-lib',
  description: 'Rewrite the 6 face games onto the shared FaceControl lib (thin, reliable detection for all)',
  phases: [{ title: 'Rewrite', detail: 'one agent per face game -> use js/face-control.js, map one signal to the action' }],
}

const ROOT = '/Users/manuel/coo/attention-architecture'
const GAMES = [
  { id: 'brow-lift', sig: 'FC.sig.browRaise', action: 'raise eyebrows to lift/levitate the object; relax to sink. Threshold ~0.3 with hysteresis; the more raised the more lift.' },
  { id: 'head-dodge', sig: 'FC.sig.headTilt (range -1 left .. +1 right)', action: 'tilt head left/right to move the runner horizontally, proportional to the tilt. Dead-zone ±0.12.' },
  { id: 'big-smile', sig: 'FC.sig.smile', action: 'smile wider to grow the bloom/fill the meter; it wilts when you stop. Proportional to smile 0..1.' },
  { id: 'blink-shoot', sig: 'FC.sig.blink', action: 'a blink (blink crosses ~0.5 then releases) fires/jumps once per blink — edge-triggered with hysteresis so a normal blink = one action.' },
  { id: 'kiss-cam', sig: 'FC.sig.pucker', action: 'pucker (kiss) to shoot a heart; edge-triggered per pucker so one kiss = one shot.' },
  { id: 'cheek-float', sig: 'FC.sig.cheekPuff', action: 'puff cheeks to float up; stop to sink. Proportional lift to cheekPuff 0..1.' },
]

phase('Rewrite')
const results = await parallel(GAMES.map((g) => () =>
  agent(
    `Rewrite web/site/games/${g.id}/index.html to use the SHARED face-detection library. Working dir: ${ROOT}.\n` +
    `PROBLEM: each face game hand-wrote its own (buggy) face detection and only flappy-face works. FIX: use the shared, proven js/face-control.js for ALL detection.\n` +
    `READ FIRST: web/site/games/flappy-face/index.html (the REFERENCE — now on the lib) and web/site/js/face-control.js (the API).\n` +
    `Do this to ${g.id}:\n` +
    `1. Add \`<script src="../../js/face-control.js"></script>\` after share.js (all 4 includes: loop-events, juice, share, face-control).\n` +
    `2. DELETE any home-grown face code in this game (its own MediaPipe import, initFace, readMouth/read*, landmarker, getUserMedia, per-game blendshape reading, its own camStatus). Replace with: \`var FC=window.FaceControl;\` and on the ALLOW button click call \`await FC.start(); ... requestAnimationFrame(frame);\`.\n` +
    `3. In the human-mode frame branch: \`FC.update(now);\` then read the control signal ${g.sig} and drive the game: ${g.action}\n` +
    `4. Draw the webcam PiP from FC.video (mirror it) with a live control BAR + status via FC.statusLabel() — copy flappy-face's PiP block. The border reddens when the control is active.\n` +
    `5. Record button → FC.toggleRecord(cv, '${g.id}.webm', cb).\n` +
    `6. KEEP the AUTO demo/bot autopilot intact (simulated face + give-up cap so demo/bot END) — do NOT route AUTO through FC.\n` +
    `7. Validate: node engine/night/validate-game.mjs ${g.id} — must pass. Fix + re-run up to 4 times. Report {id, passed}.\n` +
    `Goal: identical, reliable detection across all face games; ${g.id} responds crisply to the player's ${g.id.split('-')[0]} expression.`,
    { label: `lib:${g.id}`, phase: 'Rewrite', model: 'sonnet', agentType: 'general-purpose', schema: {
      type: 'object', properties: { id: { type: 'string' }, passed: { type: 'boolean' } }, required: ['id', 'passed']
    } }
  ).catch(() => ({ id: g.id, passed: false }))
))

return { done: results.filter((r) => r && r.passed).map((r) => r.id), failed: results.filter((r) => r && !r.passed).map((r) => r && r.id) }
