import './style.css';
import { frameBust } from './ui/frameBust';
if (frameBust()) throw new Error('framed: render blocked');
import { initTheme, setTheme, currentTheme, isTheme, THEMES, type Theme } from './ui/theme';
import { initSound, isMuted, setMuted } from './ui/sound';
initTheme(); initSound();
import { Terminal, WorldMap, startCodeRain, type LineKind } from './effects';
import { showDisclaimer } from './ui/disclaimer';
import { onFullscreenChange, toggleFullscreen } from './ui/fullscreen';
import { parseRoute, replaceHash, showView } from './ui/router';
import { CameraModule } from './modules/camera';
import { VirtualBrowser } from './modules/virtualBrowser';
import { RansomAlert } from './modules/ransomAlert';
import { BUILTIN_EGGS } from './eggs.builtin';
import { loadGags, renderGags, gagIds, runGag } from './ui/gags';
import { decodeReveal, encodeReveal, renderReveal } from './ui/reveal';
import { SCRIPTS, UNPARSED_EGGS, fakeIp, fill, runScenario, type ScenarioScript, type Vars } from './scenario';

startCodeRain(document.querySelector<HTMLCanvasElement>('#rain')!);
const map = new WorldMap(document.querySelector<HTMLCanvasElement>('#map')!, document.querySelector<HTMLElement>('#hops')!);
const barsEl = document.querySelector<HTMLElement>('#bars')!;
const panel = document.querySelector<HTMLElement>('#term-panel')!;
const term = new Terminal(panel);
const eggKind = (t: string): LineKind => (t.startsWith('[x]') ? 'err' : t.startsWith('[OK]') || t.startsWith('[+]') ? 'ok' : 'warn');
const scriptEggs = SCRIPTS.flatMap((s) => (s.easterEggs ?? []).map((e) => ({ ...e, script: s.id })));
const allEggs = [...scriptEggs, ...BUILTIN_EGGS.filter((b) => !scriptEggs.some((e) => e.kind === 'click' && e.element === b.element))];

