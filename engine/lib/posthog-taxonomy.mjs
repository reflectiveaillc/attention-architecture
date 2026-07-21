// LOOP PostHog taxonomy manager — idempotent event/property definitions.
// Insights/funnels are printed as JSON for manual import because the insight
// creation API is project-specific and brittle; definitions are auto-created.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const TAXONOMY_PATH = path.join(ROOT, 'engine', 'config', 'posthog-taxonomy.json');

export async function apply({ projectId, apiKey, host = 'https://us.posthog.com' }) {
  if (!apiKey) throw new Error('POSTHOG_PERSONAL_API_KEY required');
  if (!projectId) throw new Error('project_id required');

  const tax = JSON.parse(fs.readFileSync(TAXONOMY_PATH, 'utf8'));
  const baseUrl = `${host}/api/projects/${projectId}`;
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  const results = { events: { created: 0, existing: 0, failed: 0 }, properties: { created: 0, existing: 0, failed: 0 } };

  // fetch existing definitions to avoid duplicates
  const existingEvents = await listAll(`${baseUrl}/event_definitions/`, headers);
  const existingProps = await listAll(`${baseUrl}/property_definitions/`, headers);
  const eventNames = new Set(existingEvents.map((e) => e.name));
  const propNames = new Set(existingProps.map((p) => p.name));

  for (const ev of tax.events) {
    if (eventNames.has(ev.name)) { results.events.existing++; continue; }
    const r = await fetch(`${baseUrl}/event_definitions/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: ev.name, description: ev.description })
    });
    if (r.ok) results.events.created++; else results.events.failed++;
  }

  for (const p of tax.properties) {
    if (propNames.has(p.name)) { results.properties.existing++; continue; }
    const r = await fetch(`${baseUrl}/property_definitions/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: p.name, description: p.description, property_type: mapType(p.type) })
    });
    if (r.ok) results.properties.created++; else results.properties.failed++;
  }

  console.log('PostHog taxonomy applied:');
  console.log(`  events     created ${results.events.created} · existing ${results.events.existing} · failed ${results.events.failed}`);
  console.log(`  properties created ${results.properties.created} · existing ${results.properties.existing} · failed ${results.properties.failed}`);
  console.log('\nFunnel insight JSON for manual import:');
  console.log(JSON.stringify(tax.insights, null, 2));
  return results;
}

async function listAll(url, headers) {
  const items = [];
  let next = url;
  while (next) {
    const r = await fetch(next, { headers });
    if (!r.ok) break;
    const data = await r.json();
    items.push(...(data.results || []));
    next = data.next || null;
  }
  return items;
}

function mapType(t) {
  return ({ string: 'String', number: 'Numeric', boolean: 'Boolean', array: 'String', object: 'String' }[t]) || 'String';
}
