# CLAUDE.md — attention-architecture (viralfreegames.com)

Agent-facing source of truth. If `docs/loop-spec.md` disagrees with this file, **this file wins** — the spec is the R4 vision, this is the running reality (updated 2026-07-28 after a full audit + repair).

## What this is

A catalog of ~387 one-file browser games (`web/site/games/<id>/index.html` — every game is one self-contained HTML file). Each game gets a 21s hook clip posted to Instagram (@viral_free_online_games); IG engagement is the market signal; the loop learns which game families win and produces variants of them. Games are tagged `engine: viral|calm` and carry `circuits` (see `docs/circuits.md`).

## The loop as it ACTUALLY runs

```
SIGNAL → IDEATE → QUEUE → PRODUCE → DEPLOY → MEASURE → LEARN
   ↑                                                        │  (node engine/loop.mjs run)
   └────────────── evidence.json feeds back ────────────────┘

Side stages (standalone subcommands, wired into scripts/refresh-analytics.sh):
  ingest     PostHog → engine/state/events/live.jsonl          (every 3h, launchd)
  ig-ingest  IG metrics.jsonl → engine/state/ig-signals.json   (every 3h)
  ig-learn   ig-signals → evidence.json (delayed IG verdicts)  (every 3h)
  report     recompute analytics/summary.json                  (every 3h)
  feed-order visitors+IG+prior → feed-order.json (/play rank)  (every 3h)
  feed       summary → next-concepts.json (analytics concepts) (every 3h)
```

**The two feedback channels that matter:**
1. **IG → variant production:** ig-learn verdicts posted games → `evidence[<gameId>]` → signal injects `variant-<gameId>` concept at score ~1.0+boost → ideate picks it → produce clone-reskins the winner → deploy → clip → Manuel/queue posts it → IG measures it → ig-learn verdicts again. This cycle is PROVEN end-to-end (2026-07-28, run `2026-07-28T15-12-15-s7` → variant "Moss Breathe").
2. **Live funnel → verdicts:** measure computes the 4 bars from `live.jsonl` (real humans) per game; learn verdicts approve_scale / suspend_learn / insufficient_data.

## ⛔ Hard rules — learned from failures, do not regress

1. **NEVER write `engine/state/trends.json` from code.** It is the hand-curated trend SEED (`{trends:[...]}`) that signal.mjs reads. `feed.mjs` overwrote it with the report schema (`{series,movers}`) every 3h and killed the whole run pipeline for a week. The series/movers shape ships inside `analytics/summary.json` — that's its only home.
2. **Evidence keys must match across signal/ideate/learn.** learn writes `evidence[concept.mechanic]`; signal reads `evidence[feedItem.mechanic]`. Convention: template trends → the trend's mechanic string; analytics concepts → `${input}:${primary_circuit}`; IG-winner variants → the winning game's id (`mechanic_key`). One-shot ids (loop-xxx) are FORBIDDEN as evidence keys — they make evidence unreadable.
3. **No synthetic data in the verdict path.** The seeded cohort's dials were hardwired below the bars (d1_prob 0.12 < bar 0.18) → 14/14 runs suspend_learn with identical metrics across games. measure.mjs now reads ONLY `live.jsonl` (mode:'human'). If you add a metric, it must come from real events or be `na`.
4. **`insufficient_data` is not a loss.** A metric without enough real data (MIN_VISITORS 10, MIN_D1_BASE 20) is `na`; a concept with zero available bars gets verdict `insufficient_data` — recorded in evidence.runs but increments NEITHER wins nor losses. Never convert "unjudged" into "loser".
5. **learn.mjs verdicts at T0 only; ig-learn.mjs verdicts the market.** A fresh concept has no IG post at run time, so the IG override cannot fire in its own run — that's by design. ig-learn re-verdicts posted games later (idempotent: 1 win + 1 loss max per game; losses need ≥300 cumulative views AND ~0% peak like-rate).
6. **produce.mjs builds two kinds of games:** existing hand-built games (13 template mechanics) and `variant_of` clone-reskins (deterministic name + hue-rotate skin). It does NOT codegen arbitrary concepts — analytics-feed concepts (`loop-xxx`) will throw at produce. That's the R4 hook point; don't pretend it works.
7. **This repo is PUBLIC and auto-pushes.** refresh-analytics.sh commits data files every 3h. The `phx_[A-Za-z0-9]{20,}` guard exists; never let secrets, IPs, or personal info into `engine/state/*` or `web/site/*`. PostHog keys in client HTML must be `phc_` project keys only (deploy.mjs enforces).
8. **Deploy + clip posting are GATED on Manuel.** deploy.mjs publishes to `web/site` locally only; IG posting happens via `content-studio/social-autopilot` queue + launchd (com.manuel.tilt-post). Appending to that queue = WILL post. Never append without explicit approval.

