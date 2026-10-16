// 默认构建不得包含任何一键神功文案（内容未审核；构建期开关 VITE_GAGS=1 才打包）
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] ?? 'dist';
if (!existsSync(dir)) { console.error(`✘ 找不到 ${dir}，请先 npm run build`); process.exit(1); }
const gagDir = '../scripts/gags', texts = [];
for (const f of existsSync(gagDir) ? readdirSync(gagDir).filter((f) => f.endsWith('.json')) : [])
  for (const g of JSON.parse(readFileSync(join(gagDir, f), 'utf8'))) texts.push(g.label, g.twist);
const files = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } }; walk(dir);
const hits = [];
for (const f of files) { const c = readFileSync(f, 'utf8'); for (const t of texts) if (t && c.includes(t)) hits.push(`${f}: ${t}`); }
if (files.some((f) => /gagsData/.test(f))) hits.push('存在 gagsData 分块');
if (hits.length) { console.error('✘ 默认构建中发现一键神功内容：\n  ' + hits.slice(0, 10).join('\n  ')); process.exit(1); }
console.log(`✔ check:dist-no-gags 通过（${dir} 中无 ${texts.length} 条神功文案）`);
