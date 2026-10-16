import type { ScenarioScript, Step } from './types';
import { fromCopywriter, type CwIndex, type CwScript } from './copywriter';
// 所有脚本均在构建期由 Vite 打包（eager import），运行时绝不经网络加载
// 内置格式脚本放 src/scripts/*.json（目前为空，示例已按负责人决定删除）
const nativeMods = import.meta.glob<{ default: unknown }>('../scripts/*.json', { eager: true });
const cwMods = import.meta.glob<{ default: unknown }>('../../../scripts/*.json', { eager: true });
const TYPES = new Set(['type', 'log', 'progress', 'popup', 'delay', 'at', 'trace', 'reveal']);

export function validate(raw: unknown, file: string): ScenarioScript {
  const s = raw as ScenarioScript, err = (m: string) => { throw new Error(`[脚本 ${file}] ${m}`); };
  if (!s || typeof s.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(s.id)) err('id 必须为小写字母/数字/连字符');
  if (typeof s.name !== 'string' || typeof s.description !== 'string') err('缺少 name/description');
  if (!Array.isArray(s.steps) || !s.steps.length) err('steps 不能为空');
  s.steps.forEach((st: Step, i) => { if (!st || !TYPES.has(st.type)) err(`steps[${i}].type 非法: ${(st as { type?: string })?.type}`); });
  if (s.steps[s.steps.length - 1].type !== 'reveal') err('最后一步必须是 reveal（PRD R15：每个流程必须揭晓）');
  return s;
}

/** 文案组彩蛋中无法自动解析的条目（会在 `eggs` 命令里列出）*/
export const UNPARSED_EGGS: string[] = [];

function loadCopywriter(): ScenarioScript[] {
  const byName = (n: string) => Object.entries(cwMods).find(([f]) => f.endsWith('/' + n))?.[1].default;
  const index = byName('index.json') as CwIndex | undefined;
  if (!index) return [];
  if (!Array.isArray(index.scripts)) throw new Error('[文案脚本 index.json] scripts 必须为数组');
  return index.scripts.map((e) => {
    const raw = byName(e.file) as CwScript | undefined;
    if (!raw) throw new Error(`[文案脚本 index.json] 找不到文件 ${e.file}`);
    if (raw.id !== e.id) throw new Error(`[文案脚本 ${e.file}] id「${raw.id}」与 index.json 中「${e.id}」不一致`);
    return validate(fromCopywriter(raw, e.title, e.file, UNPARSED_EGGS), e.file);
  });
}

const native = Object.entries(nativeMods).map(([f, m]) => validate({ format: 'native', ...(m.default as object) }, f))
  .sort((a, b) => a.id.localeCompare(b.id));
const cw = loadCopywriter();
const dup = [...native, ...cw].map((s) => s.id).find((id, i, a) => a.indexOf(id) !== i);
if (dup) throw new Error(`脚本 id 重复：${dup}`);
export const SCRIPTS: ScenarioScript[] = [...cw, ...native];
