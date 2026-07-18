export const meta = {
  name: 'tilt-face-fix',
  description: 'Fix the 6 face games for cross-platform camera + robust landmark detection (per Manuel cross-platform test)',
  phases: [{ title: 'Fix', detail: 'one agent per face game -> secure-context check, landmark detection, thresholds, status UI' }],
}

const ROOT = '/Users/manuel/coo/attention-architecture'
const GAMES = [
  { id: 'brow-lift', signal: 'eyebrow-raise: brow (lm[105]/lm[334]) to eye (lm[159]/lm[386]) vertical distance / face height |lm[10].y-lm[152].y|, self-calibrated' },
  { id: 'head-dodge', signal: 'head tilt (roll): atan2(lm[263].y-lm[33].y, lm[263].x-lm[33].x) — negative=left, positive=right' },
  { id: 'big-smile', signal: 'smile: mouth-corner spread |lm[61].x-lm[291].x| / face width |lm[234].x-lm[454].x|, self-calibrated to neutral' },
  { id: 'blink-shoot', signal: 'blink: eyeBlinkLeft+eyeBlinkRight blendshapes (fallback: eye-openness from lm[159]/lm[145] and lm[386]/lm[374]); trigger on a blink edge' },
  { id: 'kiss-cam', signal: 'pucker: mouthPucker blendshape (fallback: mouth width shrink |lm[61].x-lm[291].x| below neutral)' },
  { id: 'cheek-float', signal: 'cheek puff: cheekPuff blendshape (fallback: face-width bulge)' },
]

phase('Fix')
const results = await parallel(GAMES.map((g) => () =>
  agent(
    `Fix the cross-platform camera + face-detection bugs in web/site/games/${g.id}/index.html. Working dir: ${ROOT}.\n` +
    `The game currently: (a) fails to start the camera on mobile (LAN over http), and (b) the facial control barely triggers. Apply the SAME fixes now proven in the reference web/site/games/flappy-face/index.html — READ IT and docs/face-contract.md "CRITICAL FIXES" first.\n` +
    `Apply to ${g.id}:\n` +
    `1. Before getUserMedia, check \`window.isSecureContext || location.hostname==='localhost' || location.hostname==='127.0.0.1'\`; if false OR no getUserMedia, set a visible status string ("camera needs https://") and fall back to tap/space so the game is never bricked. Wrap getUserMedia in try/catch with NotAllowedError → "camera blocked — allow it & reload".\n` +
    `2. Drive the control from LANDMARKS not blendshapes alone (more robust): ${g.signal}. Self-calibrate the neutral baseline (track running min/max). Normalize to 0..1.\n` +
    `3. One detect per video frame: skip if video.currentTime===lastVideoTime.\n` +
    `4. Low threshold + hysteresis (trigger ~0.22, release ~0.12) so it is responsive.\n` +
    `5. Draw a live control-strength BAR under the webcam PiP + a status line so the player SEES their face is read. delegate:'GPU' in baseOptions.\n` +
    `6. Do NOT break the AUTO demo/bot autopilot (keep the simulated face + give-up cap). Keep all events + the record button.\n` +
    `Then run: node engine/night/validate-game.mjs ${g.id} — must pass (file_exists, uses_event_layer, bot_done, demo_done, no_page_errors, emits_play_start, emits_game_over). Fix + re-run up to 4 times. Report {id, passed}.`,
    { label: `fix:${g.id}`, phase: 'Fix', model: 'sonnet', agentType: 'general-purpose', schema: {
      type: 'object', properties: { id: { type: 'string' }, passed: { type: 'boolean' } }, required: ['id', 'passed']
    } }
  ).catch(() => ({ id: g.id, passed: false }))
))

return { fixed: results.filter((r) => r && r.passed).map((r) => r.id), failed: results.filter((r) => r && !r.passed).map((r) => r && r.id) }
