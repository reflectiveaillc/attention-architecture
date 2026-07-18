# LOOP — pipeline spec

> Source: `/Users/manuel/coo/attention-architecture/docs/loop-spec.md`
> Companion site: `web/loop-control-room.html`

A self-improving games factory. Discovers, builds, ships, A/B-tests, and scales simple games engineered to hit known circuits (see [`circuits.md`](./circuits.md)). Distributed by AI hook videos (see [`hook-video.md`](./hook-video.md)).

## The loop

```
SIGNAL → IDEATE → QUEUE → PRODUCE → DEPLOY → MEASURE → LEARN
   ↑                                                            |
   └────────────────── evidence feeds back ─────────────────────┘
```

The loop never stops learning. Winners are doubled-down on; losers are killed. Both outcomes return to Signal as evidence about what hits a circuit — so the next batch is smarter than the last.

## Stages

### 1. Signal — trend mining
- **Inputs:** TikTok/Reels/Shorts game-clip trend detection, app-store + itch.io hot charts, hypercasual mechanic patterns, what's working on the public games site already.
- **Output:** a trend feed of mechanics + themes with early virality signal.
- **Owner (R4):** automated scraper + classifier. For MVP (R2): manual pick.

### 2. Ideate — concept + circuit target
- **Per concept:** name, mechanic, theme, **target circuit(s)**, **engine** (viral / calm), and a **hook-clip concept** (what the first 3 seconds show).
- **Output:** a concept card.
- **Owner (R4):** LLM concept generator constrained to circuit taxonomy. For MVP: manual.

### 3. Queue — prioritize
- **Rank by:** predicted leverage × circuit coverage gaps × engine balance (don't over-index on one circuit).
- **Output:** a prioritized queue.
- **Human gate:** Manuel can reprioritize / drop before production spend.

### 4. Produce — build game + hook clip
- **Game:** AI-assisted codegen of a simple single-mechanic game (HTML5/canvas, no backend, $0/use client-side — same model as AIBG tools).
- **Clip:** AI-generate the 9:16 hook video from the hook-clip concept (see `hook-video.md`).
- **Output:** a playable game file + a vertical clip.

### 5. Deploy — site + 3 platforms
- **Site:** publish the game to the public games site (working brand: "Tilt"). One-tap play, no signup wall (Circuit 05).
- **Clips:** publish to YouTube Shorts, Instagram Reels, TikTok, with the site link as CTA.
- **Output:** live game + live clips.

### 6. Measure — A/B test
Per game, four numbers (see `PLAN.md` §5):
- clip→play rate (target ≥ 12%)
- avg session length (target ≥ 2:30)
- D1 retention (target ≥ 18%)
- hook-clip CTR (target ≥ 6%)

Each live game waits in Measure on Manuel's verdict (in the control room: Approve / Suspend). If unresolved, auto-resolves by the bars.

### 7. Learn — double-down or kill
- **Winner:** → "Winners" (scaled). More distribution budget, more variants, the mechanic promoted to Signal as a proven pattern.
- **Loser:** → "Suspended" (killed). The mechanic demoted in Signal as a known weak pattern.
- Both feed back to Signal. The next batch inherits the evidence.

## Two engines

**Viral** — high arousal, built to be the clip. Circuits: 01 RPE, 02 novelty, 03 social, 04 loss/FOMO, 06 Zeigarnik. Lead candidate: **Stack Rush** (near-miss tower stack).

**Calm / Wean** — for users weaning off the scroll. Same circuits, gentle delivery, no anxiety/outrage. Circuits: 01 soft variable reward, 02 gentle novelty, 05 ease, 07 timing/breath, 08 garden investment. Lead candidate: **Drift Garden** (tap-to-bloom).

Color convention (carried from the dossier): **vermillion = viral/exploit, teal = calm/humane.**

## Segmentation (R3+)
Detect social-addiction signals (late-night long sessions, repeated short-session patterns) and route the **calm** catalog to those users. This is Circuit 07 (timing) applied humanely — hit them at low resistance with the *soothing* loop, not the exploiting one.

## Control room (current artifact)
`web/loop-control-room.html` is a browser simulation of this pipeline. A tick engine advances cards through the stages every ~2.6s, generates metrics for games reaching Measure, and auto-resolves unresolved games by the target bars. Manuel's approve/suspend decisions + design-gate verdict + feedback persist to `localStorage`. It is a *visualization of intent*, not the live system.