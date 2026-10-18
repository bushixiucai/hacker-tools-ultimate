import type { Runtime } from '../core/runtime';
import type { ModuleDefinition, Params } from '../core/types';
export function tokenize(raw: string): string[] {
  const result: string[] = []; let token = '', quote = '', started = false;
  for (const char of raw) {
    if (quote) { if (char === quote) quote = ''; else token += char; started = true; }
    else if (char === '"' || char === "'") { quote = char; started = true; }
    else if (/\s/.test(char)) { if (started) { result.push(token); token = ''; started = false; } }
    else { token += char; started = true; }
  }
  if (quote) throw new Error('Unclosed quoted argument.'); if (started) result.push(token); return result;
}
export function moduleParams(module: ModuleDefinition, args: string[]): Params {
  const params: Params = Object.fromEntries(module.fields.filter(f => f.default !== undefined).map(f => [f.key, f.default!]));
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) throw new Error('Use --option=value for parameters.');
    const [key, ...parts] = args[i].slice(2).split('='); if (!module.fields.some(f => f.key === key)) throw new Error(`Unknown option: ${key}`);
    const value = parts.length ? parts.join('=') : args[++i]; if (value === undefined) throw new Error(`Missing value: ${key}`); params[key] = value;
  } return params;
}
export class Shell {
  private output: HTMLElement; private input: HTMLInputElement; private seen = new Map<string, number>(); private statuses = new Map<string, string>();
  private history: string[] = []; private cursor = 0; private unsubscribe: () => void;
  constructor(host: HTMLElement, private runtime: Runtime, private module: ModuleDefinition, private start: (target: string, params: Params) => void, private finish: () => void) {
    host.innerHTML = '<div class="shell-heading"><span>root@toolbox:~# 终端</span><span>Tab 补全 · Ctrl+C 中断</span></div><div class="shell-output" role="log" aria-label="终端输出"></div><form class="shell-form"><span class="shell-prompt">┌──(operator㉿toolbox)-[~]<br>└─$</span><input aria-label="终端输入" autocomplete="off" spellcheck="false" placeholder="输入 help 查看命令"></form>';
    this.output = host.querySelector('.shell-output')!; this.input = host.querySelector('input')!;
    host.querySelector('form')!.onsubmit = e => { e.preventDefault(); const raw = this.input.value; this.input.value = ''; this.exec(raw); };
    this.input.onkeydown = e => {
      if (e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); const task = [...runtime.state.tasks].reverse().find(t => t.status === 'running'); if (task) runtime.cancel(task.id); this.print('^C'); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); this.output.replaceChildren(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.cursor = Math.max(0, this.cursor - 1); this.input.value = this.history[this.cursor] ?? ''; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this.cursor = Math.min(this.history.length, this.cursor + 1); this.input.value = this.history[this.cursor] ?? ''; }
      else if (e.key === 'Tab') { e.preventDefault(); const matches = ['help','run','status','select','pause','resume','stop','cancel','jobs','ls','cat','clear','end',module.code,module.id].filter(s => s.startsWith(this.input.value)); if (matches.length === 1) this.input.value = matches[0] + ' '; else this.print(matches.join('  ')); }
    };
    this.print(`${module.code.toUpperCase()} / Console ready. Type help to inspect commands.`, 'muted'); this.unsubscribe = runtime.subscribe(() => this.sync()); this.sync();
  }
  destroy() { this.unsubscribe(); }
  print(value: string, kind = '') { const line = document.createElement('div'); line.className = `shell-line ${kind}`; line.textContent = value; this.output.append(line); while (this.output.childElementCount > 500) this.output.firstElementChild?.remove(); this.output.scrollTop = this.output.scrollHeight; }
  private sync() {
    const live = new Set(this.runtime.state.tasks.map(task => task.id)); for (const key of this.seen.keys()) if (!live.has(key)) { this.seen.delete(key); this.statuses.delete(key); }
    for (const task of this.runtime.state.tasks) { const offset = task.logOffset ?? 0; const count = this.seen.get(task.id) ?? offset; task.logs.slice(Math.max(0, count - offset)).forEach(line => this.print(line)); this.seen.set(task.id, offset + task.logs.length); if (task.choice && this.statuses.get(task.id) !== task.choice.prompt) { this.print(task.choice.prompt); task.choice.options.forEach(o => this.print(`  select ${o.value}  ${o.label}`, 'muted')); this.statuses.set(task.id, task.choice.prompt); } if (task.status !== 'running' && this.statuses.get(task.id) !== task.status) { this.print(`${task.status.toUpperCase()} ${task.result ?? task.error ?? ''}`, task.status === 'failed' ? 'error' : 'muted'); this.statuses.set(task.id, task.status); } }
  }
  exec(raw: string) {
    if (!raw.trim()) return; this.history.push(raw); this.cursor = this.history.length; this.print(`└─$ ${raw}`, 'command');
    try {
      const [name, ...args] = tokenize(raw); const target = this.runtime.activeTarget; const task = [...this.runtime.state.tasks].reverse().find(t => t.status === 'running');
      if (['run','start',this.module.code,this.module.id].includes(name)) { const input = this.module.targetRequired === false ? '' : args.shift() ?? ''; this.start(input, moduleParams(this.module, args)); }
      else if (name === 'help') { this.print(`run ${this.module.targetRequired === false ? '' : '<target> '}[--option=value]\nselect <value> · status · jobs · pause · resume · stop · cancel\nls · cat <path> · clear · end`); this.module.fields.forEach(f => this.print(`--${f.key} ${f.label}${f.default ? ` [${f.default}]` : ''}${f.options ? ' ' + f.options.map(o => o.value).join('|') : ''}`, 'muted')); }
      else if (name === 'select') { if (!task) throw new Error('No active selection.'); this.runtime.choose(task.id, args[0] ?? ''); }
      else if (name === 'cancel') { if (!task) throw new Error('No running task.'); this.runtime.cancel(task.id); }
      else if (name === 'stop') { if (!task) throw new Error('No running task.'); this.runtime.stop(task.id); }
      else if (name === 'pause' || name === 'resume') { if (!target || !this.module.continuous) throw new Error('No continuous session.'); this.runtime.updateTarget(target.id, t => { t.data.paused = name === 'pause'; for (const value of Object.values(t.data)) { if (value && typeof value === 'object' && 'paused' in value && typeof value.paused === 'boolean') value.paused = t.data.paused; } }); }
      else if (name === 'jobs') this.print(this.runtime.state.tasks.slice(-5).map(t => `${t.id} ${t.status} ${t.phase}`).join('\n') || 'No tasks.');
      else if (name === 'status') { if (!target) throw new Error('No active target.'); this.print(`TARGET ${target.domain}\nHOST ${target.ip}\n${task?.phase ?? this.runtime.state.tasks[this.runtime.state.tasks.length - 1]?.result ?? 'IDLE'}`); }
      else if (name === 'ls') { if (!target) throw new Error('No active target.'); this.print(Object.keys(target.files).join('\n')); }
      else if (name === 'cat') { if (!target || !(args[0] in target.files)) throw new Error('File not found.'); this.print(target.files[args[0]]); }
      else if (name === 'clear') this.output.replaceChildren();
      else if (name === 'end') this.finish();
      else throw new Error(`Command not found: ${name}. Type help.`);
    } catch (error) { this.print(error instanceof Error ? error.message : String(error), 'error'); }
  }
}
