import type { ModuleDefinition } from '../../core/types';
import { createTarget } from '../../core/profile';
import { prepareMetadata } from '../../core/metadata';
const definition: ModuleDefinition = {
  id: 'site-takeover', code: 'site', order: 1, name: '网站接管', category: '访问', view: 'cms', description: '分析站点入口，建立管理会话并检查内容发布。', fields: [],
  validate(_params, target) { const valid = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+[\p{L}\p{N}-]{2,63}$/u.test(target.domain) && target.domain.split('.').every(label => label.length <= 63 && !label.startsWith('-') && !label.endsWith('-')); return valid ? {} : { target: '请输入完整网址或域名，例如 完整网址或 domain.example' }; },
  async execute(ctx) {
    ctx.phase('分析站点特征', 8); const beforeKind = ctx.target.kind; await prepareMetadata(ctx.target, ctx.signal); if (beforeKind !== ctx.target.kind) { const profile = createTarget(ctx.target.domain, ctx.target.kind); ctx.target.records = profile.records; ctx.target.announcement = profile.announcement; ctx.target.originalAnnouncement = profile.announcement; } ctx.changed();
    ctx.log(`HOST ${ctx.target.domain} [${ctx.target.ip}] / HTTP 200`); await ctx.wait(400);
    ctx.log(`CMS fingerprint: ${ctx.target.kind} / Content gateway available`);
    let granted = false;
    while (!granted) {
      ctx.phase('等待选择访问入口', 30);
      const entry = await ctx.choose('选择已发现的入口', [{ value: 'admin', label: '/admin · 管理网关 · 401' }, { value: 'api', label: '/api/content · 内容接口 · 200' }, { value: 'archive', label: '/backup · 历史入口 · 403' }]);
      ctx.log(`GET ${entry === 'admin' ? '/admin' : entry === 'api' ? '/api/content' : '/backup'} → ${entry === 'archive' ? '403 Access policy denied' : entry === 'admin' ? '401 Session required' : '200 Content schema received'}`);
      ctx.phase('分析入口响应', 55); await ctx.wait(400);
      const method = await ctx.choose('根据响应选择处理方式', [{ value: 'session', label: '检查会话与内容发布权限' }, { value: 'retry', label: '重新提交当前请求' }, { value: 'switch', label: '返回入口列表' }]);
      if (method === 'switch') continue;
      if (method === 'retry') { ctx.log('Response unchanged. Inspect authentication policy before retrying.'); continue; }
      if (entry === 'archive') { ctx.log('Policy restriction confirmed. Select an active gateway.'); continue; }
      ctx.phase('建立内容管理会话', 85); await ctx.wait(450); granted = true;
    }
    ctx.target.unlocked = true; ctx.target.data.siteOriginal = structuredClone({ name: ctx.target.name, announcement: ctx.target.announcement, records: ctx.target.records, site: ctx.target.site }); ctx.changed();
    ctx.log('SESSION ESTABLISHED / role: content-editor / scope: publish');
    return '管理会话已建立。点击进入后台，修改内容并刷新前台验证。';
  },
};
export default definition;
