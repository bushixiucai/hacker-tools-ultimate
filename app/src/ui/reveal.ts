// G6 统一反转揭晓页。状态编码在 hash 中（base64url(JSON)），可分享、可刷新；不经网络。
export interface RevealState { s: string; n?: string; t: string; b: string; tg?: string }
const MAX = 600;
const clip = (x: unknown) => String(x ?? '').slice(0, MAX);

export function encodeReveal(st: RevealState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(st));
  let bin = ''; bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeReveal(p?: string): RevealState | null {
  if (!p) return null;
  try {
    const bin = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return { s: clip(o.s), n: clip(o.n), t: clip(o.t), b: clip(o.b), tg: o.tg ? clip(o.tg) : undefined };
  } catch { return null; }
}

/** 渲染揭晓页（只用 textContent：分享链接里的内容不可信） */
export function renderReveal(st: RevealState | null, opts: { onAgain(id: string, target?: string): void; onHome(): void }) {
  const $ = (id: string) => document.getElementById(id)!;
  const s = st ?? { s: '', t: '你被骗啦 🤡', b: '这是一个反转揭晓页。所有效果都是本地模拟的。' };
  $('reveal-tool').textContent = s.n || s.s || '黑客工具箱';
  $('reveal-title').textContent = s.t; $('reveal-title').dataset.text = s.t;
  $('reveal-body').textContent = s.b;
  $('reveal-share-msg').textContent = '';
  const again = $('reveal-again') as HTMLButtonElement;
  again.disabled = !s.s; again.onclick = () => opts.onAgain(s.s, s.tg);
  ($('reveal-home') as HTMLButtonElement).onclick = () => opts.onHome();
  ($('reveal-share') as HTMLButtonElement).onclick = async () => {
    const url = location.href, msg = $('reveal-share-msg');
    try { await navigator.clipboard.writeText(url); msg.textContent = '已复制（链接只包含这段文字，不含任何数据）'; }
    catch { msg.textContent = url; } // 无剪贴板权限时直接显示链接
  };
}
