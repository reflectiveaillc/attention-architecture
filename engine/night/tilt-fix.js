export const meta = {
  name: 'tilt-fix',
  description: 'Fan out Claude subagents to FIX already-built Tilt games that fail validation (each self-validates & fixes)',
  phases: [{ title: 'Fix', detail: 'one agent per game -> repair existing index.html until validate-game.mjs passes' }],
}

const ROOT = '/Users/manuel/coo/attention-architecture'
// args: ["id1","id2",...] — games whose web/site/games/<id>/index.html EXISTS but fails validation
let batch = args
if (typeof batch === 'string') { try { batch = JSON.parse(batch) } catch (_) { batch = null } }
if (!Array.isArray(batch) || !batch.length) throw new Error('tilt-fix needs args: ["game-id", ...]')

phase('Fix')
const results = await parallel(batch.map((id) => () =>
  agent(
    `You are a game-repair worker for the Tilt games site. Working dir: ${ROOT}.\n` +
    `The game web/site/games/${id}/index.html EXISTS but was built by an interrupted batch and fails validation. Your job is to FIX it in place — do not rewrite from scratch unless it is beyond repair (then follow engine/night/prompts/build-${id}.md + docs/game-contract-v2.md with web/site/games/stack-rush/index.html as reference, and also write copy.md if missing).\n` +
    `STEP 1: Run via Bash: node engine/night/validate-game.mjs ${id} — read the failing checks.\n` +
    `STEP 2: Read the game file and fix the cause. Common: bot mode never reaches game_over -> the bot must eventually LOSE; demo never sets window.__demoDone; a JS SyntaxError; hitStop frozen without decay -> use if(hitStop>0)hitStop-=dt; else autopilot(); asymptotic autopilot never crossing a threshold -> release within an epsilon; endless-accumulation games -> bot plays K actions then goes passive so the natural lose-path fires.\n` +
    `STEP 3: Re-run validate. Repeat up to 4 times until "pass": true.\n` +
    `STEP 4: Ensure web/site/games/${id}/copy.md exists (write a short one from the design in engine/night/prompts/build-${id}.md if missing).\n` +
    `Do NOT run integrate.mjs, do NOT touch the registry, do NOT capture clips — the orchestrator does that.`,
    { label: `fix:${id}`, phase: 'Fix', model: 'sonnet', agentType: 'general-purpose', schema: {
      type: 'object',
      properties: { id: { type: 'string' }, passed: { type: 'boolean' }, note: { type: 'string' } },
      required: ['id', 'passed']
    } }
  ).catch(() => ({ id, passed: false, note: 'agent error' }))
))

return {
  fixed: results.filter((r) => r && r.passed).map((r) => r.id),
  still_failing: results.filter((r) => r && !r.passed).map((r) => r && r.id),
}
