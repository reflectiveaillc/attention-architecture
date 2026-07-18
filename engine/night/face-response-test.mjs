// Face-response test: the gap validate-game.mjs can't cover. Loads a face game in
// HUMAN mode, clicks ALLOW, then injects an oscillating face signal (no camera) and
// checks that ACTION events fire — proving the expression actually drives the game.
// usage: node engine/night/face-response-test.mjs [game-id ...]   (default: all face games)
import { startCollector } from '../lib/collector.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SIG = { 'flappy-face': 'mouthOpen', 'brow-lift': 'browRaise', 'head-dodge': 'headTilt', 'big-smile': 'smile', 'blink-shoot': 'blink', 'kiss-cam': 'pucker', 'cheek-float': 'cheekPuff', 'look-away': 'headYaw', 'infinite-fall-face': 'headTilt' };
const games = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SIG);
const { chromium } = await import('playwright');
const b = await chromium.launch();
let allPass = true;
for (const id of games) {
  const sk = SIG[id] || 'mouthOpen';
  const ev = `/tmp/frt-${id}.jsonl`; fs.rmSync(ev, { force: true });
  const { server, url } = await startCollector({ eventsFile: ev });
  const ctx = await b.newContext({ viewport: { width: 405, height: 720 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await p.goto(`${url}/games/${id}/?sink=${encodeURIComponent(url + '/e')}`);
  await p.waitForTimeout(300);
  await p.evaluate(() => { const s = document.getElementById('start'); if (s) s.click(); });
  await p.waitForTimeout(500);
  await p.evaluate((sk) => {
    const FC = window.FaceControl; if (!FC) return;
    FC.ready = true; FC.faceSeen = true;
    // Oscillate the signal through the lib's pulse engine (injectSig steps it),
    // proving the full gesture→tap/gate path — not just raw sig reads.
    let t = 0; FC.update = function () {
      t++; const v = (Math.floor(t / 20) % 2) ? 0.9 : 0.03;
      if (sk === 'headTilt') { FC.sig.headTilt = v > 0.5 ? 0.8 : -0.8; FC.faceSeen = true; }
      else if (sk === 'headYaw' || sk === 'headPitch') { FC.sig[sk] = (t % 80) < 60 ? 0 : 0.8; FC.faceSeen = true; }  // long re-center, short look (human cadence)
      else if (FC.injectSig) FC.injectSig({ [sk]: v });
      else FC.sig[sk] = v;
    };
  }, sk);
  await p.waitForTimeout(5000);
  await p.close(); await ctx.close(); server.close();
  await new Promise((r) => setTimeout(r, 150));
  const evs = fs.existsSync(ev) ? fs.readFileSync(ev, 'utf8').trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } }) : [];
  const acts = evs.filter((e) => e.event && e.event !== 'session_heartbeat' && e.event !== 'clip_landed');
  const started = acts.some((e) => e.event === 'play_start');
  const responded = acts.some((e) => e.event !== 'play_start' && e.event !== 'session_end');
  const pass = started && responded && errs.length === 0;
  if (!pass) allPass = false;
  const c = {}; for (const e of acts) c[e.event] = (c[e.event] || 0) + 1;
  console.log(`${pass ? '✅' : '❌'} ${id.padEnd(13)} ${JSON.stringify(c)}${errs.length ? ' ERR:' + errs[0] : ''}`);
}
await b.close();
process.exit(allPass ? 0 : 1);
