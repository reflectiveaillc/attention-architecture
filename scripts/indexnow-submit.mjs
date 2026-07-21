// Submit all sitemap URLs to IndexNow (Bing/Yandex/Seznam + feeds Copilot/ChatGPT browse).
// Usage: node scripts/indexnow-submit.mjs <key>
import fs from 'node:fs';
const key = process.argv[2];
if (!key) { console.error('usage: node scripts/indexnow-submit.mjs <key>'); process.exit(1); }
const xml = fs.readFileSync(new URL('../web/site/sitemap.xml', import.meta.url), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const host = 'www.viralfreegames.com';
const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls })
});
console.log(`indexnow: submitted ${urls.length} urls → HTTP ${r.status}`);
