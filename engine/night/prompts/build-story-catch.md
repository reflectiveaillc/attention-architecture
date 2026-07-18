You are a game-implementation worker for the Tilt games site. Deliverables:

1. `web/site/games/story-catch/index.html` — the game (single self-contained file)
2. `web/site/games/story-catch/copy.md` — social captions

READ FIRST (mandatory): `docs/game-contract-v2.md` (the FULL contract — includes order, J.* sound hooks, hit-stop/shake/zoom juice, mirror-neuron demo, sharing) and `web/site/games/stack-rush/index.html` (the reference v2 implementation — copy its patterns exactly: fit(), seeded mulberry32 RNG, challenge phase, demoWaits hesitation, MUTE_R/SHARE_R + inR + coordinate-passing input, dareBeaten flow, window.__demoScore, ctx.save/restore around juice transforms, mute toggle).

## The game: STORY CATCH

- **Conditioned path (the hook):** stories 24h FOMO (the story bar of decaying rings you scramble to watch before they expire). The player's thumb already knows this move from Instagram/TikTok — the game IS that move.
- **Mechanic:** A row of story bubbles drifts in, each with a 24h ring depleting around it. Tap each ring at peak brightness (full ring) to 'catch' it; tap too late and it expires and breaks your combo. Speed ramps as rings appear faster.
- **Engine:** viral. **Circuits:** 01-rpe, 04-loss, 02-novelty.
- **Video trick:** FOMO catch (invented) — the ring is draining, catch it before it's gone — the demo/hook clip must land this.

## Contract requirements (v2 — all of it)

- Canvas 405x720, dpr-aware (fit() from reference). Palette: ink #0b0d12, vermillion #e8502e, teal #2ec5b6, gold #f2b134. Fonts -apple-system / Menlo.
- Includes in order: `window.LOOP_GAME='story-catch'` → loop-events.js → juice.js → share.js.
- **Sound (juice.js):** wire moments to J.hit(combo)/J.perfect/J.gold/J.near/J.tension(x)/J.death(mag)/J.fanfare per contract §2.
- **Visual juice §3:** hit-stop on big hits, decaying screen shake, zoom-pulse on criticals, floating reward text. Wrap frame draw in save/transform/restore. CRITICAL: if you use hitStop to freeze the sim, DECAY it every frame (`if (hitStop>0) hitStop-=dt; else autopilot()`) — never gate the autopilot on hitStop without decaying it.
- **Events:** play_start, game_over {score, dur_s}, near_miss (if applicable), restart, plus game-specific verbs. Score must be a meaningful number.
- Dares: score card shows "⚡ DARE A FRIEND" → SHARE.send({score, unit: 'caught'}); incoming ?dare= shows "BEAT <n>" banner + SHARE.beaten() when passed.
- **Demo mode** (?demo=1&seed=7): no input; mirror-neuron arc: challenge card "SCORE TO BEAT — <n>" (~1.2s) → human-feeling play WITH hesitation (varied timing) → a near-fail + recovery at ~60% → the real fail (spectacle) → score card "TOP N% TODAY" (~2.2s) → CTA card (game name, "▶ BEAT <n>" vermillion, "link in bio") ~3.5s → set window.__demoScore=<final> and window.__demoDone=true. Total ~18-24s.
- **Bot mode** (?bot=1&runs=N&seed=5): imperfect autopilot, N runs, completes with window.__botDone=true. No CTA. MUST reach game_over so validation passes.
- Human ignores autopilots; autopilots ignore human input. Seeded RNG everywhere. No external resources (no network/fonts/images/libs). Mute toggle corner (human only). Silent clips (audio is for play only).

## copy.md format

```
# STORY CATCH — copy
## TikTok (3 captions ≤100 chars, hook-first, FOMO catch (invented) — the ring is draining, catch it before it's gone angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```
Captions ≤2 emojis, none in titles, no hype words. Lean on the conditioned path (the viewer recognizes the gesture).

Write both files now. Do not modify ANY other file. No build steps. Output "BUILD DONE: story-catch" when finished.
