import { el, pick, sfx, sleep } from './util';
export const DEFAULT_REVEALS = [
  '开玩笑的啦 😜 你刚刚“黑掉”的是……你自己的浏览器标签页。',
  '以上全部是本地生成的假数据，没有任何服务器受到伤害 🐹',
  '管理员其实是一只橘猫，它不在乎。',
  '恭喜你成功入侵了……空气。',
];
export interface PopupOpts { sub?: string; reveal?: string; revealTitle?: string; holdMs?: number; button?: string; className?: string; egg?: string }
/**
 * 故障风弹窗：先显示 title，再揭晓为玩笑。
 * 一键关闭（PRD §2.8）：按钮 / Esc / 双击遮罩 任意一种都能立即关闭；
 * 若还在惊吓阶段，则先立即切到揭晓文案（R15：揭晓不可跳过），再次操作即关闭。
 * 不拦截系统快捷键、不注册 beforeunload、不强制全屏。（M6 勒索弹窗将复用此组件）
 */
export async function glitchPopup(title: string, opts: PopupOpts = {}) {
  const overlay = el('div', 'popup' + (opts.className ? ' ' + opts.className : '')), box = el('div', 'box');
  overlay.setAttribute('role', 'alertdialog'); overlay.setAttribute('aria-modal', 'true');
  const big = el('div', 'big glitch', title); big.dataset.text = title;
  const sub = el('div', 'psub', opts.sub ?? '正在注入载荷……');
  const btn = el('button', 'close-btn', '✕ 关闭（Esc）'); btn.dataset.egg = opts.egg ?? 'close-prank';
  box.append(big, sub, btn); overlay.append(box); document.body.append(overlay);
  let revealed = false, done: () => void = () => {};
  const reveal = () => {
    if (revealed) return; revealed = true; sfx('reveal');
    const rt = opts.revealTitle ?? '你被骗啦 🤡'; big.textContent = rt; big.dataset.text = rt;
    sub.textContent = opts.reveal ?? pick(DEFAULT_REVEALS); btn.textContent = opts.button ?? '好吧，我被骗了'; btn.focus();
    if (document.body.dataset.autoDismiss) setTimeout(() => close(), 1500); // 仅自动化测试/录屏
  };
  const close = () => { if (!revealed) return reveal(); document.removeEventListener('keydown', onKey); overlay.remove(); done(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; // 不 preventDefault，不影响浏览器退出全屏
  document.addEventListener('keydown', onKey);
  btn.onclick = (e) => { e.stopPropagation(); close(); };
  overlay.addEventListener('dblclick', close);
  const finished = new Promise<void>((res) => { done = res; });
  await Promise.race([sleep(opts.holdMs ?? 1600), finished]);
  reveal();
  return finished;
}

/** 短暂闪现的故障大字（不含揭晓），用于流程中途的 “ACCESS GRANTED” 等 */
export async function glitchFlash(title: string, sub = '', ms = 1400) {
  const overlay = el('div', 'popup'), box = el('div', 'box');
  const big = el('div', 'big glitch', title); big.dataset.text = title;
  box.append(big, el('div', 'psub', sub)); overlay.append(box); document.body.append(overlay); sfx('alarm');
  await sleep(ms); overlay.remove();
}
