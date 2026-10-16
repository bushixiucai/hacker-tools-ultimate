/**
 * M11「一键神功」：大量小剧本。数据来自 hacker-toolbox/scripts/gags/gags.json（构建期打包，非网络）。
 *
 * Gag schema（PRD v0.4）：
 *   { id, category: site|crack|ctf|wireless|hardware|mystic, label, duration: 3–5（秒）, stall?: 10–99 两位数, twist,
 *     logs?: string[]（可选假日志）, steps?: Step[]（可选，完整内部步骤，优先于自动生成） }
 * 未给 steps 时自动生成：logs（缺省用通用台词）在 duration 内打出 + 进度条（有 stall 则在该百分比卡顿一下再走完）→ 一句话反转弹窗。
 */
import { GAG_CATEGORY_KEYS, type GagCategory } from '../gags.categories';
import type { ScenarioScript, Step } from './types';
import { validate } from './validate';

export interface Gag { id: string; category: GagCategory; label: string; duration: number; stall?: number; twist: string; logs?: string[]; steps?: Step[] }

const DEFAULT_LOGS = [
  '[*] 召唤「{label}」引擎……',
  '[*] 正在用意念加速，CPU 风扇假装在转',
  '[!] 进度遇到一点玄妙的阻力，正在礼貌地推它',
];

export function validateGags(raw: unknown, file: string, seen = new Set<string>()): Gag[] {
  const err = (m: string) => { throw new Error(`[一键神功 ${file}] ${m}`); };
  if (!Array.isArray(raw)) err('必须是数组');
  return (raw as Gag[]).map((g, i) => {
    const at = `[${i}]${g && typeof g.id === 'string' ? ' ' + g.id : ''}`;
    if (!g || typeof g !== 'object') err(`${at} 不是对象`);
    if (typeof g.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(g.id)) err(`${at} id 必须为小写字母/数字/连字符`);
    if (seen.has(g.id)) err(`${at} id 重复`); seen.add(g.id);
    if (!GAG_CATEGORY_KEYS.includes(g.category)) err(`${at} category 必须是 ${GAG_CATEGORY_KEYS.join('|')}`);
    if (typeof g.label !== 'string' || !g.label.trim()) err(`${at} 缺少 label`);
    if (typeof g.twist !== 'string' || !g.twist.trim()) err(`${at} 缺少 twist`);
    if (typeof g.duration !== 'number' || g.duration < 3 || g.duration > 5) err(`${at} duration 必须是 3–5（秒）`);
    if (g.stall !== undefined && !(Number.isInteger(g.stall) && g.stall >= 10 && g.stall <= 99)) err(`${at} stall 必须是两位数整数（10–99）`);
    if (g.logs !== undefined && (!Array.isArray(g.logs) || g.logs.some((l) => typeof l !== 'string'))) err(`${at} logs 必须是字符串数组`);
    if (g.steps !== undefined && !Array.isArray(g.steps)) err(`${at} steps 必须是数组`);
    return g;
  });
}

/** Gag → 可播放的 ScenarioScript */
export function gagToScript(g: Gag): ScenarioScript {
  const ms = g.duration * 1000, stall = g.stall;
  const reveal: Step = { type: 'reveal', title: g.label, texts: [g.twist], keepTitle: true, button: '哈哈，好吧' };
  let steps: Step[];
  if (g.steps?.length) {
    steps = [...g.steps];
    if (steps[steps.length - 1].type !== 'reveal') steps.push(reveal);
  } else {
    const logs = (g.logs?.length ? g.logs : DEFAULT_LOGS).map((l) => l.replace('{label}', g.label.replace(/^一键/, '')));
    steps = [stall !== undefined
      ? { type: 'progress', label: '执行中', duration: ms * 0.55, to: stall, stuckAt: stall, stuckMs: ms * 0.3, async: true } // 卡在 stall 抖一下再走完
      : { type: 'progress', label: '执行中', duration: ms * 0.8, async: true }];
    logs.forEach((l, i) => steps.push({ type: 'at', ms: Math.round((ms * 0.85 * i) / logs.length) }, { type: 'type', text: l, speed: 8, kind: l.startsWith('[!]') ? 'warn' : '' }));
    steps.push(reveal);
  }
  return validate({ id: `gag-${g.id}`, name: g.label, description: g.label, format: 'native', defaultTarget: '', steps }, `gag ${g.id}`);
}
