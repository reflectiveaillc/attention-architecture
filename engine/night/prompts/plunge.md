You are a game-implementation worker for the Tilt games site. Your ONLY deliverables are two files:

1. `web/site/games/plunge/index.html` — the game (single self-contained file; overwrite if it exists)
2. `web/site/games/plunge/copy.md` — social captions

FIRST: Read `web/site/games/stack-rush/index.html` end to end — the reference implementation of the contract (canvas setup, fit(), seeded RNG, modes, events, CTA card). Also read `web/site/games/bottom-of-the-feed/index.html` for the swipe input pattern — Plunge is its VIRAL sibling: same gesture family, opposite arousal.

## The game: Plunge

A glowing comet falls down a neon shaft split into **3 lanes**. Glass panes rise toward you; each pane has its gap in ONE lane. **Swipe down-left / straight down / down-right** to dash through the gap's lane. Every clean smash feeds the chain — combo, speed, glow. Until you shatter. **The shatter is the ecstasy moment — the most beautiful frame in the game.**

### The coordination chain (THE CORE — tune this carefully)

The swipe is chained to escalating human coordination, staged so an AVERAGE player sustains ~20 moves, and the game visibly telegraphs that it's becoming extremely complex — anticipation must rise with the complexity:

- **Input:** swipe direction picks the lane: drag angled left = left lane, mostly vertical = center, angled right = right lane (classify by dx/dy ratio, threshold ±0.35). The dash smashes the pane ONLY if you dashed into the lane holding the gap, within the timing window. Keyboard: ← ↓ → arrows dash into the lanes (space = center).
- **STAGE 1 — "warm-up" (panes 1–5):** slow approach, gap stays center or moves once, huge timing windows. Nobody fails here — it primes the rhythm.
- **STAGE 2 — "aim" (panes 6–10):** gaps alternate lanes in simple patterns (L,C,R,C…), approach 15% faster. The hand starts steering.
- **STAGE 3 — "doubles" (panes 11–15):** sometimes two panes arrive in quick succession needing OPPOSITE lanes (L then R) — the left-right coordination burst; tempo +15% again.
- **STAGE 4 — "the wall" (panes 16–20):** gap patterns go syncopated (L,L,R,C,R), windows tighten ~25%, occasional fake-out (gap shifts lanes once mid-approach, telegraphed by a flicker). This is where average runs end (~18–24).
- **STAGE 5 — "beyond" (21+):** everything faster, triple bursts. Elite territory.
- **Tuning target:** with moderate human reaction (~250ms decisions), death should land between panes 16 and 24 most runs. Bot mode (below) must confirm this: seeded bot with 250ms-equivalent error dies in that band.
- **The game KNOWS it's escalating (telegraph = anticipation = dopamine):** at each stage boundary flash a stage banner ("STAGE 3 — DOUBLES"), raise the visual heat one notch: shaft edge-glow brightens, combo text grows, a faint pulse vignette beats faster, background hue warms toward vermillion. By stage 4 the screen should FEEL like it's about to burst.

### Reward chain

- **Clean smash:** pane shatters (radial glass shards + glow, micro screen-shake), combo++, fall speed +3%, comet gains a visible glow-ring per smash (the accumulated riches riding on the run).
- **Gold panes:** seeded ~1 in 6 — double shards, +2 combo, gold flash.
- **Graze (near-miss):** dash into the right lane but at the window's edge → squeeze through with sparks + "SO CLOSE" — chain survives.
- **THE SHATTER (fail = ecstasy — spend your best effort here):** wrong lane, missed window, or pane reaches you → (1) time slows to ~0.25× for 400ms while cracks spider from the impact across the whole screen; (2) the comet bursts: EVERY glow-ring earned explodes outward as its own slow wave of light (a 20-combo death = 20 waves filling the screen, vermillion + gold); (3) the bloom fades into the score card: panes smashed, best combo, stage reached, "TOP N% TODAY" (N = clamp(round(100*exp(-panes/9)),1,99)) + "better than (100-N)% of players", pulsing "SWIPE — PLUNGE AGAIN". The death must look BETTER than the gameplay.
- **Restart:** swipe/tap on the score card → instant new run.

## Contract (MUST match — the site engine depends on it)

- Canvas: internal coordinates 405x720 (9:16), scaled to fit, devicePixelRatio-aware (copy `fit()` from stack-rush).
- Palette (viral engine): bg ink `#0b0d12`, shaft lane-lines faint teal, comet + shards vermillion `#e8502e`, gold `#f2b134`, white-hot flashes. Fonts: -apple-system / Menlo like the reference.
- Include, in this order, before your game script:
  `<script>window.LOOP_GAME = 'plunge';</script>`
  `<script src="../../js/loop-events.js"></script>`
- Events via `window.LOOP && LOOP.emit(...)`: `play_start` per run, `smash {n, combo, lane, gold, stage}` per pane, `near_miss {n}` per graze, `stage {s}` at each stage banner, `game_over {score, dur_s}` at the shatter (score = panes smashed), `restart` on plunge-again.
- Seeded RNG: mulberry32 from `?seed=` (copy from reference). NEVER call Math.random directly. Gap patterns, gold panes, fake-outs are seeded.
- **Demo mode** (`?demo=1&seed=7`): no human input. Scripted run that SHOWS the escalation: quick montage through stage 1 (2 smashes), stage 2 banner + 3 lane-alternating smashes, stage 3 banner + one double (L→R burst) + gold pane, stage 4 banner with the heat visibly maxed + 2 tense smashes + 1 graze — then the scripted FAIL at pane ~19: full ecstasy sequence (slow-mo cracks → ~12 bloom waves → score card "TOP 5% TODAY · STAGE 4"), hold ~2.2s; then CTA overlay (dark scrim, "PLUNGE" huge, "the fail is the best part.", vermillion "▶ ONE MORE PLUNGE", teal "link in bio") ~3.5s, then `window.__demoDone = true`. Total ~20–24s.
- **Bot mode** (`?bot=1&runs=N&seed=5`): dashes with seeded human-like timing error (~250ms equivalent) so deaths land panes 14–24 (this doubles as the tuning check); ecstasy sequence fast-forwarded ×2; ~500ms between runs; then `window.__botDone = true`. No CTA.
- Human mode ignores demo/bot autopilot code paths; demo/bot ignore human input.
- No external network requests, no external fonts/images/libs. Everything inline. Silent.
- Title screen (human mode only): "PLUNGE", "swipe ← ↓ → through the glass. don't stop.", pulsing "SWIPE DOWN".

## copy.md format

```
# Plunge — copy
## TikTok (3 captions ≤100 chars, hook-first)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Angle: the escalation wall + the fail as reward — "stage 4 is where hands give up", "average people die at 19", "the death is the best part". ≤2 emojis per caption, none in titles, no hype words.

Write both files now. Do not modify ANY other file. Do not add build steps.
