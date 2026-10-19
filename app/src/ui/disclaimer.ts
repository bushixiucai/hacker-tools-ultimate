import { el, sleep } from '../effects';
// PRD R16 / G1：首次访问免责声明；必须点「我已了解」才能继续；记忆于 localStorage（可一键清除，R10）
export const DISCLAIMER_KEY = 'htb.disclaimer.v1';
export const DISCLAIMER_TEXT = [
  '本产品用于娱乐模拟，不执行真实入侵、设备接管、文件加密或资金操作。',
  '网站工具可能读取公开网页资料作为背景；扫描、破解、追踪及操作结果均由页面生成。',
  '请勿用于欺骗、恐吓他人或违法用途；整蛊请适度，别让朋友真的恐慌，玩完记得告诉 TA 这是假的。',
];
const accepted = () => { try { return localStorage.getItem(DISCLAIMER_KEY) === '1'; } catch { return false; } };

/** 显示免责声明；force=true 时即使已接受也显示（再次打开）。返回 Promise，在用户确认后 resolve */
export function showDisclaimer(force = false, skipDelayMs = 0): Promise<void> {
  if (!force && accepted()) return Promise.resolve();
  document.querySelector('.disclaimer')?.remove();
  const ov = el('div', 'popup disclaimer'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  const box = el('div', 'box dbox');
  box.append(el('div', 'dtitle', '⚠ 免责声明 · 纯属娱乐'));
  for (const t of DISCLAIMER_TEXT) box.append(el('p', '', t));
  const btn = el('button', 'accept', '我已了解，进入工具') as HTMLButtonElement;
  box.append(btn); ov.append(box); (document.fullscreenElement ?? document.body).append(ov);
  btn.focus();
  return new Promise((res) => {
    btn.onclick = () => { try { localStorage.setItem(DISCLAIMER_KEY, '1'); } catch { /* 隐私模式忽略 */ } ov.remove(); res(); };
  });
}
