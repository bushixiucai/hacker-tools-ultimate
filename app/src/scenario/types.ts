import type { LineKind } from '../effects';
/** 内部（规范化后）脚本 schema；文案组格式经 adapter 转成这个（见 README）*/
export type Range = [number, number];
export type Step =
  | { type: 'type'; text: string; kind?: LineKind; speed?: number }
  | { type: 'log'; lines: string[]; kind?: LineKind; delay?: Range; repeat?: number; shuffle?: boolean }
  | { type: 'progress'; label: string | string[]; duration: number;
      from?: number; to?: number; stuckAt?: number; stuckMs?: number;
      /** true：不阻塞后续步骤（时间轴格式用），reveal 前会等待其完成 */ async?: boolean }
  | { type: 'popup'; title: string; sub?: string; ms?: number }
  | { type: 'delay'; ms: number | Range }
  | { type: 'at'; ms: number }            // 等到「脚本开始后 ms 毫秒」（绝对时间轴）
  | { type: 'trace'; hops?: number }
  | { type: 'reveal'; title?: string; texts: string[]; button?: string; keepTitle?: boolean };

export interface VarSpec { name: string; default: string; label?: string }
export interface EasterEgg {
  /** command：整行输入完全匹配（全局隐藏命令）；arg：运行本脚本时某变量等于 value；repeat：同一目标连续运行 N 次；click：点击 [data-egg=element] 元素 N 次（logo=标题）*/
  kind: 'command' | 'arg' | 'repeat' | 'click';
  match?: string; element?: string; varName?: string; count?: number;
  output: string; effect?: 'pink';
  source: string;           // 原始文案
}
export interface ScenarioScript {
  id: string; name: string; description: string;
  usage?: string;
  defaultTarget?: string;
  vars?: VarSpec[];          // 位置参数顺序；未给时只有 target
  disclaimer?: string;
  easterEggs?: EasterEgg[];
  format?: 'native' | 'copywriter';
  steps: Step[];
}
