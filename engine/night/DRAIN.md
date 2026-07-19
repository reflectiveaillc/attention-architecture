# BACKLOG DRAIN — building the 100-game catalog

> Started 2026-07-17 ~14:10. Goal: drain `engine/state/design-backlog.json` (100
> designs) into live, validated, clipped games. Read this after any autocompact.

## 📌 SESSION 2026-07-19 (state as of ~13:30)
- ⛔ **drop-dodge LOCKED** — Manuel play-tested: "very engaging and addicting".
  Difficulty frozen (registry `locked:true` + header comment + docs/locked-games.md).
  Locked games get variants as NEW ids, never retunes.
- ✅ **drop-dodge-face SHIPPED** — head-steered variant (headTilt/headYaw blend,
  ±0.18 hysteresis, face-only, tap = restart only), deliberately EASIER
  (vy 4.6 vs 6.2, ramp 0.9 vs 1.4, spawn 1.5→0.55s vs 1.1→0.32s). Passed
  validate-game + face-response-test (24 lane_changes off injected signal);
  clip captured + frame-QA'd (title font fixed 42→33px, was edge-clipped);
  registered (registry 319) + site rendered. Added to face-response-test SIG map.
- 🔧 **Round 4 recovery**: the interrupted batch left 19 games ON DISK but never
  integrated (pinch-to-fit … squish-row, the sensory wave). Sampled ones all fail
  validation (half-finished self-fix loops). Serial integrate loop killed
  (4min/failure in timeouts); instead fix fan-out `tilt-fix.js` (NEW script,
  repair-in-place variant of tilt-build) run wf_e70d3bd6-d08, 19 sonnet agents.
- 🚀 **Round 5 launched**: wf_b3704a91-103, 18 builds (ink-drop … tap-twin,
  rhythm wave). 27 designs remain unstarted after this round.
- NEXT after both workflows: serial `integrate.mjs` per passed id (registry
  races — never parallel), then commit. Then Round 6 (last 27).

## 🤖 CLAUDE BUILD ROUNDS (Ollama 429'd ~2h — sonnet fan-out is the build engine)
- Round 1 (wf_b043157e-312): 16/16 built + integrating (badge-clear…grid-curate). 23 agents, 1.4M tokens, ~32min. 16/16 PASSED first workflow — sonnet self-validation is far more reliable than the Ollama workers (near-zero orchestrator fixes needed).
- Round 2 (wf_9384107f-a29): 18 builds IN FLIGHT (doom-refresh save-later-guilt comment-cliff poll-fever going-live online-dot like-check link-bio unsent-draft story-archive filter-glow draft-courage double-tap-rush save-or-lose story-catch duet-sync fyp-train archive-walk).
- Round 2 DONE: 18/18 built + integrated → registry ~89. Round 3 (wf_851b0414-409): 18 IN FLIGHT (poll-predict active-dot like-guess repost-chain tag-everyone filter-restore grid-breathe drafts-release story-set breath-filter save-box poll-no-stakes profile-settle unfollow-quiet spot-the-sponsored micro-mash genre-shuffle mini-boss-rush).
- PATTERN (proven, 34/34 builds passed across rounds 1-2): edit `engine/night/tilt-build.js` BUILDS array → gen-build-prompt each → Workflow(scriptPath) → on completion integrate each id serially. ~18/round, ~25min/round. 277 unbuilt remain (~15 rounds). Ollama still 429.

## ✅ DESIGN GOAL COMPLETE (~19:40): all 13 categories × 20 = 260 category designs
merged. **Backlog = 360 designs** (100 original + 260 category). 13/13 categories
done via the Claude fan-out. Remaining work = BUILD them (drain), continuing as
Ollama allows + Claude fan-out while Ollama is 429'd.

