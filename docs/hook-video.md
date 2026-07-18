# The AI hook video — distribution spec

> Source: `/Users/manuel/coo/attention-architecture/docs/hook-video.md`

The clip is the trigger. Every game gets one. AI generates a vertical short that fires the circuits *before* the user ever lands on the site.

## Format
- 9:16 vertical, 9–30s.
- Silent-friendly: motion + on-screen text must carry the hook without audio (autoplay feeds start muted). Optional sound design for the ASMR/calm clips (audio is the whole point of the wean engine).

## Structure
1. **Hook — first 3 seconds.** The game's most satisfying opening frame and motion. The brain decides to keep watching before the second tick. Fires Circuit 02 (novelty) + Circuit 01 (uncertain reward — the brain wants to see how it resolves).
2. **Tease — the near-miss / payoff.** A play that almost succeeds (near-miss) or a payoff just out of reach. Fires Circuit 01 (the dopamine gap) + Circuit 06 (Zeigarnik — the loop is left open, only resolvable by clicking through).
3. **CTA — "play now."** The clip resolves only by clicking to the site. The site is the action (Circuit 05, near-zero friction — one-tap, no signup); the game is the variable reward (Circuit 01).

## Per-clip circuits
| Clip element | Circuit fired |
|---|---|
| Satisfying opening motion | 02 novelty |
| Uncertain outcome | 01 RPE |
| Near-miss / open loop | 01 + 06 |
| One-tap "play now" | 05 friction-removal |
| First in-game reward | 01 + 08 (investment starts) |

## Platforms
- YouTube Shorts
- Instagram Reels
- TikTok
- (Piped through the same autopilot posting pattern already used for @miami_google_ads / Rafa — see content-studio/social-autopilot.)

## Per-clip metrics
- **CTR clip → site** (target ≥ 6%)
- **Play rate** once landed (target ≥ 12%)
- **Session length** (target ≥ 2:30)
- **D1 retention** (target ≥ 18%)

Clips that don't convert are re-cut (different hook frame, different near-miss) or killed. The next batch inherits what worked.

## Production stack (open — R4)
Candidate: content-studio/hyperframes (already in the build) for motion + ElevenLabs for the calm-engine ASMR audio. Reuses existing generation art direction (OpenAI gpt-image-2 + Miami context + brand-faithful reference-anchoring) where a game has a brand. For MVP: render the hook directly from the game's canvas (screen-capture the opening seconds) — cheapest path, no separate gen pipeline needed yet.

## MVP shortcut
For the first game, don't build a separate AI video pipeline. Screen-capture the game's own opening + a scripted near-miss, add on-screen CTA text, post. If the clip→play numbers clear, *then* invest in AI-generation. Validate the distribution mechanic with the cheapest possible clip first.