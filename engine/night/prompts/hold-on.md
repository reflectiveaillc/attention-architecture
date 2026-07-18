You are a game-implementation worker for the Tilt games site. Your ONLY deliverables are two files:

1. `web/site/games/hold-on/index.html` — the game (single self-contained file)
2. `web/site/games/hold-on/copy.md` — social captions

FIRST: Read `web/site/games/stack-rush/index.html` end to end. It is the reference implementation of the contract below — match its structure, style, and conventions exactly (canvas setup, mode handling, seeded RNG, event emission, CTA card).

## The game: Hold On

Press and hold — a counter climbs faster and faster. Release to BANK the points. Hold too long and it POPS: you lose everything from that hold.

- **Hold flow:** pointerdown starts the hold: a value counter climbs (starts +10/s, accelerates ~1.6x per second — big numbers fast). A circle around the counter inflates with it and its color shifts teal → gold → vermillion as risk rises. The pop point is SEEDED-RANDOM per hold (uniform between 3.5s and 9s of holding) — invisible to the player. Release before the pop → the value BANKS (green "+N BANKED" flies to the total top-center). Pop → screen shake, the circle bursts, "POPPED — LOST N" in vermillion, that hold's value gone (banked total stays).
- **Run:** 5 holds per run. Final screen: total banked, best single hold, and the taunt line: if any hold popped, "you rode hold #K to N and lost it. one release earlier…"; if none popped, "never popped — you're leaving points on the table." (Both sides sting: that's the design.)
- **The psychological angle (loss aversion + greed):** watching a hold climb into huge numbers is unbearable — the viewer screams "bank it." The pop that erases a monster hold is the shareable moment.

## Contract (MUST match — the site engine depends on it)

- Canvas: internal coordinates 405x720 (9:16), scaled to fit the window, devicePixelRatio-aware (copy the `fit()` pattern from stack-rush).
- Palette: bg `#0b0d12`, vermillion `#e8502e`, teal `#2ec5b6`, gold `#f2b134`. Fonts: -apple-system / Menlo like the reference.
- Include, in this order, before your game script:
  `<script>window.LOOP_GAME = 'hold-on';</script>`
  `<script src="../../js/loop-events.js"></script>`
- Events via `window.LOOP && LOOP.emit(...)`: `play_start` when a run (5 holds) starts, `hold_result {n, value, banked}` per hold (banked=false means popped), `near_miss {value, margin_ms}` when a bank happens within 400ms before the pop point (reveal the closeness: "banked 0.3s before the pop"), `game_over {score, dur_s}` at run end (score = total banked), `restart` on play-again.
- Seeded RNG: mulberry32 from `?seed=` (copy from reference). NEVER call Math.random directly. Pop points come from the seeded RNG.
- **Demo mode** (`?demo=1&seed=7`): no human input, 3 scripted holds: (1) banks a modest 240 early — safe; (2) rides to a big number and banks 0.3s before the pop — show the near-miss reveal; (3) rides even higher past hold #2's value and POPS — the loss beat, hold the "LOST 1,840" moment ~2s. Then CTA overlay (dark scrim, "HOLD ON" huge, "when would YOU have banked?", vermillion "▶ PLAY NOW", teal "link in bio") ~3.5s, then `window.__demoDone = true`. Script the releases by targeting hold durations relative to the seeded pop points so the beats are deterministic.
- **Bot mode** (`?bot=1&runs=N&seed=5`): N runs of 5 holds, seeded release times (some banks, some pops), ~500ms between holds, then `window.__botDone = true`. No CTA.
- Human mode ignores demo/bot autopilot code paths; demo/bot ignore human input.
- No external network requests, no external fonts/images/libs. Everything inline. Silent.
- Title screen (human mode only): "HOLD ON", "release to bank. hold for more. it pops.", pulsing "HOLD TO START".

## copy.md format

```
# Hold On — copy
## TikTok (3 captions ≤100 chars, hook-first, loss-aversion angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Captions weaponize the scream-at-the-screen moment ("he rode it to 1,840", "bank it. BANK IT."), ≤2 emojis per caption, none in titles, no hype words.

Write both files now. Do not modify ANY other file. Do not add build steps.
