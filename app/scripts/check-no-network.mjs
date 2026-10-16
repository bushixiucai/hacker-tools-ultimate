// 静态零网络/零权限检查（PRD R1–R4、§2.10）
// - 禁止网络 API：fetch / XMLHttpRequest / WebSocket / EventSource / sendBeacon / RTCPeerConnection / importScripts
// - 禁止权限 API（R4）：getUserMedia / enumerateDevices / permissions.query / geolocation / clipboard.read / showOpenFilePicker / bluetooth / usb / serial / Notification.requestPermission
// - 禁止预取：dns-prefetch / preconnect / prefetch / prerender / speculationrules
// - 外部 URL 只允许出现在普通 <a href="https://..."> 中（赞助外链）；src= / <link href> / url() / import / 其它位置一律禁止
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const API = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection|importScripts)\b/;
const PERM = /\b(getUserMedia|enumerateDevices|permissions\.query|geolocation|clipboard\.read\w*|showOpenFilePicker|showSaveFilePicker|navigator\.(bluetooth|usb|serial|hid)|requestPermission)\b/;
const PREFETCH = /\b(dns-prefetch|preconnect|prefetch|prerender|speculationrules)\b/i;
const URL_RE = /(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)<>]*/gi;
const ALLOWED_A = /<a\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*>/gi;

const walk = (d, out = []) => { if (!existsSync(d)) return out; for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; };
const src = [...walk('src'), 'index.html', ...walk('public')];
const data = walk('../scripts'); // 文案脚本：只查网络/权限 API 名（文本中的 URL 仅作显示）
let bad = 0;
const fail = (f, i, why, l) => { console.error(`✘ ${f}:${i + 1} [${why}] ${l.trim().slice(0, 160)}`); bad++; };
for (const f of src) readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
  if (/^\s*(\/\/|\*|\/\*)/.test(l)) return; // 跳过注释行
  if (API.test(l)) fail(f, i, '网络API', l);
  if (PERM.test(l) && !f.endsWith('_headers')) fail(f, i, '权限API', l); // _headers 中是禁用声明
  if (PREFETCH.test(l) && !f.endsWith('_headers')) fail(f, i, '预取', l);
  const rest = l.replace(ALLOWED_A, '<a>'); // 去掉合规的 <a href="https://..."> 后，不得再出现外部 URL
  if (URL_RE.test(rest)) fail(f, i, '外部URL（只允许 <a href> 外链）', l);
  URL_RE.lastIndex = 0;
  if (/<a\b[^>]*href\s*=\s*["']https?:/i.test(l) && !(/rel=["'][^"']*noopener[^"']*noreferrer|rel=["'][^"']*noreferrer[^"']*noopener/.test(l) && /referrerpolicy=["']no-referrer/.test(l)))
    fail(f, i, '外链需 rel="noopener noreferrer" + referrerpolicy="no-referrer"', l);
});
for (const f of data) readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (API.test(l) || PERM.test(l)) fail(f, i, '文案脚本含API名', l); });
if (bad) { console.error(`check:no-network 失败：${bad} 处`); process.exit(1); }
console.log(`✔ check:no-network 通过（${src.length} 个源文件 + ${data.length} 个文案脚本）`);
