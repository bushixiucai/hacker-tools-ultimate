// G3 主题：Matrix 绿（默认）/ 赛博紫粉 / 红黑警报；记入 localStorage；切换时“切换次元”过场
export const THEMES = { matrix: 'Matrix 绿', cyber: '赛博紫粉', alert: '红黑警报' } as const;
export type Theme = keyof typeof THEMES;
const KEY = 'htb.theme';
export const isTheme = (t: string): t is Theme => t in THEMES;
export const currentTheme = (): Theme => { const t = document.documentElement.dataset.theme ?? ''; return isTheme(t) ? t : 'matrix'; };
export function setTheme(t: Theme, animate = true) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  if (animate) { const d = document.createElement('div'); d.className = 'dimension'; document.body.append(d); setTimeout(() => d.remove(), 400); }
  window.dispatchEvent(new CustomEvent('htb:theme', { detail: t }));
}
export function initTheme() {
  let t: string | null = null; try { t = localStorage.getItem(KEY); } catch { /* ignore */ }
  setTheme(t && isTheme(t) ? t : 'matrix', false);
}
