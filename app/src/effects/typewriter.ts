import { sleep, reducedMotion } from './util';
/** 逐字输出到元素；返回 Promise，完成后 resolve */
export async function typewrite(target: HTMLElement, text: string, speed = 14, onTick?: () => void) {
  if (reducedMotion() || speed <= 0) { target.textContent += text; onTick?.(); return; }
  for (const ch of text) { target.textContent += ch; onTick?.(); await sleep(speed); }
}
