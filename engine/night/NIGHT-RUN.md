# NIGHT RUN — 2026-07-17 overnight orchestration

## ✅ WAKE-UP SUMMARY (for Manuel, ~03:05 ET)

**Done: 10 games live on Tilt, 10 hook clips (each on a named psych trick), 10 copy files, all through the engine.**

- Preview: `npm run serve` → http://127.0.0.1:4620/ (or `node engine/loop.mjs serve`)
- Clips: `web/site/clips/` (9:16 1080x1920 mp4, 10–29s)
- Copy: `web/site/games/<id>/copy.md` (TikTok/Reels/Shorts + hashtags)
- The library: stack-rush (competitive TOP-5%, your spec), lab-rat (shock-honesty), perfect-circle (ego-bait 87%), reflex-duel (F1 benchmark), ten-seconds (near-perfection itch), drift-garden (calm/completion — first wean-engine game), hold-on (loss aversion "bank it!"), odd-one (playable clip + comment bait), dont-press (curiosity gap), memory-nine (7±2 benchmark)
- Workers: 10 headless Claude Code runs on YOUR Ollama cloud (kimi-k2.7-code ×7 — 6/7 passed first try; glm-5.2 copy ×1; deepseek ×2 — 1 pass 1 empty). 3 bugs total, all caught by validation gate + frame QA, all fixed by orchestrator.
- ⛔ Nothing posted/deployed externally. Your go-live call is unchanged: Vercel deploy + clip posting.
- Your next move: open the site, watch 2-3 clips (`stack-rush`, `dont-press`, `hold-on` are the strongest), then say go/no-go on deploy + posting.

> **READ THIS FIRST after any autocompact.** This file is the durable state of the
> overnight loop. DIR: `/Users/manuel/coo/attention-architecture`

## Mission (Manuel, 2026-07-17 ~01:30 ET)

Run all night as orchestrator. Wake-up deliverable: **a viral game library with
videos and copy**. Research games online + pain points + copy; implement games
into `web/site/games/`; every video leverages a psychological trick. Use
**Ollama cloud (Chinese OSS models)** via headless Claude Code workers for
code-writing so Anthropic usage stays low — orchestrate, don't hand-write.
⛔ Nothing deploys/posts externally (standing gate).

## Worker protocol (PROVEN 01:40 ET)

```bash
# spawn (background it): writes code through Manuel's Ollama subscription
./engine/night/worker.sh <model> <prompt-file> <log-file>
# models (cloud, verified live): kimi-k2.7-code:cloud (primary),
#   glm-5.2:cloud, deepseek-v4-pro:cloud, qwen3.5:cloud, minimax-m3:cloud
# validate a produced game (bot + demo modes must complete, events must flow):
node engine/night/validate-game.mjs <game-id>
# then run it through the factory (clip + site + measure + learn):
node engine/loop.mjs run --seed 7   # picks top Signal trend — add trend first
```

Worker rules: prompts live in `engine/night/prompts/`, logs in
`engine/night/logs/`. Workers get `Read Glob Grep Write Edit` + acceptEdits
only — no Bash, no network. If a worker's game fails validation twice, fix it
yourself (orchestrator) or drop the game and log why.

## The angle system (psych trick per video — Manuel's direction)

Each game's demo mode IS the video. Each video weaponizes ONE psych trick:

