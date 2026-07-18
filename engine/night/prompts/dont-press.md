You are a game-implementation worker for the Tilt games site. Your ONLY deliverables are two files:

1. `web/site/games/dont-press/index.html` — the game (single self-contained file)
2. `web/site/games/dont-press/copy.md` — social captions

FIRST: Read `web/site/games/stack-rush/index.html` end to end. It is the reference implementation of the contract below — match its structure, style, and conventions exactly (canvas setup, mode handling, seeded RNG, event emission, CTA card).

## The game: DON'T PRESS

A single red button labeled "DO NOT PRESS". That's the whole screen. Every press triggers an escalating consequence. The game is finding out what happens next.

- **Escalation ladder (by total press count, persisted in localStorage):** design ~18 milestones from 1 to 100. Examples to implement: #1 "seriously?"; #3 the button dodges your finger once; #5 screen hairline-cracks (draw cracks); #8 the button sulks in a corner, smaller; #12 gravity flips the UI upside down for 3s; #16 fake "system alert: user is STILL pressing"; #20 the counter starts mocking ("your record is meaningless"); #25 confetti that immediately un-confettis itself; #30 the button multiplies into 9 decoys (only the real one counts, seeded position); #40 screen inverts colors for one press; #50 a fake "achievement: HALFWAY TO NOTHING"; #66 the button plays dead (grayscale, "you did this"); #75 everything trembles; #90 dramatic countdown text "10 more…"; #100 the payoff: the screen goes calm, one line — "that's it. that's what happens. (press to start over)" — then it truly resets to 0. Fill remaining milestones with short mocking lines above the button.
- **Between milestones:** every press still reacts (tiny squash-and-stretch on the button, terse counter tick) so pressing always feels alive.
- **The psychological angle (curiosity gap):** the ONLY driver is "what happens at N?". The counter + next-unknown-milestone is the loop. End-of-clip question = comment bait ("what happens at 100? don't spoil it").

## Contract (MUST match — the site engine depends on it)

- Canvas: internal coordinates 405x720 (9:16), scaled to fit the window, devicePixelRatio-aware (copy the `fit()` pattern from stack-rush).
- Palette: bg `#0b0d12`, vermillion `#e8502e` (the button), teal `#2ec5b6`, gold `#f2b134`. Fonts: -apple-system / Menlo like the reference.
- Include, in this order, before your game script:
  `<script>window.LOOP_GAME = 'dont-press';</script>`
  `<script src="../../js/loop-events.js"></script>`
- Events via `window.LOOP && LOOP.emit(...)`: `play_start` on the first press of the session, `press {n}` every press, `milestone {n}` at each milestone, `game_over {score, dur_s}` every 10 presses and on tab-hide (score = total presses this session; the player never sees an "end"), `restart` at the #100 reset.
- Seeded RNG: mulberry32 from `?seed=` (copy from reference). NEVER call Math.random directly.
- **Demo mode** (`?demo=1&seed=7`): no human input. An invisible auto-presser presses at a lively human cadence (~350ms, small jitter), racing from 0 with milestone moments visibly landing (dodge at #3, cracks at #5, upside-down at #12, decoys at #30 — speed up the cadence between milestones so the demo reaches #30 by ~14s). Freeze on the 9-decoy chaos ~2s, then CTA overlay (dark scrim, "DON'T PRESS" huge, "what happens at 100?", vermillion "▶ FIND OUT", teal "link in bio") ~3.5s, then `window.__demoDone = true`.
- **Bot mode** (`?bot=1&runs=N&seed=5`): presses at seeded 150–400ms cadence, 25 presses per run, then `window.__botDone = true`. No CTA. Don't persist bot press-counts to localStorage.
- Human mode ignores demo/bot autopilot code paths; demo/bot ignore human input.
- No external network requests, no external fonts/images/libs. Everything inline. Silent.
- No title screen: the button + "DO NOT PRESS" IS the first frame.

## copy.md format

```
# DON'T PRESS — copy
## TikTok (3 captions ≤100 chars, hook-first, curiosity-gap angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Captions open the gap and forbid ("don't press it", "do NOT get to 30", "what happens at 100 — no spoilers"), ≤2 emojis per caption, none in titles, no hype words.

Write both files now. Do not modify ANY other file. Do not add build steps.
