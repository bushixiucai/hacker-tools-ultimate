import type { SiteKind, Target } from './types';

export function seedOf(text: string): number {
  let seed = 2166136261;
  for (const char of text) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}

export function createTarget(input: string, kind?: SiteKind): Target {
  let domain = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!domain || domain.length > 253 || /[<>\u0000-\u001f\u007f]/.test(domain)) throw new Error('请输入有效目标，最多 253 个字符');
  const scheme = domain.match(/^([a-z][a-z\d+.-]*):/);
  if (scheme) {
    if (!['http', 'https'].includes(scheme[1])) throw new Error('仅支持 HTTP 或 HTTPS 网站地址');
    try {
      const url = new URL(domain);
      if (!url.hostname || url.username || url.password) throw new Error('Invalid address');
      domain = url.hostname.replace(/\.$/, '');
    } catch { throw new Error('网址格式不正确'); }
  } else domain = domain.replace(/\.$/, '');
  if (/^\d+(?:\.\d+){3}(?:\/\d+)?$/.test(domain)) {
    const [ip, mask] = domain.split('/');
    if (ip.split('.').some(n => Number(n) > 255) || (mask !== undefined && Number(mask) > 32)) throw new Error('地址范围不正确');
  }
  if (domain.includes('..')) throw new Error('目标格式不正确');
  const seed = seedOf(domain);
  const kinds: SiteKind[] = ['commerce', 'publishing', 'enterprise'];
  const selected = kind ?? (/shop|store|mall|market|商城/.test(domain) ? 'commerce' : /news|blog|journal|press|新闻/.test(domain) ? 'publishing' : /tech|cloud|developer|service|studio/.test(domain) ? 'enterprise' : kinds[seed % kinds.length]);
  if (!kinds.includes(selected)) throw new Error('站点类型不正确');
  const label = domain.replace(/^www\./, '').split('.')[0].replace(/-/g, ' ');
  const suffix = { commerce: '精选商店', publishing: '观察志', enterprise: '技术服务' }[selected];
  const names = { commerce: ['轻量通勤包', '桌面收纳套装', '便携随行杯'], publishing: ['城市周末观察', '独立创作者访谈', '本月编辑推荐'], enterprise: ['数字化咨询', '系统维护方案', '客户合作计划'] }[selected];
  const announcement = { commerce: '秋日新品已上架，会员订单享包邮。', publishing: '本周专题更新，欢迎订阅编辑精选。', enterprise: '全新服务方案上线，欢迎预约咨询。' }[selected];
  const records = names.map((title, i) => ({ id: String(i + 1), title, detail: selected === 'commerce' ? `价格 ¥${99 + i * 70} · 库存 ${20 + seed % 80 + i}` : selected === 'publishing' ? `编辑部 · 阅读 ${200 + seed % 1200 + i * 76}` : `服务周期 ${i + 1} 个月 · 支持预约`, status: selected === 'commerce' ? '在售' : selected === 'publishing' ? '已发布' : '服务中' }));
  const password = ['cedar-2026', 'orbit-2026', 'harbor-2026'][seed % 3];
  return {
    id: `target-${encodeURIComponent(domain)}`, domain, seed, kind: selected, name: `${label} ${suffix}`,
    ip: /^\d+(?:\.\d+){3}$/.test(domain) ? domain : `192.0.2.${1 + seed % 253}`, services: [{ port: 22, name: 'SSH', version: `9.${seed % 7}` }, { port: 80, name: 'HTTP', version: '1.1' }, { port: 443, name: 'HTTPS', version: '1.3' }, { port: 554, name: 'RTSP', version: '1.0' }, ...(seed % 2 ? [{ port: 8080, name: 'CMS', version: '2.4' }] : [])],
    username: 'admin', password, latitude: 20 + (seed % 2800) / 100, longitude: 90 + (seed % 4000) / 100,
    devices: ['仓储区', '机房', '装卸区'], discoveredPorts: [], scanned: false, credentials: false, unlocked: false, cameraConnected: false,
    traced: false, traffic: 0, latency: 24 + seed % 35, locked: false,
    announcement, originalAnnouncement: announcement, records, revision: 0, data: {},
    site: { title: `${label} ${suffix}`, description: announcement, language: 'zh-CN', accent: ['#37d67a', '#ba84ff', '#55b7ed'][seed % 3], source: 'generated' },
    files: { '/readme.txt': `${domain}\nService workspace initialized.\nAccount: admin`, '/site/announcement.txt': announcement, '/site/catalog.json': JSON.stringify(records, null, 2), '/var/log/system.log': 'Workspace initialized. No active sessions.' },
  };
}
