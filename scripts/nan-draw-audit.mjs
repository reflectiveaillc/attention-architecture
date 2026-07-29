// Runtime playability audit: catch games that draw at NaN coordinates.
//
// The validation gate checks that events fire and no exceptions throw. Neither
// notices a game rendering its character at NaN — the canvas API silently draws
// nothing. tap-save shipped that way and reached Instagram; odd-one did it before.
// This instruments the 2D context and reports any draw call receiving NaN.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const GAMES = process.env.GAMES_DIR ? path.resolve(process.env.GAMES_DIR) : path.resolve('web/site/games');
const PROBE = `
  window.__nanCalls = [];
  const P = CanvasRenderingContext2D.prototype;
  for (const m of ['translate','arc','fillRect','strokeRect','fillText','moveTo','lineTo','rect','arcTo','ellipse','drawImage','clearRect']) {
    const orig = P[m];
    if (!orig) continue;
    P[m] = function (...a) {
      if (a.some(v => typeof v === 'number' && Number.isNaN(v))) {
        if (window.__nanCalls.length < 5) window.__nanCalls.push(m + '(' + a.join(',') + ')');
      }
      return orig.apply(this, a);
    };
  }
`;

const only = process.argv[2];
const dirs = fs.readdirSync(GAMES)
  .filter(d => fs.existsSync(path.join(GAMES, d, 'index.html')))
  .filter(d => !only || d === only);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const bad = [];

for (const [i, d] of dirs.entries()) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 120)));
  try {
    await page.addInitScript(PROBE);
    await page.goto(`file://${path.join(GAMES, d, 'index.html')}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(500);
    // a real player taps — do that, then look again
    await page.mouse.click(195, 500);
    await page.waitForTimeout(600);
    const nan = await page.evaluate(() => window.__nanCalls || []);
    if (nan.length || errors.length) bad.push({ game: d, nan, errors });
  } catch (e) {
    bad.push({ game: d, nan: [], errors: [`LOAD FAIL: ${e.message.slice(0, 90)}`] });
  }
  await page.close();
  if ((i + 1) % 50 === 0) console.log(`  …${i + 1}/${dirs.length}`);
}
await browser.close();

console.log(`\nscanned ${dirs.length} games — ${bad.length} with problems\n`);
for (const b of bad) {
  console.log(`✗ ${b.game}`);
  for (const n of b.nan) console.log(`    NaN draw: ${n}`);
  for (const e of b.errors) console.log(`    error: ${e}`);
}
fs.writeFileSync('engine/state/nan-audit.json', JSON.stringify({ scanned: dirs.length, bad }, null, 2));
