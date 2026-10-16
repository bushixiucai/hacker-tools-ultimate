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