term.register(
  { name: 'help', description: '显示帮助', run: ({ term: t }) => {
    t.print('可用命令：', 'ok');
    for (const c of t.commands()) t.print(`  ${(c.usage ?? c.name).padEnd(34)} ${c.description}`);
    t.print('提示：以上全部为本地动画，不会访问任何网络。参数可用 --名称=值 指定（如 --dict=星座运势）。', 'warn');
  } },
  { name: 'clear', description: '清屏', run: ({ term: t }) => t.clear() },
  { name: 'trace', description: '全球追踪 IP 跳点（假）', run: async ({ term: t }) => {
    await t.type('[*] 启动全球追踪协议……');
    const end = await map.trace(6, fakeIp, (i, ip, c, ms) => t.print(`  [hop ${i + 1}] ${ip} → ${c.name} (${ms}ms)`, 'dim'));
    t.print(`[✔] 目标定位：${end.name}，坐标精确到他家猫的窝`, 'ok');
    t.print('[i] 实际上什么都没追踪，全是随机生成的 :)', 'warn');
  } },
  { name: 'fullscreen', description: '切换全屏（Esc 退出）', run: () => toggleFullscreen() },
  { name: 'theme', usage: 'theme [matrix|cyber|alert]', description: '切换主题（Matrix 绿 / 赛博紫粉 / 红黑警报）', run: ({ args, term: t }) => {
    const order = Object.keys(THEMES) as Theme[];
    const next = args[0] ?? order[(order.indexOf(currentTheme()) + 1) % order.length];
    if (!isTheme(next)) return t.print(`未知主题：${next}。可选：${order.join(' / ')}`, 'err');
    setTheme(next); t.print(`[*] 已切换到「${THEMES[next]}」次元。`, 'ok');
  } },
  { name: 'mute', usage: 'mute [on|off]', description: '静音开关（音效为本地合成）', run: ({ args, term: t }) => {
    setMuted(args[0] ? args[0] !== 'off' : !isMuted()); t.print(isMuted() ? '[i] 已静音。' : '[i] 音效已开启（40%）。', 'dim');
  } },
  { name: 'disclaimer', description: '查看免责声明', run: () => showDisclaimer(true, 0) },
  { name: 'whoami', description: '显示当前有效用户', run: ({ term: t }) => t.print('kali', 'ok') },
  { name: 'id', description: '显示用户与组 ID', run: ({ term: t }) => t.print('uid=1000(kali) gid=1000(kali) groups=1000(kali),24(cdrom),27(sudo),100(users),106(netdev)', 'dim') },
  { name: 'uname', usage: 'uname [-a]', description: '显示系统信息', run: ({ term: t }) => t.print('Linux kali 6.6.0-kali1-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.6.9-1kali1 (2026-10-17) x86_64 GNU/Linux', 'dim') },
  { name: 'uptime', description: '显示系统开机时间与负载', run: ({ term: t }) => t.print(' 21:45:00 up 42 days,  3:14,  1 user,  load average: 0.12, 0.08, 0.02', 'dim') },
  { name: 'hostname', description: '显示系统主机名', run: ({ term: t }) => t.print('toolbox-offensive', 'dim') },
  { name: 'ls', usage: 'ls [-la]', description: '列出文件目录', run: ({ term: t }) => {
    t.print('total 28', 'dim');
    t.print('drwxr-xr-x 2 kali kali 4096 Oct 18 21:00 exploits', 'ok');
    t.print('drwxr-xr-x 2 kali kali 4096 Oct 18 21:00 wordlists', 'ok');
    t.print('drwxr-xr-x 2 kali kali 4096 Oct 18 21:00 loot', 'ok');
    t.print('-rw-r--r-- 1 kali kali  342 Oct 18 21:00 targets.cfg');
    t.print('-rw-r--r-- 1 kali kali  188 Oct 18 21:00 note.txt');
    t.print('-rwxr-xr-x 1 kali kali 8192 Oct 18 21:00 offensive_deploy.sh', 'ok');
  } },
  { name: 'cat', usage: 'cat [file]', description: '查看文件内容', run: ({ args, term: t }) => {
    const f = args[0] ?? 'note.txt';
    if (f === 'note.txt') {
      t.print('[TOP SECRET MEMO]', 'warn');
      t.print('1. 目标渗透与网页篡改完全为前端虚拟沙盒。');
      t.print('2. 过程保持 100% 严肃写实，不可提前剧透。');
      t.print('3. 结尾反转必须让对方会心一笑。');
    } else if (f === 'targets.cfg') {
      t.print('TARGET_HOST="203.0.113.88"', 'dim');
      t.print('GATEWAY="192.0.2.1"', 'dim');
      t.print('SUBNET="192.0.2.0/24"', 'dim');
    } else {
      t.print(`cat: ${f}: No such file or directory`, 'err');
    }
  } },
  { name: 'ps', description: '查看当前活跃进程', run: ({ term: t }) => {
    t.print('  PID TTY          TIME CMD', 'dim');
    t.print('    1 ?        00:00:03 systemd');
    t.print('   88 ?        00:00:01 dbus-daemon');
    t.print('  420 ?        00:00:00 kworker/u4:0-events_unbound');
    t.print(' 1337 pts/0    00:00:01 zsh', 'ok');
    t.print(' 1420 pts/0    00:00:02 msfconsole', 'warn');
    t.print(' 1984 pts/0    00:00:00 ps');
  } },
  { name: 'ifconfig', description: '查看网络接口配置', run: ({ term: t }) => {
    t.print('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'dim');
    t.print('        inet 192.0.2.15  netmask 255.255.255.0  broadcast 192.0.2.255');
    t.print('        ether 08:00:27:12:34:56  txqueuelen 1000  (Ethernet)');
    t.print('');
    t.print('wlan0mon: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'dim');
    t.print('        Mode: Monitor  Frequency: 2.437 GHz  txpower 20 dBm');
    t.print('');
    t.print('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536', 'dim');
    t.print('        inet 127.0.0.1  netmask 255.0.0.0');
  } },
  { name: 'ping', usage: 'ping [target]', description: '向目标发送 ICMP 探测包', run: async ({ args, term: t }) => {
    const tgt = args[0] || '192.0.2.47';
    t.print(`PING ${tgt} (${tgt}) 56(84) bytes of data.`, 'dim');
    for (let i = 1; i <= 4; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const ms = (14 + Math.random() * 8).toFixed(1);
      t.print(`64 bytes from ${tgt}: icmp_seq=${i} ttl=56 time=${ms} ms`);
    }
    t.print(`--- ${tgt} ping statistics ---`, 'dim');
    t.print('4 packets transmitted, 4 received, 0% packet loss, time 2404ms', 'ok');
  } },

  { name: 'eggs', hidden: true, description: '列出彩蛋（剧透）', run: ({ term: t }) => {
    allEggs.forEach((e) => t.print(`  [${e.script}] ${e.source}`, 'dim'));
    UNPARSED_EGGS.forEach((e) => t.print(`  [未解析] ${e}`, 'err'));
  } },
);

/** 位置参数按脚本 vars 顺序映射；--k=v 形式为具名参数 */
function buildVars(s: ScenarioScript, args: string[]): Vars {
  const specs = s.vars ?? [{ name: 'target', default: s.defaultTarget ?? '目标' }];
  const v: Vars = {}; const pos: string[] = [];
  for (const a of args) { const m = /^--(\w+)=(.*)$/.exec(a); if (m) v[m[1]] = m[2]; else pos.push(a); }
  specs.forEach((sp, i) => { v[sp.name] ??= pos[i] ?? sp.default; });
  if (!s.vars && pos.length > 1) v.target = pos.join(' ');
  return v;
}

const repeatState = new Map<string, { target: string; n: number }>();
for (const s of SCRIPTS) term.register({
  name: s.id, usage: s.usage, description: s.description,
  run: async ({ args }) => {
    const vars = buildVars(s, args);
    if (s.disclaimer) term.print(`※ ${s.disclaimer}`, 'dim');
    for (const e of s.easterEggs ?? []) {
      if (e.kind === 'arg' && e.varName && vars[e.varName]?.toLowerCase() === e.match?.toLowerCase()) term.print(fill(e.output, vars), eggKind(e.output));
      if (e.kind === 'repeat') {
        const st = repeatState.get(s.id), tgt = vars.target ?? '';
        const n = st && st.target === tgt ? st.n + 1 : 1; repeatState.set(s.id, { target: tgt, n });
        if (n >= (e.count ?? 3)) term.print(fill(e.output, vars), 'warn');
      }
    }
    showView('tool');
    // 模块专属画面：camera-takeover → 假监控网格（替换右侧地图）
    const ctl = new AbortController(); let cam: CameraModule | undefined;
    if (s.id === 'camera-takeover') {
      cam = new CameraModule(() => ctl.abort());
      document.querySelector('#map-wrap')!.classList.add('hidden');
      document.querySelector('#side-title')!.textContent = '监控网格 // CAM GRID（本地生成，非真实摄像头）';
      cam.mount(document.querySelector<HTMLElement>('#cam-slot')!);
    }
    let r;
    try {
      r = await runScenario(s, { term, map, barsEl, signal: ctl.signal }, vars);
      // 真实展示篡改：若为 site-takeover，无缝唤起虚拟浏览器进行 Web 篡改与互动
      if (s.id === 'site-takeover' && !ctl.signal.aborted) {
        await new Promise<void>((res) => {
          const vb = new VirtualBrowser({
            target: vars.target || 'target-corp.example',
            onFinish: () => res(),
          });
          vb.mount();
          // 自动化/录屏模式：短暂展示交互界面后自动收尾，避免阻塞 autorun
          if (document.body.dataset.autoDismiss) setTimeout(() => vb.close(), 2000);
        });
      }
      // 拟真勒索警报：若为 ransom-prank，呼出独立全屏红黑警报窗口
      if (s.id === 'ransom-prank' && !ctl.signal.aborted) {
        await new Promise<void>((res) => {
          const ra = new RansomAlert({
            onClose: () => res(),
          });
          ra.mount();
          // 自动化/录屏模式：短暂展示交互界面后自动收尾，避免阻塞 autorun
          if (document.body.dataset.autoDismiss) setTimeout(() => ra.close(), 2000);
        });
      }
    }
    finally {
      if (cam) { cam.unmount(); document.querySelector('#map-wrap')!.classList.remove('hidden'); document.querySelector('#side-title')!.textContent = '全球追踪 // TRACE MAP'; }
    }
    // G6：揭晓弹窗关闭后进入统一揭晓页（状态在 hash 中，可分享）
    if (r) location.hash = '#/reveal/' + encodeReveal({ s: s.id, n: s.description, t: r.title, b: r.text, tg: args.length ? vars.target : undefined });
  },
});

// 彩蛋：整行精确匹配的隐藏命令（优先于普通命令，如 `hack nasa`）
term.interceptor = (raw, t) => {
  const e = allEggs.find((x) => x.kind === 'command' && x.match?.toLowerCase() === raw.trim().toLowerCase().replace(/\s+/g, ' '));
  if (!e) return false;
  t.print(fill(e.output), eggKind(e.output)); return true;
};
// 彩蛋：点击 [data-egg=<element>] 元素 N 次（1.5s 内连续）。logo=标题；close-prank=弹窗关闭按钮；未出现在界面上的元素名（如 night-vision）留待对应模块
document.querySelector('h1')!.dataset.egg = 'logo';
const clickCounts = new Map<string, { n: number; timer: number }>();
document.addEventListener('click', (ev) => {
  const elName = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-egg]')?.dataset.egg; if (!elName) return;
  const st = clickCounts.get(elName) ?? { n: 0, timer: 0 }; clearTimeout(st.timer);
  st.n++; st.timer = window.setTimeout(() => clickCounts.delete(elName), 1500); clickCounts.set(elName, st);
  for (const e of allEggs.filter((x) => x.kind === 'click' && x.element === elName && st.n === (x.count ?? 1))) {
    const on = e.effect === 'pink' ? document.body.classList.toggle('kitty') : true;
    term.print(on ? (e.output.startsWith('[') ? e.output : `[♥] ${e.output}`) : '[i] 已退出 Hello Kitty 安全模式', 'warn');
  }
}, true);

const quick = document.createElement('div'); quick.className = 'quick';
for (const name of ['help', ...SCRIPTS.map((s) => s.id), 'trace', 'clear']) {
  const b = document.createElement('button'); b.textContent = name; b.onclick = (e) => { e.stopPropagation(); void term.exec(name); };
  quick.append(b);
}
panel.append(quick);

// 设置：主题按钮 + 音效开关
const slot = document.querySelector<HTMLElement>('#settings-slot')!;
const themeBtns = (Object.keys(THEMES) as Theme[]).map((k) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'mini theme-btn'; b.dataset.themeChoice = k;
  b.textContent = { matrix: '绿', cyber: '紫', alert: '红' }[k]; b.title = `主题：${THEMES[k]}`; b.setAttribute('aria-label', `主题：${THEMES[k]}`);
  b.onclick = (e) => { e.stopPropagation(); setTheme(k); }; slot.append(b); return b;
});
const soundBtn = document.createElement('button'); soundBtn.type = 'button'; soundBtn.className = 'mini'; soundBtn.id = 'sound-btn';
soundBtn.onclick = (e) => { e.stopPropagation(); setMuted(!isMuted()); };
slot.append(soundBtn);
const syncSettings = () => {
  themeBtns.forEach((b) => b.classList.toggle('on', b.dataset.themeChoice === currentTheme()));
  soundBtn.textContent = isMuted() ? '🔇 静音' : '🔊 音效'; soundBtn.setAttribute('aria-pressed', String(!isMuted()));
};
addEventListener('htb:theme', syncSettings); addEventListener('htb:sound', syncSettings); syncSettings();

