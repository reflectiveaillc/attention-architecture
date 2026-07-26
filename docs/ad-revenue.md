# Shadow ads — what viralfreegames.com would earn if we turned ads on

> Project root: `/Users/manuel/coo/attention-architecture`

**No ad is ever rendered.** This system answers one question — *"how much money would
yesterday's traffic have made?"* — without putting a single ad in front of a player.

## Why it works this way

The obvious build is to ship ad-placement code to the site with rendering disabled.
We don't. Instead the placement policy is **replayed server-side** over the event
stream we already collect (`engine/state/events/live.jsonl`, ingested from PostHog).

That buys three things:

1. **Retroactive.** The model can price traffic from before it was written. Change a
   CPM assumption, re-run, get a new answer over the same history in a second.
2. **Zero risk.** No client code, no bytes shipped, no perf cost, nothing that can
   break the live site or leak.
3. **Honest.** The policy that computes the estimate is the same policy we would flip
   on. Nothing to reconcile later.

## The placement thesis

The money moment in a casual game is **the instant after a loss, while the player is
still inside the loop** — dead screen on the display, thumb already moving to restart,
attention at its peak. Not the load screen, not the menu.

So every death in every session gets an engagement score, and only the good ones get
an ad. `moment_score` (0–1) weighs five signals available in the event stream:

| Signal | Weight | Why it means "still hooked" |
|---|---|---|
| session depth (run index) | 0.25 | run 9 is an invested player; run 1 is a tourist |
| time invested | 0.15 | sunk attention makes a break more tolerable |
| death followed a near-miss | 0.20 | "I almost had it" — the strongest re-engage signal we log |
| compulsive restart after | 0.25 | restarted in <2.5s = they never left the loop |
| personal record on that run | 0.15 | euphoria peak, and the rewarded-continue moment |

The `compulsive restart` term is only knowable **after** the death — which is exactly
why the replay is more accurate than live placement could ever be. It uses the proof
the player came back, not a guess that they would.

## The policy

An ad is placed on a death only if all of these hold (`engine/config/ad-model.json`):

- the player **actually restarted** within 60s (`require_continued_play`) — we never
  count revenue from a moment the player had already abandoned
- it is at least the 3rd run of the session — don't ad-wall a first impression
- ≥120s since the last ad in that session, ≤8 ads per session
- not immediately after a `difficulty_spike` (3 fast deaths) — that player is about to
  rage-quit and an ad would push them out the door
- `moment_score ≥ 0.3`

Four placements are priced: `interstitial_post_death`, `rewarded_continue` (offered
instead of an interstitial when the death is record-chasing or near-miss at depth —
opt-in, higher eCPM, not an interruption), `interstitial_feed_swipe`, and
`banner_sticky` (priced off page-open time from the 5s heartbeat).

## Running it

```bash
cd /Users/manuel/coo/attention-architecture
set -a; source .env; set +a

node engine/loop.mjs revenue                    # last 24h
node engine/loop.mjs revenue --day yesterday    # a specific local day (America/New_York)
node engine/loop.mjs revenue --day 2026-07-21
node engine/loop.mjs revenue --since 7d         # rolling window
node engine/loop.mjs revenue --since all        # everything ingested
node engine/loop.mjs revenue --policy aggressive
node engine/loop.mjs revenue --since 7d --json  # machine output
```

This runs automatically every 3h inside `scripts/refresh-analytics.sh` (launchd
`com.manuel.loop-analytics`), so any completed day is already computed and stored
before it's asked about.

**Outputs (local only — this repo and `web/site/` are PUBLIC, revenue modeling is not
published):**

- `engine/state/analytics/ad-revenue.json` — latest full report + session diagnostics
- `engine/state/analytics/ad-revenue-daily.json` — per-day history, the file that
  answers "how much did yesterday make?" even after the raw event window rolls off
- `engine/state/analytics/geo-map.json` — vid → country/device, built by
  `scripts/backfill-geo.mjs` (a US session is worth ~10x a tier-3 one, so geo is the
  single biggest lever on the estimate)

A day computed from a window that only partly covers it is written with
`partial: true` and can never overwrite a fully-computed day in the history.

## Reading the number honestly

- **Gross vs net.** Net applies a 68% publisher share — an ad exchange keeps a cut.
- **Bands.** low/mid/high are the CPM range, not a confidence interval. Quote the mid.
- **Confidence.** Below 100 sessions / 50 ad moments the report self-labels `LOW`. At
  that volume the daily total is noise; **the per-session number is the real output.**
- **The cost.** Every interstitial is modeled to cost ~5% of session length and ~2% of
  D1 return. The report prints that next to the revenue on purpose. More ads is always
  more money and always less session — the `appetite scenarios` table prices that
  trade directly.
- **Assumptions, not measurements.** Every CPM, CTR, fill rate and multiplier in
  `ad-model.json` is a documented assumption. The engagement multipliers in particular
  (a peak moment is modeled to roughly double CTR) are reasoning, not evidence. They
  become evidence only if ads are actually turned on.

## What the first run said (2026-07-26)

Over all ingested traffic (Jul 21–26, 105 sessions, 92 visitors, 100% geo-resolved,
US/GB-dominant tier 1): **~$0.15 net**, and yesterday alone was **under a cent**.

The useful finding is not the total, it's the shape:

- **~$1.47 net per 1,000 sessions.** That is well below a typical H5 game site
  ($2–15 RPM) — because the peak-only policy is deliberately narrow: 16 interstitials
  across 105 sessions.
- **The binding constraint is session depth, not ad rates.** 398 deaths came from
  105 sessions but 4 whales produced most of them; the median session never reaches
  the 3rd run, so it is never monetizable at all.
- **Ads are not the lever at this traffic level.** At 1M sessions/month the same
  economics are ~$1,470/mo. Getting there is a distribution problem, and the fastest
  multiplier on ad revenue is making the median session *deeper*, not showing more ads.
