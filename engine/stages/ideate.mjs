// Stage 2 — IDEATE: trend → concept card (name, mechanic, theme, target
// circuits, engine, hook-clip concept). MVP: deterministic template per known
// mechanic. R4: LLM concept generator constrained to the circuit taxonomy
// (hook point: swap conceptFor with a model call).
const CONCEPTS = {
  'thumb-distance-race': {
    id: 'scroll-sprint', name: 'Scroll Sprint', engine: 'viral',
    mechanic: 'thumb-distance-race', theme: 'how far can your thumb go in 10s',
    circuits: ['03-social', '01-rpe', '02-novelty'],
    hook_clip_concept: 'BEAT 38 FT card → frantic 10s race, odometer blurring, looks lost at 33 ft → late surge passes 38 → 41.2 FT + "2.9 mph of thumb" → "his thumb did 41 ft. yours?"'
  },
  'swipe-chain-ecstasy-fail': {
    id: 'plunge', name: 'Plunge', engine: 'viral',
    mechanic: 'swipe-chain-ecstasy-fail', theme: 'smash down; the fail is the best part',
    circuits: ['01-rpe', '02-novelty', '04-loss', '06-zeigarnik'],
    hook_clip_concept: 'combo chain ×1→×10 smashing glass at rising tempo → the SHATTER: slow-mo cracks + every earned ring exploding as light → "TOP 4% TODAY" → "the fail is the best part. ONE MORE PLUNGE"'
  },
  'scroll-with-an-edge': {
    id: 'bottom-of-the-feed', name: 'Bottom of the Feed', engine: 'calm',
    mechanic: 'scroll-with-an-edge', theme: 'a feed-shaped descent that ends',
    circuits: ['01-soft-rpe', '05-ease', '07-timing', '08-garden', '02-novelty'],
    hook_clip_concept: 'a thumb scrolls a glowing deep-sea feed… and it ENDS at a luminous seafloor — "your feed doesn\'t have a bottom. this one does." — mined verbatim: the anti-doomscroll'
  },
  'sequence-memory': {
    id: 'memory-nine', name: 'Memory Nine', engine: 'viral',
    mechanic: 'sequence-memory', theme: 'repeat the growing sequence',
    circuits: ['01-rpe', '03-social', '06-zeigarnik'],
    hook_clip_concept: 'rounds montage → fails at 9 ON THE LAST STEP → "you held 8 — above the famous 7±2… but not top 8%" → "average human: 7. you?"'
  },
  'forbidden-button': {
    id: 'dont-press', name: "DON'T PRESS", engine: 'viral',
    mechanic: 'forbidden-button', theme: 'a button that says DO NOT PRESS',
    circuits: ['02-novelty', '06-zeigarnik'],
    hook_clip_concept: 'presses race through escalating milestones (dodge, cracks, upside-down, 9 decoys) → freeze on chaos → "what happens at 100? FIND OUT"'
  },
  'odd-tile-perception': {
    id: 'odd-one', name: 'Odd One', engine: 'viral',
    mechanic: 'odd-tile-perception', theme: 'spot the different tile',
    circuits: ['01-rpe', '02-novelty', '03-social'],
    hook_clip_concept: '3 rounds solved on screen, round 4 left UNSOLVED → "pause now. find it. comment your round" → the clip itself is the game'
  },
  'hold-to-bank': {
    id: 'hold-on', name: 'Hold On', engine: 'viral',
    mechanic: 'hold-to-bank', theme: 'press-and-hold greed, variable pop',
    circuits: ['01-rpe', '04-loss'],
    hook_clip_concept: 'a hold climbs into huge numbers → banks 0.3s before the pop → next hold rides higher and POPS, loses 1,840 → "when would YOU have banked?"'
  },
  'reaction-benchmark': {
    id: 'reflex-duel', name: 'Reflex Duel', engine: 'viral',
    mechanic: 'reaction-benchmark', theme: 'F1 start lights reaction test',
    circuits: ['01-rpe', '03-social', '04-loss'],
    hook_clip_concept: 'lights sequence → 0.191s "top 9% of humans — 41ms from an F1 start" → the ladder taunts → "are you faster?"'
  },
  'blind-timer-precision': {
    id: 'ten-seconds', name: 'Ten Seconds', engine: 'viral',
    mechanic: 'blind-timer-precision', theme: 'stop the clock at exactly 10.00',
    circuits: ['01-rpe', '06-zeigarnik'],
    hook_clip_concept: 'timer goes blind at 3s → 9.97 EARLY → 10.02 LATE "SO CLOSE" → "nobody hits 10.00 twice"'
  },
  'one-stroke-precision': {
    id: 'perfect-circle', name: 'Perfect Circle', engine: 'viral',
    mechanic: 'one-stroke-precision', theme: 'draw a perfect circle, get judged',
    circuits: ['01-rpe', '03-social'],
    hook_clip_concept: 'a decent-but-beatable circle drawn live → 87% + "better than N% of players" → viewer is CERTAIN they can beat it → PLAY NOW'
  },
  'lever-timing-exposed': {
    id: 'lab-rat', name: 'Lab Rat', engine: 'viral',
    mechanic: 'lever-timing-exposed', theme: 'you are the subject',
    circuits: ['01-rpe', '02-novelty', '03-social', '04-loss', '06-zeigarnik'],
    hook_clip_concept: 'juicy jackpot opening (3s) → the game calls out its own manipulation live ("the counter is FAKE") → kill screen "Subject: you" → "how long can it hold YOU? PLAY NOW"'
  },
  'tower-stack': {
    id: 'stack-rush', name: 'Stack Rush', engine: 'viral',
    mechanic: 'tower-stack', theme: 'minimal neon tower',
    circuits: ['01-rpe', '04-loss', '06-zeigarnik'],
    hook_clip_concept: 'satisfying perfect-stack opening (3s) → near-miss sliver → run dies → "one more try? PLAY NOW"'
  },
  'tap-to-bloom': {
    id: 'drift-garden', name: 'Drift Garden', engine: 'calm',
    mechanic: 'tap-to-bloom', theme: 'soft garden, breath pacing',
    circuits: ['01-soft-rpe', '05-ease', '07-timing', '08-garden'],
    hook_clip_concept: 'a single tap blooms a flower in slow ASMR detail → the garden half-grown → "grow yours"'
  }
};

export async function run(ctx) {
  const top = ctx.results.signal.feed[0];
  const concept = CONCEPTS[top.mechanic] || {
    id: top.mechanic, name: top.mechanic, engine: 'viral', mechanic: top.mechanic,
    theme: top.theme || 'minimal', circuits: top.circuits || ['01-rpe'],
    hook_clip_concept: 'best 3s of the mechanic → near-miss → CTA'
  };
  const card = { ...concept, from_trend: { mechanic: top.mechanic, score: top.score }, generator: 'template (R4: LLM)' };
  ctx.log(`ideate: concept = ${card.name} [${card.engine}] circuits ${card.circuits.join(', ')}`);
  return { concept: card };
}
