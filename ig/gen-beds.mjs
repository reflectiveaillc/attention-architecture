#!/usr/bin/env node
// Generate looping music beds for the IG clip pipeline — pure PCM synthesis,
// $0, no external APIs. Four beds cover the 14 game categories:
//   arcade — driving square-lead chiptune (reflexes, competitor, adhd, face, curiosity)
//   focus  — minimal soft-pulse (ocd, autism, perfectionist, memory, collector)
//   rhythm — beat-forward loop (rhythm)
//   calm   — NOT generated here: reuses content-studio yip-asmr bed.mp3
//            (sensory, anxiety, insomnia)
// Output: ig/beds/<name>.m4a (24s, loopable — bar-aligned so -stream_loop is seamless)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SR = 44100;
const OUT = new URL('./beds/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

// note name -> frequency
const N = {};
const names = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
for (let oct = 1; oct <= 6; oct++) names.forEach((n, i) => { N[n + oct] = 440 * Math.pow(2, (i - 9) / 12 + (oct - 4)); });

function synth({ bpm, bars, tracks }) {
  const beat = 60 / bpm, barLen = beat * 4, total = bars * barLen;
  const len = Math.round(total * SR), buf = new Float32Array(len);
  for (const tr of tracks) {
    const stepLen = beat * (tr.step || 0.25) * 4 / 4; // tr.step in beats
    const seq = tr.seq;
    for (let s = 0; ; s++) {
      const t0 = s * (tr.step * beat);
      if (t0 >= total) break;
      const tok = seq[s % seq.length];
      if (!tok || tok === '.') continue;
      const dur = (tr.gate || 0.8) * tr.step * beat;
      const i0 = Math.round(t0 * SR), i1 = Math.min(len, Math.round((t0 + dur) * SR));
      if (tr.kind === 'noise') {
        for (let i = i0; i < i1; i++) {
          const tt = (i - i0) / SR, env = Math.exp(-tt * (tr.decay || 60));
          buf[i] += (Math.random() * 2 - 1) * env * tr.vol;
        }
      } else if (tr.kind === 'kick') {
        for (let i = i0; i < i1; i++) {
          const tt = (i - i0) / SR, env = Math.exp(-tt * 18);
          const f = 120 * Math.exp(-tt * 25) + 42;
          buf[i] += Math.sin(2 * Math.PI * f * tt) * env * tr.vol;
        }
      } else {
        const f = N[tok]; if (!f) continue;
        for (let i = i0; i < i1; i++) {
          const tt = (i - i0) / SR;
          const env = Math.min(1, tt * 200) * Math.exp(-tt * (tr.decay || 3));
          let v;
          const ph = f * tt;
          if (tr.kind === 'square') v = Math.sign(Math.sin(2 * Math.PI * ph)) * 0.6 + Math.sign(Math.sin(2 * Math.PI * ph * 2.005)) * 0.15;
          else if (tr.kind === 'tri') { const x = ph % 1; v = 4 * Math.abs(x - 0.5) - 1; }
          else v = Math.sin(2 * Math.PI * ph);
          buf[i] += v * env * tr.vol;
        }
      }
    }
  }
  // gentle master soft-clip + normalize to -12 dBFS-ish peak
  let peak = 0; for (let i = 0; i < len; i++) { buf[i] = Math.tanh(buf[i]); peak = Math.max(peak, Math.abs(buf[i])); }
  const g = peak > 0 ? 0.25 / peak : 1;
  const pcm = Buffer.alloc(len * 2);
  for (let i = 0; i < len; i++) pcm.writeInt16LE(Math.round(buf[i] * g * 32767), i * 2);
  return pcm;
}

function writeBed(name, cfg) {
  const pcm = synth(cfg);
  const raw = OUT + name + '.pcm';
  fs.writeFileSync(raw, pcm);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(SR), '-ac', '1', '-i', raw,
    '-c:a', 'aac', '-b:a', '128k', OUT + name + '.m4a']);
  fs.rmSync(raw);
  console.log('bed:', name);
}

// ARCADE — 128bpm, 12 bars (~22.5s): driving bass, square lead hook, hats, kick 4-floor
writeBed('arcade', {
  bpm: 128, bars: 12, tracks: [
    { kind: 'kick', step: 1, gate: 0.4, vol: 0.9, seq: ['x', 'x', 'x', 'x'] },
    { kind: 'noise', step: 0.5, gate: 0.12, decay: 90, vol: 0.25, seq: ['.', 'h'] },
    { kind: 'square', step: 0.5, gate: 0.55, decay: 6, vol: 0.5,
      seq: ['A2', 'A2', 'A3', 'A2', 'G2', 'G2', 'G3', 'G2', 'F2', 'F2', 'F3', 'F2', 'E2', 'E2', 'E3', 'E2'] },
    { kind: 'square', step: 0.25, gate: 0.5, decay: 8, vol: 0.28,
      seq: ['A4', '.', 'C5', 'E5', '.', 'E5', 'D5', 'C5', 'B4', '.', 'G4', 'B4', '.', 'D5', 'C5', 'B4',
            'A4', '.', 'C5', 'E5', '.', 'A5', 'G5', 'E5', 'F5', '.', 'E5', 'D5', 'E5', '.', 'B4', '.'] },
  ],
});

// FOCUS — 100bpm, 10 bars (24s): soft triangle pulse + airy pad tones, sparse
writeBed('focus', {
  bpm: 100, bars: 10, tracks: [
    { kind: 'kick', step: 2, gate: 0.3, vol: 0.5, seq: ['x'] },
    { kind: 'tri', step: 0.5, gate: 0.9, decay: 4, vol: 0.4,
      seq: ['C3', '.', 'G3', '.', 'E3', '.', 'G3', '.', 'A2', '.', 'E3', '.', 'G3', '.', 'C3', '.'] },
    { kind: 'sine', step: 1, gate: 1.6, decay: 1.2, vol: 0.3,
      seq: ['E4', 'G4', 'C5', 'B4', 'A4', 'E4', 'D4', 'G4'] },
  ],
});

// RHYTHM — 112bpm, 11 bars (~23.6s): syncopated kick, off-beat bass, clap noise
writeBed('rhythm', {
  bpm: 112, bars: 11, tracks: [
    { kind: 'kick', step: 0.5, gate: 0.4, vol: 0.85, seq: ['x', '.', '.', 'x', '.', '.', 'x', '.'] },
    { kind: 'noise', step: 1, gate: 0.14, decay: 40, vol: 0.35, seq: ['.', 'c', '.', 'c'] },
    { kind: 'noise', step: 0.25, gate: 0.08, decay: 120, vol: 0.15, seq: ['h', '.', 'h', 'h'] },
    { kind: 'tri', step: 0.5, gate: 0.6, decay: 5, vol: 0.5,
      seq: ['.', 'D3', '.', 'D3', '.', 'F3', '.', 'A3', '.', 'D3', '.', 'C3', '.', 'F3', '.', 'G3'] },
  ],
});
console.log('done');
