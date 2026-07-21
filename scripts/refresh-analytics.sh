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
node engine/loop.mjs report >/dev/null
node engine/loop.mjs feed

# ship only analytics data; nothing else, and never if a private key sneaks in
git add web/site/analytics/ engine/state/analytics/ engine/state/events/live.jsonl \
        engine/state/next-concepts.json engine/state/trends.json 2>/dev/null || true
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
