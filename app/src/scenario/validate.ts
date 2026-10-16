import type { ScenarioScript, Step } from './types';
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

