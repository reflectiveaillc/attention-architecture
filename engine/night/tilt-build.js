export const meta = {
  name: 'tilt-build',
  description: 'Fan out Claude subagents to build a batch of Tilt games from the backlog (each self-validates & fixes)',
  phases: [{ title: 'Build', detail: 'one agent per game -> write index.html + copy.md, self-validate & fix until pass' }],
}

const ROOT = '/Users/manuel/coo/attention-architecture'
// pass the batch via Workflow args: ["id1","id2",...] — accepts a real array OR a
// JSON-encoded string (the tool may deliver it stringified). NO fallback batch:
// rebuilding a stale hardcoded list burns ~1M tokens for nothing — fail loud instead.
let batch = args
if (typeof batch === 'string') { try { batch = JSON.parse(batch) } catch (_) { batch = null } }
if (!Array.isArray(batch) || !batch.length) throw new Error('tilt-build needs args: ["game-id", ...] — refusing to run a stale hardcoded batch')
const BUILDS = batch

phase('Build')
const buildResults = await parallel(BUILDS.map((id) => () =>
  agent(
    `You are a game-implementation worker for the Tilt games site. Working dir: ${ROOT}.\n` +
    `STEP 1: Read engine/night/prompts/build-${id}.md fully and follow it EXACTLY — it tells you to read docs/game-contract-v2.md and web/site/games/stack-rush/index.html (the reference), then write two files: web/site/games/${id}/index.html and web/site/games/${id}/copy.md.\n` +
    `STEP 2: Self-validate by running via Bash: node engine/night/validate-game.mjs ${id}. It prints JSON with a "pass" field and per-check booleans.\n` +
    `STEP 3: If pass is not true, read which checks failed (common: bot mode never reaches game_over -> the bot must eventually LOSE; demo never sets window.__demoDone; a JS SyntaxError; hitStop frozen without decay -> use if(hitStop>0)hitStop-=dt; else autopilot(); asymptotic autopilot never crossing a threshold -> release within an epsilon; endless-accumulation games -> bot plays K actions then goes passive so the natural lose-path fires). Fix the game file and re-run validate. Repeat up to 4 times.\n` +
    `STEP 4: Report the final result. Do NOT run integrate.mjs, do NOT touch the registry, do NOT capture clips — the orchestrator does that. Only produce a passing game file + copy.md.\n` +
    `Keep the game self-contained: canvas 405x720, seeded RNG, no external resources, includes loop-events.js + juice.js + share.js as the reference does.`,
    { label: `build:${id}`, phase: 'Build', model: 'sonnet', agentType: 'general-purpose', schema: {
      type: 'object',
      properties: { id: { type: 'string' }, passed: { type: 'boolean' }, note: { type: 'string' } },
      required: ['id', 'passed']
    } }
  ).catch(() => ({ id, passed: false, note: 'agent error' }))
))

return {
  built: buildResults.filter((r) => r && r.passed).map((r) => r.id),
  build_failed: buildResults.filter((r) => r && !r.passed).map((r) => r && r.id),
}
