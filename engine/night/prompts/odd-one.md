You are a game-implementation worker for the Tilt games site. Your ONLY deliverables are two files:

1. `web/site/games/odd-one/index.html` — the game (single self-contained file)
2. `web/site/games/odd-one/copy.md` — social captions

FIRST: Read `web/site/games/stack-rush/index.html` end to end. It is the reference implementation of the contract below — match its structure, style, and conventions exactly (canvas setup, mode handling, seeded RNG, event emission, CTA card).

## The game: Odd One

A grid of identical colored tiles — except ONE is a slightly different shade. Tap it. Rounds get harder.

- **Round flow:** round R shows a grid (round 1: 2x2, then 3x3, 4x4, 5x5, 6x6, capped 7x7 from round 6+) of rounded-square tiles in one color; one seeded-random tile differs in lightness. The difference starts obvious (~22 lightness points) and shrinks ~15% per round (floor 4 points). Tap the odd tile → satisfying pop + next round. Tap wrong → the odd one blinks, run ends.
- **Timer pressure (light):** each round allows 5 seconds (a thin bar draining under the grid). Time out = run ends. No harsh sounds, no shake — this game's tension is perceptual, not physical.
- **Scoring:** score = rounds cleared. End screen: "you saw R rounds deep", the taunt band (R≥12 "eagle eyes — top 3%", R≥9 "top 11%", R≥6 "sharper than most", else "the tiles won"), best from localStorage, "TAP — ONE MORE LOOK".
- **The psychological angle (participation + comment bait):** the VIEWER can play the clip itself — every frame of the video is a playable puzzle. They pause, find it, and comment their time. Make grids visually clean so this works at feed size.

## Contract (MUST match — the site engine depends on it)

- Canvas: internal coordinates 405x720 (9:16), scaled to fit the window, devicePixelRatio-aware (copy the `fit()` pattern from stack-rush).
- Palette: bg `#0b0d12`, vermillion `#e8502e`, teal `#2ec5b6`, gold `#f2b134`. Tile base colors rotate per round through rich hues (teal, coral, violet, amber…) — keep saturation moderate so the lightness difference is the only tell. Fonts: -apple-system / Menlo like the reference.
- Include, in this order, before your game script:
  `<script>window.LOOP_GAME = 'odd-one';</script>`
  `<script src="../../js/loop-events.js"></script>`
- Events via `window.LOOP && LOOP.emit(...)`: `play_start` when a run starts, `round_clear {r, ms}` per round, `near_miss {r}` when a wrong tap was ADJACENT to the odd tile, `game_over {score, dur_s}` at run end, `restart` on play-again.
- Seeded RNG: mulberry32 from `?seed=` (copy from reference). NEVER call Math.random directly.
- **Demo mode** (`?demo=1&seed=7`): no human input. 4 scripted rounds: rounds 1–3 solved by a visible white finding-ring that circles then taps the odd tile (round 1 fast/obvious, rounds 2–3 slower as difficulty rises); round 4 (5x5, subtle) is left UNSOLVED for the viewer: freeze the grid, pulse the text "can YOU see it? ⏸ pause now" for ~3s. Then CTA overlay (dark scrim, "ODD ONE" huge, "round 4 is on screen. find it.", vermillion "▶ PLAY NOW", teal "link in bio") ~3.5s — keep the unsolved grid faintly visible behind the scrim — then `window.__demoDone = true`.
- **Bot mode** (`?bot=1&runs=N&seed=5`): N runs; per round the bot taps the correct tile with probability 0.8 (else a wrong one) after a seeded 600–2500ms delay, then `window.__botDone = true`. No CTA.
- Human mode ignores demo/bot autopilot code paths; demo/bot ignore human input.
- No external network requests, no external fonts/images/libs. Everything inline. Silent.
- Title screen (human mode only): "ODD ONE", "one tile is different. find it.", pulsing "TAP TO LOOK".

## copy.md format

```
# Odd One — copy
## TikTok (3 captions ≤100 chars, hook-first, participation/comment-bait angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Captions invite play-along and comments ("pause at round 4", "comment your round"), ≤2 emojis per caption, none in titles, no hype words.

Write both files now. Do not modify ANY other file. Do not add build steps.
