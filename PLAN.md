# PLAN — Attention Architecture / LOOP

> Root: `/Users/manuel/coo/attention-architecture`

This is the master plan. It captures the thesis, the system, the roadmap, every decision, and every open question. Update it as we go — log decisions, don't erase them.

---

## 1. Thesis

Every social interface is designed for a **brain** before it's designed for a person. The conscious user is the last to know. "Engagement" is a proxy for *how many neurological circuits did we fire*.

LOOP takes this seriously as a product thesis: build simple games that deliberately target known circuits, measure which ones hold humans, double-down on winners, kill losers, and feed every result back into the next batch. Two engines share one factory:

- **Viral engine** — high-arousal games built to *be the clip*. Variable reward, near-miss, novelty, social compare. Fills the catalog and the feed.
- **Calm / Wean engine** — for users hooked on the refresh-sound and image-feed dopamine tickle. The *same* circuits (variable reward, tactile, ASMR) delivered without anxiety or outrage. The humane application of the same map.

Distribution is AI-generated hook videos (YouTube Shorts / IG Reels / TikTok): the satisfying opening → a near-miss or payoff → "play now". The clip is the trigger (Circuits 01/02); the site is the action + variable-reward loop (Circuits 05/01); the streak/garden is the investment (Circuit 08). One device fires every circuit.

The framework that names the circuits lives in [`docs/circuits.md`](./docs/circuits.md). The pipeline that uses them lives in [`docs/loop-spec.md`](./docs/loop-spec.md).

## 2. The LOOP pipeline (7 stages, self-improving)

```
SIGNAL → IDEATE → QUEUE → PRODUCE → DEPLOY → MEASURE → LEARN → (back to SIGNAL)
```

1. **Signal** — trend mining across TikTok/Reels/Shorts game clips, app-store + itch.io hot, hypercasual mechanics. Output: a trend feed.
2. **Ideate** — generate a game concept (mechanic + theme + hook-clip concept) tagged with target circuit(s) and engine (viral / calm). Output: a concept.
3. **Queue** — prioritize concepts by predicted leverage + circuit coverage gaps. Output: a prioritized queue.
4. **Produce** — AI-assisted build: code-gen the simple game + AI-generate the 9:16 hook video. Output: a playable game + a clip.
5. **Deploy** — ship the game to the games site; ship the clip to YT Shorts + IG Reels + TikTok. Output: live game + live clips.
6. **Measure** — A/B test per game: clip→play rate, session length, D1/D7 retention, hook-clip CTR. Output: metrics per game.
7. **Learn** — winners → scale (more distribution budget, more variants). Losers → suspend. Both outcomes return to Signal as evidence about what hits a circuit. The next batch is smarter than the last.

Full spec: [`docs/loop-spec.md`](./docs/loop-spec.md).

## 3. The two engines

| | Viral | Calm / Wean |
|---|---|---|
| Intent | shareable thrill | wean off the scroll |
| Arousal | high | low |
| Circuits | 01 RPE, 02 novelty, 03 social, 04 loss/FOMO, 06 Zeigarnik | 01 soft variable reward, 02 gentle novelty, 05 ease, 07 timing/breath, 08 garden investment |
| Risk profile | exploits (deliberate, disclosed) | humane |
| Lead candidate | **Stack Rush** (near-miss tower stack) | **Drift Garden** (tap-to-bloom, soft) |

Open question: which engine ships *first*? Calm is safer to defend and faster to validate; viral is where the reach is. (See Decisions log.)

## 4. Distribution — the AI hook video

- Format: 9:16 vertical, 9–30s.
- Structure: **hook** (satisfying opening, first 3s) → **tease** (near-miss / payoff) → **CTA** ("play now" → site link).
- Platforms: YouTube Shorts, Instagram Reels, TikTok.
- The clip fires Circuits 01 (uncertain reward) + 02 (novelty); the site closes the loop with 05 (low friction) + 06 (open loop) + 08 (investment).
- Per-clip metrics: CTR clip→site, play rate, session length, D1/D7.

Full spec: [`docs/hook-video.md`](./docs/hook-video.md).

