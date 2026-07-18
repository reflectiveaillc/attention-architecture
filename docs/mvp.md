# MVP — the first thing to actually ship

> Source: `/Users/manuel/coo/attention-architecture/docs/mvp.md`

The full LOOP factory is expensive to build. Validate the thesis for the price of **one game** instead.

## Goal
Prove (or falsify) that a single-circuit viral game + an AI/screen-captured hook clip can clear the target bars on TikTok/Reels. If it can, the factory thesis is worth automating. If it can't, we learned it for the cost of one game, not a factory.

## The game: Stack Rush
- **Mechanic:** tap to stack a moving block on a tower; the overhang gets trimmed, a near-miss leaves a sliver, a miss ends the run. One-tap. Instant restart.
- **Circuits hit:** 01 RPE (every placement is a variable reward — perfect/wobble/trim), 04 loss/FOMO (the run you'll lose), 06 Zeigarnik ("one more try" — the open loop).
- **Engine:** viral.
- **Clip-worthiness:** the near-miss sliver is the shareable fail. Built to be the clip.

## The clip
- Screen-capture the game's opening 3s (satisfying perfect-stack) + a scripted near-miss that ends the run.
- On-screen CTA: "play it → [link]".
- 9:16, muted-friendly (motion + text carry it).
- No separate AI video pipeline yet — see `hook-video.md` "MVP shortcut".

## Instrumentation (minimal A/B)
- A simple event layer on the game: `clip_landed` (with clip_id + platform referrer), `play_start`, `session_heartbeat`, `d1_return`.
- A landing page that captures the referrer so we can attribute clip→play per platform.
- Store in whatever's already wired (PostHog is already live for AIBG — reuse the same profile pattern). No new infra.

## The four bars (MVP verdict)
- clip→play rate ≥ 12%
- avg session ≥ 2:30
- D1 retention ≥ 18%
- hook-clip CTR ≥ 6%

Clear all four → **R4 (automate the loop) is greenlit.** Miss → pivot: re-cut the clip first (cheaper than rebuilding the game); if a re-cut still misses, the thesis needs revisiting before any factory build.

## Build order (concrete)
1. Build Stack Rush as a single HTML5 canvas file. One mechanic, one-tap, ~1 day.
2. Add the minimal event layer + a referrer-capturing landing page. Host on Vercel (existing identity). ~half day.
3. Screen-capture the hook clip; add on-screen CTA. ~2 hours.
4. Post to TikTok + Instagram Reels. (Reuse social-autopilot posting pattern.)
5. Watch the bars for 5–7 days. Verdict.

## What this deliberately skips
- The calm/wean engine (R3).
- Automated Signal/Ideate (R4).
- Multi-game catalog, per-game budget, the compounding self-improvement (R5).
- A separate AI hook-video generation pipeline (only worth it after the screen-capture clip clears).

## Why this is the right first move
It's the **warm path**: the framework is done, the control room is done, the distribution autopilot exists, PostHog exists, Vercel exists. The only net-new thing is one tiny game. If one tiny game can clear the bars through an existing distribution channel, the factory is real. If it can't, no factory would have saved it.