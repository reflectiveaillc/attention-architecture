# Game Contract v2 — juice, sound, mirror-neuron demos, variants

> Supersedes the v1 contract embedded in the night-run prompts. Every game on
> Tilt must satisfy this. Reference implementation: `web/site/games/stack-rush/`.

## 1. Includes (in this order, before the game script)

```html
<script>window.LOOP_GAME = '<id>';</script>
<script src="../../js/loop-events.js"></script>
<script src="../../js/juice.js"></script>
```
(Variants one level deeper use `../../../js/`.)

## 2. Sound (juice.js — semantic hooks, all synthesized)

Wire the game's moments to `window.J` (guard `window.J && J.hit(...)`):
- every reward → `J.hit(combo)` (pitch climbs the ladder with combo)
- perfect/critical reward → `J.perfect(streak)`; rare/gold → `J.gold()`
- near-miss → `J.near()`
- stakes rising (combo, height, depth, hold value) → `J.tension(x)` with x∈[0,1]; reset to 0 on run end
- death/fail → `J.death(magnitude)` scaled by how much was lost
- new best / big payoff → `J.fanfare()`
- calm-engine games use `J.calm(step)` ONLY — no percussive hits, no tension riser
- a small 🔇/🔊 toggle (calls `J.toggleMute()`) in a corner, human mode only

## 3. Visual juice (in-game, so clips capture it)

- **hit-stop**: freeze the sim 40–80ms on big hits (perfect/gold/jackpot)
- **screen shake**: 2–6px decaying on impacts; big on death
- **zoom-pulse**: canvas scale to ~1.02 for ~6 frames on criticals
- **floating text**: rewards fly up and fade ("+50", "×7", "SO CLOSE")
- **combo escalation**: combo display grows/brightens as it climbs — stakes must be VISIBLE (rings, glow, size)
- **death spectacle**: the fail is the most beautiful frame (peak-end rule)

## 4. Demo mode v2 — the mirror-neuron video (`?demo=1&seed=N`)

The demo is a VIDEO of a human-feeling attempt. The viewer must tense up,
identify with the player, and want to OUTDO the score. Required beats:

1. **Challenge card (~1.2s):** "SCORE TO BEAT — <N>" (or the game's challenge
   line) before play starts. Primes the competitive frame.
2. **Human imperfection:** inputs with hesitation and variance — near the edge
   of windows, wobbly saves, a visible pause before a hard move. NEVER a clean
   robotic run.
3. **The near-fail + recovery (~60% in):** one moment that reads as "it's over"
   — then a save. (Wobble, sliver, last-instant dash.) This is the tension peak.
4. **The fail:** shortly after the recovery, the real death — full spectacle.
5. **Score card (~2.2s):** score + rank line ("TOP N% TODAY").
6. **CTA (~3.5s):** a DIRECT challenge, not an invitation: "BEAT 33", "FASTER
   THAN 0.191?", "OUTLAST 18 PANES" + "link in bio". Then `window.__demoDone = true`.
7. Set `window.__demoScore = <final score>` (the site's challenge line feeds from it).

Calm-engine demos skip 1/3/4/6-as-dare: their arc is settle → deepen → resolve
→ soft invitation ("grow yours", "reach it").

## 5. Events (unchanged core + auto-analytics)

Emit as before: `play_start`, `game_over {score, dur_s}`, `near_miss`, `restart`,
plus game-specific verbs. loop-events v2 derives `restart_latency`,
`session_end`, visit meta, and tags every event with `variant` (`?v=` param) —
games don't implement analytics, they just emit their moments honestly.

## 6. Modes & determinism

As v1: `?demo=1&seed=N` → `__demoDone`; `?bot=1&runs=N&seed=M` → `__botDone`;
human ignores autopilots; seeded mulberry32 everywhere; no external resources;
canvas 405x720 dpr-aware.

## 7. Variants (A/B produced by the loop)

- Live at `web/site/games/<id>/variants/<vid>/index.html` — full standalone
  copies with ONE hypothesis changed (registry: `variants[{id, hypothesis, status}]`).
- A variant keeps the SAME `LOOP_GAME` id and sets `window.LOOP_VARIANT = '<vid>'`
  before loop-events.js so every event is attributed.
- Variant hypotheses come from the behavioral indices (`node engine/loop.mjs report`):
  e.g. "high dopamine (fast restarts) but low pleasure (short sessions) →
  soften early difficulty"; "near_miss_pull ≈ 0 → near-misses aren't read as
  near — make the sliver moment louder".

## 8. The three indices (what Measure now optimizes)

- **PLEASURE** — session length, runs/session, run duration
- **DOPAMINE** — restart latency (median + <800ms share) + near-miss pull
  (near-miss deaths must restart FASTER than clean deaths)
- **ADDICTION** — d1 rate, repeat visits, late-night share

Viral engine wants all three high. Calm engine wants pleasure HIGH and
addiction LOW — that contrast is the two-engine thesis, now measurable.

## 9. Sharing & challenge links (share.js)

Include `<script src="../../js/share.js"></script>` after loop-events.js.

- **Score cards get a SHARE zone** (a tappable "⚡ DARE A FRIEND" area on the
  canvas): on tap call `SHARE.send({score, unit})` — native share sheet with a
  challenge URL (`?dare=<score>`); clipboard fallback. Human mode only.
- **Incoming dares:** if `SHARE.dare` is set, show a persistent banner during
  play: "BEAT <dare>" (+ "— dared by <SHARE.by>" if present). When the player
  passes it: big flash "DARE BEATEN", call `SHARE.beaten(score)`, and the score
  card's share zone becomes "⚡ DARE THEM BACK".
- Events flow automatically: `challenge_landed`, `challenge_beaten`,
  `share {channel}` — the loop's K-factor inputs (shares/session, dare→play
  conversion, dare-beaten re-share rate).
