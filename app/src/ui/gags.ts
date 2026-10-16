// M11「一键神功」首页宫格 + 轻量运行面板（复用 Terminal/runner，不切换页面）
// 构建期开关：仅 VITE_GAGS=1 构建时才打包 gags 数据（未审核内容不会出现在默认 dist 中）。
import { Terminal, el } from '../effects';
import { GAG_CATEGORIES, GAG_CATEGORY_KEYS } from '../gags.categories';
import { runScenario, type Gag, type ScenarioScript } from '../scenario';

let data: { GAGS: Gag[]; GAG_SCRIPTS: ScenarioScript[] } | null = null;
export async function loadGags() {
  if (import.meta.env.VITE_GAGS === '1') data = await import('../scenario/gagsData');
  return data;
}
export const gagIds = () => data?.GAGS.map((g) => g.id) ?? [];

let running = false;
export async function runGag(id: string) {
  if (!data || running) return;
  const i = data.GAGS.findIndex((g) => g.id === id); if (i < 0) return;
  running = true;
  const ov = el('div', 'gag-run'); ov.dataset.gag = id;
  const box = el('div', 'gag-box'), title = el('div', 'gag-run-title', data.GAGS[i].label), host = el('div', 'gag-term'), bars = el('div', 'gag-bars');
  box.append(title, host, bars); ov.append(box); document.body.append(ov);
  const t = new Terminal(host, '$', 60);
  try { await runScenario(data.GAG_SCRIPTS[i], { term: t, barsEl: bars }, { target: '' }); }
  finally { ov.remove(); running = false; }
}

export function renderGags() {
  const sec = document.getElementById('gags')!, groups = document.getElementById('gag-groups')!;
  if (!data?.GAGS.length) { sec.remove(); return; }
  document.body.dataset.gags = String(data.GAGS.length);
  sec.classList.remove('hidden'); groups.replaceChildren();
  for (const cat of GAG_CATEGORY_KEYS) {
    const list = data.GAGS.filter((g) => g.category === cat); if (!list.length) continue;
    const grp = el('div', 'gag-group'); grp.dataset.category = cat;
    grp.append(el('h3', '', GAG_CATEGORIES[cat]));
    const row = el('div', 'gag-row');
    for (const g of list) {
      const b = el('button', 'gag-btn', g.label); b.type = 'button'; b.dataset.gag = g.id;
      b.onclick = () => void runGag(g.id); row.append(b);
    }
    grp.append(row); groups.append(grp);
  }
}
