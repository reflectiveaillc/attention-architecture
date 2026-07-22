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
  // www is the canonical host in production (apex 308s to www)
  return process.env.LOOP_SITE_DOMAIN || 'www.viralfreegames.com';
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
  // absolute path: pages live at /, /g/<id> and /games/<id>/ depths
  return `\n<script>window.LOOP_ANALYTICS = ${JSON.stringify(analyticsConfig())};</script>\n<script src="/js/analytics.js"></script>`;
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
  // full analytics head: config + PostHog/Vercel SDK loader (analytics.js),
  // so game pages get real SDK capture, not just the beacon fallback
  const cfgScript = analyticsHead();
  for (const g of registry.games) {
    const files = [path.join(siteDir, 'games', g.id, 'index.html')];
    for (const v of g.variants || []) {
      const vid = typeof v === 'string' ? v : v.id;
      if (vid) files.push(path.join(siteDir, 'games', g.id, 'variants', vid, 'index.html'));
    }
    for (const file of files) {
      if (!fs.existsSync(file)) continue;
      let html = fs.readFileSync(file, 'utf8');
      // play pages are thin (pure canvas) — canonical points at the /g/ hub
      const extra = cfgScript + gameMetaScript(g) + `\n<link rel="canonical" href="${siteBase()}/g/${g.id}">`;
      html = injectHead(html, extra);
      fs.writeFileSync(file, html);
    }
  }
}

// hreflang alternates for pages that exist in every language (/ and /best/*).
// pagePath is the language-neutral path ('/', '/best/<slug>').
function hreflangLinks(pagePath) {
  const base = siteBase();
  const p = pagePath === '/' ? '/' : pagePath;
  const links = [
    `\n<link rel="alternate" hreflang="x-default" href="${base}${p}">`,
    `\n<link rel="alternate" hreflang="en" href="${base}${p}">`
  ];
  for (const t of loadI18n()) {
    // trailingSlash:false in vercel.json — /de not /de/
    links.push(`\n<link rel="alternate" hreflang="${t.locale}" href="${base}/${t.locale}${p === '/' ? '' : p}">`);
  }
  return links.join('');
}

let I18N_CACHE = null;
function loadI18n() {
  if (I18N_CACHE) return I18N_CACHE;
  const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'config', 'i18n');
  I18N_CACHE = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
        .sort((a, b) => a.locale.localeCompare(b.locale))
    : [];
  return I18N_CACHE;
}

