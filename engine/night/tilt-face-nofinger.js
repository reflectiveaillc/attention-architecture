export const meta = {
  name: 'tilt-face-nofinger',
  description: 'Make the 6 face games FACE-ONLY: remove tap/touch/keyboard from the core action, drive only by the FC signal',
  phases: [{ title: 'FaceOnly', detail: 'one agent per game -> remove tap-for-action, keep tap only for restart' }],
}

const ROOT = '/Users/manuel/coo/attention-architecture'
const GAMES = [
  { id: 'brow-lift', sig: 'FC.sig.browRaise', act: 'raising eyebrows' },
  { id: 'head-dodge', sig: 'FC.sig.headTilt', act: 'tilting the head' },
  { id: 'big-smile', sig: 'FC.sig.smile', act: 'smiling' },
  { id: 'blink-shoot', sig: 'FC.sig.blink', act: 'blinking' },
  { id: 'kiss-cam', sig: 'FC.sig.pucker', act: 'puckering (kiss)' },
  { id: 'cheek-float', sig: 'FC.sig.cheekPuff', act: 'puffing cheeks' },
]

phase('FaceOnly')
const results = await parallel(GAMES.map((g) => () =>
  agent(
    `Make web/site/games/${g.id}/index.html a FACE-ONLY game. Working dir: ${ROOT}.\n` +
    `PROBLEM (Manuel): the game reads the facial expression (the PiP bar moves) but the GAME ACTION only fires on TAP/touch, not on the face. GOAL: the core action must be driven ONLY by ${g.act} via ${g.sig}; remove touch/tap/keyboard from the action.\n` +
    `READ FIRST: web/site/games/flappy-face/index.html — it is now FACE-ONLY (its tap handler was changed to 'tapRestart' which ONLY restarts after a crash and NEVER performs the flap; the flap is driven exclusively by FC.sig.mouthOpen in the human frame branch).\n` +
    `Do this to ${g.id}:\n` +
    `1. Find every pointerdown / touchstart / click / keydown handler that performs the GAME ACTION (jump/lift/shoot/steer/grow/etc.) in human mode and REMOVE the action call. Keep tap/space ONLY to restart after game-over (like flappy-face's tapRestart) and to dismiss the start/allow overlay. The core mechanic must NOT respond to touch.\n` +
    `2. Ensure the human frame branch drives the action from ${g.sig} (0..1, or -1..1 for headTilt) with a sensible LOW threshold + hysteresis (trigger ~0.28, release ~0.15) for edge-triggered actions, or proportional mapping for continuous ones. The signal is now robust (blends landmarks + blendshapes) so it WILL fire when the player makes the expression.\n` +
    `3. Update the 'get ready' prompt to instruct the expression (e.g. "RAISE YOUR EYEBROWS", "SMILE TO GROW", "BLINK TO JUMP", "PUCKER TO KISS", "PUFF YOUR CHEEKS", "TILT YOUR HEAD").\n` +
    `4. Do NOT touch the AUTO demo/bot autopilot (it drives directly, not via tap or FC).\n` +
    `5. Validate: node engine/night/validate-game.mjs ${g.id} — must still pass (demo/bot unaffected). Fix + re-run up to 4 times. Report {id, passed}.\n` +
    `The result: ${g.id} is played 100% with the face — no finger needed for the mechanic.`,
    { label: `faceonly:${g.id}`, phase: 'FaceOnly', model: 'sonnet', agentType: 'general-purpose', schema: {
      type: 'object', properties: { id: { type: 'string' }, passed: { type: 'boolean' } }, required: ['id', 'passed']
    } }
  ).catch(() => ({ id: g.id, passed: false }))
))

return { done: results.filter((r) => r && r.passed).map((r) => r.id), failed: results.filter((r) => r && !r.passed).map((r) => r && r.id) }
