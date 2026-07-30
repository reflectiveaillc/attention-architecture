// Validation gate for worker-produced games.
// usage: node engine/night/validate-game.mjs <game-id>
// PASS requires: bot mode reaches __botDone, demo mode reaches __demoDone,
// the event pipe saw play_start + game_over, AND the human path renders clean.
// Prints JSON verdict.
//
// ⛔ WHY THE HUMAN PASS EXISTS (added 2026-07-30 after four broken games shipped):
// this gate used to load games ONLY as ?bot=1 and ?demo=1. breath-filter called
// initSession() exclusively when BOT||DEMO was set, so its state was uninitialised
// on the bare URL a real player opens — createRadialGradient threw on frame 1 for
// every human while both validated modes rendered perfectly. The gate was
// certifying a code path nobody plays.
//
// It was also blind to NaN. A canvas draw with a NaN coordinate throws nothing and
// logs nothing, it just silently paints no pixels: tap-save drew its character at
// NaN for a week (and odd-one shipped a blank clip the same way). So the human pass
// instruments CanvasRenderingContext2D and fails on any NaN argument.
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
// The point of this check is "the game loads nothing over the network" — instant
// start, works behind a school filter. It must therefore look at things that
// actually FETCH: script/img src, stylesheet links, @import, fetch/XHR.
// It previously matched any `href="https://…"`, which flagged the <link rel=canonical>
// that every game page carries — so it failed even stack-rush, the hand-built
// reference game. A gate that red-flags known-good code gets ignored, so scope it.
const externalLoads = [
  /src=["']https?:\/\//i,                                   // <script>, <img>, <iframe>
  /<link[^>]+rel=["']?(stylesheet|preload|prefetch)["']?[^>]*href=["']https?:\/\//i,
  /@import\s+(url\()?["']https?:\/\//i,
  /(fetch|importScripts)\(\s*["']https?:\/\//i,
  /new\s+(XMLHttpRequest|EventSource|WebSocket)\b[\s\S]{0,80}?["'](https?|wss?):\/\//i,
];
result.checks.no_external_resources = isFace ? true : !externalLoads.some((re) => re.test(html));
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
  const demoErrors = [];
  demo.on('pageerror', (e) => demoErrors.push(String(e).slice(0, 200)));
  await demo.goto(`${url}/games/${gameId}/?demo=1&seed=7`);
  result.checks.demo_done = await demo.waitForFunction('window.__demoDone === true', null, { timeout: 120_000 }).then(() => true).catch(() => false);
  // demo errors used to be collected and then silently dropped
  result.checks.demo_no_page_errors = demoErrors.length === 0;
  if (demoErrors.length) result.demo_errors = demoErrors.slice(0, 3);
  await demo.close();

  // --- HUMAN PASS: the bare URL, with taps, exactly as a player arrives ---
  if (isFace) {
    // Face games need a camera we cannot grant headlessly; their own harness is
    // engine/night/face-response-test. Marked n/a rather than silently passed.
    result.human_pass = 'skipped (face game — needs camera)';
    result.checks.human_no_page_errors = true;
    result.checks.human_no_nan_draws = true;
    result.checks.human_renders = true;
  } else {
    // hasTouch matters: without it touchscreen.tap throws and the taps silently
    // never happen, which would quietly gut this whole check.
    const human = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const humanErrors = [];
    human.on('pageerror', (e) => humanErrors.push(String(e).slice(0, 200)));
    await human.addInitScript(`
      window.__nanDraws = [];
      const P = CanvasRenderingContext2D.prototype;
      for (const m of ['translate','arc','fillRect','strokeRect','fillText','strokeText',
                       'moveTo','lineTo','rect','arcTo','ellipse','drawImage','clearRect',
                       'createRadialGradient','createLinearGradient','quadraticCurveTo','bezierCurveTo']) {
        const orig = P[m];
        if (!orig) continue;
        P[m] = function (...a) {
          if (a.some((v) => typeof v === 'number' && Number.isNaN(v))) {
            if (window.__nanDraws.length < 5) window.__nanDraws.push(m + '(' + a.join(',') + ')');
          }
          return orig.apply(this, a);
        };
      }
    `);
    // NO bot/demo flag — this is the player's URL
    await human.goto(`${url}/games/${gameId}/`);
    await human.waitForTimeout(900);          // title / idle render
    for (let i = 0; i < 3; i++) {             // a player taps
      await human.touchscreen.tap(195, 500).catch(() => {});
      await human.waitForTimeout(350);
    }
    await human.waitForTimeout(600);

    const nan = await human.evaluate(() => window.__nanDraws || []);
    result.checks.human_no_nan_draws = nan.length === 0;
    if (nan.length) result.human_nan_draws = nan;

    // A canvas painting a single flat colour means nothing is being drawn.
    result.checks.human_renders = await human.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c || !c.width) return false;
      try {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const seen = new Set();
        for (let i = 0; i < d.length; i += 4 * 97) seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
        return seen.size >= 3;
      } catch { return true; }   // WebGL/tainted canvas — not our call to make
    });

    result.checks.human_no_page_errors = humanErrors.length === 0;
    if (humanErrors.length) result.human_errors = humanErrors.slice(0, 3);
    await human.close();
  }
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
