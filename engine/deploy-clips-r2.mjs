#!/usr/bin/env node
// Upload hook clips to Cloudflare R2 and rewrite registry clip paths to public R2 URLs.
// Prerequisites:
//   npm install -g wrangler
//   wrangler login
//   wrangler r2 bucket create tilt-clips
//   set R2_PUBLIC_URL (custom domain or https://pub-<hash>.r2.dev)
// This keeps the git repo small and makes git-linked Vercel deploys self-contained.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIPS = path.join(ROOT, 'web', 'site', 'clips');
const REGISTRY = path.join(ROOT, 'engine', 'state', 'registry.json');

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString();
}

async function main() {
  const bucket = required('R2_BUCKET');
  const publicUrl = required('R2_PUBLIC_URL').replace(/\/$/, '');

  // sanity-check wrangler
  run('wrangler --version');

  const files = fs.readdirSync(CLIPS).filter((f) => f.endsWith('.mp4'));
  console.log(`uploading ${files.length} clips to R2 bucket "${bucket}"…`);

  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  const updated = [];
  for (const file of files) {
    const key = `clips/${file}`;
    const local = path.join(CLIPS, file);
    const exists = run(`wrangler r2 object get ${bucket}/${key} --pipe 2>&1 || true`).includes('Content-Type');
    if (!exists) {
      run(`wrangler r2 object put ${bucket}/${key} --file "${local}" --content-type "video/mp4"`);
      console.log(`  uploaded: ${file} (${(fs.statSync(local).size / 1024 / 1024).toFixed(1)} MB)`);
    } else {
      console.log(`  skip (exists): ${file}`);
    }
    const publicPath = `${publicUrl}/${key}`;
    for (const g of registry.games) {
      if (g.clip && g.clip.endsWith(file)) { g.clip = publicPath; updated.push(g.id); }
    }
  }
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2));
  console.log(`\nregistry updated for ${[...new Set(updated)].length} games`);
  console.log('run `node engine/loop.mjs site` to regenerate pages with R2 clip URLs');
}

main().catch((e) => { console.error(e); process.exit(1); });
