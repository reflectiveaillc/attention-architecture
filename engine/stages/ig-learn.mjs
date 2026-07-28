// Stage 0c — IG-LEARN: the delayed re-verdict the loop was missing.
//
// learn.mjs verdicts a concept at run time T0 — before its clip has been
// posted to Instagram (posting is gated on Manuel), so the IG override was
// structurally unreachable for new concepts. This stage closes the gap: it
// runs AFTER clips have accumulated real IG engagement (via ig-ingest →
// ig-signals.json) and verdicts already-posted games into evidence.json,
// keyed by game id. signal.mjs then injects "variant-of-winner" concepts for
// IG winners — the concrete mechanism by which a market win produces more of
// the winning family next cycle.
//
// Idempotent: each game gets at most one ig-learn win and one ig-learn loss.
// Pure file I/O, no network. Runs from `loop.mjs ig-learn` and from
// scripts/refresh-analytics.sh after ig-ingest.
import fs from 'node:fs';
import path from 'node:path';

const readJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return dflt; } };
// A game needs this much cumulative real exposure before a 0% like-rate counts
// as the market rejecting it. Small samples stay unjudged (never fake losses).
const LOSS_MIN_TOTAL_VIEWS = 300;

export async function run({ stateDir, log = (m) => console.log(`  ${m}`) }) {
  const root = path.resolve(stateDir, '..', '..');
  const config = readJson(path.join(root, 'engine', 'config.json'), { bars: {} });
  const igBar = config.bars?.ig_like_rate ?? 0.04;
  const igMinLikes = config.bars?.ig_min_likes ?? 5;

  const igSignals = readJson(path.join(stateDir, 'ig-signals.json'), {});
  const registry = readJson(path.join(stateDir, 'registry.json'), { games: [] });
  const gameById = Object.fromEntries((registry.games || []).map((g) => [g.id, g]));
  const evidenceFile = path.join(stateDir, 'evidence.json');
  const evidence = readJson(evidenceFile, {});

  // Derive each game's input mode from live events (feeds the variant
  // concept's feature mix downstream in signal.mjs).
  const liveFile = path.join(stateDir, 'events', 'live.jsonl');
  const inputByGame = {};
  if (fs.existsSync(liveFile)) {
    for (const l of fs.readFileSync(liveFile, 'utf8').trim().split('\n')) {
      let e; try { e = JSON.parse(l); } catch { continue; }
      const g = (e.game || '').toLowerCase().trim().replace(/\s+/g, '-');
      const inp = e.features?.input;
      if (g && inp && !inputByGame[g]) inputByGame[g] = inp;
    }
  }

  let wins = 0, losses = 0, skipped = 0;
  const at = new Date().toISOString();
  for (const [concept, s] of Object.entries(igSignals)) {
    const g = gameById[concept];
    if (!g) continue; // posted id not in registry — can't variant a ghost
    const ev = evidence[concept] || { wins: 0, losses: 0, runs: [] };
    const alreadyWin = (ev.runs || []).some((r) => r.source === 'ig-learn' && r.verdict === 'approve_scale_ig');
    const alreadyLoss = (ev.runs || []).some((r) => r.source === 'ig-learn' && r.verdict === 'suspend_learn');

    const igPass = (s.likes || 0) >= igMinLikes && (s.like_rate || 0) >= igBar;
    if (igPass && !alreadyWin) {
      ev.wins = (ev.wins || 0) + 1;
      ev.runs.push({
        run_id: `ig-learn-${at.slice(0, 10)}`, game: concept, source: 'ig-learn',
        verdict: 'approve_scale_ig',
        metrics: {
          ig_like_rate: s.like_rate, ig_likes: s.likes, ig_views: s.views,
          ig_peak_like_rate: s.peak_like_rate, ig_posts: s.posts, ig_input: inputByGame[concept] || null
        },
        note: `delayed market verdict: ${s.likes} likes @ ${(s.like_rate * 100).toFixed(1)}% on ${s.views} views (engine=${s.engine})`,
        at
      });
      evidence[concept] = ev;
      wins++;
      log(`ig-learn: WIN  ${concept} — ${s.likes} likes @ ${(s.like_rate * 100).toFixed(1)}% (engine=${s.engine}) → evidence boosted, variant concept armed`);
    } else if (!igPass && !alreadyWin && !alreadyLoss
               && (s.total_views || 0) >= LOSS_MIN_TOTAL_VIEWS && (s.peak_like_rate || 0) <= 0.005) {
      ev.losses = (ev.losses || 0) + 1;
      ev.runs.push({
        run_id: `ig-learn-${at.slice(0, 10)}`, game: concept, source: 'ig-learn',
        verdict: 'suspend_learn',
        metrics: { ig_like_rate: s.like_rate, ig_likes: s.likes, ig_views: s.total_views },
        note: `market reject: ${s.total_views} cumulative views, peak like-rate ${((s.peak_like_rate || 0) * 100).toFixed(2)}%`,
        at
      });
      evidence[concept] = ev;
      losses++;
      log(`ig-learn: LOSS ${concept} — ${s.total_views} views, never liked → demoted in signal`);
    } else {
      skipped++;
    }
  }

  if (wins || losses) fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));
  log(`ig-learn: ${wins} new IG win(s), ${losses} new market reject(s), ${skipped} unjudged/already-counted`);
  return { wins, losses, skipped };
}
