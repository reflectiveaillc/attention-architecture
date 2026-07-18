// Validation gate for worker-produced games.
// usage: node engine/night/validate-game.mjs <game-id>
// PASS requires: bot mode reaches __botDone, demo mode reaches __demoDone,
// and the event pipe saw play_start + game_over. Prints JSON verdict.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCollector } from '../lib/collector.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const gameId = process.argv[2];
if (!gameId) { console.error('usage: validate-game.mjs <game-id>'); process.exit(2); }

const result = { game: gameId, checks: {}, pass: false };
const gameFile = path.join(ROOT, 'web', 'site', 'games', gameId, 'index.html');
result.checks.file_exists = fs.existsSync(gameFile);
if (!result.checks.file_exists) { finish(); }

const html = fs.readFileSync(gameFile, 'utf8');
result.checks.uses_event_layer = html.includes('loop-events.js') && html.includes('LOOP_GAME');
const isFace = /mediapipe|LOOP_FACE|FaceLandmarker/i.test(html);
  result.checks.no_external_resources = isFace ? true : !/src=["']https?:|href=["']https?:|fetch\(["']https?:/i.test(html);
  result.is_face = isFace;

const eventsFile = path.join(ROOT, 'engine', 'state', 'events', `validate-${gameId}.jsonl`);
fs.rmSync(eventsFile, { force: true });
const { server, url } = await startCollector({ eventsFile });
const { chromium } = await import('playwright');
const browser = await chromium.launch();

try {
  const bot = await browser.newPage({ viewport: { width: 405, height: 720 } });
  const errors = [];
  bot.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await bot.goto(`${url}/games/${gameId}/?bot=1&runs=2&seed=5&clip=validate&sink=${encodeURIComponent(url + '/e')}`);
  result.checks.bot_done = await bot.waitForFunction('window.__botDone === true', null, { timeout: 120_000 }).then(() => true).catch(() => false);
  result.checks.no_page_errors = errors.length === 0;
  if (errors.length) result.page_errors = errors.slice(0, 3);
  await bot.close();

  const demo = await browser.newPage({ viewport: { width: 405, height: 720 } });
  await demo.goto(`${url}/games/${gameId}/?demo=1&seed=7`);
  result.checks.demo_done = await demo.waitForFunction('window.__demoDone === true', null, { timeout: 120_000 }).then(() => true).catch(() => false);
  await demo.close();
} finally {
  await browser.close(); server.close();
}

await new Promise((r) => setTimeout(r, 200));
const events = fs.existsSync(eventsFile)
  ? fs.readFileSync(eventsFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } })
  : [];
result.checks.emits_play_start = events.some((e) => e.event === 'play_start');
result.checks.emits_game_over = events.some((e) => e.event === 'game_over');
result.events_seen = events.length;

finish();

function finish() {
  result.pass = Object.values(result.checks).every(Boolean);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.pass ? 0 : 1);
}
