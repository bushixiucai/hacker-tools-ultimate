import type { EasterEgg } from './scenario';
// 应用内置彩蛋：绑定到应用自带 UI（脚本未定义同一元素时生效）。
// night-vision-3x：文案组最初为 camera-takeover 写的版本（后在剧本中移除），按负责人要求接到「夜视 3x」按钮。
export const BUILTIN_EGGS: (EasterEgg & { script: string })[] = [
  { kind: 'click', element: 'night-vision', count: 3, output: '[👽] 夜视切了 3 次，橘猫说：别闪了，眼睛疼。', source: 'builtin:night-vision-3x', script: 'camera-takeover' },
  { kind: 'click', element: 'record', count: 1, output: '[🎙] 对方正在说：今天中午吃什么？', source: 'builtin:record', script: 'camera-takeover' },
];
