// Stage 5 — DEPLOY: publish game + clip to the local site. Site v2 is
// mobile-first: category chips, lazy clip autoplay (only visible cards play),
// and a per-game hub page (/g/<id>.html) with the challenge line and the
// game's A/B VARIANTS produced by the loop.
// ⛔ External deploy (Vercel) + clip posting stay deliberately unwired.
import fs from 'node:fs';
import path from 'node:path';

export async function run(ctx) {
  const concept = ctx.results.ideate.concept;
  const produce = ctx.results.produce;
  const regFile = path.join(ctx.stateDir, 'registry.json');
  const registry = fs.existsSync(regFile) ? JSON.parse(fs.readFileSync(regFile, 'utf8')) : { games: [] };

  const prev = registry.games.find((g) => g.id === concept.id) || {};
  const entry = {
    ...prev,
    id: concept.id, name: concept.name, engine: concept.engine,
    circuits: concept.circuits, tagline: concept.theme,
    trick: prev.trick || concept.trick || '', challenge: prev.challenge ?? null,
    variants: prev.variants || [],
    clip: path.relative(path.join(ctx.root, 'web', 'site'), path.join(ctx.root, produce.clip.file)),
    status: 'live_local', deployed_at: new Date().toISOString(), run_id: ctx.runId
  };
  const i = registry.games.findIndex((g) => g.id === entry.id);
  if (i >= 0) registry.games[i] = entry; else registry.games.push(entry);
  fs.writeFileSync(regFile, JSON.stringify(registry, null, 2));

  renderSite(ctx.siteDir, registry);
  ctx.log(`deploy: ${entry.id} live_local — site regenerated (${registry.games.length} games, ${registry.games.reduce((a, g) => a + (g.variants?.length || 0), 0)} variants); external deploy GATED on Manuel`);
  return { registry_entry: entry, site: 'web/site/index.html', external_deploy: 'GATED — requires Manuel approval', clip_posting: 'GATED — social-autopilot pattern ready, not wired' };
}

const CSS = `
  :root { --ink:#0b0d12; --verm:#e8502e; --teal:#2ec5b6; --gold:#f2b134; --card:#12151d; }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  body { margin:0; background:var(--ink); color:#fff; font-family:-apple-system,'Helvetica Neue',Arial,sans-serif; min-height:100vh; }
  a { color:inherit; text-decoration:none; }
  .badge { font-size:10px; font-weight:800; letter-spacing:1.5px; padding:3px 8px; border-radius:99px; }
  .b-viral { background:rgba(232,80,46,.15); color:var(--verm); }
  .b-calm { background:rgba(46,197,182,.15); color:var(--teal); }
  .chip { font-size:10px; color:rgba(255,255,255,.4); border:1px solid rgba(255,255,255,.12); border-radius:6px; padding:2px 6px; }
`;

function siteDomain() {
  return process.env.LOOP_SITE_DOMAIN || 'viralfreegames.com';
}
function siteBase() {
  return `https://${siteDomain()}`;
}

function analyticsConfig() {
  // Client-side PostHog token = project API key (phc_...), NOT the personal API key.
  const posthogToken = process.env.POSTHOG_PROJECT_TOKEN || null;
  if (posthogToken && !posthogToken.startsWith('phc_')) {
    throw new Error(`POSTHOG_PROJECT_TOKEN must be a public project key (phc_...), got "${posthogToken.slice(0, 4)}..." — refusing to bake a private key into public HTML`);
  }
  return {
    vercel: true,
    hotjar: (process.env.HOTJAR_SITE_ID && process.env.HOTJAR_SNIPPET_VERSION)
      ? { id: +process.env.HOTJAR_SITE_ID, sv: +process.env.HOTJAR_SNIPPET_VERSION }
      : (process.env.HOTJAR_SITE_ID ? { id: +process.env.HOTJAR_SITE_ID, sv: 6 } : null),
    posthog: posthogToken
      ? { apiKey: posthogToken, apiHost: process.env.POSTHOG_API_HOST || 'https://us.i.posthog.com' }
      : null,
    sink: process.env.LOOP_SINK_URL || null
  };
}

function analyticsHead() {
  return `\n<script>window.LOOP_ANALYTICS = ${JSON.stringify(analyticsConfig())};</script>\n<script src="js/analytics.js"></script>`;
}

