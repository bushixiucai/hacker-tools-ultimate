import type { ModuleDefinition } from '../../core/types';
import { createTarget } from '../../core/profile';
import { prepareMetadata } from '../../core/metadata';
const definition: ModuleDefinition = {
  reveal: '刚才拿下的不是互联网，是你的导演席。现在任命你为首页宇宙终身主编，今日头条：我来、我改、我笑到键盘冒烟。',
  id: 'site-takeover', code: 'site', order: 1, name: '网站接管', category: '访问', view: 'cms', description: '给一个网址。入口、会话、发布权限，一路拿下。', fields: [],
  validate(_params, target) { const valid = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+[\p{L}\p{N}-]{2,63}$/u.test(target.domain) && target.domain.split('.').every(label => label.length <= 63 && !label.startsWith('-') && !label.endsWith('-')); return valid ? {} : { target: '请输入完整网址或域名，例如 domain.example' }; },
  async execute(ctx) {
    ctx.phase('目标已入镜，正在拆解站点指纹', 8); const beforeKind = ctx.target.kind; await prepareMetadata(ctx.target, ctx.signal, ctx.task.targetInput); if (beforeKind !== ctx.target.kind) { const profile = createTarget(ctx.target.domain, ctx.target.kind); ctx.target.records = profile.records; ctx.target.announcement = profile.announcement; ctx.target.originalAnnouncement = profile.announcement; } ctx.changed();
    ctx.log(`HOST ${ctx.target.domain} [${ctx.target.ip}] / HTTP 200`); await ctx.wait(400);
    ctx.log(`CMS fingerprint: ${ctx.target.kind} / 内容网关已露头`);
    ctx.phase('正门有锁？换条路', 30); ctx.log('GET /admin → 401 Session required / 管理网关拒绝匿名访问'); await ctx.wait(500);
    ctx.log('GET /backup → 403 Access policy denied / 旧入口封死，自动切换内容网关');
    ctx.phase('内容接口露头，继续推进', 55); await ctx.wait(500); ctx.log('GET /api/content → 200 Content schema received / 发布结构已捕获');
    ctx.phase('会话链路对齐，控制台准备接管', 85); await ctx.wait(650);
    ctx.target.unlocked = true; ctx.target.data.siteOriginal = structuredClone({ name: ctx.target.name, announcement: ctx.target.announcement, records: ctx.target.records, site: ctx.target.site }); ctx.changed();
    ctx.log('SESSION ESTABLISHED / role: content-editor / scope: publish / 发布权已到手');
    return '门开了，发布权到手。控制台归你，给首页换个大场面。';
  },
};
export default definition;