| # | Game | Trick | Video beat |
|---|------|-------|-----------|
| 1 | stack-rush | **competitive instinct / social comparison** (Manuel's spec) | deep run, very thin blocks, viewer expects the fail → fail hits → score + "TOP N% TODAY" → "think you can go further?" |
| 2 | lab-rat | **shock-honesty** (done 07-17) | game narrates its own manipulation → "Subject: you" |
| 3 | perfect-circle | **ego bait** ("most people can't score 90%") | a decent-but-beatable attempt → 87% → viewer is CERTAIN they can beat it |
| 4 | reflex-duel | **benchmark ego bait** (vs average human / F1 driver) | 3 rounds, clip shows 0.19s "faster than 92%… but not an F1 start (0.15s)" |
| 5 | ten-seconds | **near-perfection itch** (9.98… SO close to 10.00) | two near-perfect stops → the itch to try is unbearable |
| 6+ | from research | curiosity gap / loss aversion / watch-till-end | TBD by research ticks |

## Status board (update every tick)

| game | code | validated | clip | copy | engine run | notes |
|------|------|-----------|------|------|-----------|-------|
| stack-rush | LIVE | ✓ | ✓ **v2 TOP-5% angle (01:55)** | ⬜ | ✓ 07-16 | 12.5s: deep thin-block run → fail → TOP 5% → CTA |
| lab-rat | LIVE | ✓ | ✓ | ⬜ | ✓ 07-17 | |
| perfect-circle | LIVE (worker #1, kimi) | ✓ 8/8 first try | ✓ 10.7s | ✓ (worker) | ✓ 07-17 05:48 | nit: CTA says "beat 87%", demo scored 89% — tune later |
| reflex-duel | LIVE (worker #2, kimi) | ✓ 8/8 first try | ✓ 15.4s | ✓ (worker) | ✓ 07-17 05:56 | lights + "WAIT FOR IT…" verified |
| ten-seconds | LIVE (worker #4, deepseek-v4-pro) | ✓ 8/8 first try | ✓ 29.1s (long — trim later?) | ✓ (worker) | ✓ 07-17 05:57 | blind "?.??" beat verified |
| drift-garden | LIVE (worker #5, kimi) | ✓ 8/8 after 1 orchestrator fix (bot play_start) | ✓ 22.3s | ✓ (worker) | ✓ 07-17 06:04 | CALM engine live — soft pastel garden verified |
| hold-on | LIVE (worker #6, kimi) | ✓ 8/8 first try | ✓ | ✓ (worker) | ✓ 07-17 06:12 | gold risk-circle verified |
| odd-one | LIVE (worker #7, kimi) | ✓ 8/8 | ✓ 10.1s (after orchestrator fix) | ✓ (worker) | ✓ 07-17 06:18 | BUG CAUGHT IN QA: tileMetrics missing `n` → all coords NaN → clip rendered NO grid (validation passed because bot taps by index — LESSON: frame-check every clip, the gate can't see pixels). 1-property fix + recapture. |
| dont-press | LIVE (worker #8, kimi) | ✓ 8/8 first try | ✓ (escalation ladder verified: dodge/CRACK/GRAVITY/SYSTEM ALERT) | ✓ (worker) | ✓ 07-17 | curiosity-gap clip is the night's best |
| memory-nine | LIVE (attempt 2, kimi) | ✓ 8/8 | ✓ 28.6s (montage verified) | ✓ (worker) | ✓ 07-17 | attempt 1 (deepseek-v4-pro) exited 0 but wrote NOTHING (empty transcript; note deepseek DID build ten-seconds fine — flaky, not broken; kimi = primary) |

## Copy spec

Per game: `web/site/games/<id>/copy.md` — 3 TikTok captions + 3 Reels captions
+ 3 Shorts titles, each ≤100 chars, hook-first, using the game's psych trick;
plus 5 hashtags. Workers draft, orchestrator trims hype.

## Post-night addendum (2026-07-17 morning)

- **~10:45** Manuel's directive: adapt the DESKTOP_ARCHIVE "how to write ads" pain-diving playbook to mine LATENT game demand. Built `mine_latent.py` (authed reddit-direct), harvested 105 posts / 8 threads → `state/mined/`. UMP mined verbatim: "feeds have no edges"; blockers = walls not endings.
- **~15:00** Flagship calm game **bottom-of-the-feed** (worker: kimi, 1 orchestrator fix — `dt` scoping in autopilot) → validated 8/8 → engine run `14-58-21-s7` → clip QA'd frame-by-frame (descent + THE BOTTOM payoff + REACH IT CTA all land) → copy.md built from the verbatim bank. **Site = 11 games (9 viral + 2 calm).** Playbook: `docs/latent-game-mining.md`. Re-run miner weekly.

- **~12:30** **plunge** (Manuel's ecstasy-fail + coordination-chain concept) LIVE: 3-lane directional swipes, 5 telegraphed stages, empirically tuned (bot-with-human-error death distribution: avg 18.0, band 15–25 = "average sustains ~20 moves" spec). 3 orchestrator fixes (spawn deadlock, tuning ×2, demo banner double-fire). Clip 25s QA'd: montage → shatter bloom → score card → "the fail is the best part." **Site = 12 games (10 viral + 2 calm).**

## V2 PROGRAM (2026-07-17 afternoon — Manuel's directive)

Contract v2 (`docs/game-contract-v2.md`): juice + synthesized sound (juice.js),
mirror-neuron demos (challenge card → human hesitation → near-fail+save → fail
→ DARE CTA + `__demoScore`), sharing/dares (share.js, `?dare=`), analytics v2
(loop-events v2: restart_latency/session_end/variant tags; `loop.mjs report` →
pleasure/dopamine/addiction indices), site v2 (mobile 2-col, chips, lazy video,
/g/<id>.html hubs with variants), variants A/B (registry.variants, contract §7).

### Retrofit board (12 games + new ones)

| game | v2 status |
|---|---|
| stack-rush | ✅ REFERENCE (orchestrator; clip 13.4s: chases 33, dies at 32 — one short, intentional keep) |
| lab-rat | ✅ v2 (kimi) — validated, clip 28.6s recaptured |
| plunge | ✅ v2 (kimi) — validated, clip 27.6s recaptured |
| perfect-circle | ✅ v2 (kimi) — validated, clip 11.7s recaptured |
| hold-on | ✅ v2 (glm-5.2) — validated, clip 26.4s recaptured |
| drift-garden | ✅ v2 (kimi, calm rules) — validated, clip 23.2s recaptured |
| scroll-sprint | ✅ NEW GAME LIVE (kimi) — 1 orchestrator fix (Date.now vs performance.now → odometer stuck at 0, caught by frame QA); engine run done, clip 20.8s: BEAT 38 FT card → race → 41 FT 2 IN → "his thumb did 41.2 ft. yours?"; site = 13 games |
| bottom-of-the-feed | ✅ v2 (kimi, calm) — clip 29.7s |
| reflex-duel | ✅ v2 (kimi) — clip 25.7s |
| ten-seconds | ✅ v2 (kimi) — clip 18.6s |
| odd-one | ✅ v2 (kimi) — clip 10.1s |
| memory-nine | ✅ v2 (kimi) — clip 36.4s (long; trim candidate) |
| dont-press | ✅ v2 (kimi) — 1 orchestrator fix (hitStop set but never decayed → first milestone froze the autopilot forever; add decay in frame). clip 21.9s |

**PROGRAM COMPLETE 2026-07-17 ~13:50: 13/13 games on Contract v2** (sound, juice,
mirror-neuron demos, dares, analytics). All validated 8/8, all clips recaptured,
mid-clip pixel spot-checks pass. Site regenerated.

**DESIGN CATALOG: 100 games on conditioned neural paths** (Manuel's directive) —
4 worker batches × 25 through 4 lenses (feed/gesture, social status,
anticipation/intermittency, identity+calm inversions) + 1 curated (#100
spot-the-sponsored). 73 viral / 27 calm. Machine-readable:
`engine/state/design-backlog.json` (ideate's future feedstock). Human catalog:
`docs/design-catalog-100.md`. One cross-batch ID collision (seen-wait — two
models independently invented the same game; convergence = strong signal, build
that one early).

**Sound-dopamine note (Manuel 07-17):** juice.js `hit()` now carries a
variable-ratio auditory reward (~1/8 hits get an unpredictable extra sparkle) —
the RPE spike lives in the sound itself; every game inherits it for free.

Per game when worker lands: validate 8/8 → frame-strip clip QA (MANDATORY) →
recapture → `loop.mjs site`. Variants come AFTER retrofits, bred from `report`.

## Tick log (append, never rewrite)

- **01:30** tick 1 start. Ollama 0.24 verified; qwen3-coder:480b RETIRED (07-15) — current cloud lineup: kimi-k2.7-code, glm-5.2/5.1, deepseek-v4-pro/flash, qwen3.5, minimax-m3/m2.7. Headless worker smoke test PASSED (kimi wrote file via `ollama launch claude --model X -- -p ... --permission-mode acceptEdits`).
- **01:45** worker #1 launched (perfect-circle, kimi-k2.7-code:cloud, prompt `prompts/perfect-circle.md`, log `logs/perfect-circle-1.log`). NOTE: worker.sh needs `cd` into repo — background shells reset cwd; always launch with absolute paths.
- **01:55** stack-rush video angle v2 DONE by orchestrator (Manuel's spec): demo opens mid-run at 27 blocks tapering to 56px, six thinning placements, fail at 33 → "TOP 5% TODAY / better than 95% of players" → "think you can go further?" CTA. Clip recaptured (12.5s), frames verified. Percentile now also shows on human game-over (competitive hook in-game, not just in-video).
- **01:57** tick 1 end. Next tick: integrate worker #1 output (validate → engine run), launch worker #2 (reflex-duel), draft copy.md for stack-rush + lab-rat, quick research pass for game #6 angle.
- **03:05** tick 9 (FINAL): memory-nine attempt 2 (kimi) PASSED 8/8, engine run done, clip montage verified. Site = 10 games, full-page screenshot verified (all clips autoplaying). PLAN.md decisions log + memory updated. Loop CLOSED — deliverable complete; remaining polish (ten-seconds/memory-nine clip trims to <25s, site card ordering) is optional and listed for Manuel. Anthropic spend = orchestration + QA only; all game/copy code written by Ollama cloud workers.
- **02:5x** tick 7 (worker #7 done + QA pass): odd-one validated but its clip was BLANK (NaN coords bug, see board) — fixed, revalidated, recaptured (grid + finding-ring + unsolved-round freeze verified). perfect-circle CTA nit fixed (number now reads the actual demo score), recaptured. ten-seconds 29s clip reviewed — beats land, trim = optional polish. Engine run for odd-one `06-18-48-s7` (site = 8 games). Launched workers #8 (dont-press, kimi) + #9 (memory-nine, deepseek) IN PARALLEL — the two remaining tricks (curiosity gap, memory benchmark). After they land: MORNING WRAP.
- **02:4x** tick 6 (worker #6 done): hold-on PASSED 8/8 first try, engine run `06-12-32-s7`, site = 7 games. Launched worker #7 (odd-one — 8th and final planned game; its trick: the clip IS playable → pause-and-comment bait). After odd-one: MORNING WRAP (full site screenshot, library QA, PLAN/README/memory update, wake-up summary).
- **02:3x** tick 5 (worker #5 done): drift-garden failed 1/8 (bot mode missing play_start) — orchestrator fixed inline (2-line edit), revalidated PASS, engine run `06-04-55-s7`. Site = 6 games (5 viral + 1 calm). Launched worker #6 (hold-on, loss aversion). Remaining night plan: hold-on → engine; maybe game #8 (curiosity-gap angle); then morning wrap (site check, PLAN/memory update, summary for Manuel).
- **02:2x** tick 4 (workers #2+#4 done): BOTH passed validation 8/8 first try (kimi + deepseek-v4-pro both reliable game workers). Engine ran both: reflex-duel `05-56-02-s7` (15.4s clip), ten-seconds `05-57-15-s7` (29.1s clip). Signal's evidence-demotion sequenced them correctly (0.90 → run → 0.88 next). Site = 5 games, all with copy.md. Research pass: 5-second-explainable + satisfying loops trending; picked game #6 = drift-garden (CALM engine — engine balance was 5v/0c). Worker #5 launched (kimi).
- **02:1x** tick 3 (worker #3 done): glm-5.2 copy for stack-rush + lab-rat ACCEPTED as-is (hook-first, concrete, on-angle — glm-5.2 = copy model). stack-rush + lab-rat copy ✓. Launched worker #4 (ten-seconds, deepseek-v4-pro — testing 3rd model). reflex-duel (worker #2) still building.
- **02:05** tick 2 (woken by worker #1 completion). perfect-circle PASSED validation 8/8 FIRST TRY (kimi-k2.7-code is a capable game worker). Engine run `2026-07-17T05-48-24-s7`: clip 10.7s (live-drawn circle → 89.0% + "top 19%" → CTA), site = 3 games, verdict SUSPEND_LEARN (same synthetic cohort — expected). Launched worker #2 (reflex-duel, kimi) + worker #3 (copy-batch-1 for stack-rush/lab-rat, glm-5.2 — testing 2nd model). Next tick: validate reflex-duel → engine run; review glm copy; launch worker #4 (ten-seconds); research pass for game #6+.
