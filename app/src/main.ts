import './style.css';
import './workbench/extra.css';
import { Runtime, ValidationError } from './core/runtime';
import { MODULES } from './core/registry';
import type { ModuleDefinition, Params, Target, Task } from './core/types';
import { Shell } from './workbench/shell';
import { mountDetail } from './workbench/views';
import { EXTRA_VIEWS } from './workbench/extraViews';
import { mountQuickActions } from './workbench/quickActions';
import { createReport, reportLink, readReport, exportReportImage, snapshotSummary, type Report } from './workbench/share';
import { startCodeRain } from './effects/codeRain';
import { sfx } from './effects/util';
import { frameBust } from './ui/frameBust';
import { showDisclaimer } from './ui/disclaimer';
import { initSound, isMuted, setMuted } from './ui/sound';
import { initTheme, setTheme, type Theme } from './ui/theme';
import { toggleFullscreen } from './ui/fullscreen';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const button = (text: string, action: () => void, cls = '') => { const b = el('button', cls, text); b.type = 'button'; b.onclick = action; return b; };
interface ToolSession { module: ModuleDefinition; runtime: Runtime; shell: Shell; host: HTMLElement; draft: Params; input: string; revealed: Set<string> }
const sessions = new Map<string, ToolSession>();
let selected: ToolSession | undefined; let cleanupDetail: (() => void) | undefined; let detailKey = ''; let pageName = 'home'; let replayCleanup: (() => void) | undefined;
const statuses = { running: '运行中', succeeded: '完成', failed: '需要调整', cancelled: '已中断' };
const app = document.getElementById('app')!;
const $ = (selector: string) => app.querySelector<HTMLElement>(selector)!;

