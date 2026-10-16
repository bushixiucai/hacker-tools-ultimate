import { glitchFlash, glitchPopup, pick, progressBar, rnd, sleep, type Terminal, type WorldMap } from '../effects';
import { fakeIp, fill, type Vars } from './fakeData';
import type { ScenarioScript, Step } from './types';

export interface RunnerEnv { term: Terminal; map?: WorldMap; barsEl: HTMLElement; speed?: number }
const ms = (v: number | [number, number]) => (Array.isArray(v) ? rnd(v[0], v[1]) : v);

export interface RevealResult { title: string; text: string }
/** 在终端中依次播放脚本步骤；返回揭晓内容（用于揭晓页） */
export async function runScenario(s: ScenarioScript, env: RunnerEnv, vars: Vars): Promise<RevealResult | undefined> {
  let result: RevealResult | undefined;
  const k = 1 / (env.speed ?? 1), T = env.term, t0 = performance.now();
  const pending: Promise<void>[] = [];
  for (const step of s.steps) await play(step);
  await Promise.all(pending);
  return result;
  async function play(st: Step) {
    switch (st.type) {
      case 'type': return T.type(fill(st.text, vars), st.kind, (st.speed ?? 14) * k);
      case 'log': {
        const lines = st.shuffle ? [...st.lines].sort(() => Math.random() - 0.5) : st.lines;
        for (let r = 0; r < (st.repeat ?? 1); r++) for (const l of lines) {
          T.print(fill(l, vars), st.kind); await sleep(ms(st.delay ?? [80, 240]) * k);
        }
        return;
      }
      case 'progress': {
        const labels = Array.isArray(st.label) ? st.label : [st.label];
        const o = { from: st.from, to: st.to, stuckAt: st.stuckAt, stuckMs: st.stuckMs !== undefined ? st.stuckMs * k : undefined };
        const p = Promise.all(labels.map((l) => progressBar(env.barsEl, fill(l, vars), st.duration * k, o))).then(() => undefined);
        if (st.async) pending.push(p); else await p;
        return;
      }
      case 'popup': return glitchFlash(fill(st.title, vars), fill(st.sub ?? '', vars), (st.ms ?? 1400) * k);
      case 'delay': return sleep(ms(st.ms) * k);
      case 'at': return sleep(Math.max(0, st.ms * k - (performance.now() - t0)));
      case 'trace': {
        if (!env.map) return;
        const end = await env.map.trace(st.hops ?? 5, fakeIp, (i, ip, c, t) => T.print(`  [hop ${i + 1}] ${ip} → ${c.name} (${t}ms)`, 'dim'));
        vars.traceEnd = end.name; return;
      }
      case 'reveal': {
        await Promise.all(pending);
        const text = fill(pick(st.texts), vars), title = fill(st.title ?? 'ACCESS GRANTED', vars);
        T.print(`[揭晓] ${text.replace(/\n/g, ' ')}`, 'warn');
        result = { title, text };
        return glitchPopup(title, { reveal: text, button: st.button, revealTitle: st.keepTitle ? title : undefined });
      }
    }
  }
}
