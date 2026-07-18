export const meta = {
  name: 'tilt-face-tune',
  description: 'Fine-tune the 6 face games to be PLAYABLE with face control (forgiving, not harsh)',
  phases: [{ title: 'Tune', detail: 'one agent per game -> forgiving thresholds, gentle physics, playable difficulty' }],
}

const ROOT = '/Users/manuel/coo/attention-architecture'
const GAMES = [
  { id: 'brow-lift', kind: 'continuous hold-to-rise (raise brows = lift, relax = fall)', tips: 'gentle gravity + moderate lift like flappy-face (GRAV~0.20, LIFT~0.42, MAXV~4.2), big gaps, slow walls, first obstacle reachable near center.' },
  { id: 'head-dodge', kind: 'continuous steer (tilt head = move L/R)', tips: 'slow the runner + falling blocks, generous dodge margins, small dead-zone (±0.10), proportional but not twitchy; blocks slow at first and ramp gently.' },
  { id: 'big-smile', kind: 'continuous meter (smile = grow bloom)', tips: 'low smile threshold (~0.15), bloom grows steadily with a modest smile, wilts slowly (forgiving); this is a chill game — make it satisfying, never punishing.' },
  { id: 'blink-shoot', kind: 'discrete (blink = jump/shoot)', tips: 'a NORMAL blink must reliably trigger ONE action (edge-triggered, hysteresis). Do NOT require rapid blink-chaining. Space obstacles far apart so a calm blink cadence clears them; slow speed.' },
  { id: 'kiss-cam', kind: 'discrete (pucker = shoot heart)', tips: 'a relaxed pucker fires one shot reliably (low threshold ~0.2). Targets drift slowly and are large; no rapid-fire needed to succeed.' },
  { id: 'cheek-float', kind: 'continuous hold-to-rise (puff cheeks = float up)', tips: 'gentle physics like flappy-face; puffing is tiring so make the cave wide, slow, and forgiving; low puff threshold (~0.18).' },
]

phase('Tune')
const results = await parallel(GAMES.map((g) => () =>
  agent(
    `Fine-tune web/site/games/${g.id}/index.html to be genuinely PLAYABLE with FACE control. Working dir: ${ROOT}.\n` +
    `PROBLEM (Manuel): the face games are too HARSH — he fails immediately. Face control is imprecise and laggy vs tapping, so a face game must be MUCH more forgiving than a tap game. The reference web/site/games/flappy-face/index.html was just retuned and is now playable: hold-to-rise physics (GRAV 0.20 / LIFT 0.42 / MAXV 4.2), big gap (290), slow pipes (1.6), spaced pipes (155), and the FIRST obstacle sits near center so it's reachable — READ IT.\n` +
    `This game is: ${g.kind}.\n` +
    `Apply these to ${g.id}:\n` +
    `1. Make the control threshold LOW and forgiving (~0.15–0.22) with hysteresis so it triggers on a natural expression, not a maximal one.\n` +
    `2. Soften the difficulty for face play: ${g.tips}\n` +
    `3. Slow the initial pace and ramp difficulty GENTLY (the first 5-8 seconds should be easy to survive while the player learns the face control).\n` +
    `4. Add a test hook near the game state: window.__st=function(){return {st:st, /* +the key control var, obstacles array, and any target/threshold */ };} so playability can be auto-checked.\n` +
    `5. Keep it FACE-ONLY (tap only restarts), keep the AUTO demo/bot working, keep the PiP + FC.sig usage.\n` +
    `6. Validate: node engine/night/validate-game.mjs ${g.id} (must pass). Report {id, passed}.\n` +
    `The goal: a player using their ${g.id.split('-')[0]} can actually survive and score — fun, not frustrating.`,
    { label: `tune:${g.id}`, phase: 'Tune', model: 'sonnet', agentType: 'general-purpose', schema: {
      type: 'object', properties: { id: { type: 'string' }, passed: { type: 'boolean' } }, required: ['id', 'passed']
    } }
  ).catch(() => ({ id: g.id, passed: false }))
))

return { tuned: results.filter((r) => r && r.passed).map((r) => r.id), failed: results.filter((r) => r && !r.passed).map((r) => r && r.id) }
