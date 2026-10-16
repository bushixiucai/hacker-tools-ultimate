// M11 一键神功数据（scripts/gags/*.json）。只能经 ui/gags.ts 中受 import.meta.env.VITE_GAGS 保护的动态 import 加载：
// 默认构建（未设 VITE_GAGS=1）整块被摇掉，dist 中不含任何按钮文案。
import type { ScenarioScript } from './types';
import { validateGags, gagToScript, type Gag } from './gags';
const gagMods = import.meta.glob<{ default: unknown }>('../../../scripts/gags/*.json', { eager: true });
const seen = new Set<string>();
export const GAGS: Gag[] = Object.entries(gagMods).sort(([a], [b]) => a.localeCompare(b)).flatMap(([f, m]) => validateGags(m.default, f, seen));
export const GAG_SCRIPTS: ScenarioScript[] = GAGS.map((g) => gagToScript(g));
