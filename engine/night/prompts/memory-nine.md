You are a game-implementation worker for the Tilt games site. Your ONLY deliverables are two files:

1. `web/site/games/memory-nine/index.html` — the game (single self-contained file)
2. `web/site/games/memory-nine/copy.md` — social captions

FIRST: Read `web/site/games/stack-rush/index.html` end to end. It is the reference implementation of the contract below — match its structure, style, and conventions exactly (canvas setup, mode handling, seeded RNG, event emission, CTA card).

## The game: Memory Nine

A 3x3 grid of tiles. A sequence flashes — repeat it. Every round adds one step. How long is your memory?

- **Round flow:** round R plays a seeded sequence of R tile-flashes (500ms per flash, 150ms gap, teal glow), then "YOUR TURN" — the player taps the sequence back. Correct → quick green sweep, next round (sequence keeps its prefix, adds one new seeded step). Wrong tap → the correct tile pulses, run ends.
- **Playback speeds up** slightly each round (floor 260ms per flash) — length AND speed pressure.
- **Scoring + benchmark (the hook):** score = longest sequence completed. End screen: "you held R steps", benchmark band ("average human working memory: 7 ± 2" — R≥13 "top 1% — are you counting cards?", R≥10 "top 8%", R≥8 "above the famous 7±2", R=7 "exactly average. suspicious.", else "below average… tired?"), best from localStorage, "TAP — ONE MORE ROUND".
- **The psychological angle (memory benchmark ego bait):** "7±2" is a famous, concrete, checkable number. Viewers who watch someone fail at 9 KNOW they'd do better.

## Contract (MUST match — the site engine depends on it)

- Canvas: internal coordinates 405x720 (9:16), scaled to fit the window, devicePixelRatio-aware (copy the `fit()` pattern from stack-rush).
- Palette: bg `#0b0d12`, vermillion `#e8502e`, teal `#2ec5b6` (flash glow), gold `#f2b134`. Fonts: -apple-system / Menlo like the reference.
- Include, in this order, before your game script:
  `<script>window.LOOP_GAME = 'memory-nine';</script>`
  `<script src="../../js/loop-events.js"></script>`
- Events via `window.LOOP && LOOP.emit(...)`: `play_start` when a run starts, `round_clear {r}` per completed round, `near_miss {r, step}` when the wrong tap happens on the LAST step of a sequence (so close), `game_over {score, dur_s}` at run end, `restart` on play-again.
- Seeded RNG: mulberry32 from `?seed=` (copy from reference). NEVER call Math.random directly.
- **Demo mode** (`?demo=1&seed=7`): no human input. An invisible player: clears rounds 1–8 quickly (montage feel — show rounds 1, 5, 7, 8 fully, skip-cut the middle with a "round N" interstitial), then on round 9 fails ON THE LAST STEP (near-miss). End screen: "you held 8 steps — above the famous 7±2… but not top 8%". Hold ~2.5s. Then CTA overlay (dark scrim, "MEMORY NINE" huge, "average human: 7. you?", vermillion "▶ PLAY NOW", teal "link in bio") ~3.5s, then `window.__demoDone = true`.
- **Bot mode** (`?bot=1&runs=N&seed=5`): N runs; per round the bot repeats correctly with probability 0.85 (else fails at a seeded step), taps at ~280ms cadence, then `window.__botDone = true`. No CTA.
- Human mode ignores demo/bot autopilot code paths; demo/bot ignore human input.
- No external network requests, no external fonts/images/libs. Everything inline. Silent.
- Title screen (human mode only): "MEMORY NINE", "average human holds 7. you?", pulsing "TAP TO START".

## copy.md format

```
# Memory Nine — copy
## TikTok (3 captions ≤100 chars, hook-first, memory-benchmark angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Captions use the 7±2 number concretely ("failed at 9", "average is 7"), ≤2 emojis per caption, none in titles, no hype words.

Write both files now. Do not modify ANY other file. Do not add build steps.
