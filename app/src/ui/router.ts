// 极简 hash 路由：#/ 首页 · #/tool[/<id>][?target=] 终端 · #/about 关于 · #/reveal/<payload> 揭晓
// 兼容旧钩子：#run= / #autorun= / #demo → 终端视图
export type View = 'home' | 'tool' | 'about' | 'reveal';
export interface Route { view: View; id?: string; target?: string; payload?: string; legacy?: string }

export function parseRoute(hash = location.hash): Route {
  if (/^#(auto)?run=|^#demo$/.test(hash)) return { view: 'tool', legacy: hash };
  const m = /^#\/?([a-z]*)(?:\/([^?]*))?(?:\?(.*))?$/.exec(hash) ?? [];
  const q = new URLSearchParams(m[3] ?? '');
  switch (m[1]) {
    case 'tool': return { view: 'tool', id: m[2] ? decodeURIComponent(m[2]) : undefined, target: q.get('target') ?? undefined };
    case 'about': return { view: 'about' };
    case 'reveal': return { view: 'reveal', payload: m[2] };
    default: return { view: 'home' };
  }
}

export function showView(v: View) {
  for (const id of ['home', 'tool', 'about', 'reveal'] as View[]) document.getElementById(`view-${id}`)?.classList.toggle('hidden', id !== v);
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === v));
  document.body.dataset.view = v;
}

/** 修改地址栏但不触发路由（用于“已处理”的一次性路由，如 #/tool/<id> 启动后） */
export const replaceHash = (h: string) => history.replaceState(null, '', h);