## The distribution loop (second loop, added 2026-07-28)

The game loop makes games; the distribution loop gets them played. Code in
`engine/distribution/`, design + rationale in `docs/DISTRIBUTION-LOOP.md`.

```
DISCOVER → QUALIFY → DRAFT → PLACE → VERIFY → MEASURE → LEARN
```

- **Judgment = Claude Sonnet 5**, via `lib/llm.mjs` (Anthropic SDK when
  `ANTHROPIC_API_KEY` is set, else headless `claude -p --model sonnet`).
- **Everything before PLACE is read-only** and always safe to run.
- **PLACE sends nothing** unless `DIST_ARMED=1`, and nothing on a `human_gate`
  channel unless it's named in `DIST_APPROVE`. Otherwise drafts go to
  `engine/state/distribution/outbox/` for review.
- **Seven gates** in `gates.mjs`, each from a failure that already happened:
  G0 registry-only targets · G1 no placement without `?src=` · G2 canary aborts a
  batch when the event pipeline is stale · G3 T+24h logged-out survival re-fetch
  (ghosted → freeze the channel) · G4 no verdict under 3 placements / 30 visitors ·
  G5 score = visitors × play_rate × chain_depth (never raw visitors) · G6
  human/identity/rate locks · G7 weekly kill/scale with a forced exploration slot.

⛔ `engine/state/distribution/` is **gitignored** — it holds third-party usernames,
post bodies and unsent drafts, and this repo is public and auto-pushes.
`engine/state/channels.json` IS tracked (our own registry, no personal data).

⛔ Reddit reads use a saved session via `~/Dev/influencer-op/ops/reddit-direct`
(`REDDIT_READ_ACCOUNT`, default `SatisfactionSea6228` — read-only). The *sending*
identity is a separate deliberate choice per channel; G6 blocks placement while
a channel's `identity` is `TBD`. Sessions expire — a "session logged out" error
is a re-auth step (`cookie_grab.py`), not a dead end.

## Runbook

```bash
node engine/loop.mjs run          # full 7-stage cycle (picks feed[0]; builds variant if armed)
node engine/loop.mjs ig-ingest    # rebuild ig-signals.json from social-autopilot metrics
node engine/loop.mjs ig-learn     # verdict posted games into evidence.json (idempotent)
node engine/loop.mjs feed-order   # rebuild /play ranking
node engine/loop.mjs report       # analytics summary (site + per-game indices)
node engine/loop.mjs feed         # regenerate next-concepts.json from live analytics
node engine/loop.mjs revenue --day yesterday   # shadow-ad revenue (local only, never published)
node engine/loop.mjs serve        # preview site :4620 (https :4643 for mobile/camera)
```

**Deps:** `npm install` once (playwright is a devDependency; browsers are cached in `~/Library/Caches/ms-playwright` — use `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`).

**Automation (launchd):**
- `com.manuel.loop-analytics` — every 3h: ingest → ig-ingest → ig-learn → report → feed-order → feed → revenue → commit+push data files
- `com.manuel.tilt-metrics` — daily 03:17: capture IG metrics (content-studio/social-autopilot)
- `com.manuel.tilt-post` — posts from the tilt queue (~70min cadence)

