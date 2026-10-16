/**
 * 文案组脚本格式 → 内部 ScenarioScript 的适配器。
 * 源文件位于 ../../../scripts/（hacker-toolbox/scripts），构建期 import 打包，运行时不走网络。
 */
import type { EasterEgg, ScenarioScript, Step, VarSpec } from './types';

export interface CwLine { t: number; text: string; progress?: { from?: number; to?: number; ms: number; stuck_at?: number; stuck_ms?: number } }
export interface CwScript {
  id: string; tool: string; disclaimer?: string;
  vars?: Record<string, string>;
  lines: CwLine[];
  twist: { popup_title: string; popup_body: string; button?: string };
  easter_eggs?: (string | CwEgg)[];
}
/** 结构化彩蛋：trigger=command(整行输入)|arg(变量值)|repeat(同目标连续N次)|click(连点Logo N次) */
export interface CwEgg { trigger: string; match?: string | number; output: string; var?: string; count?: number; effect?: 'pink' }
export interface CwIndex { version: number; disclaimer?: string; scripts: { id: string; file: string; title: string }[] }

/** {{target}} → {target}；{{rand:a-b}} → {num:a-b}；{{year:2026}} → {year:2026} */
export const convertVars = (s: string) =>
  s.replace(/\{\{\s*(\w+)(?::([^}]*))?\s*\}\}/g, (_m, k: string, a?: string) => `{${k === 'rand' ? 'num' : k}${a !== undefined ? ':' + a : ''}}`);

/** 从 "用户输入的用户名，默认 admin" 中取默认值 */
export function parseVar(name: string, desc: string): VarSpec {
  const m = /默认\s*[:：]?\s*([^\s，。,;；]+)/.exec(desc);
  return { name, default: m ? m[1] : name, label: desc };
}

