export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
export const pick = <T>(a: readonly T[]): T => a[rnd(0, a.length - 1)];
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text; // 始终 textContent：用户输入只作文本显示（R1）
  return e;
}
/** 读取主题 CSS 变量（canvas 绘制用） */
export const cssVar = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
/** 音效事件总线：特效库只派发事件，不依赖音频实现 */
export type Sfx = 'key' | 'ding' | 'alarm' | 'reveal' | 'click';
export const sfx = (name: Sfx) => window.dispatchEvent(new CustomEvent<Sfx>('htb:sfx', { detail: name }));