// 全屏按钮 / 免责声明入口
const fsBtn = document.querySelector<HTMLButtonElement>('#fs-btn')!;
fsBtn.onclick = (e) => { e.stopPropagation(); void toggleFullscreen(); };
onFullscreenChange((on, mode) => {
  fsBtn.textContent = on ? '✕ 退出全屏' : '⛶ 全屏';
  term.print(on ? `[*] 已进入${mode === 'native' ? '' : '沉浸'}全屏，按 Esc 退出。` : '[i] 任务取消，特工下班。', 'dim');
});
document.querySelector('#open-disclaimer')!.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); void showDisclaimer(true, 0); });
document.body.dataset.scripts = SCRIPTS.map((s) => s.id).join(',');

// G2 首页模块宫格
const PRANK = new Set(['camera-takeover', 'ransom-prank']); // 整蛊类（PRD §2.8）
const cards = document.querySelector<HTMLElement>('#cards')!;
for (const sc of SCRIPTS) {
  const c = document.createElement('button'); c.type = 'button'; c.className = 'card'; c.dataset.script = sc.id;
  const h = document.createElement('div'); h.className = 'card-title'; h.textContent = sc.description;
  const t = document.createElement('div'); t.className = 'card-tool'; t.textContent = sc.name;
  const u = document.createElement('div'); u.className = 'card-cmd'; u.textContent = `$ ${sc.usage ?? sc.id}`;
  c.append(h, t, u);
  if (PRANK.has(sc.id)) { const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = '整蛊类'; c.append(tag); }
  c.onclick = () => { location.hash = `#/tool/${encodeURIComponent(sc.id)}`; };
  cards.append(c);
}
// M11 一键神功（构建期开关 VITE_GAGS=1，见 ui/gags.ts）
void loadGags().then((d) => {
  renderGags();
  if (d) term.register({ name: 'gag', hidden: true, usage: 'gag <id>', description: '运行一键神功', run: ({ args, term: t }) => {
    if (!gagIds().includes(args[0])) return t.print(`未知神功：${args[0] ?? ''}`, 'err');
    return runGag(args[0]);
  } });
});