/** 解析自然语言彩蛋描述；无法识别的返回 null */
export function parseEgg(src: string, vars: VarSpec[]): EasterEgg | null {
  const [cond, ...rest] = src.split(/[:：]/); const tail = rest.join('：').trim();
  const quoted = /^(?:输出|提示)?\s*『(.+?)』[。.]?$/.exec(tail);
  const output = quoted ? quoted[1] : tail.replace(/^(输出|提示)\s*/, '').trim();
  let m: RegExpExecArray | null;
  if ((m = /^输入\s*`([^`]+)`$/.exec(cond.trim()))) return { kind: 'command', match: m[1].trim(), output, source: src };
  if ((m = /^输入\s*(\S+)$/.exec(cond.trim()))) return { kind: 'arg', varName: vars[0]?.name ?? 'target', match: m[1], output, source: src };
  if ((m = /^用户名填\s*(\S+)$/.exec(cond.trim()))) return { kind: 'arg', varName: 'username', match: m[1], output, source: src };
  if ((m = /^密码字典选『(.+)』$/.exec(cond.trim()))) return { kind: 'arg', varName: 'dict', match: m[1], output, source: src };
  if ((m = /^连续输入同一\S*\s*(\d+)\s*次$/.exec(cond.trim()))) return { kind: 'repeat', count: +m[1], output, source: src };
  if ((m = /^连续点\s*(\d+)\s*次\s*Logo$/i.exec(cond.trim()))) {
    const tip = /提示『(.+?)』/.exec(tail);
    return { kind: 'click', element: 'logo', count: +m[1], output: tip ? tip[1] : output, effect: /粉/.test(tail) ? 'pink' : undefined, source: src };
  }
  return null;
}

const kindOf = (t: string) => (t.startsWith('[!!!]') ? 'ok' : t.startsWith('[!]') ? 'warn' : t.startsWith('[-]') ? 'dim' : '') as '' | 'ok' | 'warn' | 'dim';

export function fromCopywriter(raw: CwScript, title: string, file: string, unparsed: string[]): ScenarioScript {
  const err = (m: string) => { throw new Error(`[文案脚本 ${file}] ${m}`); };
  if (!raw || typeof raw.id !== 'string') err('缺少 id');
  if (!Array.isArray(raw.lines) || !raw.lines.length) err('lines 不能为空');
  if (!raw.twist?.popup_title || !raw.twist?.popup_body) err('缺少 twist.popup_title / popup_body（结尾揭晓必需）');
  let last = -1;
  raw.lines.forEach((l, i) => {
    if (typeof l.t !== 'number' || typeof l.text !== 'string') err(`lines[${i}] 需要数字 t 与字符串 text`);
    if (l.t < last) err(`lines[${i}].t=${l.t} 小于上一行（t 应为单调递增的绝对时间）`);
    last = l.t;
  });
  const vars = Object.entries(raw.vars ?? { target: '目标' }).map(([k, d]) => parseVar(k, d));
  const eggs: EasterEgg[] = [];
  for (const e of raw.easter_eggs ?? []) { const p = typeof e === 'string' ? parseEgg(e, vars) : structuredEgg(e, vars, file); if (p) eggs.push({ ...p, output: convertVars(p.output) }); else unparsed.push(`${raw.id}: ${e}`); }

  const steps: Step[] = [];
  for (const l of raw.lines) {
    steps.push({ type: 'at', ms: l.t });
    steps.push({ type: 'type', text: convertVars(l.text), kind: kindOf(l.text), speed: 8 });
    if (l.progress) {
      const label = l.text.replace(/^\[[^\]]*\]\s*/, '').replace(/[…\.]+$/, '') || '处理中';
      steps.push({ type: 'progress', label, duration: l.progress.ms, from: l.progress.from, to: l.progress.to,
        stuckAt: l.progress.stuck_at, stuckMs: l.progress.stuck_ms, async: true });
    }
  }
  steps.push({ type: 'reveal', title: convertVars(raw.twist.popup_title), texts: [convertVars(raw.twist.popup_body)], button: raw.twist.button, keepTitle: true });

  return {
    id: raw.id, name: raw.tool, description: title, format: 'copywriter',
    usage: [raw.id, ...vars.map((v) => `[${v.name}]`)].join(' '),
    defaultTarget: vars.find((v) => v.name === 'target')?.default,
    vars, disclaimer: raw.disclaimer, easterEggs: eggs, steps,
  };
}

const KIND = { command: 'command', arg: 'arg', repeat: 'repeat', click: 'click' } as const;
/** 结构化彩蛋 → EasterEgg；字段非法时构建期报错 */
export function structuredEgg(e0: CwEgg, vars: VarSpec[], file: string): EasterEgg {
  const err = (m: string) => { throw new Error(`[文案脚本 ${file}] easter_eggs ${JSON.stringify(e0)}: ${m}`); };
  const e = normalizeEgg(e0, vars);
  if (!e || !(e.trigger in KIND)) err(`trigger 必须为 command|arg|repeat|click，或变量名（${vars.map((v) => v.name).join('|')}），或 ui+logo-click-N`);
  if (typeof e.output !== 'string' || !e.output) err('缺少 output');
  const kind = KIND[e.trigger as keyof typeof KIND];
  // click 的 match 为元素名 + 可选次数：logo-click-5 / night-vision-3x / close-prank
  const cm = kind === 'click' && typeof e.match === 'string' ? /^([a-z][a-z0-9-]*?)(?:-click)?(?:-(\d+)x?)?$/i.exec(e.match) : null;
  if (kind === 'click' && typeof e.match === 'string' && !cm) err('click 的 match 应为元素名，如 logo-click-5 / close-prank');
  const n = e.count ?? (cm ? (cm[2] ? +cm[2] : 1) : undefined) ?? (typeof e.match === 'number' ? e.match : Number(/(\d+)/.exec(String(e.match ?? ''))?.[1]));
  if ((kind === 'command' || kind === 'arg') && (typeof e.match !== 'string' || !e.match)) err('command/arg 需要字符串 match');
  if ((kind === 'repeat' || kind === 'click') && !(n > 0)) err('repeat/click 需要正整数 count（或数字 match）');
  return { kind, match: (kind === 'command' || kind === 'arg') ? (e.match as string) : undefined, element: kind === 'click' ? (cm?.[1] ?? 'logo') : undefined, count: n > 0 ? n : undefined,
    varName: kind === 'arg' ? (e.var ?? vars[0]?.name ?? 'target') : undefined,
    output: e.output, effect: e.effect ?? (kind === 'click' && /kitty|粉/i.test(e.output) ? 'pink' : undefined), source: JSON.stringify(e0) };
}

/** 兼容文案组实际使用的变体写法：
 *  {trigger:"<变量名>"} → arg；{trigger:"ui", match:"logo-click-N"} → click；
 *  {trigger:"command", match:"same-target-Nx"} → repeat（而非字面命令） */
function normalizeEgg(e: CwEgg, vars: VarSpec[]): CwEgg {
  if (!e || typeof e !== 'object') return e;
  if (vars.some((v) => v.name === e.trigger)) return { ...e, trigger: 'arg', var: e.trigger };
  let m: RegExpExecArray | null;
  if (e.trigger === 'ui') return { ...e, trigger: 'click' };
  if (e.trigger === 'command' && typeof e.match === 'string' && (m = /^same-target-(\d+)x$/.exec(e.match))) return { ...e, trigger: 'repeat', match: undefined, count: +m[1] };
  return e;
}
