import type { ModuleDefinition } from '../../core/types';
export function parsePorts(value: string): number[] {
  const result = new Set<number>();
  for (const part of value.split(',')) { const match = part.trim().match(/^(\d+)(?:-(\d+))?$/); if (!match) throw new Error('请输入端口或范围，例如 22,80,443,8000-8100'); const start = Number(match[1]); const end = Number(match[2] ?? start); if (start < 1 || end > 65535 || end < start) throw new Error('端口范围应为 1–65535，起点不能大于终点'); for (let port = start; port <= end; port++) result.add(port); }
  return [...result].sort((a,b) => a-b);
}
const definition: ModuleDefinition = {
  id: 'port-scan', code: 'scan', order: 2, name: '端口扫描', category: '侦察', view: 'scan', description: '选择扫描范围，检查端口状态与服务指纹。',
  fields: [{ key: 'preset', label: '扫描预设', type: 'select', default: 'common', options: [{ value: 'common', label: '常用端口' }, { value: 'full', label: '完整扫描 · 1–65535' }, { value: 'custom', label: '自定义范围' }] }, { key: 'ports', label: '自定义端口', default: '22,80,443,554,8080', advanced: true, help: '自定义预设时使用，支持 8000-8100。' }],
  validate(params) { if (!['common','full','custom'].includes(params.preset)) return { preset: '请选择扫描预设' }; try { if (params.preset === 'custom') parsePorts(params.ports); return {}; } catch (error) { return { ports: (error as Error).message }; } },
  async execute(ctx, params) {
    const ports = params.preset === 'full' ? Array.from({length:65535},(_,i)=>i+1) : params.preset === 'custom' ? parsePorts(params.ports) : [21,22,25,53,80,110,143,443,554,993,3306,3389,5432,8080];
    ctx.log(`TARGET ${ctx.target.domain} → ${ctx.target.ip} / ${ports.length} TCP ports`);
    const rows = ports.filter(port => ctx.target.services.some(s=>s.port===port) || (ports.length < 40 || port % 4096 === 0)).map(port=> { const service = ctx.target.services.find(s=>s.port===port); return { port, state: service ? 'open' : (port + ctx.target.seed) % 5 === 0 ? 'filtered' : 'closed', name: service?.name ?? '—', version: service?.version ?? '—' }; });
    for (let i=0;i<rows.length;i++) { await ctx.wait(params.preset === 'full' ? 180 : 90); ctx.phase(`检查端口 ${rows[i].port}`,10+80*(i+1)/rows.length); ctx.log(`${rows[i].port}/tcp ${rows[i].state.toUpperCase()} ${rows[i].name} ${rows[i].version}`); }
    ctx.target.scanned = true; ctx.target.discoveredPorts = rows.filter(r=>r.state==='open').map(r=>r.port); ctx.target.data.scan = { rows, total: ports.length, closed: ports.length - rows.filter(r=>r.state !== 'closed').length, filtered: rows.filter(r=>r.state==='filtered').length }; ctx.target.files['/reports/services.txt'] = rows.map(r=>`${r.port}/tcp ${r.state} ${r.name} ${r.version}`).join('\n'); ctx.changed();
    return `已检查 ${ports.length} 个端口，${ctx.target.discoveredPorts.length} 个开放。点击报告中的端口查看详情或重新探测。`;
  },
}; export default definition;