// 关于页：一键清除本地设置（R10）
document.querySelector<HTMLButtonElement>('#reset-settings')!.onclick = () => {
  Object.keys(localStorage).filter((k) => k.startsWith('htb.')).forEach((k) => localStorage.removeItem(k));
  document.querySelector('#reset-msg')!.textContent = '已清除（刷新后生效）';
};

let started = false;
async function route() {
  const r = parseRoute();
  showView(r.view);
  if (r.view === 'reveal') renderReveal(decodeReveal(r.payload), {
    onAgain: (id, tg) => { location.hash = `#/tool/${encodeURIComponent(id)}${tg ? '?target=' + encodeURIComponent(tg) : ''}`; },
    onHome: () => { location.hash = '#/'; },
  });
  if (r.view === 'tool') {
    term.input.focus();
    if (r.id && started && !term.isBusy) { replaceHash('#/tool'); await term.exec([r.id, r.target].filter(Boolean).join(' ')); }
  }
}
addEventListener('hashchange', () => void route());

void (async () => {
  showView(parseRoute().view === 'reveal' ? 'reveal' : parseRoute().view);
  await showDisclaimer();
  await term.type('欢迎使用 黑客工具箱·搞怪版 v0.1', 'ok', 30);
  await term.type('本工具所有效果均为本地模拟，请放心“入侵”。输入 help 开始。', 'warn', 15);
  term.input.focus();
  // 测试/演示钩子：#run=<命令> 或 #autorun=<命令>（自动关闭揭晓弹窗）；URL 编码，多条用 ;; 分隔
  const m = /^#(auto)?run=(.+)$/.exec(location.hash);
  if (m?.[1]) document.body.dataset.autoDismiss = '1';
  if (m) for (const c of decodeURIComponent(m[2]).split(';;')) await term.exec(c);
  else if (location.hash === '#demo') await term.exec('port-scan');
  started = true;
  if (!m) await route();
  document.body.dataset.autorunDone = '1';
})();
