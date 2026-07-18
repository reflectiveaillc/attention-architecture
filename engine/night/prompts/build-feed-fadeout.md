You are a game-implementation worker for the Tilt games site. Deliverables:

1. `web/site/games/feed-fadeout/index.html` — the game (single self-contained file)
2. `web/site/games/feed-fadeout/copy.md` — social captions

READ FIRST (mandatory): `docs/game-contract-v2.md` (the FULL contract — includes order, J.* sound hooks, hit-stop/shake/zoom juice, mirror-neuron demo, sharing) and `web/site/games/stack-rush/index.html` (the reference v2 implementation — copy its patterns exactly: fit(), seeded mulberry32 RNG, challenge phase, demoWaits hesitation, MUTE_R/SHARE_R + inR + coordinate-passing input, dareBeaten flow, window.__demoScore, ctx.save/restore around juice transforms, mute toggle).

## The game: Feed Fadeout

- **Conditioned path (the hook):** the infinite autoplay feed engineered to outlast your willpower. The player's thumb already knows this move from Instagram/TikTok — the game IS that move.
- **Mechanic:** A vertical feed auto-scrolls on its own — you do nothing. As it plays, the scroll tempo slows, the audio fades, and the frames dim. You watch the autoplay mechanism run out of fuel until it stalls on a black frame. The game is letting the feed die instead of feeding it.
- **Engine:** calm. **Circuits:** 05-ease, 07-timing, 06-zeigarnik.
- **Video trick:** the feed that ends — autoplay surrendered to stillness — the demo/hook clip must land this.

## Contract requirements (v2 — all of it)

- Canvas 405x720, dpr-aware (fit() from reference). Palette: ink #0b0d12, vermillion #e8502e, teal #2ec5b6, gold #f2b134 — but CALM games avoid vermillion; use teal/soft tones. Fonts -apple-system / Menlo.
- Includes in order: `window.LOOP_GAME='feed-fadeout'` → loop-events.js → juice.js → share.js.
- **Sound (juice.js):** J.calm(step) only — soft bells, no percussion/tension/death.
- **Visual juice §3:** hit-stop on big hits, decaying screen shake, zoom-pulse on criticals, floating reward text. Wrap frame draw in save/transform/restore. CRITICAL: if you use hitStop to freeze the sim, DECAY it every frame (`if (hitStop>0) hitStop-=dt; else autopilot()`) — never gate the autopilot on hitStop without decaying it.
- **Events:** play_start, game_over {score, dur_s}, near_miss (if applicable), restart, plus game-specific verbs. Score must be a meaningful number.
- This is a CALM game: NO dares, NO challenge card, NO tension riser. Sound = J.calm(step) only. Demo arc: settle → deepen → resolve → soft invitation.
- **Demo mode** (?demo=1&seed=7): no input; scripted calm arc ~16s → soft CTA card (game name, one-line invitation, "▶ REACH IT"/"▶ GROW YOURS" teal, "link in bio") ~3.5s → window.__demoDone=true.
- **Bot mode** (?bot=1&runs=N&seed=5): imperfect autopilot, N runs, completes with window.__botDone=true. No CTA. MUST reach game_over so validation passes.
- Human ignores autopilots; autopilots ignore human input. Seeded RNG everywhere. No external resources (no network/fonts/images/libs). Mute toggle corner (human only). Silent clips (audio is for play only).

## copy.md format

```
# Feed Fadeout — copy
## TikTok (3 captions ≤100 chars, hook-first, the feed that ends — autoplay surrendered to stillness angle)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```
Captions ≤2 emojis, none in titles, no hype words. Lean on the conditioned path (the viewer recognizes the gesture).

Write both files now. Do not modify ANY other file. No build steps. Output "BUILD DONE: feed-fadeout" when finished.