## 5. Metrics — what decides a game's fate

Four numbers, with targets (Manuel's dials to set):

| Metric | Target | Verdict |
|---|---|---|
| Play rate (clip → game) | ≥ 12% | below → suspend |
| Avg session length | ≥ 2:30 | below → suspend |
| D1 retention | ≥ 18% | below → suspend |
| Hook-clip CTR | ≥ 6% | below → re-cut or kill |

Clear all bars → **approve & scale**. Miss them → **suspend & learn**. Both feed back to Signal.

## 6. Roadmap

- [x] **R0 — Framework + visualization.** The attention dossier site + the LOOP control-room simulation. (done — `web/`)
- [ ] **R1 — Design review.** Manuel approves or suspends the loop design via the control room. *(open — now reviewable against a real build, not just the simulation)*
- [~] **R2 — MVP.** **Built locally 2026-07-16:** Stack Rush (`web/site/games/stack-rush/`), hook clip captured from its demo mode (`web/site/clips/`), event layer + landing site (`web/site/`), and the 7-stage engine as real code (`engine/`) with one e2e run completed (`engine/state/runs/`). **Remaining to close R2:** Manuel's approval → external deploy (Vercel) + post clips to TikTok/Reels → real traffic replaces the synthetic cohort → 5–7 day verdict. Spec: [`docs/mvp.md`](./docs/mvp.md).
- [ ] **R3 — Second engine.** Ship the first calm/wean game; confirm it holds the scroll-weaned segment.
- [ ] **R4 — Automate the loop.** Wire Signal→Ideate→Produce to real AI pipelines; make the tick real, not simulated.
- [ ] **R5 — Scale.** Multi-game catalog, per-game distribution budget, the self-improving loop actually compounding.

## 7. Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-07-14 | Project created at `/Users/manuel/coo/attention-architecture` | Manuel: persist plans, echo dir for everything |
| 2026-07-14 | Two-engine split: viral (vermillion) + calm/wean (teal) | same neuroscience, opposite intent; color encodes the thesis |
| 2026-07-14 | Control room is a *visualization*, not the live system | nothing deploys until Manuel approves; reversible by default |
| 2026-07-14 | Decisions persist to `localStorage` so feedback survives refresh | Manuel reviews async across sessions |
| 2026-07-14 | MVP = single-circuit viral game + hook clip + A/B instrumentation | validates thesis cheaper than building the full factory |
| 2026-07-16 | Engine implemented as real code (`engine/`): 7 stages, CLI-run, state persisted per run | the control room stays a visualization; the engine is the system |
| 2026-07-16 | Hook clip = Playwright recording of the game's own demo mode → ffmpeg 1080x1920 mp4 | mvp.md "MVP shortcut": cheapest clip first, AI gen pipeline only after it clears |
| 2026-07-16 | Measure = real bot session through the real event pipe + seeded synthetic cohort (labeled `mode:synthetic`) | clips aren't posted anywhere yet (gated), so platform traffic is simulated with explicit, re-runnable assumptions (`engine/lib/traffic.mjs`) |
| 2026-07-16 | First e2e run verdict: SUSPEND_LEARN (CTR ✓ 6.2%, play ✓ 51.4%, session ✗ 148.7s, D1 ✗ 11.5%) → evidence demoted tower-stack 0.82→0.72 in next Signal pass | proves the gate gates and the loop learns; note the misses come from cohort assumptions, not real users |
| 2026-07-16 | External deploy + clip posting deliberately NOT wired in the Deploy stage | standing rule: nothing leaves the machine until Manuel approves |
| 2026-07-17 | Game #2 = **Lab Rat**: viral mechanics + shock-honesty package (Manuel's direction: "combine viral games with something completely shocking"). The game narrates its own manipulation live (experiment log, exposed fake counter, "Subject: you" kill screen) | the disclosure IS the hook — a clip angle no competitor can copy without indicting themselves; also settles §8 Q5 (ethics line) empirically: we ship the honest version and measure it |
| 2026-07-17 | Lab Rat entered through the pipeline, not around it: new trend (0.85) + concept card → engine picked it in Signal over demoted tower-stack (0.72) → full 7-stage run `2026-07-17T05-31-45-s7` → SUSPEND_LEARN under same synthetic cohort | the factory pattern holds for game #2; per-game verdicts stay synthetic until clips actually post |
| 2026-07-17 (overnight) | **Night run: library scaled 2 → 10 games** via headless Claude Code workers on Manuel's Ollama cloud subscription (kimi-k2.7-code primary, glm-5.2 copy, deepseek-v4-pro backup), orchestrated in /loop. Every game: validation gate (8 checks) → 7-stage engine run → frame-level clip QA. Full log: `engine/night/NIGHT-RUN.md` | Manuel's directive: leverage Ollama subscription, wake up to a viral library with videos + copy; Anthropic tokens spent only on orchestration + QA |
| 2026-07-17 (overnight) | Every hook video is built on ONE named psychological trick (angle system): competitive rank (stack-rush, Manuel's spec), shock-honesty (lab-rat), ego-bait (perfect-circle), benchmark vs F1 (reflex-duel), near-perfection itch (ten-seconds), completion-satisfaction (drift-garden, first CALM-engine game), loss aversion (hold-on), participation/comment-bait (odd-one — the clip itself is playable), curiosity gap (dont-press), memory benchmark 7±2 (memory-nine) | different trick per game per Manuel's direction; the trick is logged so Measure can later attribute CTR to trick, not just game |
| 2026-07-17 (overnight) | Validation gate can't see pixels: odd-one passed all 8 checks with a completely blank clip (NaN coords). Rule added: frame-strip QA every clip before calling it done | a gate that only checks completion events will pass invisible games |
| 2026-07-17 | **Latent-game mining playbook** adopted: the "how to write ads" pain-diving strategy (DESKTOP_ARCHIVE) adapted to find unbuilt games in mined Reddit demand — `docs/latent-game-mining.md`, runner `engine/night/mine_latent.py` (authed reddit-direct), harvest #1 = 105 posts/8 threads | Manuel's directive: same strategy that finds ad pain-points, pointed at "games users already play in their heads" |
| 2026-07-17 | Harvest #1 UMP/UMS: doomscroll misery persists because **the feed has no edges** (no ending signal; blockers add walls, not endings) → flagship calm game = **Bottom of the Feed**, a feed-shaped descent that ENDS; copy built from verbatim bank (`engine/state/mined/synthesis-20260717.md`) | the mined language IS the product spec; it doesn't block the itch, it finishes it |
| 2026-07-17 | **Plunge** (Manuel's concept): bottom-of-the-feed's swipe gesture × a hit/smash dopamine chain that climaxes at failure — the shatter is deliberately the most beautiful frame (slow-mo cracks + every earned combo-ring exploding as light) | **peak-end rule engineered**: fail = peak = end → the run's memory is euphoric, restart is craved, and the death frame is the shareable clip. New named trick in the angle system: "ecstasy fail" |
| 2026-07-17 | Plunge v2 (Manuel's refinement): the swipe chains to STAGED motor coordination — 3 lanes via swipe direction, 5 stages (warm-up → aim → doubles → the wall → beyond), windows/tempo tuned so an average player sustains ~20 moves; the game telegraphs each escalation (stage banners + rising visual heat) | anticipation of complexity is itself the dopamine; the ~20-move calibration makes the wall feel beatable ("flow channel": skill just below demand); bot mode doubles as the tuning check (must die panes 14–24) |
| 2026-07-17 | Plunge SHIPPED (local): 3 orchestrator fixes on kimi's build — spawn deadlock (smashed panes froze the queue), difficulty calibration in 2 passes (avg death 5.0 → 14.5 → **18.0**, band 15–25 = spec), demo banner double-fire. Clip QA'd: escalation montage + shatter + "TOP 14% TODAY" + CTA | the empirical tuning loop (bot with human-like error → measure death distribution → adjust windows) is now a reusable pattern for every skill game |
| 2026-07-17 | Plunge v3 (Manuel's phone playtest): comet moved from H-120 to **mid-screen** (~0.6s → ~1.6s reaction horizon — "so low it makes it really hard") + **velocity waves**: pane speed oscillates ±(0→28% by stage), so complexity rises as tempo VARIATION (accel + decel), not monotonic speed-up. Windows re-tuned; bot avg 15.9 (band 9–21) ≈ human ~20 since humans get the tripled preview the bot ignores | playtest feedback beats simulation; "rightfully viral" = frustration low early, wall visible late. Also fixed iOS clip playback (collector now serves HTTP 206 byte-ranges — Safari refuses <video> without it) |
| 2026-07-17 | **Contract v2 program** (Manuel): (1) mirror-neuron demos — challenge card, human hesitation, near-fail+recovery, fail, DARE CTA; (2) juice+synthesized sound layer (`juice.js`, zero files, semantic hooks, calm games get bells only); (3) behavioral analytics → three indices: PLEASURE / DOPAMINE (restart-latency + near-miss pull = slot-machine signature) / ADDICTION (d1, repeat, late-night) via `loop.mjs report`; (4) site v2 mobile-first with /g/ hubs + A/B variants surfaced; (5) share layer (`share.js`): native share sheet + `?dare=` challenge links with K-factor events; (6) new game **Scroll Sprint** (Manuel: thumb-distance race in ft/in per 10s) | tension in the video → mirror neurons → "I can beat that"; the dare link makes the score itself the distribution vector. Calm engine measurably targets HIGH pleasure + LOW addiction — the two-engine thesis becomes a dashboard row |
| 2026-07-17 | **Contract v2 COMPLETE: 13/13 games** (12 retrofits by Ollama workers + scroll-sprint new). 3 worker bugs caught by the validation+frame-QA gauntlet (scroll-sprint clock mismatch, dont-press hitStop freeze, + earlier odd-one NaN) — all orchestrator-fixed same-day | the worker/gate/frame-QA pipeline scales: a full-catalog rewrite took one afternoon and ~zero Anthropic tokens on game code |
| 2026-07-17 | **100-game design catalog** (Manuel): every design hijacks a NAMED IG/TikTok-conditioned path (pull-to-refresh lever, red badge, seen-receipts, FYP roulette, streak anxiety, duet/remix…) — `docs/design-catalog-100.md` + `engine/state/design-backlog.json` (73 viral / 27 calm) as ideate's feedstock. Two models independently invented "seen-wait" — convergence marks it as an early build | the users' training is the asset: the thumb already knows every one of these games |

## 8. Open questions (for Manuel)

1. **Which engine leads?** Calm (safer, defensible, fast to validate) or viral (where the reach is)?
2. **Are the metric targets right?** (12% / 2:30 / 18% / 6%) — these are the dials that decide every game's fate.
3. **Brand + domain for the public games site.** (Working name: "Tilt". Games brand vs. the LOOP control-room brand.)
4. **Build stack for the real loop.** AI game codegen (which model/pipeline?), hook-video generation (which tool — see content-studio/hyperframes?), games-site host, analytics (PostHog already wired for AIBG).
5. **Ethics line.** Viral games *deliberately* exploit — do we ship an in-product honesty disclosure, or keep the exploitation implicit (as every competitor does)? The framework's own "Line" section argues for the former.

## 9. Next move

> The build is done locally. The next move is **Manuel's approval to go live.**

Stack Rush, its hook clip, the Tilt site, the event layer, and the 7-stage engine all exist and ran end-to-end (`npm run loop`). What's left needs Manuel:

1. **Play it:** `npm run serve` → http://127.0.0.1:4620/games/stack-rush/ — is the game good enough to ship?
2. **Watch the clip:** `web/site/clips/stack-rush-hook-s7.mp4` — is this the hook we post?
3. **Approve go-live:** deploy `web/site/` to Vercel + post the clip to TikTok/Reels (social-autopilot pattern). Then real traffic replaces the synthetic cohort and the four bars get a real 5–7 day verdict.
4. Answer §8 open questions (engine lead, bars, brand/domain, ethics line).