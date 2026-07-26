#!/usr/bin/env node
// Build a vid → { country, device_type } map from PostHog via HogQL.
//
// Country is the single biggest lever on an ad estimate — a US session is worth
// ~10x a tier-3 one — but the local event pipe only started carrying geo when
// ingest.mjs was patched. This backfills the history so revenue estimates over
// old data are geo-weighted instead of defaulting to the pessimistic tier.
//
//   node scripts/backfill-geo.mjs [--days 90]
// writes engine/state/analytics/geo-map.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const daysArg = process.argv.indexOf('--days');
const DAYS = daysArg > -1 ? +process.argv[daysArg + 1] : 90;

const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
const projectId = process.env.POSTHOG_PROJECT_ID || '521236';
const host = process.env.POSTHOG_APP_HOST || 'https://us.posthog.com';
if (!apiKey) {
  console.error('POSTHOG_PERSONAL_API_KEY required (set -a; source .env; set +a)');
  process.exit(1);
}

// One row per (vid, country, device) with a count so ties resolve to the most
// common value — a visitor on a plane can produce two countries.
const query = `
  SELECT
    coalesce(properties.vid, distinct_id) AS vid,
    properties.$geoip_country_code AS country,
    properties.$device_type AS device_type,
    count() AS n
  FROM events
  WHERE timestamp > now() - INTERVAL ${DAYS} DAY
    AND vid != ''
  GROUP BY vid, country, device_type
  ORDER BY n DESC
  LIMIT 50000
`;

const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: { kind: 'HogQLQuery', query } })
});
if (!res.ok) {
  console.error(`HogQL failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const rows = data.results || [];

const vids = {};
const countryTotals = {};
for (const [vid, country, deviceType, n] of rows) {
  if (!vid) continue;
  const cur = vids[vid];
  if (!cur || n > cur._n) {
    vids[vid] = { country: country || null, device_type: deviceType || null, _n: n };
  }
  if (country) countryTotals[country] = (countryTotals[country] || 0) + n;
}
for (const v of Object.values(vids)) delete v._n;

const out = {
  generated_at: new Date().toISOString(),
  window_days: DAYS,
  vid_count: Object.keys(vids).length,
  country_events: Object.fromEntries(Object.entries(countryTotals).sort((a, b) => b[1] - a[1])),
  vids
};
const outPath = path.join(ROOT, 'engine', 'state', 'analytics', 'geo-map.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`geo map: ${out.vid_count} visitors · top countries ${Object.entries(countryTotals).slice(0, 8).map(([c, n]) => c + ':' + n).join(' ')}`);
console.log(`written: ${path.relative(ROOT, outPath)}`);
