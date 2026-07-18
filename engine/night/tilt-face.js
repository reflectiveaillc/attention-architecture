export const meta = {
  name: 'tilt-face',
  description: 'Fan out Claude subagents to build webcam face-controlled recordable games (using flappy-face as reference)',
  phases: [{ title: 'Build', detail: 'one agent per face game -> webcam + MediaPipe + record, self-validate & fix' }],
}

const ROOT = '/Users/manuel/coo/attention-architecture'
const FACE_GAMES = [
  { id: 'brow-lift', control: 'eyebrow raise (browInnerUp blendshape)', game: 'levitate a glowing orb over gaps — raise your eyebrows to lift it, relax to let it fall', face: 'a permanently surprised, eyebrows-to-the-ceiling face' },
  { id: 'head-dodge', control: 'head tilt left/right (roll, from facialTransformationMatrixes — enable outputFacialTransformationMatrixes:true)', game: 'lean your head to slide a runner left/right dodging falling blocks', face: 'frantic head-bobbing side to side' },
  { id: 'big-smile', control: 'smile intensity (mouthSmileLeft+mouthSmileRight averaged)', game: 'grow a plant / fill a bloom meter by smiling — the wider you grin the faster it grows, it wilts if you stop', face: 'a forced, aching, maniacal grin' },
  { id: 'blink-shoot', control: 'blink (eyeBlinkLeft+eyeBlinkRight)', game: 'blink to make a character hop over obstacles (blink = jump)', face: 'twitchy rapid over-blinking' },
  { id: 'kiss-cam', control: 'lip pucker (mouthPucker blendshape)', game: 'pucker to shoot kiss-hearts and pop drifting heart targets', face: 'a ridiculous sustained duck-face / kissy-face' },
  { id: 'cheek-float', control: 'cheek puff (cheekPuff blendshape)', game: 'puff your cheeks to float a balloon up through a narrowing cave; stop puffing to sink', face: 'chipmunk cheeks, red in the face' },
]

phase('Build')
const results = await parallel(FACE_GAMES.map((g) => () =>
  agent(
    `You are building a webcam FACE-CONTROLLED game for the Tilt site. Working dir: ${ROOT}.\n` +
    `STEP 1: Read docs/face-contract.md (the full face-game contract) AND web/site/games/flappy-face/index.html (the REFERENCE — copy its structure exactly: the #perm camera-permission gate, MediaPipe FaceLandmarker init, the getUserMedia + video PiP composited into the canvas, the AUTO demo/bot autopilot with a SIMULATED face, the MediaRecorder record button, the autopilot rule "only lift when below target AND not rising", and the (DEMO||BOT) give-up cap so demo/bot runs END).\n` +
    `STEP 2: Build web/site/games/${g.id}/index.html and web/site/games/${g.id}/copy.md.\n` +
    `  - Control: ${g.control}.\n  - Game: ${g.game}.\n  - The funny-face payoff (what the recording captures): ${g.face}.\n` +
    `  - The PiP simulated face in AUTO mode must animate to match THIS control (e.g. eyebrows raising, cheeks puffing) so the demo clip reads.\n` +
    `  - Keep includes: LOOP_GAME='${g.id}' -> loop-events.js -> juice.js -> share.js. Canvas 405x720. Recordable via MediaRecorder. Dare-shareable score.\n` +
    `STEP 3: Validate via Bash: node engine/night/validate-game.mjs ${g.id}. For face games, a PASS means these are all true: file_exists, uses_event_layer, bot_done, demo_done, no_page_errors, emits_play_start, emits_game_over (no_external_resources is auto-true for face games). If any of those fail, read why and fix (common: AUTO autopilot flies into the ceiling -> only lift when y>target AND vy>-1; demo/bot never ends -> give-up cap after ~6/3 points; demo never sets __demoDone). Repeat up to 4 times.\n` +
    `STEP 4: Report {id, passed}. Do NOT integrate or capture clips — the orchestrator does that.`,
    { label: `face:${g.id}`, phase: 'Build', model: 'sonnet', agentType: 'general-purpose', schema: {
      type: 'object', properties: { id: { type: 'string' }, passed: { type: 'boolean' }, note: { type: 'string' } }, required: ['id', 'passed']
    } }
  ).catch(() => ({ id: g.id, passed: false, note: 'agent error' }))
))

return { built: results.filter((r) => r && r.passed).map((r) => r.id), failed: results.filter((r) => r && !r.passed).map((r) => r && r.id) }