## 🤖 CLAUDE FAN-OUT (Manuel 2026-07-17 ~19:30, Ollama 429'd ~2h)
Workflow `engine/night/tilt-fanout.js` (run wf_b043157e-312): 23 Claude sonnet
subagents — 7 finish the pending category designs (ocd autism anxiety collector
sensory rhythm memory) + 16 build games from the backlog (each self-validates via
validate-game.mjs and fixes its own bugs, up to 4 tries). Agents write files only;
ORCHESTRATOR integrates on completion (merge-category-designs.mjs + integrate.mjs
per built id for clip+register+site — serial, avoids registry races).
Build batch: badge-clear pinned-top repost-train poll-slider suggested-dismiss
badge-panic typing-standoff streak-tightrope story-expire autoplay-stop
lip-sync-duel face-morph-lock fyp-pull live-count request-purgatory grid-curate.
NOTE: Workflow args must be inline (hardcoded arrays) — args-passing was flaky.

## 📌 CATEGORY-DESIGN STATE (as of ~19:25)
- Backlog = 220 designs (100 original + 120 category). Site = 55 built games, categorized.
- **6 categories DONE** (20 each merged): reflexes, adhd, insomnia, perfectionist, competitor, curiosity.
- **7 categories PENDING** (429'd mid-run, relaunch when limit clears): ocd, autism, anxiety, collector, sensory, rhythm, memory. Prompts exist at `engine/night/prompts/catdes-<id>.md`. Relaunch: `for c in ocd autism anxiety collector sensory rhythm memory; do ./engine/night/worker.sh kimi-k2.7-code:cloud engine/night/prompts/catdes-$c.md engine/night/logs/catdes-$c.log & done` (explicit words — zsh gotcha!). Then `node engine/night/merge-category-designs.mjs`.
- ⚠️ 429 hit AGAIN at ~19:19 (13 concurrent design workers too heavy). Lesson: cap concurrency ≤6-7 workers per burst to stay under the Ollama session limit.
- JSON repair: two files (reflexes, curiosity) had unescaped inner quotes → repaired inline; merge script could bake in the repair regex later.
- Also still pending build-drain: wave 8 failures mention-dodge + viral-wave (defer/fix), then continue building from the (now categorized) backlog.

## 🗂️ CATEGORIES (Manuel 2026-07-17): 13 cognitive-style labels, 20 games each
`engine/state/categories.json` — reflexes, ocd (Order & Symmetry), autism
(Patterns & Systems), adhd (Novelty), anxiety (Calm Control), insomnia
(Wind-Down), perfectionist (Mastery), collector (Completionist), competitor
(Rank Chasers), sensory (ASMR), rhythm (Rhythm & Flow), memory, curiosity.
Each: trait the algo farms → the wean. Site now has a scrollable category chip
bar + per-card category label (deploy.mjs); integrate.mjs carries `category`;
55 existing games retro-tagged by heuristic. 13 design workers (20 each = 260
new designs) running → `engine/state/designs/cat-<id>.json`; merge with
`node engine/night/merge-category-designs.mjs` → backlog. Public chip NAMES are
tasteful (not raw clinical terms) — flip to raw if Manuel prefers.
⛔ Naming of ocd/autism as public categories = Manuel's brand call.

## ⚠️ zsh gotcha (cost one dead launch): `for c in $cats` does NOT word-split a
plain variable in zsh (bash does). Use an explicit word list `for c in a b c`
or `${=cats}`. Command substitution `$(cat file)` DOES split — that's why the
wave launches worked but the category launch (using `$cats`) fired one bogus worker.

## ✅ FACE RESPONSE — ROOT CAUSE FOUND (Manuel repeated "reads but doesn't respond")
The real bug (validate-game.mjs was BLIND to it — it only runs demo/bot autopilot,
never the human face path). Built `engine/night/face-response-test.mjs`: loads a
face game in HUMAN mode, clicks ALLOW, injects an oscillating face signal (no camera),
asserts ACTION events fire. This is now the REAL gate for face games.
Findings + fixes:
- brow-lift & head-dodge = ❌ stuck in phase 'ready' forever — continuous-control
  games (lift/steer) had NO discrete trigger to start the run (tap-start was removed).
  FIX: `if(st.phase==='ready' && (FC.faceSeen||active)) start();` — the FACE starts play.
- big-smile responded (bloom grew) but emitted no LOOP event → added `LOOP.emit('bloom')`.
- **no-cache headers** added to the collector (likely why Manuel saw old "responds to
  touch" behavior — browser served stale HTML/js/face-control.js).
- ALL 7 now PASS face-response-test. Server restarted (no-cache). Rule: run
  face-response-test.mjs on every face game — validate-game.mjs alone is insufficient.

## ✅ FACE-ONLY + SIGNAL FIX (Manuel ~23:50, "reads face but responds to touch not face")
Two root causes fixed: (1) the calibration ABSORBED held expressions (brow/smile
faded when sustained) → rewrote to floor/ceiling tracking that drops to new lows
instantly but creeps up 0.0008/frame, so held expressions register; and the
signals now BLEND landmark-delta with the MediaPipe BLENDSHAPES (jawOpen,
browInnerUp, mouthSmile*, cheekPuff, mouthPucker) via max() → robust firing.
(2) tap/touch/keyboard drove the ACTION → removed from all 7; tap now ONLY
restarts after a crash (flappy-face 'tapRestart' pattern). The mechanic is
FACE-ONLY. Workflow wf_6930707c-835 applied it to the 6; flappy-face by orchestrator.
All 7 re-validated + clips recaptured. Signal thresholds ~0.28 trigger / 0.15 release.

## ✅ FACE RELIABILITY + MP4 (Manuel ~23:20-23:40)
- **Shared lib `web/site/js/face-control.js`**: ONE proven detector for all 7 face
  games (the per-game hand-written detectors were buggy → only flappy-face worked).
  Signals (self-calibrated): mouthOpen, browRaise, smile, blink, cheekPuff, pucker,
  headTilt(-1..1). All 7 games rewritten onto it (flappy-face by orchestrator +
  brow-lift/head-dodge/big-smile/blink-shoot/kiss-cam/cheek-float via workflow
  wf_ca4b2156-48f). All validate; clips recaptured. Games are now THIN (read FC.sig.X).
- **MP4 recording (universal)**: FC.toggleRecord prefers an mp4 mimeType (iOS Safari
  records mp4 natively) and transcodes webm→mp4 via lazy-loaded ffmpeg.wasm on
  Chrome/Android — so downloads always play on iPhone. Fixes "webm not viewable on iphone".
- Earlier the abandoned per-game fix approach (tilt-face-fix.js) was superseded by the shared lib.

## 🔧 CROSS-PLATFORM FACE FIX (Manuel test ~23:05)
Two real bugs: (1) MOBILE camera dead — getUserMedia needs a SECURE CONTEXT;
LAN over http:// blocks it. FIX: collector now serves HTTPS on :4643 (self-signed
cert engine/state/certs/, gen'd for the LAN IP); `npm run serve` prints both URLs.
(2) DESKTOP mouth didn't flap — jawOpen blendshape unreliable. FIX: mouth-open now
from LIP LANDMARKS (|lm[13].y-lm[14].y|/faceHeight) self-calibrated, lower threshold
+ hysteresis (.22/.12), one-detect-per-video-frame, live control BAR + status UI.
flappy-face fixed + re-validated. Contract updated with "CRITICAL FIXES".
Fix workflow tilt-face-fix.js (wf_d902f9d3-f5d): 6 agents applying same fixes to
brow-lift/head-dodge/big-smile/blink-shoot/kiss-cam/cheek-float. TEST URLs:
desktop http://127.0.0.1:4620/games/flappy-face/ · MOBILE https://<ip>:4643/ (accept cert).

## 📊 STATUS ~22:55: 127 games live. 7 FACE-CONTROL games shipped (flappy-face +
brow-lift head-dodge big-smile blink-shoot kiss-cam cheek-float — all validated,
clips captured, category "Face Control"). Distributed drain running: Claude
batch 5 (18, wf_444292b3-995) building + Ollama waves. Model reliability observed:
CLAUDE ~100% pass, OLLAMA ~70-75% (needs bot/demo fixes). Prefer Claude for builds;
use Ollama for parallel throughput on simple games.
DEFERRED add: rule-stack (demo hangs early), novelty-garden (bot incomplete + flaky
runtime) — cleanup pass. Remaining face concept: brow-mouth-combo (2-channel).

## 📸 FACE-CONTROL GAMES (Manuel 2026-07-17 ~22:10) — NEW ENGINE
Webcam + MediaPipe FaceLandmarker + MediaRecorder. Play with your FACE, RECORD
the funny face + gameplay into one shareable clip. Reference: `web/site/games/
flappy-face/index.html` (mouth-open to flap, PASSES validation). Contract:
`docs/face-contract.md`. New category `face` ("Face Control") in categories.json.
validate-game.mjs patched: `is_face` (detects mediapipe) → skips the
no_external_resources check (MediaPipe CDN is required + allowed for face games).
AUTO demo/bot modes use a SIMULATED face (no camera/CDN headless) so validation
+ clip capture work. Autopilot rule: only lift when y>target AND vy>-1 (else
overshoots ceiling); (DEMO||BOT) give-up cap so runs end.
- Face-build workflow `engine/night/tilt-face.js` (wf_0344c6fa-f71): 6 Claude
  agents building brow-lift, head-dodge, big-smile, blink-shoot, kiss-cam,
  cheek-float. Integrate on completion (integrate.mjs works; face detection auto).
- DISTRIBUTION (Manuel: "leverage ollama, distribute work"): Claude builds
  face-games (complex, need MediaPipe ref); Ollama (429 RESET ~22:15) runs the
  regular backlog drain in parallel.

## ⚠️ BATCH-OVERLAP LESSON (~00:40): computing the next Claude batch WHILE the
previous batch's integration is still running → the `built` set is stale → the
new batch re-picks 8 already-built games (batch 7 dup'd 8 of batch 6). Harmless
(upsert) but wastes agents. FIX: only compute the next batch AFTER integrate
completes, OR keep an explicit in-flight exclusion set of the last launched batch.
Deferred (Ollama flaky): rank-or-tank, frame-catch.

## 🎮 FACE PLAYABILITY (Manuel: "controls harsh, failing all games, can't chain")
KEY INSIGHT: face control is imprecise/laggy vs tapping → face games must be FAR
more forgiving. flappy-face was harsh because discrete flaps required rapid
mouth open-close CHAINING (awful with a face). FIX: converted to HOLD-TO-RISE
(open mouth = rise continuously, close = fall) + gentle physics (GRAV 0.20 /
LIFT 0.42 / MAXV 4.2, GAP 290, PIPE_SPEED 1.6, PIPE_EVERY 155, first pipe near
center). Verified playable: a proportional controller survives 16s+ (was 1.5s).
Added `window.__ff()` test hook. Fine-tune workflow tilt-face-tune.js (wf_9c27cf20-09f)
retuning the other 6 with the same forgiving philosophy (low thresholds ~0.15-0.22,
slow obstacles, big margins, gentle ramp, reachable start; continuous games use
hold-to-rise, discrete blink/kiss must NOT require rapid chaining).

## 🎭 AI FACES (Manuel: generate AI faces for viral demo videos) — PROVEN
`engine/faces/gen_faces.py` (ad-factory venv, gpt-image-2): generates ONE consistent
character then EDITS it into each exaggerated expression (base→mouth_open verified:
same person Zoe, wide gasping mouth). Ready to gen full set (brows/smile/kiss/cheeks/
blink) + wire into demos (swap the drawn PiP smiley for the AI face expression matching
the game action) for real-face viral clips. Do AFTER playability is nailed.

## Pipeline per game

1. `node engine/night/gen-build-prompt.mjs <id>` → build prompt from design
2. `./engine/night/worker.sh <model> engine/night/prompts/build-<id>.md engine/night/logs/build-<id>.log` (background)
3. on worker exit: `node engine/night/integrate.mjs <id>` → validate 8/8 → capture clip → register → regen site (prints JSON `{ok, clip_s, games}` or `{ok:false, stage, detail}`)
4. on `ok:false` → orchestrator reads the game, fixes the bug (recurring: hitStop-without-decay, Date/performance clock mismatch, NaN coords, missing bot game_over), re-integrates. 2 fails → drop + log.
5. frame-QA the clip periodically (spot-check, not every one — gate can't see pixels but validate covers structure).

## Cadence
- ~6-8 workers per wave (min(16, cores-2) cap; leave headroom). Mix kimi (primary) + glm (copy-strong, decent games).
- Models (cloud, live): kimi-k2.7-code:cloud (primary), glm-5.2:cloud, deepseek-v4-pro:cloud (flaky — backup only).
- ⛔ Nothing deploys externally. Ollama does game code; Anthropic = orchestration + QA.

## Progress

| wave | ids | status |
|---|---|---|
| 1 | seen-wait pull-to-pop like-blink story-streak long-press-loot autoplay-chicken | ✅ 6/6 integrated |
| 1 | pinch-to-fit | 🔄 rebuild (glm no-op → kimi) |
| 2 | fyp-roulette loop-trap badge-bomb duet-trace (kimi) · soft-refresh endless-pond (glm) | 🔄 building |

## ▶ RESUMED ~16:25 — 429 cleared (session window reset), wave 5 relaunched.

## ⛔ BLOCKED 15:40–16:25 — Ollama session usage limit (429)
Wave 5 (profile-grid-match, reply-window, ratio-king, follower-flood, story-peace,
badge-sit) ALL failed with `429 · you (mcalvino6) have reached your session usage
limit`. Not a code bug — the cloud subscription cap. Options for Manuel:
upgrade (ollama.com/upgrade), add usage (ollama.com/settings), or wait for the
session window to reset. Drain auto-resumes when a test worker stops 429ing.
Wave 5 ids are queued (prompts already generated) — just relaunch them first.

**Built from backlog:** ~38 / 100 → registry at 51 games. **🎯 HALFWAY: crossed 50 games at ~18:45.** Wave 7 (leaderboard-climb, story-viewers, trend-hijack, fyp-breath) + boost-button (syntax: stray `}` closing a bare return statement) + badge-sunset (juice.js hardened) integrated. Wave 8 integrating, wave 9 building.

**NEW recurring fixes (add to list):**
- **worker syntax error** (boost-button: `SyntaxError: Unexpected token 'var'`): a stray `}` after a bare `return` statement. Node-syntax-check the inline script when validate reports `no_page_errors:false` with `emits_play_start:false` + very low events.
- **non-finite audio** (badge-sunset: `setValueAtTime ... non-finite`): FIXED AT SOURCE in juice.js — `fin()` guards osc()/tension() against NaN/Infinity. No per-game fix needed anymore. Waves 5-6 integrated (reply-window, story-peace, profile-grid-match [hsl-hex color fix], follower-flood [passive-bot], comment-dogpile, duet-chain, verified-chase, slow-likes, quiet-feed). Wave 7 building: leaderboard-climb story-viewers trend-hijack boost-button badge-sunset fyp-breath.

**Deferred (2-fail, cleanup pass later):** pinch-to-fit, badge-bomb, ratio-king, badge-sit, view-spike — all "endless-accumulation" games where the bot won't reliably lose. The clean fix for these: bot plays K accepts then goes PASSIVE so the game's own overflow/drain lose-path fires (worked for follower-flood); the force-gameOver-by-count variant is flakier. Batch-fix these together later.

**Recurring bot fix (add to list):** "endless-until-one-mistake" → bot plays K human-plausible actions then goes passive (`if (botActions >= botGiveUp) return;`) so the natural lose path triggers; reset botActions+botGiveUp in resetRun. OR ~18% bad-tap for timing games (seen-receipt, view-spike partial).
- wave 3 (5/5 clean): filter-shift, infinite-fall, live-count-climb, double-tap-breath, loop-rest
- wave 4 partial: no-badge, unfollow-cleanse in ✅; streak-flame dm-typing comment-race save-scroll still building
- wave 5 building: profile-grid-match reply-window ratio-king follower-flood story-peace badge-sit
- seen-receipt: 3rd build attempt on kimi (2 glm no-ops) — if this fails, DEFER.
**Base catalog (pre-backlog):** 13 v2 games already live.

**Deferred (2-fail rule, revisit in a cleanup pass):**
- pinch-to-fit — demo autopilot never commits round 0 (frame gate/autopilot interaction; not the asymptotic fix). Rebuild fresh.
- badge-bomb — bot can't reliably overflow to MAX_BADGES (clearing spawns +more; skip+delay insufficient). Needs spawn/clear rebalance or a wall-clock bot death.

**Wave 2 integrated:** fyp-roulette, loop-trap, duet-trace, soft-refresh, endless-pond (5/6). ✅

## Recurring worker bugs (fix fast, don't re-diagnose)
- **asymptotic autopilot never crosses target** (pull-to-pop): elastic follow approaches `want` but `>=` never true → release within epsilon (`>= want - 0.012`).
- **bot never dies → no game_over** (like-blink): give the bot a ~18% skip rate so runs actually end.
- **hitStop gated without decay** (dont-press): `if(hitStop>0) hitStop-=dt; else autopilot()`.
- **Date.now vs performance.now clock mix** (scroll-sprint): autopilot `t` must use the same clock as `runStartTs`.
- glm sometimes exits 0 with NO file written → relaunch on kimi.

## Tick log
- 14:10 wave 1 launched (7 workers). Integrator + prompt-generator built. gen-build-prompt.mjs turns any design into a contract-v2 worker prompt; integrate.mjs does validate→clip→register→site data-driven (no hand-editing ideate.mjs per game).
- 14:30 wave 1 integrated: 6/6 (2 needed orchestrator fixes — like-blink bot-skip, pull-to-pop epsilon). pinch-to-fit rebuilding (glm wrote nothing). Wave 2 launched (6).

## Face playability principle (LOCKED — 2026-07-18, Manuel-driven)
**A gesture = ONE tap. A 1 in a 1/0 world.** All face games run on the shared pulse
engine in `web/site/js/face-control.js` (stepPulses): edge-triggered on the RAW
calibrated signal — NO game-side EMA smoothing in the trigger path (EMA attenuates
exactly the small/fast gestures we need). Fire on modest rise (rel>0.15) OR
small+fast rise (rel>0.07 & vel>0.04); re-arm at 45% fall from peak (chains without
full close); adaptive per-user resting baseline. Games consume via `FC.tap(sig)`
(once per gesture) or `FC.gate[sig]` (debounced hold, for smile/continuous).
- Discrete-flap games (mouth/brow/cheek/blink/pucker): gravity always on, each tap
  = fixed impulse. NO hold-to-rise anywhere.
- head-dodge: continuous tilt, TILT_ON 0.12 / OFF 0.07 / DEAD 0.06, emits `steer`.
- big-smile: FC.gate.smile (smile is a naturally held gesture).
- NEW signals: FC.sig.headYaw / headPitch (nose-offset turn/nod, mirrored-screen
  convention, neutral-pose baseline) → built **look-away** (acchi-muite-hoi: hand
  points, you look opposite; re-center gate between rounds). 8 face games total.
- face-response-test.mjs now drives the pulse engine via FC.injectSig; head sigs
  use long-center/short-look cadence (t%80<60). ALL 8 pass validate + face-response.
- 10:55 LESSON (orchestration): Workflow `args` can arrive as a JSON-encoded STRING → Array.isArray fails → tilt-build fell back to its stale hardcoded batch and rebuilt 18 already-integrated games (~940k tokens wasted). Fix: tilt-build.js now JSON.parses string args and THROWS without args (no fallback batch). Relaunched with correct next-18 (wf_0112bc6e-4ba).

## 🔒 LOCKED GAMES (do not mutate)
- **infinite-fall** — Manuel (tester, 2026-07-18): "very engaging and addicting". The
  difficulty IS the appeal — do NOT ease, retune, or variant-mutate this version.
  Registry entry carries `locked: true` + `locked_note`. Its EASIER face-steered
  sibling is **infinite-fall-face** (head-lean steering, wider gaps 190→110, slower
  scroll 2.2, gentler ramps) — tune THAT one for face playability, never the parent.
- 12:15 LESSON (shell): `'\n'.join(list)` sin newline final + `while read` = la última línea se salta silenciosamente (ink-drop no se construyó). Escribir siempre trailing newline o usar `printf '%s\n'`.
