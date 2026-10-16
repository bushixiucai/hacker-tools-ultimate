// PRD §2.9 命名 lint：剧本/彩蛋/源码中禁止真实 CVE、真实字典名、真实组织/工具/恶意软件/勒索家族名。
// 通用软件/协议名（Apache、nginx、MySQL、SSH、Tomcat…）允许。用户输入目标（arg 彩蛋的 match）不检查。
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CVE_ANY = /CVE-\d{4}-\w+/gi;
const CVE_OK = /^CVE-2077-\d{4}$/; // 严格：CVE-2077- + 4 位数字（QA）
const BLOCK = [
  // 真实泄露字典 / 词表
  'rockyou', 'darkc0de', 'crackstation', 'SecLists', 'hashkiller',
  // 真实漏洞名
  'Heartbleed', 'Log4Shell', 'EternalBlue', 'Shellshock', 'Spectre', 'Meltdown', 'BlueKeep', 'Dirty ?COW',
  // 真实恶意软件 / 勒索家族
  'WannaCry', 'NotPetya', 'Petya', 'Mirai', 'Emotet', 'LockBit', 'REvil', 'Ryuk', 'Conti', 'Stuxnet', 'Zeus', 'TrickBot',
  // 真实黑客组织
  'Anonymous', 'Lazarus', 'APT ?\\d+', 'Fancy Bear', 'Cozy Bear', 'LulzSec', 'Lapsus\\$?',
  // 真实安全工具
  'Metasploit', 'nmap', 'sqlmap', 'Hydra', 'John the Ripper', 'hashcat', 'aircrack(-ng)?', 'Burp ?Suite', 'Cobalt ?Strike', 'Mimikatz', 'Shodan', 'Kali', 'Wireshark',
];
// 机构 / 公司名大小写敏感，避免误伤 <meta>、import.meta 等代码
const BLOCK_CS = [
  'Google', 'NASA', 'FBI', 'CIA', 'NSA', 'Pentagon', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Meta', 'Tesla',
  '淘宝', '天猫', '支付宝', '微信', '腾讯', '阿里巴巴', '百度', '京东', '抖音', '字节跳动', '五角大楼',
];
const BLOCK_RE = new RegExp(`(?<![A-Za-z])(${BLOCK.join('|')})(?![A-Za-z])`, 'i');
const BLOCK_CS_RE = new RegExp(`(?<![A-Za-z])(${BLOCK_CS.join('|')})(?![A-Za-z])`);

const issues = [], warns = [];
function checkText(where, s) {
  for (const m of s.match(CVE_ANY) ?? []) {
    if (!CVE_OK.test(m)) issues.push(`${where}: 「${m}」必须为 CVE-2077-NNNN（4 位数字，PRD §2.9）`);
  }
  const b = BLOCK_RE.exec(s) ?? BLOCK_CS_RE.exec(s); if (b) issues.push(`${where}: 禁用名称「${b[1]}」→ 请改恶搞名`);
}
function walkJson(where, v, path = '') {
  if (typeof v === 'string') return checkText(`${where}${path}`, v);
  if (Array.isArray(v)) return v.forEach((x, i) => walkJson(where, x, `${path}[${i}]`));
  if (v && typeof v === 'object') {
    // 彩蛋的 match 是用户输入（目标/命令）或内部标识，按 §2.9「目标由用户自己输入」不检查
    const userInput = /easter_eggs\[\d+\]$/.test(path);
    for (const [k, x] of Object.entries(v)) if (!(userInput && k === 'match')) walkJson(where, x, `${path}.${k}`);
  }
}
const walk = (d, out = []) => { if (!existsSync(d)) return out; for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; };

for (const f of walk('../scripts').filter((f) => f.endsWith('.json'))) walkJson(f, JSON.parse(readFileSync(f, 'utf8')));
for (const f of [...walk('src'), 'index.html']) readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
  if (/check-names:\s*ignore/.test(l)) return;
  checkText(`${f}:${i + 1}`, l);
});
warns.forEach((w) => console.warn('⚠ ' + w));
if (issues.length) { issues.forEach((e) => console.error('✘ ' + e)); console.error(`check:names 失败：${issues.length} 处`); process.exit(1); }
console.log('✔ check:names 通过（PRD §2.9）');
