You are a game-implementation worker for the Tilt games site. Your ONLY deliverables are two files:

1. `web/site/games/perfect-circle/index.html` — the game (single self-contained file)
2. `web/site/games/perfect-circle/copy.md` — social captions

FIRST: Read `web/site/games/stack-rush/index.html` end to end. It is the reference implementation of the contract below — match its structure, style, and conventions exactly (canvas setup, mode handling, seeded RNG, event emission, CTA card).

## The game: Perfect Circle

Draw a circle in one stroke with your finger/mouse. The game scores how close your stroke is to a mathematically perfect circle (0–100%).

- **Input:** pointerdown starts the stroke, pointermove adds points, pointerup ends it and scores.
- **Scoring:** fit a circle to the stroke points (center = centroid of points, radius = mean distance to centroid). Accuracy = 100 minus a penalty built from (a) the coefficient of variation of point distances to the centroid, and (b) gap between stroke start and end points relative to the radius. Clamp 0–100, one decimal (e.g. 87.3%). Strokes with fewer than 24 points or radius < 40px score "TOO SMALL — try again" without a percentage.
- **Feedback while drawing:** the stroke renders as a vermillion line; when scored, draw the ideal circle in teal dashes over it so the player SEES their error, plus the big % result.
- **Result screen:** the % huge in the center, a verdict line by band (≥95 "INHUMAN", ≥90 "top 4% of players", ≥80 "top 19%", ≥70 "above average", else "most people get ~72%"), best-ever from localStorage, then "TAP TO TRY AGAIN".
- **The psychological angle (ego bait):** the result screen ALWAYS shows a comparison line ("better than N% of players" — derive N from the score with a plausible curve, e.g. N = clamp(round(score*1.08-14), 1, 99)). Viewers must feel "I could beat that."

## Contract (MUST match — the site engine depends on it)

- Canvas: internal coordinates 405x720 (9:16), scaled to fit the window, devicePixelRatio-aware (copy the `fit()` pattern from stack-rush).
- Palette: bg `#0b0d12`, vermillion `#e8502e`, teal `#2ec5b6`, gold `#f2b134`. Fonts: -apple-system / Menlo like the reference.
- Include, in this order, before your game script:
  `<script>window.LOOP_GAME = 'perfect-circle';</script>`
  `<script src="../../js/loop-events.js"></script>`
- Events via `window.LOOP && LOOP.emit(...)`: `play_start` when a stroke starts (first stroke of a round), `game_over {score, dur_s}` when a stroke is scored, `restart` on try-again, `near_miss {score}` when score is between 88 and 94.9 (so close to the 95 "INHUMAN" band).
- Seeded RNG: mulberry32 from `?seed=` (copy from reference). NEVER call Math.random directly.
- **Demo mode** (`?demo=1&seed=7`): no human input. The game draws a stroke by itself, point by point (~60 points over ~3s), of a good-but-beatable circle (target score between 86 and 89: generate points on a circle of radius 130 centered at (202, 330) with smooth seeded wobble — precompute the wobble so the score is deterministic). Show the scoring reveal, hold the result ~2.5s, then show a CTA overlay (dark scrim, game name huge, "most people can't beat 87%", vermillion "▶ PLAY NOW", teal "link in bio") for ~3.5s, then set `window.__demoDone = true`.
- **Bot mode** (`?bot=1&runs=N&seed=5`): like demo but noisier circles (score anywhere 40–90), no CTA, runs N rounds back-to-back (auto try-again ~800ms apart), then set `window.__botDone = true`.
- Human mode ignores demo/bot autopilot code paths; demo/bot ignore human input.
- No external network requests, no external fonts/images/libs. Everything inline. Silent (no audio).
- Title screen (human mode only): game name, one-line dare ("nobody draws 95%"), pulsing "DRAW A CIRCLE".

## copy.md format

```
# Perfect Circle — copy
## TikTok (3 captions ≤100 chars, hook-first, ego-bait angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Captions must weaponize the ego-bait: viewer sees 87% and KNOWS they can do better. No emojis in titles; ≤2 per caption. No hype words ("insane", "crazy").

Write both files now. Do not modify ANY other file. Do not add build steps.
