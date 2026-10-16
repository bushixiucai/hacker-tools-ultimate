// M11「一键神功」分类显示名 —— 唯一配置处，PM/文案可直接改名。
// 枚举键（site/crack/ctf/wireless/hardware/mystic）是数据契约，不要改；显示名为总负责人最终拍板（2026-10-17）；gags.json 里若带显示名一律忽略。
export const GAG_CATEGORIES = {
  site: '网站魔法',
  crack: '拆解实验室',
  ctf: '夺旗练习场',
  wireless: '空中信号站',
  hardware: '铁盒子们',
  mystic: '玄学办公室',
} as const;
export type GagCategory = keyof typeof GAG_CATEGORIES;
export const GAG_CATEGORY_KEYS = Object.keys(GAG_CATEGORIES) as GagCategory[];
