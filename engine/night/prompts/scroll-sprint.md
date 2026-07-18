You are a game-implementation worker for the Tilt games site. Your deliverables:

1. `web/site/games/scroll-sprint/index.html` — the game (single self-contained file)
2. `web/site/games/scroll-sprint/copy.md` — social captions

READ FIRST: `docs/game-contract-v2.md` (the full contract — juice, sound, mirror-neuron demo, sharing) and `web/site/games/stack-rush/index.html` (the reference v2 implementation — copy its patterns: includes order, J.* hooks, hit-stop/shake/zoom, challenge phase, SHARE zones, coordinate-passing input, `window.__demoScore`).

## The game: Scroll Sprint

**How far can your thumb scroll in 10 seconds?** Measured in real-world distance — feet and inches. A race against the clock and everyone you dare.

- **Run flow:** tap to arm → "3, 2, 1, GO" (600ms per count, punchy) → 10.00s countdown → scroll/swipe down as fast as humanly possible (pointer drag + wheel both count; only DOWNWARD motion adds) → time's up → the distance card.
- **Distance is real:** accumulate scrolled CSS pixels ÷ 96 = inches → display feet + inches (e.g. `41 ft 7 in`). Also compute average speed in mph (`inches / 10s` → mph, 1 mph = 17.6 in/s) — "2.9 mph of pure thumb".
- **Live HUD (the dopamine):** a huge odometer counting feet (rolling-digit feel — the number must BLUR upward when fast), a speed needle/bar that surges with instantaneous velocity, motion-streak lines down the shaft that intensify with speed, `J.tension(speed01)` riser + `J.tick()` every full foot + `J.hit(ft)` every 10 ft milestone. The screen must FEEL like velocity.
- **Milestone flashes:** at 10/20/30/40 ft: gold flash "+10 FT" + zoom-pulse + shake. Final 3 seconds: countdown turns vermillion and pulses (urgency spike).
- **The distance card:** distance HUGE ("41 FT 7 IN"), "that's 2.9 mph of thumb", benchmark line by distance (≥55 ft "your thumb is an athlete — top 2%", ≥45 "top 9%", ≥35 "faster than most", ≥25 "average thumb (29 ft)", else "warm-up lap?"), best from localStorage, `J.fanfare()` on new best, share pill "⚡ DARE A FRIEND" → `SHARE.send({score: <feet with 1 decimal>, unit: 'ft'})`, "TAP — RACE AGAIN".
- **Incoming dares:** `SHARE.dare` → banner "BEAT <dare> FT" during the run; live: when the odometer passes the dare mid-run, flash "DARE BEATEN" + `SHARE.beaten(ft)` + `J.fanfare()`. The player should beat the dare WHILE racing — that's the peak moment.
- **Circuits:** 03 social-compare (the race), 01 RPE (milestones), 02 novelty (absurd real-world units).

## Contract requirements (v2 — all of it)

- Canvas 405x720 dpr-aware (`fit()` from reference), palette ink/vermillion/teal/gold, includes in order: `LOOP_GAME='scroll-sprint'` → `loop-events.js` → `juice.js` → `share.js`.
- Events: `play_start` (on GO), `milestone {ft}` per 10ft, `game_over {score, dur_s}` (score = total feet, 1 decimal; dur_s = 10), `restart`, plus near_miss is N/A (omit).
- Seeded RNG mulberry32 from `?seed=` for any visual variance. No external resources. Mute toggle corner.
- **Demo mode** (`?demo=1&seed=7`): challenge card "BEAT — 38 FT" (~1.2s) → 3-2-1-GO → a scripted HUMAN race: bursts of frantic scrolling with micro-pauses (thumb repositioning!), speed surging and dipping, milestone flashes at 10/20/30, a visible late surge in the final vermillion seconds that JUST passes 38 ft (near-fail beat: at 8s it's at 33 ft — looks lost — then the surge), ends at 41.2 ft → distance card ~2.4s → CTA (dark scrim, "SCROLL SPRINT" huge, "his thumb did 41 ft. yours?", vermillion "▶ BEAT 41 FT", teal "link in bio") ~3.5s → `window.__demoScore = 41.2; window.__demoDone = true`. Total ~19s.
- **Bot mode** (`?bot=1&runs=N&seed=5`): synthetic scroll velocity waves for the full 10s (final distance seeded 22–48 ft), ~400ms between runs, then `window.__botDone = true`. No CTA.
- Human ignores autopilots; autopilots ignore human input.

## copy.md format

```
# Scroll Sprint — copy
## TikTok (3 captions ≤100 chars, race/dare angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Angle: the absurd concrete stat + the dare ("41 ft in 10 seconds", "average thumb: 29 ft", "dare your slowest friend"). ≤2 emojis per caption, none in titles, no hype words.

Write both files now. Do not modify ANY other file.
