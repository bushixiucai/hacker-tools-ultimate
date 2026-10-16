// 构建期校验所有脚本（内置 + 文案组）：打包 registry 在 Node 中执行，任何校验错误即失败
import { build } from 'esbuild';
import { readFileSync, readdirSync } from 'node:fs';
const res = await build({
  stdin: { contents: `import { SCRIPTS, UNPARSED_EGGS } from './src/scenario/registry'; import { GAGS, GAG_SCRIPTS } from './src/scenario/gagsData'; export { SCRIPTS, UNPARSED_EGGS, GAGS, GAG_SCRIPTS };`, resolveDir: '.', loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error',
  plugins: [{ name: 'glob', setup(b) {
    // 把 import.meta.glob 替换为同步读取 JSON（仅校验用）
    b.onLoad({ filter: /(registry|gagsData)\.ts$/ }, (a) => ({ loader: 'ts', contents: readFileSync(a.path, 'utf8').replace(
      /import\.meta\.glob<[^>]*>\('([^']+)',[^)]*\)/g,
      (_m, pat) => `__glob(${JSON.stringify(pat)})`) + `
function __glob(p){const fs=require('node:fs'),path=require('node:path');const dir=path.resolve(${JSON.stringify(process.cwd() + '/src/scenario')},path.dirname(p));const o={};
if(!fs.existsSync(dir))return o;for(const f of fs.readdirSync(dir))if(f.endsWith('.json'))o[dir+'/'+f]={default:JSON.parse(fs.readFileSync(dir+'/'+f,'utf8'))};return o;}` }));
  } }],
});
const url = 'data:text/javascript;base64,' + Buffer.from(`import{createRequire}from'node:module';const require=createRequire(${JSON.stringify(import.meta.url)});` + res.outputFiles[0].text).toString('base64');
try {
  const { SCRIPTS, UNPARSED_EGGS, GAGS, GAG_SCRIPTS } = await import(url);
  for (const s of SCRIPTS) console.log(`  ✔ ${s.id} (${s.format}) steps=${s.steps.length} eggs=${s.easterEggs?.length ?? 0}`);
  if (UNPARSED_EGGS.length) { console.error('✘ 无法解析的彩蛋：\n  ' + UNPARSED_EGGS.join('\n  ')); process.exit(1); }
  const byCat = GAGS.reduce((m, g) => ((m[g.category] = (m[g.category] ?? 0) + 1), m), {});
  console.log(`  ✔ 一键神功 ${GAGS.length} 个：${JSON.stringify(byCat)}，生成剧本 ${GAG_SCRIPTS.length} 个`);
  console.log(`✔ check:scripts 通过（${SCRIPTS.length} 个脚本 + ${GAGS.length} 个一键神功）`);
} catch (e) { console.error('✘ check:scripts 失败：' + e.message); process.exit(1); }