function showReveal(title: string, text: string) {
  const dialog = document.getElementById('reveal-dialog') as HTMLDialogElement; document.getElementById('reveal-title')!.textContent = `${title} · 收工，放大招！`; document.getElementById('reveal-text')!.textContent = text;
  if (!dialog.open) dialog.showModal(); (dialog.querySelector('button') as HTMLButtonElement).focus(); sfx('reveal');
}
function finishTool() {
  if (!selected) return; const session = selected; const latest = session.runtime.state.tasks[session.runtime.state.tasks.length - 1]; if (latest) session.revealed.add(latest.id); session.runtime.end(); cleanupDetail?.(); cleanupDetail = undefined; detailKey = '';
  const task = session.runtime.state.tasks[session.runtime.state.tasks.length - 1]; if (task) session.revealed.add(task.id);
  showReveal(session.module.name, `${session.module.reveal ?? '战果已封存。键盘可以降温了。'}\n\n刚才的探测、会话、数据和操作结果均为模拟，没有真实网站、设备、文件或资金受到操作。网站公开资料仅用于背景。`); sync();
}
function saveDraft() { if (!selected || !app.querySelector('#module-form')) return; const data = new FormData($('#module-form') as HTMLFormElement); selected.input = String(data.get('target') ?? ''); selected.draft = Object.fromEntries([...data.entries()].filter(([key]) => key !== 'target')) as Params; }
function setPage(name: string) {
  const changed = pageName !== name; pageName = name; if (changed) window.scrollTo(0, 0); for (const p of ['home','terminal','about','replay']) $(`#${p}-page`).classList.toggle('hidden', p !== name);
  $('#home-button').classList.toggle('active', name === 'home'); $('#terminal-button').classList.toggle('active', name === 'terminal');
  if (name !== 'terminal') { cleanupDetail?.(); cleanupDetail = undefined; detailKey = ''; }
}
function sessionFor(module: ModuleDefinition): ToolSession {
  const found = sessions.get(module.id); if (found) return found;
  const runtime = new Runtime([module]); const host = el('div', 'shell-panel');
  const session: ToolSession = { module, runtime, host, draft: {}, input: '', revealed: new Set(), shell: undefined as unknown as Shell };
  session.shell = new Shell(host, runtime, module, (target, params) => startRun(session, target, params), () => { if (selected === session) finishTool(); });
  sessions.set(module.id, session); runtime.subscribe(() => {
    const retained = new Set(runtime.state.tasks.map(task => task.id));
    for (const id of session.revealed) if (!retained.has(id)) session.revealed.delete(id);
    sync();
  }); return session;
}
function fieldGroup(name: string, labelText: string, input: HTMLElement, help = '') {
  const group = el('div', 'field'); const label = el('label', '', labelText); const id = `field-${name}`; label.htmlFor = id; input.id = id; group.append(label, input);
  if (help) { const hint = el('small', '', help); hint.id = `${id}-help`; input.setAttribute('aria-describedby', hint.id); group.append(hint); } return group;
}
function renderForm() {
  const host = $('#module-fields'); host.replaceChildren(); $('#form-errors').replaceChildren(); if (!selected) return;
  const { module, draft } = selected;
  if (module.targetRequired !== false) { const input = el('input'); input.name = 'target'; input.setAttribute('aria-label', '目标'); input.placeholder = module.view === 'wallet' ? 'NVA-7F42A91C' : module.view === 'cms' ? '输入网站网址' : '输入目标名称、地址或代号'; input.value = selected.input; input.maxLength = 253; input.autocomplete = 'off'; input.required = true; host.append(fieldGroup('target', module.view === 'cms' ? '目标网址' : '目标', input)); }
  const advanced = el('details', 'advanced-fields'); advanced.append(el('summary', '', '可选配置 · 不用改，直接开干'));
  for (const f of module.fields) {
    const input = f.type === 'select' ? el('select') : el('input'); input.name = f.key; input.required = !!f.required;
    if (input instanceof HTMLSelectElement) (f.options ?? []).forEach(o => input.add(new Option(o.label, o.value)));
    else { input.type = f.type === 'number' ? 'number' : 'text'; input.placeholder = f.placeholder ?? ''; input.autocomplete = 'off'; input.maxLength = 256; }
    input.value = draft[f.key] ?? f.default ?? ''; const group = fieldGroup(f.key, f.label, input, f.help ?? ''); advanced.append(group);
  }
  if (advanced.childElementCount > 1) host.append(advanced);
  $('#module-form').oninput = saveDraft;
}
function openTool(id: string) {
  const module = MODULES.find(m => m.id === id); if (!module) return;
  saveDraft(); cleanupDetail?.(); cleanupDetail = undefined; detailKey = ''; selected = sessionFor(module);
  window.scrollTo(0, 0); $('#tool-title').textContent = module.name; $('#tool-description').textContent = module.description; $('#shell-slot').replaceChildren(selected.host); renderForm(); setPage('terminal'); location.hash = `#/tool/${id}`; sync();
}
function startRun(session: ToolSession, target: string, params: Params) {
  try {
    $('#form-errors').replaceChildren(); const task = session.runtime.startRun(session.module.id, target, params);
    session.input = target; session.draft = { ...task.params }; if (selected === session) renderForm(); sfx('click');
  } catch (error) {
    const errors = error instanceof ValidationError ? error.errors : { task: error instanceof Error ? error.message : String(error) };
    if (selected === session) { $('#form-errors').replaceChildren(...Object.entries(errors).map(([key, text]) => { const p = el('p', 'error', text); p.dataset.field = key; return p; })); }
    session.shell.print(Object.values(errors).join(' / '), 'error');
  }
}
function renderDetails() {
  if (!selected || pageName !== 'terminal') return;
  const target = selected.runtime.activeTarget; const key = selected.module.id + ':' + (target?.id ?? '') + ':' + selected.runtime.state.ended; if (key === detailKey) return;
  cleanupDetail?.(); cleanupDetail = undefined; detailKey = key; const host = $('#module-detail'); host.replaceChildren();
  if (selected.runtime.state.ended) { host.append(el('p', 'detail-empty', '会话已结束，可导出报告或开始新一轮。')); return; }
  if (!target) { host.append(el('p', 'detail-empty', '填上目标，一键开干。选路、采样、重试交给我，结果交给你玩。')); return; }
  const factory = selected.module.view ? EXTRA_VIEWS[selected.module.view] : undefined;
  if (factory) cleanupDetail = factory(host, target.id, selected.runtime);
  else if (selected.module.view) cleanupDetail = mountDetail(host, selected.module.view, target.id, selected.runtime);
  else host.append(el('pre', '', target.files['/reports/result.txt'] ?? '等待运行结果'));
}
function currentReport(): Report | undefined {
  if (!selected) return; const task = selected.runtime.state.tasks[selected.runtime.state.tasks.length - 1]; const target = selected.runtime.state.targets.find(t => t.id === task?.targetId); if (!task || !target) return; return createReport(selected.module, target, task);
}
function sync() {
  let running = 0; sessions.forEach(s => running += s.runtime.state.tasks.filter(t => t.status === 'running').length); $('#running-note').textContent = running ? `${running} 个工具运行中` : '';
  app.querySelectorAll<HTMLElement>('[data-module]').forEach(n => { const state = sessions.get(n.dataset.module!); n.classList.toggle('active', selected?.module.id === n.dataset.module && pageName === 'terminal'); n.classList.toggle('is-running', !!state?.runtime.state.tasks.some(t => t.status === 'running')); });
  if (!selected) return;
  const { runtime, module } = selected; const task = runtime.state.tasks[runtime.state.tasks.length - 1];
  const choiceHost = $('#choice-panel'); const choiceKey = task?.choice ? `${task.id}:${task.choice.prompt}` : '';
  if (choiceHost.dataset.key !== choiceKey) { choiceHost.dataset.key = choiceKey; choiceHost.replaceChildren(); if (task?.choice) { choiceHost.append(el('h3', '', task.choice.prompt)); const row = el('div', 'choice-buttons'); task.choice.options.forEach(o => row.append(button(o.label, () => { try { runtime.choose(task.id, o.value); } catch (error) { selected?.shell.print(String(error), 'error'); } }))); choiceHost.append(row); } }
  $('#task-status').textContent = task ? `${statuses[task.status]} · ${task.phase}` : '目标到位，立刻开干';
  ($('#task-progress') as HTMLProgressElement).value = task?.progress ?? 0;
  $('#task-result').textContent = task?.result ?? task?.error ?? '';
  const active = task?.status === 'running'; ($('#start-task') as HTMLButtonElement).disabled = !!active; ($('#new-run') as HTMLButtonElement).disabled = !!active;
  $('#stop-task').classList.toggle('hidden', !active); $('#stop-task').textContent = module.continuous ? '停止任务' : '中断任务';
  ($('#end-tool') as HTMLButtonElement).disabled = !task; ($('#share-image') as HTMLButtonElement).disabled = !task; ($('#share-link') as HTMLButtonElement).disabled = !task;
  const history = $('#task-list'); const historyKey = runtime.state.tasks.slice(-5).map(t => `${t.id}${t.status}${t.progress.toFixed(0)}`).join();
  if (history.dataset.key !== historyKey) { history.dataset.key = historyKey; history.replaceChildren(); runtime.state.tasks.slice(-5).reverse().forEach(t => { const row = el('div', `task-row ${t.status}`); row.dataset.taskId = t.id; row.append(el('strong', '', t.targetInput || module.name), el('span', '', statuses[t.status]), el('small', '', t.result ?? t.error ?? t.phase), button('查看报告', () => showHistory(t, runtime))); history.append(row); }); }
  $('#history-count').textContent = String(runtime.state.tasks.length); renderDetails();
  if (module.autoReveal && task && task.status !== 'running' && !selected.revealed.has(task.id) && pageName === 'terminal') { selected.revealed.add(task.id); showReveal(module.name, `${module.reveal ?? '警报撤了，文件一根头发都没掉。'}\n\n所有警报、文件与倒计时均为模拟，没有读取、加密或修改你的真实文件。`); }
}
function showHistory(task: Task, runtime: Runtime) {
  const dialog = el('dialog', 'report-dialog'); const title = el('h2', '', task.title); const body = el('pre', '', `${task.targetInput ?? ''}\n${task.result ?? task.error ?? task.phase}\n\n${task.logs.join('\n')}`); dialog.append(title, body, button('关闭', () => { dialog.close(); dialog.remove(); }), el('p', 'modal-disclosure', '纯属娱乐，所有内容均为模拟')); dialog.addEventListener('close', () => dialog.remove(), { once: true }); document.body.append(dialog); dialog.showModal();
}
async function openReplay(payload: string) {
  replayCleanup?.(); replayCleanup = undefined; setPage('replay'); const host = $('#replay-content'); host.replaceChildren(el('p', '', '载入报告…'));
  try {
    const report = await readReport(payload); const module = MODULES.find(m => m.id === report.moduleId); if (!module) throw new Error('此工具报告版本不受支持');
    host.replaceChildren(el('h2', '', report.title), el('p', '', report.target.domain), el('p', 'muted', report.kind === 'flow' ? '过程回放' : '成果报告'));
    const output = el('pre', 'replay-log'); const detail = el('div', 'replay-detail'); const controls = el('div', 'detail-actions'); host.append(output, controls, detail);
    const sequence = report.kind === 'flow' ? report.task.events?.filter(e => ['choice','phase','result','error'].includes(e.kind)).slice(-24).map(e => `${e.kind.toUpperCase()} ${e.value}`) ?? report.task.logs.slice(-12) : [report.task.phase, report.task.result ?? '当前状态报告']; let index = 0; let timer: ReturnType<typeof setInterval> | undefined; let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => { if (timer) clearInterval(timer); replayCleanup?.(); replayCleanup = undefined; showReveal(report.title, `${module.reveal ?? '回放收官，键盘封神。'}\n\n报告中的探测、状态、数据与修改均为模拟，真实网站、设备和资产没有变化。`); };
    const showResult = () => {
      if (detail.childElementCount) return;
      detail.append(el('h3', '', '结果摘要'), el('p', '', report.task.result ?? report.task.error ?? report.task.phase));
      if (report.target.unlocked) { detail.append(el('h3', '', report.target.name), el('p', '', report.target.announcement)); report.target.records.forEach(row => detail.append(el('p', '', `${row.title} · ${row.detail} · ${row.status}`))); }
      else { const facts = snapshotSummary(report); detail.append(el('pre', '', [...facts, ...report.task.logs.slice(-8)].join('\n'))); }
    };
    const next = () => { if (index < sequence.length) output.textContent += sequence[index++] + '\n'; if (index >= sequence.length) { if (timer) clearInterval(timer); showResult(); if (!revealTimer) revealTimer = setTimeout(reveal, 1800); } };
    controls.append(button('播放回放', () => { if (timer) clearInterval(timer); if (revealTimer) { clearTimeout(revealTimer); revealTimer = undefined; } if (index >= sequence.length) { index = 0; output.textContent = ''; detail.replaceChildren(); } timer = setInterval(next, 250); }), button('下一步', next), button('结束回放', reveal), button('我也体验', () => { if (timer) clearInterval(timer); openTool(module.id); }));
    replayCleanup = () => { if (timer) clearInterval(timer); if (revealTimer) clearTimeout(revealTimer); }; next();
  } catch (error) { host.replaceChildren(el('p', 'error', error instanceof Error ? error.message : String(error)), button('返回首页', () => { location.hash = '#/'; route(); })); }
}
function route() {
  if (location.hash.startsWith('#/replay/')) { void openReplay(location.hash.slice(9)); return; }
  replayCleanup?.(); replayCleanup = undefined;
  const match = /^#\/tool\/([a-z-]+)$/.exec(location.hash);
  if (match) { if (selected?.module.id !== match[1] || pageName !== 'terminal') openTool(match[1]); return; }
  if (location.hash === '#/about') { saveDraft(); setPage('about'); }
  else if (location.hash === '#/tool') { setPage('terminal'); if (selected) sync(); }
  else { saveDraft(); setPage('home'); }
}
function bootstrap() {
  app.innerHTML = `<header class="classic-header"><h1 class="glitch" aria-label="黑客工具箱" data-text="黑客工具箱">黑客工具箱</h1><nav class="sub" aria-label="主导航"><button id="home-button">首页</button><button id="terminal-button">终端</button><button id="about-button">关于</button><button id="open-disclaimer">声明</button><button id="fs-btn">⛶ 全屏</button><button data-theme="matrix">绿</button><button data-theme="cyber">紫</button><button data-theme="alert">红</button><button id="sound-btn">音效</button></nav></header>
  <main><section id="home-page"><div class="hero"><h2>给个目标。剩下的，交给我。</h2><p>自动选路 · 链路接管 · 全域追踪 · 高压监测</p><p class="muted">挑个工具，甩个目标。一路自动推进，战果直接上桌。</p></div><div id="cards"></div><section class="quick-section"><h2>快速操作</h2><div id="quick-actions"></div></section></section>
  <section id="terminal-page" class="hidden"><div class="tool-heading"><h2 id="tool-title">交互式终端</h2><span id="running-note"></span><button id="new-run">新一轮</button><button id="end-tool">收工揭晓</button></div><p id="tool-description">选择工具以建立会话。</p><div class="classic-grid"><section class="terminal-column"><div id="shell-slot"><div class="panel detail-empty">选好工具，准备开干。</div></div><div id="module-nav" class="quick"></div><details class="task-section"><summary>最近记录 <span id="history-count">0</span></summary><div id="task-list"></div></details></section><section class="operation-column"><section class="panel configuration"><div class="panel-heading">行动起点</div><form id="module-form" novalidate><div id="module-fields"></div><div id="form-errors" role="alert"></div><div class="detail-actions"><button id="start-task" type="submit">一键开干</button><button id="stop-task" type="button" class="hidden">中断任务</button></div></form><p id="task-status">目标一到，立刻起飞</p><progress id="task-progress" max="100" value="0" aria-label="任务进度"></progress><p id="task-result" role="status"></p><div id="choice-panel"></div></section><section id="module-detail" class="panel detail"><div class="idle-map"></div></section><section class="panel share-actions"><button id="share-image">导出战报图片</button><button id="share-link">生成回放链接</button><div id="share-output" role="status"></div></section></section></div></section>
  <section id="about-page" class="hidden panel guide"><h2>操作说明</h2><p>选工具、填目标、开干。入口、信号、频道、候选和重试全部自动处理；接通后你只管改后台、转云台、玩手机。可选配置不改也能跑，切换工具各自继续。</p><p>终端输入 help 查装备，run 带目标直接开干，Ctrl+C 随时刹车。持续任务可暂停、恢复和停止，结果可导出战报图片或生成回放链接。</p><h2>产品声明</h2><p>纯属娱乐，所有内容均为模拟。工具不会执行真实入侵、设备接管、文件加密或资金交易。网站工具可尝试读取公开资料用作背景，无法取得的内容由页面生成。</p><p>目标与报告仅保留在当前页面会话；刷新清空。主题与音效偏好只保存在本机。</p><button id="reset-settings">清除本地设置</button><p id="reset-msg"></p><p class="muted">创意参考 GodOfHacker，界面与流程独立实现。</p></section>
  <section id="replay-page" class="hidden panel"><div id="replay-content"></div></section></main>`;
  MODULES.forEach(module => { const card = button('', () => openTool(module.id), 'card'); card.dataset.module = module.id; card.append(el('strong','card-title',module.name),el('span','card-tool',module.description),el('span','card-cmd',`$ ${module.code}`)); $('#cards').append(card); const quick = button(module.name, () => openTool(module.id)); quick.dataset.module = module.id; $('#module-nav').append(quick); });
  mountQuickActions($('#quick-actions'), showReveal);
  ($('#module-form') as HTMLFormElement).onsubmit = e => { e.preventDefault(); if (!selected) return; saveDraft(); startRun(selected, selected.input, selected.draft); };
  $('#home-button').onclick = () => { saveDraft(); location.hash = '#/'; setPage('home'); };
  $('#terminal-button').onclick = () => { if (!selected) openTool(MODULES[0].id); else { location.hash = `#/tool/${selected.module.id}`; setPage('terminal'); sync(); } };
  $('#about-button').onclick = () => { saveDraft(); location.hash = '#/about'; setPage('about'); };
  $('#new-run').onclick = () => { if (!selected || selected.runtime.state.tasks.some(t => t.status === 'running')) return; selected.input = ''; selected.draft = {}; renderForm(); ($('#module-form input[name="target"]') as HTMLInputElement | null)?.focus(); };
  $('#end-tool').onclick = finishTool;
  $('#stop-task').onclick = () => { if (!selected) return; const task = selected.runtime.state.tasks.find(t => t.status === 'running'); if (task) selected.module.continuous ? selected.runtime.stop(task.id) : selected.runtime.cancel(task.id); };
  $('#share-image').onclick = () => { const report = currentReport(); if (report) void exportReportImage(report).catch(error => { $('#share-output').textContent = String(error); }); };
  $('#share-link').onclick = async () => { const report = currentReport(); if (!report) return; try { const url = await reportLink(report); const input = el('input'); input.readOnly = true; input.value = url; input.setAttribute('aria-label', '回放链接'); $('#share-output').replaceChildren(input, button('复制链接', () => { void navigator.clipboard.writeText(url).catch(() => { input.select(); }); })); } catch (error) { $('#share-output').textContent = error instanceof Error ? error.message : String(error); } };
  $('#open-disclaimer').onclick = () => void showDisclaimer(true); $('#fs-btn').onclick = () => void toggleFullscreen();
  const sound = () => { $('#sound-btn').textContent = isMuted() ? '🔇 音效' : '🔊 音效'; $('#sound-btn').setAttribute('aria-pressed', String(!isMuted())); }; sound(); $('#sound-btn').onclick = () => { setMuted(!isMuted()); sound(); };
  app.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b => b.onclick = () => setTheme(b.dataset.theme as Theme));
  $('#reset-settings').onclick = () => { try { Object.keys(localStorage).filter(k => k.startsWith('htb.')).forEach(k => localStorage.removeItem(k)); $('#reset-msg').textContent = '设置已清除'; } catch { $('#reset-msg').textContent = '当前存储不可用'; } };
  window.addEventListener('tool:finish', event => { if ((event as CustomEvent<{targetId:string}>).detail?.targetId === selected?.runtime.activeTarget?.id) finishTool(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') sessions.forEach(s => { if (s.module.autoReveal) { const task = s.runtime.state.tasks.find(t => t.status === 'running'); if (task) { event.preventDefault(); s.runtime.cancel(task.id); } } }); });
  const revealDialog = document.getElementById('reveal-dialog') as HTMLDialogElement; revealDialog.querySelector('button')!.onclick = () => { revealDialog.close(); if (selected) { selected.input = ''; renderForm(); } };
  addEventListener('hashchange', route); route(); sync();
}
if (!frameBust()) {
  initTheme(); initSound(); startCodeRain(document.getElementById('rain') as HTMLCanvasElement); bootstrap();
  document.addEventListener('fullscreenchange', () => {
    document.querySelectorAll('#fullscreen-disclosure').forEach(node => node.remove());
    const surface = document.fullscreenElement; const original = document.getElementById('sim-pill');
    if (surface && original && !surface.contains(original)) { const copy = original.cloneNode(true) as HTMLButtonElement; copy.id = 'fullscreen-disclosure'; copy.onclick = () => void showDisclaimer(true); surface.append(copy); }
  });
  const disclosure = document.getElementById('sim-pill')!; disclosure.onclick = () => void showDisclaimer(true); disclosure.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void showDisclaimer(true); } }; void showDisclaimer();
}
