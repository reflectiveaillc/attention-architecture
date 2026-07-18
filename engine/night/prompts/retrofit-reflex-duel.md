You are a game-upgrade worker for the Tilt games site. You will upgrade ONE existing game to Contract v2 (juice + sound + mirror-neuron demo + sharing). The game is named at the END of this prompt.

READ FIRST, in this order:
1. `docs/game-contract-v2.md` — the contract you are implementing.
2. `web/site/games/stack-rush/index.html` — the REFERENCE v2 implementation. Copy its patterns exactly: script includes order, J.* hooks placement, hit-stop/shake/zoom transforms, challenge card phase, demoWaits hesitation, SHARE zones (MUTE_R/SHARE_R + inR + coordinate-passing tap), dare banner + dareBeaten flow, `window.__demoScore`, ctx.save/restore around the juice transforms.
3. The target game's `web/site/games/<id>/index.html` — understand it fully before editing.

## Your job (edit the target game's index.html IN PLACE)

1. **Includes:** add `juice.js` and `share.js` after `loop-events.js` (same relative paths as the reference).
2. **Sound:** wire the game's existing moments to J.* semantic hooks per contract §2. Viral games: hit/perfect/gold/near/tension/death/fanfare. CALM games (drift-garden, bottom-of-the-feed): `J.calm(step)` ONLY — no percussion, no tension riser, no death boom.
3. **Visual juice** per contract §3: hit-stop on big hits, decaying screen shake on impacts, zoom-pulse on criticals, keep existing floating text. Wrap the frame draw in the save/transform/restore pattern from the reference. Do NOT break existing renders.
4. **Demo v2** per contract §4 — REWRITE the demo sequence to the mirror-neuron arc: challenge card (~1.2s, "SCORE TO BEAT — <the demo's final score>" or the game's natural challenge), human hesitation (varied waits), a NEAR-FAIL + RECOVERY beat at ~60%, then the real fail, score card, and a DARE CTA ("BEAT <score>", direct challenge wording). Set `window.__demoScore`. Calm games: settle → deepen → resolve → soft invitation instead (no dare, no challenge card).
5. **Sharing** per contract §9: share pill on the score screen ("⚡ DARE A FRIEND" → `SHARE.send({score, unit})`), incoming-dare banner + `SHARE.beaten`, mute toggle corner. Human mode only. Input handlers must pass canvas coordinates like the reference.
6. **Keep intact:** all existing events, modes (`?demo`,`?bot` completing with `__demoDone`/`__botDone`), seeded RNG, difficulty tuning values, and the game's core mechanics. You are ADDING layers, not redesigning gameplay.

Do not modify any other file. No build steps. When done, output one line: "RETROFIT DONE: <id>".

## Target game

Upgrade `web/site/games/reflex-duel/index.html`. 
