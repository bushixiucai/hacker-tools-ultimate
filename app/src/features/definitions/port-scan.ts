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
    const services=new Map(ctx.target.services.map(service=>[service.port,service]));
    let closed=0;let filtered=0;
    const rows:Array<{port:number;state:string;name:string;version:string;fingerprint:string;response:string}>=[];
    for(const port of ports){
      const service=services.get(port);
      const state=service?'open':(port+ctx.target.seed)%5===0?'filtered':'closed';
      if(state==='closed')closed++;else if(state==='filtered')filtered++;
      if(!service&&ports.length>=40&&port%4096!==0)continue;
      const name=service?.name??'—',version=service?.version??'—';
      const fingerprint=!service?'未识别':name==='SSH'?`OpenSSH ${version}`:name==='HTTPS'?`TLS ${version}`:name==='HTTP'||name==='RTSP'?`${name}/${version}`:`${name} ${version}`;
      const response=!service?'':name==='SSH'?`SSH-2.0-OpenSSH_${version}`:name==='HTTPS'?`TLS handshake completed / TLSv${version}`:name==='RTSP'?`RTSP/${version} 200 OK`:name==='HTTP'?`HTTP/${version} 200 OK`:'HTTP/1.1 200 OK';
      rows.push({port,state,name,version,fingerprint,response});
    }
    for (let i=0;i<rows.length;i++) { await ctx.wait(params.preset === 'full' ? 180 : 90); ctx.phase(`检查端口 ${rows[i].port}`,10+80*(i+1)/rows.length); ctx.log(`${rows[i].port}/tcp ${rows[i].state.toUpperCase()} ${rows[i].fingerprint}`); }
    ctx.target.scanned = true; ctx.target.discoveredPorts = rows.filter(r=>r.state==='open').map(r=>r.port); ctx.target.data.scan = { rows, total: ports.length, closed, filtered }; ctx.target.files['/reports/services.txt'] = `Checked ${ports.length} / Open ${ctx.target.discoveredPorts.length} / Closed ${closed} / Filtered ${filtered}\n`+rows.map(r=>`${r.port}/tcp ${r.state} ${r.fingerprint}`).join('\n'); ctx.changed();
    return `已检查 ${ports.length} 个端口，${ctx.target.discoveredPorts.length} 个开放。点击报告中的端口查看详情或重新探测。`;
  },
}; export default definition;
