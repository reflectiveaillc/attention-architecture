import fs from 'node:fs';
import path from 'node:path';

const STATE_DIR = path.resolve(import.meta.dirname, '..', 'state');
const FEED_PATH = path.join(STATE_DIR, 'next-concepts.json');
const TRENDS_PATH = path.join(STATE_DIR, 'trends.json');
const CIRCUITS = ['anticipation_loop', 'near_miss_reward', 'variable_interval', 'progress_pressure', 'loss_aversion', 'social_proof', 'completion_compulsion'];
const INPUTS = ['tap', 'drag', 'swipe', 'tilt', 'type'];
const ENGINES = ['viral', 'calm'];

export default async function feed(config = {}) {
  ensureState();

  const summaryPath = path.join(STATE_DIR, 'analytics', 'summary.json');
  if (!fs.existsSync(summaryPath)) throw new Error('Run report before feed; state/analytics/summary.json missing.');

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const eventsPath = summary.live_events_file || path.join(STATE_DIR, 'events', 'live.jsonl');
  const events = fs.existsSync(eventsPath)
    ? fs.readFileSync(eventsPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];

  const registry = fs.existsSync(path.join(STATE_DIR, 'registry.json'))
    ? JSON.parse(fs.readFileSync(path.join(STATE_DIR, 'registry.json'), 'utf8'))
    : { games: [] };

  // Build a feature matrix from live data.
  const featureStats = {};
  for (const e of events) {
    const f = e.features || {};
    const k = `${f.input || 'tap'}|${f.face_control ? 'face' : 'touch'}|${f.has_sound ? 'sound' : 'silent'}|${f.engine || 'unknown'}`;
    featureStats[k] ||= { attention_s: 0, sessions: new Set(), play_starts: 0 };
    featureStats[k].play_starts += e.event === 'play_start' ? 1 : 0;
    if (e.event === 'session_end' && typeof e.play_s === 'number') featureStats[k].attention_s += e.play_s;
    if (e.vsid) featureStats[k].sessions.add(e.vsid);
  }
  const bestFeature = Object.entries(featureStats).sort((a, b) => b[1].attention_s - a[1].attention_s)[0];
  const winningFeature = bestFeature ? bestFeature[0].split('|') : ['tap', 'touch', 'silent', 'viral'];
  const [winInput, winControl, winSound, winEngine] = winningFeature;

  // Circuit winners/losers.
  const circuits = (summary.circuits || []).sort((a, b) => b.activation_rate - a.activation_rate);
  const hotCircuit = circuits[0]?.circuit || 'near_miss_reward';
  const coldCircuit = circuits[circuits.length - 1]?.circuit || 'progress_pressure';

  // Trend direction.
  const trends = summary.trends || {};
  const lastDay = (trends.series || []).slice(-1)[0] || {};
  const viralShare = lastDay.viral_share ?? 0.55;
  const engineTilt = viralShare > 0.6 ? 'calm' : viralShare < 0.4 ? 'viral' : winEngine;

  // Movers.
  const movers = (trends.movers || []).slice(0, 5);

  const concepts = [];
  for (let i = 0; i < (config.feedCount || 6); i++) {
    const engine = i === 0 ? engineTilt : ENGINES[i % 2];
    const input = i === 1 ? (INPUTS.find((x) => x !== winInput) || 'drag') : winInput;
    const face = i === 2 ? !winControl.includes('face') : winControl === 'face';
    const sound = i === 3 ? winSound === 'silent' : winSound === 'sound';
    const circuit = i === 4 ? coldCircuit : hotCircuit;

    concepts.push({
      id: `loop-${Date.now().toString(36)}-${i}`,
      source: 'feed_analytics',
      generated_at: new Date().toISOString(),
      engine,
      input,
      face_control: !!face,
      has_sound: !!sound,
      primary_circuit: circuit,
      rationale: `Best feature=${winningFeature.join('/')}, hot circuit=${hotCircuit}, cold circuit=${coldCircuit}, engine share=${viralShare}; promote under-tested combos.`,
      from_movers: movers.map((m) => m.game),
      prompt_seed: `Build a one-tap browser mini-game. Engine: ${engine}. Input: ${input}${face ? ' with face-control fallback' : ''}. Primary loop: ${circuit}. Sound: ${sound ? 'required' : 'silent OK'}. Single session <90s. No install. Use existing game mechanics from top mover${movers[0] ? ' ' + movers[0].game : ''}.`
    });
  }

  // Add a rescue concept for the worst bottom game if any.
  const bottomGame = summary.catalog?.bottom?.[0];
  if (bottomGame) {
    const gid = bottomGame.game;
    const meta = bottomGame.meta || {};
    concepts.unshift({
      id: `rescue-${gid}`,
      source: 'rescue_bottom',
      generated_at: new Date().toISOString(),
      engine: meta.engine || bottomGame.engine || 'viral',
      input: 'tap',
      face_control: false,
      has_sound: true,
      primary_circuit: 'near_miss_reward',
      rationale: `Rescue lowest P+D game ${gid} (P=${bottomGame.indices.pleasure}, D=${bottomGame.indices.dopamine}) by swapping loop and adding sound.`,
      rescue_target: gid,
      prompt_seed: `Rescue the game "${meta.name || gid}". Keep core mechanic, replace weakest loop with near_miss_reward, add audio feedback, tighten first-tap payoff, cap session to 60s.`
    });
  }

  const feed = {
    generated_at: new Date().toISOString(),
    winning_feature: { input: winInput, control: winControl, sound: winSound, engine: winEngine },
    hot_circuit: hotCircuit,
    cold_circuit: coldCircuit,
    engine_tilt: engineTilt,
    top_movers: movers,
    concepts
  };

  fs.writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2));
  fs.writeFileSync(TRENDS_PATH, JSON.stringify(trends, null, 2));
  // mirror to web/site so the dashboard can fetch it without an extra build step
  const siteAnalyticsDir = path.resolve(import.meta.dirname, '..', '..', 'web', 'site', 'analytics');
  fs.mkdirSync(siteAnalyticsDir, { recursive: true });
  fs.writeFileSync(path.join(siteAnalyticsDir, 'next-concepts.json'), JSON.stringify(feed, null, 2));

  console.log(`feed: wrote ${concepts.length} concepts → ${path.relative(process.cwd(), FEED_PATH)}`);
  return feed;
}

function ensureState() {
  fs.mkdirSync(path.join(STATE_DIR, 'analytics'), { recursive: true });
  fs.mkdirSync(path.join(STATE_DIR, 'events'), { recursive: true });
}