function gameMetaScript(g) {
  const features = {
    engine: g.engine,
    category: g.category || 'unknown',
    trick: g.trick || g.tagline || 'unknown',
    input: g.input || 'tap',          // default; can be set in registry later
    face_control: !!g.face_control,
    has_sound: g.has_sound !== false, // default true when juice.js is loaded
    duration_class: g.duration_class || 'short'
  };
  const meta = {
    id: g.id,
    name: g.name,
    engine: g.engine,
    circuits: g.circuits || [],
    features,
    trick: g.trick || g.tagline || '',
    category: g.category || 'unknown'
  };
  return `\n<script>window.LOOP_GAME_META = ${JSON.stringify(meta)};</script>`;
}

function injectHead(html, extra) {
  // avoid double-injection
  const marker = '<!-- LOOP_HEAD_INJECT -->';
  if (html.includes(marker)) {
    const re = new RegExp(`${marker}[\\s\\S]*?${marker}`, 'i');
    html = html.replace(re, '');
  }
  return html.replace(/<head>/i, `<head>\n${marker}${extra}\n${marker}`);
}

function injectGamePages(siteDir, registry) {
  const cfgScript = `\n<script>window.LOOP_ANALYTICS = ${JSON.stringify(analyticsConfig())};</script>`;
  for (const g of registry.games) {
    const files = [path.join(siteDir, 'games', g.id, 'index.html')];
    for (const v of g.variants || []) {
      const vid = typeof v === 'string' ? v : v.id;
      if (vid) files.push(path.join(siteDir, 'games', g.id, 'variants', vid, 'index.html'));
    }
    for (const file of files) {
      if (!fs.existsSync(file)) continue;
      let html = fs.readFileSync(file, 'utf8');
      const extra = cfgScript + gameMetaScript(g);
      html = injectHead(html, extra);
      fs.writeFileSync(file, html);
    }
  }
}

function metaHead({ path = '/', title = 'Tilt — tiny games, honest hooks', desc = '383 tiny games engineered for attention. Play one. Loop forever.', includeAnalytics = true } = {}) {
  const base = siteBase();
  const url = base.replace(/\/$/, '') + path;
  return `\n<link rel="canonical" href="${url}">` +
    `\n<meta property="og:url" content="${url}">` +
    `\n<meta property="og:title" content="${title}">` +
    `\n<meta property="og:description" content="${desc}">` +
    `\n<meta property="og:type" content="website">` +
    `\n<meta name="twitter:card" content="summary_large_image">` +
    `\n<meta name="description" content="${desc}">` +
    (includeAnalytics ? analyticsHead() : '');
}

