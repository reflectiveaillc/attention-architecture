export const meta = {
  name: 'tilt-fanout',
  description: 'Fan out Claude subagents to finish 7 category designs + build 16 games from the backlog (while Ollama is rate-limited)',
  phases: [
    { title: 'Design', detail: '7 agents, one per remaining category -> cat-<id>.json (20 designs each)' },
    { title: 'Build', detail: '16 agents, one per game -> write index.html + copy.md, self-validate & fix until pass' },
  ],
}

const ROOT = '/Users/manuel/coo/attention-architecture'
const CATEGORIES = ['ocd', 'autism', 'anxiety', 'collector', 'sensory', 'rhythm', 'memory']
const BUILDS = ['badge-clear', 'pinned-top', 'repost-train', 'poll-slider', 'suggested-dismiss', 'badge-panic', 'typing-standoff', 'streak-tightrope', 'story-expire', 'autoplay-stop', 'lip-sync-duel', 'face-morph-lock', 'fyp-pull', 'live-count', 'request-purgatory', 'grid-curate']

phase('Design')
const designResults = await parallel(CATEGORIES.map((cat) => () =>
  agent(
    `You are a game-design worker for the Tilt factory. Working dir: ${ROOT}.\n` +
    `Read the file engine/night/prompts/catdes-${cat}.md and do EXACTLY what it instructs: ` +
    `write engine/state/designs/cat-${cat}.json — a pure JSON array of exactly 20 game designs for the "${cat}" category, ` +
    `following the schema and rules in that prompt. CRITICAL: the JSON must be strictly valid — escape any double-quotes inside string values (write \\" not "). ` +
    `Do not wrap it in markdown fences. After writing, run via Bash: node -e "JSON.parse(require('fs').readFileSync('engine/state/designs/cat-${cat}.json','utf8'))" to prove it parses; if it errors, fix and re-check. ` +
    `Report done when the file exists and parses.`,
    { label: `design:${cat}`, phase: 'Design', model: 'sonnet', agentType: 'general-purpose' }
  ).then(() => ({ cat, ok: true })).catch(() => ({ cat, ok: false }))
))

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
  designed: designResults.filter((r) => r && r.ok).map((r) => r.cat),
  design_failed: designResults.filter((r) => r && !r.ok).map((r) => r.cat),
  built: buildResults.filter((r) => r && r.passed).map((r) => r.id),
  build_failed: buildResults.filter((r) => r && !r.passed).map((r) => r && r.id),
}
