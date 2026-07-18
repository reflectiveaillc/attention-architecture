// LOOP traffic — feeds the Measure stage.
// 1) runBotSession: a REAL browser session (Playwright) playing the game in bot
//    mode; its events flow through the real event layer → sendBeacon → collector.
// 2) generateSyntheticCohort: a seeded, clearly-labeled synthetic audience
//    (mode:'synthetic') POSTed through the SAME collector endpoint, standing in
//    for platform traffic that doesn't exist until clips are actually posted.
//    Assumptions live in `params` so they can be re-run with different dials.

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export async function runBotSession({ siteUrl, sinkUrl, gameId, clipId, runs = 3, seed = 7 }) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 405, height: 720 } });
  const qs = `?bot=1&runs=${runs}&seed=${seed}&clip=${clipId}&src=e2e-bot&sink=${encodeURIComponent(sinkUrl)}`;
  const t0 = Date.now();
  await page.goto(`${siteUrl}/games/${gameId}/${qs}`);
  await page.waitForFunction('window.__botDone === true', null, { timeout: 180_000 });
  await page.waitForTimeout(400);
  await browser.close();
  return { runs, seed, wall_s: +((Date.now() - t0) / 1000).toFixed(1) };
}

export const DEFAULT_COHORT = {
  // per-platform: clip impressions and click-through assumption
  platforms: [
    { platform: 'tiktok', impressions: 4200, ctr: 0.071 },
    { platform: 'reels', impressions: 2400, ctr: 0.055 },
    { platform: 'shorts', impressions: 1400, ctr: 0.048 }
  ],
  play_prob: 0.52,        // landed → started a run
  session_median_s: 140,  // lognormal median of playing sessions
  session_sigma: 0.55,
  d1_prob: 0.12           // landed → returned next day
};

export async function generateSyntheticCohort({ sinkUrl, clipId, gameId, seed = 99, params = DEFAULT_COHORT }) {
  const rng = mulberry32(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const post = (e) => fetch(`${sinkUrl}`, { method: 'POST', body: JSON.stringify(e) });

  let sent = 0, landings = 0, players = 0, d1 = 0, totalImpr = 0;
  const base = { game: gameId, mode: 'synthetic', clip_id: clipId };
  const queue = [];

  for (const p of params.platforms) {
    totalImpr += p.impressions;
    queue.push({ ...base, event: 'clip_impressions', platform: p.platform, count: p.impressions, ts: Date.now() });
    // binomial via per-impression draw is slow; use expectation + noise
    const n = Math.max(0, Math.round(p.impressions * p.ctr + gauss() * Math.sqrt(p.impressions * p.ctr * (1 - p.ctr))));
    for (let i = 0; i < n; i++) {
      const vid = `syn-${p.platform}-${i}-${seed}`;
      const sid = `ssyn-${p.platform}-${i}`;
      const t0 = Date.now() - Math.floor(rng() * 5 * 24 * 3600e3);
      const ev = { ...base, vid, sid, src: p.platform };
      queue.push({ ...ev, event: 'clip_landed', ts: t0 });
      landings++;
      if (rng() < params.play_prob) {
        players++;
        const dur = Math.round(params.session_median_s * Math.exp(params.session_sigma * gauss()));
        queue.push({ ...ev, event: 'play_start', ts: t0 + 3000 });
        queue.push({ ...ev, event: 'session_heartbeat', t: dur, ts: t0 + 3000 + dur * 1000 });
        queue.push({ ...ev, event: 'game_over', score: Math.max(1, Math.round(6 + gauss() * 4)), dur_s: dur, ts: t0 + 3000 + dur * 1000 });
      }
      if (rng() < params.d1_prob) {
        d1++;
        queue.push({ ...ev, sid: sid + '-d1', event: 'd1_return', ts: t0 + 26 * 3600e3 });
      }
    }
  }
  // send in small parallel batches
  for (let i = 0; i < queue.length; i += 50) {
    await Promise.all(queue.slice(i, i + 50).map(post));
    sent += Math.min(50, queue.length - i);
  }
  return { seed, params, impressions: totalImpr, landings, players, d1_returns: d1, events_sent: sent };
}
