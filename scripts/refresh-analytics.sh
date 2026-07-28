#!/bin/bash
# LOOP analytics refresh: ingest live PostHog events → recompute metrics →
# regenerate concept feed → ship refreshed dashboard data (auto-deploys via git).
# Zero-LLM, zero-token. Runs from launchd (com.manuel.loop-analytics) every 3h.
set -euo pipefail
cd "$(dirname "$0")/.."

# pin modern node first (launchd PATH otherwise finds a stale node 18)
export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
set -a; source .env; set +a

node engine/loop.mjs ingest
node engine/loop.mjs ig-ingest || echo "ig-ingest skipped" >&2
node engine/loop.mjs ig-learn || echo "ig-learn skipped" >&2
node engine/loop.mjs report >/dev/null
node engine/loop.mjs feed-order || echo "feed-order skipped" >&2
node engine/loop.mjs feed

# shadow ads: what the traffic WOULD have earned. No ad is ever rendered — this
# is a replay of the placement policy over the events we already collect.
# 7d window so every completed day is covered end-to-end and lands in the daily
# history file, which is what answers "how much did yesterday make?".
# Both are non-fatal (set -e is on): a bug in the revenue model must never take
# down the analytics pipeline that the rest of the loop depends on.
node scripts/backfill-geo.mjs --days 90 >/dev/null || echo "geo backfill skipped" >&2
node engine/loop.mjs revenue --since 7d >/dev/null || echo "revenue replay skipped" >&2

# ship only analytics data; nothing else, and never if a private key sneaks in
git add web/site/analytics/ engine/state/analytics/ engine/state/events/live.jsonl \
        engine/state/next-concepts.json engine/state/trends.json \
        engine/state/ig-signals.json engine/state/feed-order.json \
        engine/state/evidence.json \
        web/site/feed-order.json 2>/dev/null || true
if ! git diff --cached --quiet; then
  if git diff --cached | grep -qE 'phx_[A-Za-z0-9]{20,}'; then
    git reset -q
    echo "ABORT: private key detected in staged analytics data" >&2
    exit 1
  fi
  git -c user.email='reflectiveaillc@gmail.com' -c user.name='reflectiveaillc' \
    commit -q -m "analytics refresh: $(date '+%Y-%m-%d %H:%M') [auto]"
  git push -q origin main
  echo "refreshed + pushed $(date '+%H:%M')"
else
  echo "no new data $(date '+%H:%M')"
fi
