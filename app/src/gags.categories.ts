// M11「一键神功」分类显示名 —— 唯一配置处，PM/文案可直接改名。
// 枚举键（site/crack/ctf/wireless/hardware/mystic）是数据契约，不要改；显示名由 PM 定（2026-10-17）；gags.json 里若带显示名一律忽略。
export const GAG_CATEGORIES = {
  site: '网站奇遇',
  crack: '人生破解',
  ctf: '比赛外挂',
  wireless: '信号玄机',
  hardware: '机器驯服',
  mystic: '赛博求签',
} as const;
export type GagCategory = keyof typeof GAG_CATEGORIES;
export const GAG_CATEGORY_KEYS = Object.keys(GAG_CATEGORIES) as GagCategory[];
