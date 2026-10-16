import { el, sfx, sleep } from './util';
export interface ProgressOpts { from?: number; to?: number; stuckAt?: number; stuckMs?: number; keepMs?: number; /** false：卡住后保持在 stuckAt，不跳到 100% */ finish?: boolean }
/** 假进度条：durationMs 内从 from 涨到 to（默认 0→100），可在 stuckAt 处“卡住” stuckMs */
export function progressBar(container: HTMLElement, label: string, durationMs: number, o: ProgressOpts = {}): Promise<void> {
  const from = o.from ?? 0, to = o.to ?? 100;
  return new Promise((resolve) => {
    const wrap = el('div', 'bar'), txt = el('span'), track = el('div', 'track'), fill = el('div', 'fill');
    track.append(fill); wrap.append(txt, track); container.prepend(wrap);
    const show = (p: number, done = false) => { fill.style.width = p + '%'; txt.textContent = `${label}… ${p}%${done && p === 100 ? ' ✔' : ''}`; };
    const start = performance.now();
    const step = async () => {
      const t = Math.min(1, (performance.now() - start) / Math.max(1, durationMs));
      const eased = from + (to - from) * (1 - Math.pow(1 - t, 2));
      // 未完成时加一点抖动，但不超过 to-1，最后一帧精确落在 to
      const p = t >= 1 ? to : Math.min(Math.max(from, to - 1), Math.floor(eased + Math.random() * 2));
      show(p, t >= 1);
      if (t < 1) { requestAnimationFrame(() => void step()); return; }
      if (o.stuckAt !== undefined && o.stuckMs) {
        show(o.stuckAt); txt.textContent += '  (卡住了…)'; await sleep(o.stuckMs);
        if (o.stuckAt >= to && o.finish !== false) { show(100, true); }
      }
      sfx('ding'); setTimeout(() => wrap.remove(), o.keepMs ?? 4000); resolve();
    };
    void step();
  });
}