function renderSite(siteDir, registry) {
  // categories taxonomy (for chips + labels)
  let cats = [];
  try { cats = JSON.parse(fs.readFileSync(path.join(siteDir, '..', '..', 'engine', 'state', 'categories.json'), 'utf8')).categories; } catch (_) {}
  const catLabel = Object.fromEntries(cats.map((c) => [c.id, c.label]));
  const liveCats = cats.filter((c) => registry.games.some((g) => g.category === c.id));

  // ---------- index ----------
  const cards = registry.games.map((g) => `
    <a class="card" data-engine="${g.engine}" data-category="${g.category || ''}" href="g/${g.id}.html">
      <div class="clipbox"><video class="clip" data-src="${g.clip}" muted loop playsinline preload="none"></video></div>
      <div class="meta">
        <span class="badge b-${g.engine}">${g.engine === 'viral' ? 'VIRAL' : 'CALM'}</span>
        ${g.category && catLabel[g.category] ? `<span class="catchip">${catLabel[g.category]}</span>` : ''}
        ${g.variants?.length ? `<span class="vcount">${g.variants.length + 1} versions</span>` : ''}
        <h2>${g.name}</h2>
        <p>${g.trick || g.tagline}</p>
        ${g.challenge ? `<span class="dare">${g.challenge}</span>` : '<span class="dare soft">no score. just you.</span>'}
      </div>
    </a>`).join('\n');

  const chips = ['<button class="on" data-t="all" data-v="">All</button>',
    '<button data-t="engine" data-v="viral">Viral</button>',
    '<button data-t="engine" data-v="calm">Calm</button>',
    ...liveCats.map((c) => `<button data-t="category" data-v="${c.id}">${c.label}</button>`)].join('');

  const index = `<!DOCTYPE html>
<!-- GENERATED by engine/stages/deploy.mjs — edit the template there -->
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Tilt — tiny games, honest hooks</title>${metaHead({ path: '/', title: 'Tilt — tiny games, honest hooks' })}
<style>${CSS}
  header { padding:max(24px,env(safe-area-inset-top)) 16px 4px; text-align:center; position:sticky; top:0; background:linear-gradient(var(--ink) 75%, transparent); z-index:5; }
  header h1 { font-size:34px; font-weight:900; letter-spacing:-1px; margin:0; }
  header h1 em { font-style:normal; color:var(--verm); }
  nav { display:flex; gap:8px; padding:10px 12px 12px; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  nav::-webkit-scrollbar { display:none; }
  nav button { flex:0 0 auto; background:var(--card); color:rgba(255,255,255,.65); border:1px solid rgba(255,255,255,.1); border-radius:99px; padding:7px 15px; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; }
  nav button.on { background:#fff; color:var(--ink); border-color:#fff; }
  .catchip { font-size:10px; font-weight:700; color:var(--gold); margin-left:6px; }
  main { max-width:960px; margin:0 auto 70px; padding:0 12px; display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
  @media (min-width:700px){ main { grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:18px; padding:0 24px; } }
  .card { display:block; background:var(--card); border:1px solid rgba(255,255,255,.07); border-radius:16px; overflow:hidden; }
  .card:active { transform:scale(.97); }
  .clipbox { aspect-ratio:9/16; background:#000; }
  .clip { width:100%; height:100%; object-fit:cover; display:block; }
  .meta { padding:10px 12px 12px; position:relative; }
  .vcount { font-size:10px; color:var(--gold); font-weight:700; margin-left:6px; }
  .meta h2 { margin:8px 0 2px; font-size:16px; font-weight:800; }
  .meta p { margin:0 0 6px; color:rgba(255,255,255,.45); font-size:11px; }
  .dare { font-size:12px; font-weight:800; color:var(--verm); }
  .dare.soft { color:var(--teal); }
  footer { text-align:center; padding:20px; color:rgba(255,255,255,.3); font-size:11px; }
</style></head><body>
<header><h1>til<em>t</em></h1></header>
<nav>${chips}</nav>
<main>
${cards}
</main>
<footer>${registry.games.length} games · built by the LOOP factory · <a href="/tilt-dashboard" style="color:rgba(255,255,255,.4)">🧪</a></footer>
<script>
  // filter by engine OR category
  document.querySelectorAll('nav button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('nav button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var t = b.dataset.t, v = b.dataset.v;
      document.querySelectorAll('.card').forEach(function (c) {
        var show = t === 'all' || (t === 'engine' && c.dataset.engine === v) || (t === 'category' && c.dataset.category === v);
        c.style.display = show ? '' : 'none';
      });
      window.scrollTo(0, 0);
    };
  });
  // lazy clip autoplay — only visible cards play (phones can't run 50 videos)
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting && en.target.offsetParent !== null) { if (!v.src) v.src = v.dataset.src; v.play().catch(function(){}); }
      else v.pause();
    });
  }, { rootMargin: '120px' });
  document.querySelectorAll('video.clip').forEach(function (v) { io.observe(v); });
</script>
<script src="js/loop-events.js"></script>
</body></html>`;
  fs.writeFileSync(path.join(siteDir, 'index.html'), index);

  // ---------- per-game hub pages ----------
  const gdir = path.join(siteDir, 'g');
  fs.mkdirSync(gdir, { recursive: true });
  for (const g of registry.games) {
    const variants = (g.variants || []).map((v) => typeof v === 'string' ? { id: v, status: 'live' } : v);
    const variantCards = variants.map((v) => `
      <a class="variant" href="../games/${g.id}/variants/${v.id}/?v=${encodeURIComponent(v.id)}">
        <div><b>${v.id}</b> <span class="chip">${v.status || 'testing'}</span></div>
        <p>${v.hypothesis || ''}</p>
        <span class="go">play this version →</span>
      </a>`).join('\n');
    const variantsJson = JSON.stringify(variants.map((v) => ({ id: v.id, status: v.status || 'testing' })));

    const page = `<!DOCTYPE html>
<!-- GENERATED by engine/stages/deploy.mjs -->
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${g.name} — Tilt</title>${metaHead({ path: `/g/${g.id}`, title: `${g.name} — Tilt`, desc: `${g.trick || g.tagline || 'A tiny attention loop.'} Play it at Tilt.` })}${gameMetaScript(g)}
<style>${CSS}
  .wrap { max-width:520px; margin:0 auto; padding:max(16px,env(safe-area-inset-top)) 16px 60px; }
  .back { display:inline-block; color:rgba(255,255,255,.5); font-size:14px; font-weight:700; padding:8px 0; }
  .clipbox { aspect-ratio:9/16; max-height:52vh; background:#000; border-radius:18px; overflow:hidden; margin:8px auto; width:auto; display:flex; justify-content:center; }
  video { height:100%; display:block; }
  h1 { font-size:30px; font-weight:900; margin:12px 0 2px; }
  .trick { color:rgba(255,255,255,.5); font-size:13px; margin:0 0 10px; }
  .dare { display:block; font-size:16px; font-weight:900; color:var(--verm); margin:6px 0 14px; }
  .dare.soft { color:var(--teal); }
  .play { display:block; text-align:center; background:var(--verm); color:#fff; font-size:19px; font-weight:900; padding:16px; border-radius:14px; }
  .play.calm { background:var(--teal); color:var(--ink); }
  .play:active { transform:scale(.98); }
  .circuits { margin:14px 0; display:flex; gap:6px; flex-wrap:wrap; }
  h3 { font-size:13px; letter-spacing:1px; color:rgba(255,255,255,.4); margin:22px 0 8px; text-transform:uppercase; }
  .variant { display:block; background:var(--card); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:12px 14px; margin-bottom:10px; }
  .variant p { color:rgba(255,255,255,.5); font-size:12px; margin:6px 0; }
  .variant .go { color:var(--gold); font-size:13px; font-weight:700; }
  .none { color:rgba(255,255,255,.3); font-size:13px; }
</style></head><body>
<div class="wrap">
  <a class="back" href="../">← all games</a>
  <div class="clipbox"><video src="../${g.clip}" muted loop playsinline autoplay></video></div>
  <span class="badge b-${g.engine}">${g.engine === 'viral' ? 'VIRAL' : 'CALM'}</span>
  <h1>${g.name}</h1>
  <p class="trick">${g.trick || g.tagline}</p>
  ${g.challenge ? `<span class="dare">think you can ${g.challenge}?</span>` : '<span class="dare soft">no score. no timer. just yours.</span>'}
  <a class="play ${g.engine === 'calm' ? 'calm' : ''}" href="../games/${g.id}/">▶ &nbsp;PLAY</a>
  <div class="circuits">${(g.circuits || []).map((c) => `<span class="chip">${c}</span>`).join('')}</div>
  <h3>Versions from the loop</h3>
  ${variantCards || '<p class="none">base version only — variants appear here when the loop breeds them from your play data.</p>'}
</div>
<script src="../js/loop-events.js"></script>
<script>window.LOOP_VARIANTS_FOR = window.LOOP_VARIANTS_FOR || {}; window.LOOP_VARIANTS_FOR['${g.id}'] = ${variantsJson};</script>
<script>
(function () {
  var g = '${g.id}';
  var variants = [{ id: 'base', status: 'live' }].concat((window.LOOP_VARIANTS_FOR && window.LOOP_VARIANTS_FOR[g]) || []);
  var v = window.LOOP && window.LOOP.assignVariant ? window.LOOP.assignVariant(window.LOOP.vid, g, variants) : 'base';
  var play = document.querySelector('.play');
  if (play && v !== 'base') play.href = '../games/' + g + '/?v=' + encodeURIComponent(v);
})();
</script>
</body></html>`;
    fs.writeFileSync(path.join(gdir, `${g.id}.html`), page);

    // ---------- per-variant game pages ----------
    const baseGameFile = path.join(siteDir, 'games', g.id, 'index.html');
    if (fs.existsSync(baseGameFile)) {
      const baseHtml = fs.readFileSync(baseGameFile, 'utf8');
      for (const v of variants) {
        const vdir = path.join(siteDir, 'games', g.id, 'variants', v.id);
        fs.mkdirSync(vdir, { recursive: true });
        let html = baseHtml;
        // tag events with this variant id
        html = html.replace(
          /<head>/i,
          `<head>\n<script>window.LOOP_VARIANT = ${JSON.stringify(v.id)}; window.LOOP_VARIANT_HYPOTHESIS = ${JSON.stringify(v.hypothesis || '')};</script>`
        );
        // make script/asset paths one level deeper
        html = html.replace(/src="\.\.\/\.\.\//g, 'src="../../../').replace(/href="\.\.\/\.\.\//g, 'href="../../../');
        fs.writeFileSync(path.join(vdir, 'index.html'), html);
      }
    }
  }

  // ---------- inject analytics config + game meta into every hand-built game page ----------
  injectGamePages(siteDir, registry);
}

export { renderSite };
