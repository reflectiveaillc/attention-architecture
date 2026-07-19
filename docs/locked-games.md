# Locked games — tester-validated, do not retune

Games on this list have been played by a human tester and confirmed to hit the
loop. Their **difficulty and core mechanics are frozen**: no agent, batch round,
retro pass, or "balance fix" may touch the numbers that make them feel the way
they do. Ship variants as NEW game ids instead.

| Game | Locked | Tester | Insight | Frozen surface |
|---|---|---|---|---|
| `drop-dodge` | 2026-07-19 | Manuel | **"very engaging and addicting"** — the difficulty is part of the hook; keep it hard | `BASE_VY 6.2`, ramp `1+1.4p`, spawn `1.1s→0.32s`, two-lane tap steering, 60s survival |

## Variant policy

- A locked game CAN get variants (new input methods, themes, easier/harder
  modes) — always as a **separate game id** with its own registry entry.
- Example: `drop-dodge-face` is the head-steered variant of `drop-dodge`,
  deliberately tuned easier (`BASE_VY 4.6`, ramp `1+0.9p`, spawn `1.5s→0.55s`)
  because a head lean is slower than a thumb tap. Its tuning must never flow
  back into the locked original.
- When a tester validates a game, add it here AND put a `⛔ LOCKED` block at the
  top of the game's `index.html` header comment, and set `"locked": true` +
  `tester_note` on its registry entry so batch tooling can skip it.
