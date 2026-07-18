// Merge cat-*.json design outputs into the backlog with category tags.
import fs from 'node:fs';
const bl = JSON.parse(fs.readFileSync('engine/state/design-backlog.json','utf8'));
const seen = new Set(bl.designs.map(d=>d.id));
const cats = ['reflexes','ocd','autism','adhd','anxiety','insomnia','perfectionist','collector','competitor','sensory','rhythm','memory','curiosity'];
let added=0, report={};
for (const c of cats) {
  const f = `engine/state/designs/cat-${c}.json`;
  if (!fs.existsSync(f)) { report[c]='MISSING'; continue; }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(f,'utf8').replace(/^[^\[]*/,'').replace(/[^\]]*$/,'')); }
  catch(e){ report[c]='PARSE_ERR'; continue; }
  let n=0;
  for (const d of arr) { if (!d.id || seen.has(d.id)) continue; d.category=c; seen.add(d.id); bl.designs.push(d); n++; added++; }
  report[c]=n;
}
bl.count = bl.designs.length;
fs.writeFileSync('engine/state/design-backlog.json', JSON.stringify(bl,null,2));
console.log('added', added, 'designs. per-cat:', JSON.stringify(report), '| backlog now', bl.count);
