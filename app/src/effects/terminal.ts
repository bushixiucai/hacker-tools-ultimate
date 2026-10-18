import { el, sfx } from './util';
import { typewrite } from './typewriter';
export type LineKind = '' | 'ok' | 'warn' | 'err' | 'dim' | 'accent' | 'header';
export interface CommandCtx { args: string[]; raw: string; term: Terminal }
export interface Command { name: string; description: string; usage?: string; hidden?: boolean; run(ctx: CommandCtx): Promise<void> | void }

/** 伪终端：Kali Linux 风格交互式 Shell、命令补全、历史回溯、日志缓冲 */
export class Terminal {
  readonly out: HTMLDivElement; readonly input: HTMLInputElement; readonly promptEl: HTMLElement;
  private cmds = new Map<string, Command>(); private hist: string[] = []; private hi = 0; private busy = false;
  private userHost = 'kali㉿toolbox';
  private cwd = '~';

  constructor(host: HTMLElement, prompt: string | number = 600, private maxLines = 600) {
    if (typeof prompt === 'number') this.maxLines = prompt;
    this.out = el('div', 'term-out'); this.out.setAttribute('aria-live', 'polite');
    const line = el('div', 'inputline kali-inputline');
    const pwrap = el('div', 'prompt-wrap');
    pwrap.innerHTML = `<span class="p-top">┌──(<span class="p-user">${this.userHost}</span>)-[<span class="p-path">${this.cwd}</span>]</span><br/><span class="p-bot">└─$ </span>`;
    this.promptEl = pwrap;
    this.input = el('input');
    this.input.autocomplete = 'off'; this.input.spellcheck = false; this.input.setAttribute('aria-label', '终端输入');
    line.append(pwrap, this.input); host.append(this.out, line);

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
  printRawHtml(html: string, kind: LineKind = '') { const d = this.line(kind); d.innerHTML = html; }
  async type(text: string, kind: LineKind = '', speed = 14) { await typewrite(this.line(kind), text, speed, () => { this.scroll(); sfx('key'); }); }
  clear() { this.out.replaceChildren(); }

  async exec(raw: string) {
    const s = raw.trim(); if (!s || this.busy) return;
    this.hist.push(s); this.hi = this.hist.length;
    // 渲染写实的 Kali 命令前缀
    const cmdLine = el('div', 'term-cmd-history');
    cmdLine.innerHTML = `<span class="dim">┌──(${this.userHost})-[${this.cwd}]</span><br/><span class="ok">└─$ </span><span class="cmd-text">${s}</span>`;
    this.out.append(cmdLine);
    this.scroll();

    const [name, ...args] = s.split(/\s+/); const c = this.cmds.get(name.toLowerCase());
    this.busy = true; this.input.disabled = true;
    try {
      if (this.interceptor && await this.interceptor(s, this)) { /* 已由拦截器处理 */ }
      else if (c) await c.run({ args, raw: s, term: this });
      else this.print(`bash: ${name}: command not found. Try 'help' or press Tab for completions.`, 'err');
    }
    catch (e) { this.print(`[ERROR] ${(e as Error).message}`, 'err'); }
    finally { this.busy = false; this.input.disabled = false; this.input.focus(); }
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const v = this.input.value; this.input.value = ''; void this.exec(v);
    } else if (e.key === 'ArrowUp' && this.hi > 0) {
      this.input.value = this.hist[--this.hi]; e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      this.hi = Math.min(this.hist.length, this.hi + 1); this.input.value = this.hist[this.hi] ?? '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.handleTabComplete();
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      this.clear();
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      const current = this.input.value;
      this.print(`└─$ ${current}^C`, 'dim');
      this.input.value = '';
    }
  }

  private handleTabComplete() {
    const val = this.input.value.trim().toLowerCase();
    if (!val) return;
    const matches = Array.from(this.cmds.keys()).filter((k) => k.startsWith(val));
    if (matches.length === 1) {
      this.input.value = matches[0] + ' ';
    } else if (matches.length > 1) {
      this.print(`[completions] ${matches.join('   ')}`, 'dim');
    }
  }
}
