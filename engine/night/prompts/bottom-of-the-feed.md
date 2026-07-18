You are a game-implementation worker for the Tilt games site. Your ONLY deliverables are two files:

1. `web/site/games/bottom-of-the-feed/index.html` — the game (single self-contained file)
2. `web/site/games/bottom-of-the-feed/copy.md` — social captions

FIRST: Read `web/site/games/stack-rush/index.html` end to end — it is the reference implementation of the contract (canvas setup, fit(), seeded RNG, mode handling, event emission, CTA card). This game is the CALM engine flagship: slow, breathtaking, zero pressure. It was designed from mined Reddit research — the copy section below includes the users' literal words; respect them.

## The game: Bottom of the Feed

A feed-shaped descent that ENDS. The player swipes/scrolls downward — the exact gesture of doomscrolling — through one continuous, gorgeous deep-sea world. And unlike their feed, this one has a bottom.

- **Input:** vertical swipe/drag (pointer) and mouse wheel both add downward momentum with soft inertia (glide + gentle friction, never abrupt). No taps needed. The descent only goes down.
- **The world (IMPACTING IMAGERY — this is the whole point, spend your effort here):** a vertical ocean ~30,000px deep rendered as layered depth: (a) background gradient shifting with depth from teal-lit water `#0e3a3f` → deep indigo `#101228` → near-black `#07070d`; (b) 3 parallax layers of drifting motes/plankton; (c) soft god-rays near the surface that fade by 20% depth; (d) seeded bioluminescent creatures that drift by and GLOW as you pass them (jellyfish = translucent bell + trailing tentacles with glow; small fish schools = coordinated dots; rare long silhouette of a whale crossing at ~60% depth — build these from canvas primitives + shadowBlur glow, they must feel alive via slow sine sway); (e) occasional soft text whispers in the water (see below).
- **Soft variable reward (Circuit 01, gentle):** every so often (seeded, ~8-12 times total) a creature pulses brighter as you pass and a soft ring expands — a "found" moment. A tiny counter bottom-right: "N found". No points, no timer, no fail state.
- **Breath pacing (Circuit 07):** below 50% depth, maximum scroll speed gradually decreases (the water "thickens") so the final stretch moves at a slow drift regardless of how hard they swipe — the pace itself calms down.
- **Depth whispers:** faint text lines that drift by at set depths, fading in/out (use EXACTLY these, in this order): "you've scrolled 900 ft" (12%) · "no ads down here" (25%) · "the unconscious scroll — you'd normally not notice the time" (40%) · "it gets quieter" (55%) · "almost" (75%) · "most feeds never let you reach this" (88%).
- **THE BOTTOM (the payoff):** at full depth the seafloor resolves — a luminous seafloor garden (glowing anemones/plants swaying, built from primitives) and the words, appearing slowly: "the bottom." … "your feed doesn't have one. this one does." … "found tonight: N lights" … "come back tomorrow — the sea remembers." Then a gentle "◦ surface" button (human mode) that resets to the top. The ending must feel like an exhale, not a game-over.
- **Memory artifact (Circuit 08, anti-dissociation):** persist to localStorage: date of each completed descent + lights found. On return, near the surface show a small shelf line: "descents: N · lights: M". Human mode only.

## Contract (MUST match — the site engine depends on it)

- Canvas: internal coordinates 405x720 (9:16), scaled to fit the window, devicePixelRatio-aware (copy the `fit()` pattern from stack-rush).
- NO vermillion in this game (calm engine): palette = deep teals, indigo, soft cyan glow `#7fe8dc`, pale gold glow `#f2d9a0` for "found" moments.
- Include, in this order, before your game script:
  `<script>window.LOOP_GAME = 'bottom-of-the-feed';</script>`
  `<script src="../../js/loop-events.js"></script>`
- Events via `window.LOOP && LOOP.emit(...)`: `play_start` on first downward input of a descent, `found {n, depth_pct}` per glow-found, `game_over {score, dur_s}` when the bottom is reached (score = lights found) AND on tab-hide mid-descent (score = lights so far), `restart` when "surface" is tapped.
- Seeded RNG: mulberry32 from `?seed=` (copy from reference). NEVER call Math.random directly. Creature placement and found-moments are seeded.
- **Demo mode** (`?demo=1&seed=7`): no human input. An invisible thumb scrolls the descent compressed to ~16s of wall time (auto-momentum, ~4 visible found-pulses, the whale, visibly slowing near the end), reaches the bottom, holds the full bottom text ~3s, then CTA overlay (very soft scrim, "BOTTOM OF THE FEED" in soft cyan, "your feed doesn't have a bottom. this one does.", "▶ REACH IT" in pale gold, "link in bio" teal) ~3.5s, then `window.__demoDone = true`.
- **Bot mode** (`?bot=1&runs=N&seed=5`): auto-scrolls at constant fast momentum, reaches bottom (~8s), emits game_over, resets, N runs, then `window.__botDone = true`. No CTA, no localStorage persistence.
- Human mode ignores demo/bot autopilot code paths; demo/bot ignore human input.
- No external network requests, no external fonts/images/libs. Everything inline. Silent.
- First-visit hint (human only): "swipe down. that's all." — fades permanently after the first swipe.

## copy.md format

```
# Bottom of the Feed — copy
## TikTok (3 captions ≤100 chars)
## Reels (3)
## Shorts titles (3)
## Hashtags (5)
```

Copy MUST be built from the mined verbatim bank (these are real doomscrollers' words):
- "the unconscious scroll where you don't notice 40 min passed"
- "our brains were not built for the endlessness — the lack of edges"
- "every night I promise myself tomorrow will be different"
- The lead formula: "the worst part isn't the wasted hours. it's not remembering them."
Angle: it doesn't block the itch — it finishes it. ≤2 emojis per caption, none in titles, no hype words, no shame language (never scold the user).

Write both files now. Do not modify ANY other file. Do not add build steps.
