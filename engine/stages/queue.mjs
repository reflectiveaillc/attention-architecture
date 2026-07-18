// Stage 3 — QUEUE: prioritize by predicted leverage × circuit-coverage gap ×
// engine balance. Human gate: Manuel can reprioritize/drop before production
// spend (the queue is persisted in the run report before Produce runs).
import fs from 'node:fs';
import path from 'node:path';

export async function run(ctx) {
  const concept = ctx.results.ideate.concept;
  const regFile = path.join(ctx.stateDir, 'registry.json');
  const registry = fs.existsSync(regFile) ? JSON.parse(fs.readFileSync(regFile, 'utf8')) : { games: [] };

  const liveCircuits = new Set(registry.games.flatMap((g) => g.circuits || []));
  const newCircuits = concept.circuits.filter((c) => !liveCircuits.has(c));
  const gapBonus = 1 + 0.15 * newCircuits.length;

  const liveByEngine = registry.games.filter((g) => g.engine === concept.engine).length;
  const engineBalance = 1 / (1 + 0.25 * liveByEngine);

  const leverage = ctx.results.ideate.concept.from_trend.score;
  const priority = +(leverage * gapBonus * engineBalance).toFixed(3);

  const item = { concept_id: concept.id, priority, leverage, gap_bonus: gapBonus, engine_balance: engineBalance, new_circuits: newCircuits, human_gate: 'open — reprioritize/drop in run report before Produce (auto-proceeds in e2e)' };
  ctx.log(`queue: ${concept.id} priority ${priority} (gap +${newCircuits.length} circuits)`);
  return { queue: [item], selected: item };
}
