// LOOP Edge collector — receives client events via navigator.sendBeacon,
// forwards them to PostHog, and returns 204 fast. Keeps the device event
// shape so the engine can replay it from PostHog later.
export const config = { runtime: 'edge' };

const POSTHOG_HOST = process.env.POSTHOG_API_HOST || 'https://us.i.posthog.com';
// Project API key (phc_...) for server-side capture; personal API key is separate.
const POSTHOG_KEY = process.env.POSTHOG_PROJECT_TOKEN;
const SITE_DOMAIN = process.env.LOOP_SITE_DOMAIN || 'viralfreegames.com';

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.text();
    if (!body) return new Response(null, { status: 204 });
  } catch (_) {
    return new Response(null, { status: 204 });
  }

  // Each beacon may carry one event object or a newline batch.
  const rawEvents = body.trim().split('\n').map((l) => {
    try { return JSON.parse(l); } catch (_) { return null; }
  }).filter(Boolean);

  if (POSTHOG_KEY) {
    const batch = rawEvents.map((e) => toPostHogEvent(e));
    try {
      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: POSTHOG_KEY, batch })
      });
    } catch (_) {
      // fail open: the client still local-buffers if sink fails; we log nothing
    }
  }

  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

function toPostHogEvent(e) {
  const eventName = e.event || '$event';
  const distinctId = e.vid || e.vsid || 'anon';
  const props = {};
  for (const k in e) {
    if (k === 'event' || k === 'ts') continue;
    props[k] = e[k];
  }
  props['$current_url'] = e.page_type ? `https://${SITE_DOMAIN}/${e.page_type === 'game' ? 'games/' + (e.game || '') : ''}` : `https://${SITE_DOMAIN}/`;
  props['$host'] = SITE_DOMAIN;
  props['$lib'] = 'loop-edge-collector';
  return {
    event: eventName,
    properties: props,
    distinct_id: distinctId,
    timestamp: e.ts ? new Date(e.ts).toISOString() : new Date().toISOString()
  };
}
