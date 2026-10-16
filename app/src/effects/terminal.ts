import { el, sfx } from './util';
import { typewrite } from './typewriter';
export type LineKind = '' | 'ok' | 'warn' | 'err' | 'dim';
export interface CommandCtx { args: string[]; raw: string; term: Terminal }
export interface Command { name: string; description: string; usage?: string; hidden?: boolean; run(ctx: CommandCtx): Promise<void> | void }

/** 伪终端：输入、历史、命令注册表、环形缓冲日志（PRD 7.3）*/
export class Terminal {
  readonly out: HTMLDivElement; readonly input: HTMLInputElement;
  private cmds = new Map<string, Command>(); private hist: string[] = []; private hi = 0; private busy = false;
  constructor(host: HTMLElement, private prompt = 'root@toolbox:~#', private maxLines = 400) {
    this.out = el('div', 'term-out'); this.out.setAttribute('aria-live', 'polite');
    const line = el('div', 'inputline'); this.input = el('input');
    this.input.autocomplete = 'off'; this.input.spellcheck = false; this.input.setAttribute('aria-label', '终端输入');
    line.append(el('span', 'prompt', prompt), this.input); host.append(this.out, line);
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    host.addEventListener('click', () => !this.busy && this.input.focus());
  }
  /** 拦截器：在命令分发前查看整行输入，返回 true 表示已处理（用于彩蛋隐藏命令）*/
  interceptor?: (raw: string, term: Terminal) => boolean | Promise<boolean>;
  register(...cs: Command[]) { cs.forEach((c) => this.cmds.set(c.name.toLowerCase(), c)); return this; }
  commands(all = false) { return [...this.cmds.values()].filter((c) => all || !c.hidden); }
  get isBusy() { return this.busy; }
  private trim() { while (this.out.childElementCount > this.maxLines) this.out.firstElementChild?.remove(); }
  private scroll = () => { this.out.scrollTop = this.out.scrollHeight; };
  line(kind: LineKind = '') { const d = el('div', kind); this.out.append(d); this.trim(); this.scroll(); return d; }
  print(text: string, kind: LineKind = '') { this.line(kind).textContent = text; }
  async type(text: string, kind: LineKind = '', speed = 14) { await typewrite(this.line(kind), text, speed, () => { this.scroll(); sfx('key'); }); }
  clear() { this.out.replaceChildren(); }
  async exec(raw: string) {
    const s = raw.trim(); if (!s || this.busy) return;
    this.hist.push(s); this.hi = this.hist.length; this.print(`${this.prompt} ${s}`, 'ok');
    const [name, ...args] = s.split(/\s+/); const c = this.cmds.get(name.toLowerCase());
    this.busy = true; this.input.disabled = true;
    try { if (this.interceptor && await this.interceptor(s, this)) { /* 已由拦截器处理 */ } else if (c) await c.run({ args, raw: s, term: this }); else this.print(`bash: ${name}: 命令未找到。输入 help 查看可用命令。`, 'err'); }
    catch (e) { this.print(`[内部错误] ${(e as Error).message}`, 'err'); }
    finally { this.busy = false; this.input.disabled = false; this.input.focus(); }
  }
  private onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { const v = this.input.value; this.input.value = ''; void this.exec(v); }
    else if (e.key === 'ArrowUp' && this.hi > 0) { this.input.value = this.hist[--this.hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { this.hi = Math.min(this.hist.length, this.hi + 1); this.input.value = this.hist[this.hi] ?? ''; }
  }
}
