You are a game-implementation worker for the Tilt games site. Your ONLY deliverables are two files:

1. `web/site/games/drift-garden/index.html` — the game (single self-contained file)
2. `web/site/games/drift-garden/copy.md` — social captions

FIRST: Read `web/site/games/stack-rush/index.html` end to end. It is the reference implementation of the contract below — match its structure and conventions exactly (canvas setup, mode handling, seeded RNG, event emission, CTA card). NOTE: this game is the CALM engine — same contract, opposite mood: slow, soft, zero pressure, no timers, no score anxiety.

## The game: Drift Garden

Tap anywhere; a flower blooms there, slowly and softly. That's it. The garden is the point.

- **Bloom:** each tap grows a procedural flower over ~1.8s: a stem eases up, then 5–8 petals unfold one by one around a center. Petal count, size (18–34px), hue (teal→lavender→rose range, soft pastels on the dark bg), and petal shape roundness come from the seeded RNG — every bloom is a little different (soft variable reward). A faint glow pulses once when a bloom completes.
- **Drift:** completed flowers sway gently (2–3px sinusoidal, different phases). Occasional petal-motes drift upward slowly across the scene.
- **Persistence (investment):** the garden saves to localStorage (positions + flower params) and reloads on return — "your garden is still here." A soft counter bottom-right: "N blooms". At 30 blooms the header whispers "your garden is full — it will keep drifting" (nothing ends; no fail state exists).
- **Breath pacing:** if the player taps faster than one bloom per 1.2s, gently queue the blooms rather than rushing them — the garden sets the pace, never the player.
- **The psychological angle (completion-satisfaction, humane):** the video shows a garden filling bloom by bloom in a satisfying spiral — viewers watch to the end to see it full, then want their own.

## Contract (MUST match — the site engine depends on it)

- Canvas: internal coordinates 405x720 (9:16), scaled to fit the window, devicePixelRatio-aware (copy the `fit()` pattern from stack-rush).
- Palette: bg `#0b0d12`; calm accents — teal `#2ec5b6` primary, soft lavender `#9d8cff`, rose `#e8a0b4`; NO vermillion in this game (vermillion = viral engine). Fonts: -apple-system like the reference.
- Include, in this order, before your game script:
  `<script>window.LOOP_GAME = 'drift-garden';</script>`
  `<script src="../../js/loop-events.js"></script>`
- Events via `window.LOOP && LOOP.emit(...)`: `play_start` on first tap of the session, `bloom {n}` per completed flower, `game_over {score, dur_s}` when the tab is hidden or every 10 blooms (score = total blooms — the engine needs game_over to measure; emit it quietly, the player never sees an end), `restart` never (no fail state).
- Seeded RNG: mulberry32 from `?seed=` (copy from reference). NEVER call Math.random directly. In human mode, seed the RNG from the saved garden's stored seed so reloads regenerate identical flowers.
- **Demo mode** (`?demo=1&seed=7`): no human input. Blooms appear one by one (~900ms apart) at positions along a loose golden-angle spiral from the center outward, 16 blooms total, garden visibly filling; hold the full garden ~2.5s with all flowers swaying; then CTA overlay (soft dark scrim, "DRIFT GARDEN" in teal, "no score. no timer. just yours.", teal "▶ GROW YOURS", "link in bio") ~3.5s, then `window.__demoDone = true`.
- **Bot mode** (`?bot=1&runs=N&seed=5`): plants 8 blooms per run at seeded positions (~400ms apart), emits game_over after each run's 8th bloom, N runs, then `window.__botDone = true`. No CTA. Clear the garden between bot runs (do not persist bot gardens to localStorage).
- Human mode ignores demo/bot autopilot code paths; demo/bot ignore human input.
- No external network requests, no external fonts/images/libs. Everything inline. Silent.
- Title hint (human mode, first visit only): "DRIFT GARDEN" small and calm, "tap to bloom" — fades out permanently after the first bloom.

## copy.md format

```
# Drift Garden — copy
## TikTok (3 captions ≤100 chars, hook-first, calm/satisfying angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Copy sells the exhale, not a challenge: "no score, no timer", "your garden is still there tomorrow", the anti-doomscroll. ≤2 emojis per caption, none in titles, no hype words.

Write both files now. Do not modify ANY other file. Do not add build steps.