**Key state files:** `engine/state/` — `evidence.json` (the loop's memory, keyed by mechanic), `ig-signals.json` (per-game IG engagement), `feed-order.json` (/play ranking + .scores), `registry.json` (all games), `trends.json` (HAND-CURATED seed), `next-concepts.json` (analytics concepts), `events/live.jsonl` (PostHog stream), `analytics/summary.json` (dashboard data).

## Current intelligence (2026-07-28)

- **First confirmed IG winner: grid-breathe** (calm, behavior-mirror) — 10 likes / 110 views = 9.1% like-rate (bar: ≥5 likes @ ≥4%). verdicted `approve_scale_ig` by ig-learn; feed position #2 of 377.
- **Calm thesis is n=1 — NOT yet proven.** Calm pooled like-rate 1.43% vs viral 0.50%, but ex-grid-breathe calm is 0.15% (worse than viral). The test is already running: **35 calm vs 49 viral reels queued over the 7 days from 2026-07-28** — read ig-signals ~Aug 4–5. Believe the thesis at ~5 calm posts clearing the bar.
- **variant-grid-breathe ("Moss Breathe")** built by the loop 2026-07-28; reel queued to post 2026-07-29 10:10 ET — first market test of the full repaired cycle.
- **lsd-x-* experiment posts** show 3–11% like-rates at tiny views with `engine: null` in ig-signals (not in registry) — possibly a second winning family hiding outside the engine labels.
- **ig-signals aggregation:** likes/views are cumulative per post so "latest snapshot" is sound, but `posts` counts capture snapshots (inflated ~3×), and `like_rate` can decay as views outgrow likes — `peak_like_rate` is stored but currently unused by learn/feed-order.

## ⛔ Validate the HUMAN path, not just bot/demo (2026-07-30)

Four games shipped completely unplayable — tap-save, breath-filter, fold-perfect,
pinch-to-fit — and three of them were queued to post to Instagram. Manuel found the
first one by opening it on his phone. Nothing automated caught any of them, for two
reasons now fixed in `engine/night/validate-game.mjs`:

1. **The gate only ever loaded `?bot=1` and `?demo=1`.** breath-filter called
   `initSession()` exclusively when `BOT||DEMO` was set, so the bare player URL ran
   with uninitialised state and threw on frame 1 — while both validated modes were
   perfect. **A gate that tests a synthetic mode certifies a code path nobody plays.**
2. **Nothing could see NaN.** A canvas draw with a NaN coordinate throws nothing and
   logs nothing; it silently paints no pixels. That is how tap-save drew its character
   at NaN for a week, and how odd-one shipped a 100% blank clip before it.

`validate-game.mjs` now runs a human pass (bare URL, real taps) with
`human_no_page_errors` / `human_no_nan_draws` / `human_renders`, plus
`demo_no_page_errors` (previously collected then discarded). Standalone catalog
sweep: `node scripts/nan-draw-audit.mjs [game]` (`GAMES_DIR=` to point elsewhere).

**When you change a gate, prove it fails.** Both tools were verified against the
pre-fix files restored from git before being trusted — a clean result from an
unproven detector is worthless. 12 known-good games pass with zero false positives.

⬜ Related gap, NOT fixed: `tap-save` / `tap-combo` / `tap-pop` declare `LOOP_GAME`
but never load `loop-events.js` and have no bot mode, so they cannot pass the gate
and emit almost no analytics (7 events total, ever). The three games built
specifically to fix the 0.15% like-rate are invisible to the measurement that would
judge them — that experiment could never have produced an answer.

## Known gaps (honest list)

- produce can't codegen non-variant concepts (R4 hook point) — analytics-feed concepts fail at produce.
- 230/348 historical metrics.jsonl rows have `id:null` (pre-fix captures); ig-ingest's ±30s fallback joins them (safe: min posting gap 119s).
- `arm` is still null on all metrics rows (experiments.json empty) — A/B arm attribution not live.
- d1_return events are site-wide (`game:'unknown'`); measure attributes them to games by prior play — sparse (5 events total).
- infinite-fall dominates live play_starts (40%) — hence its -0.15 feed-order penalty; watch for other self-play artifacts.
- ig-learn loss floor (300 views) means most of the catalog is currently unjudged — by design at this account's volumes.
