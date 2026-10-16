import type { ScenarioScript } from './types';
import { validate } from './validate';
export { validate };
import { fromCopywriter, type CwIndex, type CwScript } from './copywriter';
// 所有脚本均在构建期由 Vite 打包（eager import），运行时绝不经网络加载
// 内置格式脚本放 src/scripts/*.json（目前为空，示例已按负责人决定删除）
const nativeMods = import.meta.glob<{ default: unknown }>('../scripts/*.json', { eager: true });
const cwMods = import.meta.glob<{ default: unknown }>('../../../scripts/*.json', { eager: true });

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
