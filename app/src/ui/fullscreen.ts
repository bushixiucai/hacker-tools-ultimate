// PRD G5 / §6.3：Fullscreen API（需用户手势），失败降级为 CSS 沉浸模式；Esc 退出（不拦截系统 Esc）
type Listener = (on: boolean, mode: 'native' | 'immersive' | 'off') => void;
let listener: Listener = () => {};
const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
const nativeOn = () => !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
export const isFullscreen = () => nativeOn() || document.body.classList.contains('immersive');

export function onFullscreenChange(fn: Listener) { listener = fn; }
export async function enterFullscreen() {
  const req = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
  try { if (!req) throw new Error('unsupported'); await req(); }
  catch { document.body.classList.add('immersive'); listener(true, 'immersive'); }
}
export async function exitFullscreen() {
  if (document.body.classList.contains('immersive')) { document.body.classList.remove('immersive'); listener(false, 'off'); }
  if (nativeOn()) { try { await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()); } catch { /* ignore */ } }
}
export const toggleFullscreen = () => (isFullscreen() ? exitFullscreen() : enterFullscreen());

document.addEventListener('fullscreenchange', () => { const on = nativeOn(); document.body.classList.toggle('fs', on); listener(on, on ? 'native' : 'off'); });
// 降级模式下由我们处理 Esc；原生全屏的 Esc 由浏览器处理
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('immersive')) void exitFullscreen(); });
