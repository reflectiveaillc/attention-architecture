// Stage 0 — INGEST: pull real human events from PostHog into the local JSONL pipe.
// The engine can then compute metrics on the same event shape as bot/synthetic runs.
import fs from 'node:fs';
import path from 'node:path';

const TAXONOMY = JSON.parse(fs.readFileSync(
  new URL('../config/posthog-taxonomy.json', import.meta.url), 'utf8'));

export async function run(ctx) {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID || '521236';
  // Private API (events read) lives on the app host, NOT the i.* ingestion host.
  const host = process.env.POSTHOG_APP_HOST || 'https://us.posthog.com';
  if (!apiKey) throw new Error('POSTHOG_PERSONAL_API_KEY required for ingest');

  const cursorFile = path.join(ctx.stateDir, 'analytics', 'ingest-cursor.json');
  const liveFile = path.join(ctx.stateDir, 'events', 'live.jsonl');
  fs.mkdirSync(path.dirname(cursorFile), { recursive: true });
  fs.mkdirSync(path.dirname(liveFile), { recursive: true });

  const cursor = fs.existsSync(cursorFile) ? JSON.parse(fs.readFileSync(cursorFile, 'utf8')) : { after_ms: 0, seen: [] };
  // keep only recent seen ids to bound memory
  const seen = new Set((cursor.seen || []).slice(-5000));
  const afterIso = new Date(cursor.after_ms || 0).toISOString();

  const eventNames = TAXONOMY.events.map((e) => e.name).join(',');
  let url = `${host}/api/projects/${projectId}/events/?event__in=${encodeURIComponent(eventNames)}&after=${encodeURIComponent(afterIso)}&order_by=timestamp&limit=100`;

  let added = 0, skipped = 0, fetched = 0, maxTs = cursor.after_ms || 0;
  const headers = { Authorization: `Bearer ${apiKey}` };

  while (url) {
    const r = await fetch(url, { headers });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`PostHog ingest failed: ${r.status} ${body}`);
    }
    const data = await r.json();
    const results = data.results || [];
    fetched += results.length;
    if (!results.length) break;

    const lines = [];
    for (const ev of results) {
      const id = ev.id;
      if (seen.has(id)) { skipped++; continue; }
      seen.add(id);
      const e = toLoopEvent(ev);
      if (e.ts > maxTs) maxTs = e.ts;
      lines.push(JSON.stringify(e));
      added++;
    }
    if (lines.length) fs.appendFileSync(liveFile, lines.join('\n') + '\n');

    url = data.next || null;
    if (url && !url.startsWith('http')) url = `${host}${url}`;
  }

  const seenArr = Array.from(seen).slice(-5000);
  fs.writeFileSync(cursorFile, JSON.stringify({ after_ms: maxTs, seen: seenArr, ingested_at: new Date().toISOString() }, null, 2));

  ctx.log(`ingest: fetched ${fetched} · added ${added} · skipped ${skipped} · cursor ${new Date(maxTs).toISOString()}`);
  return { fetched, added, skipped, live_file: liveFile, cursor_file: cursorFile };
}

function toLoopEvent(ev) {
  const p = ev.properties || {};
  const ts = ev.timestamp ? new Date(ev.timestamp).getTime() : Date.now();
  const out = {
    event: ev.event,
    ts,
    vid: p.vid || p.distinct_id || ev.distinct_id || 'unknown',
    vsid: p.vsid || null,
    sid: p.sid || null,
    game: p.game || 'unknown',
    variant: p.variant || 'base',
    mode: p.mode || 'human',
    clip_id: p.clip_id || null,
    src: p.src || p.$referrer || 'direct',
    visit_n: p.visit_n || 1,
    hour: typeof p.hour === 'number' ? p.hour : new Date(ts).getHours(),
    late_night: !!p.late_night,
    page_type: p.page_type || 'unknown',
    circuits: p.circuits || [],
    features: p.features || {},
    trick: p.trick || '',
    variant_hypothesis: p.variant_hypothesis || '',
    posthog_id: ev.id || null
  };
  // copy remaining numeric / string props that are useful
  for (const k of ['score', 'dur_s', 'stage', 'best', 'personal_record', 'ms', 'after_near_miss', 'runs', 'play_s', 'span_s', 'browse_s', 'max_scroll', 'depth_pct', 'circuit', 'trigger_event', 'dare', 'by', 'channel']) {
    if (p[k] !== undefined) out[k] = p[k];
  }
  return out;
}