function metaHead({ path = '/', title = 'Tilt — tiny games, honest hooks', desc = '383 tiny games engineered for attention. Play one. Loop forever.', includeAnalytics = true, ld = [], alternatesPath = null } = {}) {
  const base = siteBase();
  const url = base.replace(/\/$/, '') + path;
  return `\n<link rel="canonical" href="${url}">` +
    (alternatesPath ? hreflangLinks(alternatesPath) : '') +
    `\n<meta property="og:url" content="${url}">` +
    `\n<meta property="og:title" content="${title}">` +
    `\n<meta property="og:description" content="${desc}">` +
    `\n<meta property="og:type" content="website">` +
    `\n<meta name="twitter:card" content="summary_large_card">` +
    `\n<meta name="description" content="${desc}">` +
    ld.map((o) => `\n<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('') +
    (includeAnalytics ? analyticsHead() : '');
}

// ---------------- SEO layer ----------------
// Keyword phrase per registry category, used in <title> patterns.
const CAT_PHRASE = {
  reflexes: 'Reaction Game', memory: 'Memory Game', rhythm: 'Rhythm Game',
  anxiety: 'Calming Game', insomnia: 'Relaxing Game', adhd: 'Fidget Game',
  ocd: 'Satisfying Game', sensory: 'Sensory Game', autism: 'Sensory Game',
  perfectionist: 'Precision Game', curiosity: 'Weird Game',
  competitor: 'Challenge Game', collector: 'Collecting Game', face: 'Face-Controlled Game'
};

// Intent collections: keyword-targeted hubs at /best/<slug>.
// Naming is deliberately non-clinical; copy makes zero medical claims.
const COLLECTIONS = [
  { slug: 'games-to-play-when-bored', h1: 'Games to Play When Bored',
    title: 'Games to Play When Bored — Free, Instant, No Download',
    desc: 'Bored right now? Tap any of these free browser mini games and be playing in under 2 seconds. No download, no sign-up, works on your phone.',
    intro: 'Every game on this page loads instantly in your browser and takes under a minute to learn. No downloads, no accounts, no ads between you and the game — tap a card and you are playing. They are tiny on purpose: one clear goal, one input, and a score that dares you to try again.',
    faqs: [
      { q: 'What can I play when I’m bored with nothing installed?', a: 'Any game on this page runs directly in your browser — phone or desktop — with no download or sign-up. Tap one and you are playing in about two seconds.' },
      { q: 'Are these games really free?', a: 'Yes. Every game on viralfreegames.com is free to play, with no accounts and no paywalls.' },
      { q: 'Do these games work on iPhone and Android?', a: 'Yes. They are built mobile-first: one-thumb controls, portrait layout, and they run in Safari and Chrome without installing anything.' }],
    match: () => true, cap: 48 },
  { slug: '1-minute-games', h1: '1-Minute Games',
    title: '1-Minute Games — Quick Free Browser Games, No Download',
    desc: 'Quick free games you can finish in about a minute. Perfect for a short break: instant load, one-tap controls, no download.',
    intro: 'These are the fastest games on the site: a full round takes roughly a minute or less. They are built for the gap between two things — a queue, a kettle, an elevator. One tap to start, one clear score at the end, and a rematch button that loads instantly.',
    faqs: [
      { q: 'What is a good game for a 1 minute break?', a: 'Round-based games with instant restarts work best — reaction tests, timing challenges and one-tap arcade loops. Every game on this page finishes a round in about a minute.' },
      { q: 'Do I need to install anything?', a: 'No. Everything here runs in the browser tab you already have open.' }],
    match: (g) => g.engine === 'viral', cap: 48 },
  { slug: 'calming-games', h1: 'Calming Games',
    title: 'Calming Games Online Free — Relaxing Browser Games, No Download',
    desc: 'Free calming browser games with no score pressure, no timers and no ads. Slow, soft, designed to wind you down instead of hooking you.',
    intro: 'Most free game sites are engineered to speed you up. This page is the opposite: games from our calm engine, designed to slow your pace — soft visuals, gentle audio, no leaderboards, and in many of them no score at all. They end when you feel like ending them.',
    faqs: [
      { q: 'What makes a game calming instead of addictive?', a: 'Calming games remove the pressure mechanics — countdowns, streaks, near-miss jolts — and replace them with slow pacing, soft feedback and natural stopping points. Our calm games are built that way on purpose.' },
      { q: 'Are these games free and offline-friendly?', a: 'They are free and load in your browser; once a game has loaded, most keep working even with a weak connection.' },
      { q: 'Can I play these before bed?', a: 'They are designed for low stimulation — dim palettes, no sudden sounds — which makes them a better fit for late evening than typical arcade games.' }],
    match: (g) => g.engine === 'calm', cap: 48 },
  { slug: 'anxiety-relief-games', h1: 'Games That Feel Good When You’re Anxious',
    title: 'Anxiety-Relief Games — Free Calming Browser Games',
    desc: 'Free browser games designed to feel steadying when your mind is racing: breathing pacers, slow sorting, soft repetition. No download.',
    intro: 'When your head is loud, the right kind of game gives your hands something ordered and predictable to do. The games here are built around steady rhythms — breathing pacers, gentle sorting, slow repetition — with no timers and no failure states. They are games, not therapy, and they make no medical claims; they are simply designed to feel steadying.',
    faqs: [
      { q: 'Can games actually help with anxious moments?', a: 'Games with slow, predictable, repetitive actions can feel grounding for many people, similar to a fidget object. These are designed with that in mind — though they are entertainment, not a treatment.' },
      { q: 'Which type should I try first?', a: 'Breathing-paced games are the most popular starting point — the game moves at inhale/exhale speed, and your input follows the rhythm.' }],
    match: (g) => g.category === 'anxiety', cap: 48 },
  { slug: 'games-to-fall-asleep', h1: 'Games to Play in Bed When You Can’t Sleep',
    title: 'Games to Fall Asleep — Slow, Dark, Free Browser Games',
    desc: 'Can’t sleep? These free browser games are dim, slow and endless-calm — built to bore you gently toward sleep instead of waking you up.',
    intro: 'Most phone games at 1 a.m. make things worse: bright colors, streaks, adrenaline. These do the opposite. Dark palettes, no win/lose, movements that drift at breathing speed. They are designed to be put down — several fade themselves quieter the longer you play.',
    faqs: [
      { q: 'Is playing a game in bed a bad idea?', a: 'Bright, fast, reward-heavy games wake your brain up. Slow, dim, no-goal games are far less stimulating — that is the entire design brief for this page.' },
      { q: 'Do these games have sound?', a: 'Some have soft optional audio; all of them work fully muted.' }],
    match: (g) => g.category === 'insomnia', cap: 48 },
  { slug: 'fidget-games', h1: 'Fidget Games',
    title: 'Fidget Games Online — Free Dopamine Games, No Download',
    desc: 'Free fidget games for restless hands: tap, pop, drag, spin. Instant browser games that scratch the itch — no download, no sign-up.',
    intro: 'Sometimes you don’t want a challenge — you want something for your hands. These are digital fidget toys: pop things, drag things, spin things, stack things. Constant small feedback, zero stakes, instant restarts. The screen equivalent of clicking a pen, minus the annoyed coworkers.',
    faqs: [
      { q: 'What is a fidget game?', a: 'A game you play for the feel of the interaction itself — taps, pops, snaps and drags with satisfying feedback — rather than to win. All of these run free in your browser.' },
      { q: 'Are fidget games good for focus?', a: 'Many people fidget to stay focused during calls or reading. A low-stakes tapping loop can serve the same role as a fidget spinner — entertainment, not a medical tool.' }],
    match: (g) => g.category === 'adhd', cap: 48 },
  { slug: 'oddly-satisfying-games', h1: 'Oddly Satisfying Games',
    title: 'Oddly Satisfying Games — Free Browser Games, No Download',
    desc: 'Peel, align, fill, pop, complete. Free oddly satisfying browser games that hit the “just right” feeling — instant play, no download.',
    intro: 'The “oddly satisfying” feeling — the peel that comes off in one piece, the shape that fits exactly, the last tile that completes the set — is a real, specific pleasure. These games are engineered directly for it: clean completions, perfect alignments, and that quiet click in your brain when everything resolves.',
    faqs: [
      { q: 'Why do satisfying games feel so good?', a: 'They deliver completion and order — patterns finishing, gaps filling, sets resolving — which the brain rewards. Every game here is built around one of those completion loops.' },
      { q: 'Are these the same as ASMR games?', a: 'Close cousins. ASMR focuses on sound and texture; oddly satisfying focuses on completion and precision. Several games here do both, with soft audio on by default.' }],
    match: (g) => g.category === 'ocd', cap: 48 },
  { slug: 'sensory-games', h1: 'Sensory Games',
    title: 'Sensory Games Online Free — Gentle Visual & Audio Play',
    desc: 'Free sensory browser games: gentle visuals, soft audio, predictable interactions, no jump scares, no time pressure. No download needed.',
    intro: 'These games are picked for predictable, gentle sensory experiences: smooth motion, soft color, optional audio, and interactions that never punish you. Nothing flashes, nothing screams, nothing surprises you. Good for winding down, for background play, or for anyone who prefers low-stimulation games.',
    faqs: [
      { q: 'What makes a game sensory-friendly?', a: 'Predictability and control: no sudden sounds or flashes, adjustable or optional audio, no countdown pressure, and gentle failure states. That is the filter for every game on this page.' },
      { q: 'Do these games require sound?', a: 'No — all of them are fully playable muted, and audio is a soft layer, never a requirement.' }],
    match: (g) => g.category === 'sensory' || g.category === 'autism', cap: 48 },
  { slug: 'memory-test-games', h1: 'Memory Test Games',
    title: 'Memory Test Games — Free Short-Term Memory Games Online',
    desc: 'Test your short-term memory free in your browser: sequences, numbers, patterns and positions. Instant play, scores to beat, no download.',
    intro: 'How many digits can you actually hold in your head? The classic answer is 7±2 — these games let you test it. Sequences, positions, patterns and numbers, each with a hard score at the end that tells you exactly where you stand. Fair warning: they start easy on purpose.',
    faqs: [
      { q: 'What is a normal short-term memory score?', a: 'Most people hold 5 to 9 items in short-term memory (the classic “seven plus or minus two”). The number games here will find your personal limit in about two minutes.' },
      { q: 'Do memory games improve memory?', a: 'They reliably improve at the game itself; broader transfer is debated in research. Either way, they are a fun benchmark — and the scores are very shareable.' }],
    match: (g) => g.category === 'memory', cap: 48 },
  { slug: 'reaction-time-games', h1: 'Reaction Time Games',
    title: 'Reaction Time Test Games — Free Online Reflex Games',
    desc: 'Test your reaction time free: F1 start lights, quick-draw duels, dodge tests. Millisecond scores, instant browser play, no download.',
    intro: 'Average human reaction time to a visual cue is around 250 milliseconds. Formula 1 drivers live near 200. These games give you your real number — F1-style start lights, quick-draw duels, and dodge tests, all scored to the millisecond. Then they dare you to beat it.',
    faqs: [
      { q: 'What is a good reaction time?', a: 'Around 250ms is typical for a visual stimulus; under 200ms is excellent and near athlete level. Play one round of the F1 lights game here and you will have your own number in ten seconds.' },
      { q: 'Why is my reaction time different on my phone?', a: 'Touchscreens add input latency, so phone scores run slightly slower than mouse scores. Compare against yourself on the same device for a fair benchmark.' }],
    match: (g) => g.category === 'reflexes', cap: 48 },
  { slug: 'rhythm-games', h1: 'Rhythm Games',
    title: 'Free Rhythm Games Online — Beat & Timing Games, No Download',
    desc: 'Free browser rhythm games: lock the beat, dodge on tempo, tap in time. Instant play with sound on, no download, no sign-up.',
    intro: 'Turn your sound on for these. Beat-locked dodging, tempo tapping, BPM duels — rhythm games are the rare genre where your ears do half the work. Every one here runs instantly in the browser and scores your timing precision, not just your survival.',
    faqs: [
      { q: 'Do I need sound on for rhythm games?', a: 'Strongly recommended — the audio IS the gameplay. They remain technically playable muted using visual cues, but you lose the best part.' },
      { q: 'Are these rhythm games free?', a: 'Yes, free in the browser with no download — tap and play.' }],
    match: (g) => g.category === 'rhythm', cap: 48 },
  { slug: 'face-control-games', h1: 'Face-Controlled Games',
    title: 'Face Control Games — Play With Your Face, Free in Browser',
    desc: 'Games you play with your FACE: smile to flap, raise brows to jump, look away to dodge. Free in-browser camera games — nothing recorded.',
    intro: 'Your face is the controller. Smile to flap, raise your eyebrows to jump, pucker to shoot, look away to dodge. These games use your camera directly in the browser — all processing happens on your device, nothing is recorded or uploaded, and the camera turns off when you leave. Fair warning: you will make ridiculous faces, and it is even funnier watching someone else play.',
    faqs: [
      { q: 'How do face-controlled games work?', a: 'The browser reads your camera and tracks facial landmarks (smile, brows, head direction) on your device in real time. One gesture equals one tap. Nothing is recorded, stored or uploaded.' },
      { q: 'Do I need to install an app for camera games?', a: 'No — these run in the normal browser on your phone or laptop. You just grant camera permission for the tab and revoke it any time.' },
      { q: 'Are face games safe for privacy?', a: 'The camera feed is processed entirely on your device and never leaves it. Close the tab and the camera is off.' }],
    match: (g) => g.category === 'face', cap: 48 },
  { slug: 'precision-games', h1: 'Precision Games',
    title: 'Precision Games — Perfect Circle, Perfect Timing, Free Online',
    desc: 'Draw a perfect circle, stop at exactly 10.00, land the pixel-perfect drop. Free precision browser games that grade you mercilessly.',
    intro: 'These games grade you to the decimal. Draw a circle and get judged as a percentage. Stop a clock at exactly 10.00 seconds. Land a block dead center. There is no luck to blame and no one else to beat — just you against a number that refuses to be perfect. One more try. Every time.',
    faqs: [
      { q: 'How do you draw a perfect circle?', a: 'Slow, constant speed, and draw from the shoulder, not the wrist. Most people score in the 80s; above 95% is genuinely rare. The circle game here scores you instantly.' },
      { q: 'Why are precision games so addictive?', a: 'Because the near-miss is visible: 9.98 seconds, 94.6% roundness. Seeing exactly how close you came is the strongest “one more try” trigger there is — which is also why we cap the pressure with no ads and no streaks.' }],
    match: (g) => g.category === 'perfectionist', cap: 48 },
  { slug: 'weird-games', h1: 'Weird Games',
    title: 'Weird Games on the Internet — Free Strange Browser Experiments',
    desc: 'The strange corner of the internet: games that narrate their own manipulation, buttons that beg you not to press them. Free, no download.',
    intro: 'This is the strange shelf: a lab game that narrates exactly how it is manipulating you while it does it, a button whose entire game is that you should not press it, autoplay you have to fight. Small internet experiments that are one-part game, one-part joke, one-part mirror. Show a friend.',
    faqs: [
      { q: 'What are some weird websites with games?', a: 'You are on one. This page collects our strangest browser experiments — self-aware games, anti-games and curiosities — all free and instant.' }],
    match: (g) => g.category === 'curiosity', cap: 48 },
  { slug: 'challenge-a-friend-games', h1: 'Games to Challenge Your Friends',
    title: 'Challenge a Friend — Free Score-Battle Browser Games',
    desc: 'Set a score, send the link, watch them fail. Free browser games built for friendly score battles — instant play on any phone.',
    intro: 'Every game here ends with a number — and a link. Set your score, send it, and your friend opens the exact same challenge with your number stamped on it. No accounts, no friend lists, no install: the dare travels as a plain URL. The rematch spiral is the whole point.',
    faqs: [
      { q: 'How do I challenge a friend without them installing anything?', a: 'Finish a round, tap share, and send the link. Your friend plays the same game in their browser with your score as the target. Works in any chat app.' },
      { q: 'Are these two-player games?', a: 'They are turn-based score battles — you play, they play, the better number wins. No simultaneous connection needed, which is why they work over text.' }],
    match: (g) => g.category === 'competitor', cap: 48 }
];

function videoGameLd(g, base) {
  return {
    '@context': 'https://schema.org', '@type': 'VideoGame',
    name: g.name, url: `${base}/g/${g.id}`,
    description: `${g.tagline || 'A tiny free browser game.'} Free to play in the browser, no download.`,
    playMode: 'SinglePlayer', applicationCategory: 'Game',
    gamePlatform: ['Web Browser', 'Mobile'], operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' }
  };
}
function faqLd(faqs) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  };
}
function gameFaqs(g) {
  const how = g.challenge
    ? `${g.tagline ? g.tagline.charAt(0).toUpperCase() + g.tagline.slice(1) + '. ' : ''}Your challenge: ${g.challenge}. One tap to start, instant restarts.`
    : `${g.tagline ? g.tagline.charAt(0).toUpperCase() + g.tagline.slice(1) + '. ' : ''}No score and no timer — play at your own pace and stop whenever you like.`;
  return [
    { q: `How do you play ${g.name}?`, a: how },
    { q: `Is ${g.name} free?`, a: `Yes — ${g.name} is free to play in your browser with no download, no sign-up and no paywall.` },
    { q: `Can I play ${g.name} on my phone?`, a: `Yes. ${g.name} is built mobile-first and runs in Safari or Chrome on any phone — nothing to install.` }
  ];
}
function gameTitle(g) {
  const phrase = CAT_PHRASE[g.category] || 'Mini Game';
  return `${g.name} — Free ${phrase} Online, No Download`;
}
function gameDesc(g) {
  const tag = g.tagline ? `${g.tagline.charAt(0).toUpperCase()}${g.tagline.slice(1)}. ` : '';
  const dare = g.challenge ? `Think you can ${g.challenge}? ` : '';
  return `Play ${g.name} free in your browser. ${tag}${dare}No download, no sign-up — instant play on phone or desktop.`;
}
function collectionsFor(g) {
  return COLLECTIONS.filter((c) => c.slug !== 'games-to-play-when-bored' && c.match(g)).slice(0, 3);
}

function renderSite(siteDir, registry) {
  // categories taxonomy (for chips + labels)
  let cats = [];
  try { cats = JSON.parse(fs.readFileSync(path.join(siteDir, '..', '..', 'engine', 'state', 'categories.json'), 'utf8')).categories; } catch (_) {}
  const catLabel = Object.fromEntries(cats.map((c) => [c.id, c.label]));
  const liveCats = cats.filter((c) => registry.games.some((g) => g.category === c.id));

  // ---------- index ----------
  const cards = registry.games.map((g) => `
    <a class="card" data-engine="${g.engine}" data-category="${g.category || ''}" href="/g/${g.id}.html">
      <div class="clipbox"><video class="clip" data-src="/${g.clip}" muted loop playsinline preload="none"></video></div>
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

  const makeIndex = (t) => {
    const n = registry.games.length;
    const locale = t ? t.locale : 'en';
    const prefix = t ? `/${t.locale}` : '';
    const homeTitle = t ? t.home.title.replace('{n}', n) : `Viral Free Games — ${n} Tiny Browser Games, No Download`;
    const homeDesc = t ? t.home.desc.replace('{n}', n) : `${n} free online mini games that load instantly: reaction tests, calming games, fidget games, face-controlled games and more. No download, no sign-up.`;
    return `<!DOCTYPE html>
<!-- GENERATED by engine/stages/deploy.mjs — edit the template there -->
<html lang="${locale}"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${homeTitle}</title>${metaHead({
    path: prefix || '/',
    title: homeTitle,
    desc: homeDesc,
    ld: [{
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: 'Viral Free Games', alternateName: 'Tilt', url: siteBase(), inLanguage: locale
    }],
    alternatesPath: '/'
  })}
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
<footer>
  <nav style="display:block;max-width:960px;margin:0 auto 14px;line-height:2" aria-label="Game collections">
    ${COLLECTIONS.map((c) => `<a href="${prefix}/best/${c.slug}" style="color:rgba(255,255,255,.45);margin:0 8px;white-space:nowrap">${(t ? t.collections[c.slug] : c).h1}</a>`).join('\n    ')}
  </nav>
  <nav style="display:block;margin:0 auto 14px" aria-label="Languages">
    <a href="/" style="color:rgba(255,255,255,${locale === 'en' ? '.7' : '.45'});margin:0 8px">English</a>
    ${loadI18n().map((x) => `<a href="/${x.locale}" hreflang="${x.locale}" style="color:rgba(255,255,255,${x.locale === locale ? '.7' : '.45'});margin:0 8px">${x.label}</a>`).join('\n    ')}
  </nav>
  ${registry.games.length} games · built by the LOOP factory · <a href="/tilt-dashboard" style="color:rgba(255,255,255,.4)">🧪</a>
</footer>
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
<script src="/js/loop-events.js"></script>
</body></html>`;
  };
  fs.writeFileSync(path.join(siteDir, 'index.html'), makeIndex(null));
  for (const t of loadI18n()) {
    fs.mkdirSync(path.join(siteDir, t.locale), { recursive: true });
    fs.writeFileSync(path.join(siteDir, t.locale, 'index.html'), makeIndex(t));
  }

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
<title>${gameTitle(g)}</title>${metaHead({ path: `/g/${g.id}`, title: gameTitle(g), desc: gameDesc(g), ld: [videoGameLd(g, siteBase()), faqLd(gameFaqs(g))] })}${gameMetaScript(g)}
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
  ${collectionsFor(g).length ? `<h3>More like this</h3>\n  <p class="none">${collectionsFor(g).map((c) => `<a href="/best/${c.slug}" style="color:var(--gold);font-weight:700">${c.h1}</a>`).join(' · ')}</p>` : ''}
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

  // ---------- SEO: intent collections (en + localized) + sitemap + robots ----------
  renderCollections(siteDir, registry);
  for (const t of loadI18n()) renderCollections(siteDir, registry, t);
  renderSitemapAndRobots(siteDir, registry);
}

function renderCollections(siteDir, registry, t = null) {
  const base = siteBase();
  const locale = t ? t.locale : 'en';
  const prefix = t ? `/${t.locale}` : '';
  const ui = t ? t.ui : {
    allGames: '← all {n} games', questions: 'Questions', moreCollections: 'More collections',
    viral: 'VIRAL', calm: 'CALM', noScore: 'no score. just you.'
  };
  const dir = path.join(siteDir, ...(t ? [t.locale, 'best'] : ['best']));
  fs.mkdirSync(dir, { recursive: true });
  for (const c of COLLECTIONS) {
    const L = t ? t.collections[c.slug] : c;   // localized copy pack
    if (!L) continue;
    const games = registry.games.filter(c.match).slice(0, c.cap || 48);
    if (!games.length) continue;
    const cards = games.map((g) => `
    <a class="card" href="/g/${g.id}.html">
      <div class="clipbox"><video class="clip" data-src="/${g.clip}" muted loop playsinline preload="none"></video></div>
      <div class="meta">
        <span class="badge b-${g.engine}">${g.engine === 'viral' ? ui.viral : ui.calm}</span>
        <h2>${g.name}</h2>
        <p>${g.tagline || ''}</p>
        ${g.challenge ? `<span class="dare">${g.challenge}</span>` : `<span class="dare soft">${ui.noScore}</span>`}
      </div>
    </a>`).join('\n');
    const faqHtml = L.faqs.map((f) => `
    <details class="faq"><summary>${f.q}</summary><p>${f.a}</p></details>`).join('\n');
    const others = COLLECTIONS.filter((o) => o.slug !== c.slug && (!t || t.collections[o.slug]));
    const ld = [
      {
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: L.h1, url: `${base}${prefix}/best/${c.slug}`, description: L.desc, inLanguage: locale,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: games.slice(0, 20).map((g, i) => ({
            '@type': 'ListItem', position: i + 1, name: g.name, url: `${base}/g/${g.id}`
          }))
        }
      },
      faqLd(L.faqs)
    ];
    const page = `<!DOCTYPE html>
<!-- GENERATED by engine/stages/deploy.mjs -->
<html lang="${locale}"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${L.title}</title>${metaHead({ path: `${prefix}/best/${c.slug}`, title: L.title, desc: L.desc, ld, alternatesPath: `/best/${c.slug}` })}
<style>${CSS}
  .wrap { max-width:960px; margin:0 auto; padding:max(20px,env(safe-area-inset-top)) 16px 60px; }
  .back { display:inline-block; color:rgba(255,255,255,.5); font-size:14px; font-weight:700; padding:8px 0; }
  h1 { font-size:30px; font-weight:900; margin:8px 0 10px; letter-spacing:-.5px; }
  .intro { color:rgba(255,255,255,.6); font-size:15px; line-height:1.65; max-width:680px; margin:0 0 22px; }
  main { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
  @media (min-width:700px){ main { grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:18px; } }
  .card { display:block; background:var(--card); border:1px solid rgba(255,255,255,.07); border-radius:16px; overflow:hidden; }
  .card:active { transform:scale(.97); }
  .clipbox { aspect-ratio:9/16; background:#000; }
  .clip { width:100%; height:100%; object-fit:cover; display:block; }
  .meta { padding:10px 12px 12px; }
  .meta h2 { margin:8px 0 2px; font-size:16px; font-weight:800; }
  .meta p { margin:0 0 6px; color:rgba(255,255,255,.45); font-size:11px; }
  .dare { font-size:12px; font-weight:800; color:var(--verm); }
  .dare.soft { color:var(--teal); }
  h3 { font-size:13px; letter-spacing:1px; color:rgba(255,255,255,.4); margin:34px 0 10px; text-transform:uppercase; }
  .faq { background:var(--card); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:12px 16px; margin-bottom:10px; }
  .faq summary { font-weight:700; font-size:14px; cursor:pointer; }
  .faq p { color:rgba(255,255,255,.55); font-size:13px; line-height:1.6; margin:10px 0 2px; }
  .others a { color:rgba(255,255,255,.45); margin-right:14px; line-height:2; white-space:nowrap; font-size:13px; }
</style></head><body>
<div class="wrap">
  <a class="back" href="${prefix || '/'}">${ui.allGames.replace('{n}', registry.games.length)}</a>
  <h1>${L.h1}</h1>
  <p class="intro">${L.intro}</p>
  <main>
${cards}
  </main>
  <h3>${ui.questions}</h3>
  ${faqHtml}
  <h3>${ui.moreCollections}</h3>
  <p class="others">${others.map((o) => `<a href="${prefix}/best/${o.slug}">${(t ? t.collections[o.slug] : o).h1}</a>`).join('\n  ')}</p>
</div>
<script>
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(function(){}); }
      else v.pause();
    });
  }, { rootMargin: '120px' });
  document.querySelectorAll('video.clip').forEach(function (v) { io.observe(v); });
</script>
<script src="/js/loop-events.js"></script>
</body></html>`;
    fs.writeFileSync(path.join(dir, `${c.slug}.html`), page);
  }
}

function renderSitemapAndRobots(siteDir, registry) {
  const base = siteBase();
  const today = new Date().toISOString().slice(0, 10);
  const liveCollections = COLLECTIONS.filter((c) => registry.games.some(c.match));
  const urls = [
    { loc: `${base}/`, priority: '1.0' },
    ...loadI18n().map((t) => ({ loc: `${base}/${t.locale}`, priority: '0.9' })),
    ...liveCollections.map((c) => ({ loc: `${base}/best/${c.slug}`, priority: '0.8' })),
    ...loadI18n().flatMap((t) => liveCollections
      .filter((c) => t.collections[c.slug])
      .map((c) => ({ loc: `${base}/${t.locale}/best/${c.slug}`, priority: '0.7' }))),
    ...registry.games.map((g) => ({
      loc: `${base}/g/${g.id}`, priority: '0.6',
      lastmod: (g.deployed_at || '').slice(0, 10) || undefined
    }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod || today}</lastmod><priority>${u.priority}</priority></url>`).join('\n') +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(siteDir, 'sitemap.xml'), xml);
  fs.writeFileSync(path.join(siteDir, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /tilt-dashboard\n\nSitemap: ${base}/sitemap.xml\n`);
}

export { renderSite };
