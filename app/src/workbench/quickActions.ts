import { seedOf } from '../core/profile';

const actions = [
  ['Web 应用分析', '站点指纹识别', '识别服务响应与技术特征', true],
  ['Web 应用分析', '响应标头分析', '检查响应标头与缓存策略', true],
  ['Web 应用分析', '管理入口检测', '分析入口路径与访问状态', true],
  ['密码攻击', '口令强度评估', '检查口令结构与候选空间', true],
  ['密码攻击', '哈希格式识别', '识别摘要长度与编码特征', true],
  ['密码攻击', '认证策略检查', '评估尝试限制与会话策略', true],
  ['漏洞利用', '服务配置审计', '核对服务暴露与配置状态', true],
  ['漏洞利用', '会话权限检查', '检查会话角色与访问范围', true],
  ['漏洞利用', '补丁基线核对', '比较服务版本与基线', true],
  ['无线攻击', '信道占用分析', '检查频道分布与信号质量', true],
  ['无线攻击', '握手质量检测', '分析握手完整性与信噪比', true],
  ['无线攻击', '接入点测绘', '生成接入点信号分布', true],
  ['硬件与物联网', '设备接口识别', '检查设备端口与接口信息', true],
  ['硬件与物联网', '固件信息提取', '分析版本与构建信息', true],
  ['硬件与物联网', '传感器校准', '校验采样稳定性与误差', false],
  ['信息收集', '子域名枚举', '生成子域名与主机清单', true],
  ['信息收集', '证书信息分析', '检查证书主体与有效期', true],
  ['信息收集', '路由路径分析', '生成跳点与链路时延', true],
  ['信息收集', '时间同步检测', '比较时间偏差与同步状态', false],
  ['信息收集', '资源可用性检查', '检查服务状态与响应延迟', true],
] as const;
interface Inspection { lines: string[]; summary: string; review?: boolean }
function inspect(index: number, sample: string, deep: boolean): Inspection {
  const seed = seedOf(sample || actions[index][1]);
  const octet = 1 + seed % 250;
  const address = `192.0.2.${octet}`;
  const level = deep ? 'EXTENDED' : 'STANDARD';
  const hostname = sample.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/\s+/g, '-').toLowerCase() || 'edge-gateway';
  const r = (lines: string[], summary: string, review = false): Inspection => ({ lines: [`[PROFILE] ${level}`, ...lines], summary, review });
  switch (index) {
    case 0: return r([`[HOST] ${hostname} → ${address}`, '[HTTP] 200 · HTTP/2 · text/html; charset=utf-8', `[SERVER] Meridian Gateway 4.${seed % 9}`, `[ASSETS] ${deep ? 18 : 4} signatures · application/json · cache manifest`, ...(deep ? ['[FINGERPRINT] Meridian CMS 3.8 · frontend bundle v4', '[CONFIDENCE] 0.94 · header + asset signatures agree'] : ['[CONFIDENCE] 0.68 · header evidence only'])], `识别到 Meridian Gateway 与 CMS 特征；${deep ? '资源与响应标头交叉核对一致。' : '建议深入核对静态资源以提高置信度。'}`, !deep);
    case 1: return r(['[HTTP] 200 OK', 'Content-Type: text/html; charset=utf-8', 'Cache-Control: public, max-age=300', 'Vary: Accept-Encoding', ...(deep ? ['Strict-Transport-Security: max-age=31536000', "Content-Security-Policy: default-src 'self'", '[CACHE] HTML 300s · assets 86400s · no private response caching'] : ['[HEADERS] 5 observed · security policy not expanded'])], deep ? '缓存分层与安全标头已核对，静态资源缓存时间长于 HTML。' : '基础响应有效；安全标头与缓存分层需进一步核对。', !deep);
    case 2: return r([`[HOST] ${address}`, '/admin → 302 /session', '/manage → 404', ...(deep ? ['/console → 403 · role required', '/session → 200 · CSRF token present', '[ACCESS] unauthenticated denied · login challenge required'] : ['/console → not inspected'])], deep ? '发现登录入口；匿名会话无法访问受限管理路由。' : '发现 /admin 重定向；控制台权限状态待深入核对。', !deep);
    case 3: {
      const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(regex => regex.test(sample)).length;
      const unique = new Set(sample).size; const entropy = Math.round(sample.length * Math.log2(Math.max(2, unique)));
      const repeated = /(.)\1{2,}|1234|password|admin/i.test(sample); const score = Math.max(0, Math.min(100, sample.length * 4 + classes * 9 - (repeated ? 30 : 0)));
      return r([`[LENGTH] ${sample.length} characters · ${unique} unique`, `[STRUCTURE] ${classes}/4 character classes`, `[ENTROPY] ${entropy} bits · structural estimate`, ...(deep ? [`[PATTERN] ${repeated ? 'repeated/common sequence detected' : 'no repeated/common sequence detected'}`, `[RECOMMEND] ${score < 65 ? 'increase length and remove repeated patterns' : 'maintain unique use and rotation policy'}`] : []), `[RATING] ${score < 40 ? 'WEAK' : score < 65 ? 'MODERATE' : 'STRONG'} · ${score}/100`], `口令结构评分 ${score}/100；${score < 65 ? '建议增加长度并减少重复模式。' : '结构较完整，仍应保持每个服务使用不同口令。'}`, score < 65);
    }
    case 4: {
      const hex = /^[a-f0-9]+$/i.test(sample); const base64 = /^[a-zA-Z0-9+/]+={0,2}$/.test(sample) && sample.length % 4 === 0;
      const format = hex ? ({32:'128-bit hexadecimal digest',40:'160-bit hexadecimal digest',64:'256-bit hexadecimal digest',128:'512-bit hexadecimal digest'}[sample.length] || 'hexadecimal sequence · nonstandard digest length') : base64 ? 'Base64-encoded sequence' : 'unrecognized text sequence';
      return r([`[SAMPLE] ${sample.length} characters`, `[FORMAT] ${format}`, ...(deep ? [`[ALPHABET] ${hex ? '0–9, A–F' : base64 ? 'Base64' : 'mixed text'}`, '[NOTE] length and encoding do not uniquely identify an algorithm'] : ['[NEXT] expanded check can compare alphabet and padding'])], `样本格式：${format}。${hex || base64 ? '仅凭格式不能确定具体算法。' : '请使用完整摘要样本重新检查。'}`, !hex && !base64);
    }
    case 5: { const limit = 3 + seed % 4; return r([`[AUTH] threshold ${limit} attempts / 60s`, '[SESSION] idle timeout 900s', ...(deep ? ['[LOCKOUT] exponential backoff enabled', '[COOKIE] Secure · HttpOnly · SameSite=Lax', '[TOKEN] rotation on privilege change'] : ['[COOKIE] flags pending inspection'])], deep ? `认证限制为每分钟 ${limit} 次；会话标志与轮换规则已核对。` : `尝试阈值 ${limit} 次/分钟；会话保护规则尚需深入核对。`, !deep); }
    case 6: return r([`[SERVICE] ${address}:443 · TLS`, '[LISTENER] 22/tcp · restricted management', '[EXPOSURE] 443/tcp public · 8080/tcp denied', ...(deep ? ['[CONFIG] directory listing disabled', '[CONFIG] debug endpoint disabled', '[CONFIG] management access restricted to control subnet'] : ['[BASELINE] public listeners checked'])], deep ? '公开监听与管理接口边界一致，调试和目录列表未开放。' : '已核对监听范围；深入模式可检查调试与目录配置。', !deep);
    case 7: return r(['[IDENTITY] operator · session active', '[ROLE] content-editor', '[ALLOW] read:content · write:drafts', '[DENY] manage:accounts · system:config', ...(deep ? ['[SCOPE] tenant=workspace-01', '[CROSS-SCOPE] denied · object ownership enforced', '[ELEVATION] additional authentication required'] : [])], deep ? '编辑角色限制在当前工作空间，跨域对象与系统配置访问被拒绝。' : '当前角色可编辑草稿，无账号与系统管理权限。');
    case 8: { const minor = seed % 5; const old = minor < 2; return r([`[PACKAGE] Meridian Gateway 4.${minor}.2`, '[BASELINE] 4.2.2 minimum', `[VERSION] ${old ? 'BELOW BASELINE' : 'COMPLIANT'}`, ...(deep ? [`[COMPONENT] TLS adapter 3.${seed % 3}.8`, '[SIGNATURE] package manifest verified', `[ACTION] ${old ? 'schedule maintenance update' : 'no baseline exception'}`] : [])], old ? '服务版本低于 4.2.2 基线，建议安排维护更新。' : '服务版本符合当前补丁基线。', old); }
    case 9: { const channels = [1,6,11].map((ch,i)=>({ch,load:(seed+i*23)%87+8})); const best = [...channels].sort((a,b)=>a.load-b.load)[0]; return r(channels.map(c=>`[CHANNEL ${c.ch}] utilization ${c.load}% · noise -${85+seed%10} dBm`).concat(deep ? [`[5GHz] CH 36 utilization ${14+seed%20}%`, `[RECOMMEND] 2.4GHz CH ${best.ch} · lowest observed occupation`] : []), `2.4 GHz 最低占用频道为 ${best.ch}（${best.load}%）。${deep ? '5 GHz 指标已加入比较。' : '可深入检查更多频段。'}`); }
    case 10: { const weak=seed%3===0&&!deep; return r([`[RSSI] -${40+seed%35} dBm`, `[EAPOL] ${weak?'2/4':'4/4'} frames`, `[REPLAY] ${weak?'counter gap detected':'counter sequence valid'}`, ...(deep ? ['[REASSEMBLY] fragmented frames joined', '[SNR] 28 dB · capture stable'] : []), `[QUALITY] ${weak?'INCOMPLETE':'VALID'}`], weak ? '握手缺少两个帧；深入核对可重组分片并补齐采集窗口。' : '握手四帧完整，重放计数连续，可进入候选校验。', weak); }
    case 11: return r([0,1,2,...(deep?[3,4]:[])].map((i)=>`[AP ${i+1}] ${hostname}${['','-Guest','-Office','-5G','-IoT'][i]} · CH ${[1,6,11,36,44][i]} · -${34+(seed+i*13)%43} dBm · ${i===1?'WPA2':'WPA2/WPA3'}`), `已生成 ${deep?5:3} 个接入点的频道与信号分布，访客与办公网络分别列示。`);
    case 12: return r(['[BOARD] ORB-24 / revision C', '[INTERFACE] UART · 3.3V · 115200 8N1', '[INTERFACE] I2C · address 0x48', ...(deep ? ['[INTERFACE] SPI · bus 0 · CS1', '[DEBUG] diagnostic access disabled', '[PINOUT] RX / TX / GND · reference only'] : ['[EXPANSION] secondary bus not inspected'])], deep ? '识别 UART、I2C 与 SPI 接口；诊断访问处于关闭状态。' : '已识别基础串口与传感总线，深入模式可核对扩展总线。');
    case 13: return r([`[IMAGE] ${hostname} · ORB-FW`, `[VERSION] 3.${seed%8}.12 · build ${20261001+seed%17}`, '[ARCH] ARMv7 · little-endian', ...(deep ? ['[MANIFEST] kernel 6.6 · rootfs squashfs', `[CHECKSUM] CRC32 ${seed.toString(16).toUpperCase().padStart(8,'0')}`, '[SIGNATURE] release manifest intact'] : ['[MANIFEST] header only'])], deep ? '固件版本、文件系统及发布清单校验完成。' : '已取得固件头部版本，文件系统与签名需深入核对。', !deep);
    case 14: { const before=(seed%40+10)/100;const after=deep?before/8:before/2;return r([`[SENSOR] channel A · ${deep?128:16} samples`, '[REFERENCE] 25.000 °C', `[OFFSET BEFORE] +${before.toFixed(3)} °C`, `[OFFSET AFTER] +${after.toFixed(3)} °C`, `[TOLERANCE] ±0.100 °C · ${after<=.1?'PASS':'REVIEW'}`], `校准后偏差 +${after.toFixed(3)} °C，${after<=.1?'符合 ±0.100 °C 容差。':'仍超出容差，建议深入采样。'}`,after>.1); }
    case 15: return r(['www','api','mail',...(deep?['status','assets','gateway']:[])].map((prefix,i)=>`[HOST] ${prefix}.${hostname} → ${i%2?'198.51.100':'192.0.2'}.${1+(seed+i*17)%250} · ${i===2?'MX':'A'}`), `已整理 ${deep?6:3} 条主机记录，地址与记录类型分别列示。`);
    case 16: { const day=1+seed%20;return r([`[SUBJECT] CN=${hostname}`, '[ISSUER] Meridian Trust R4', '[VALID FROM] 2026-09-01T00:00:00Z', `[VALID UNTIL] 2027-09-${String(day).padStart(2,'0')}T23:59:59Z`, '[KEY] EC P-256 · SHA-256', ...(deep ? [`[SAN] ${hostname} · www.${hostname}`, '[CHAIN] 3 certificates · complete', '[STATUS] time window valid · hostname covered'] : ['[CHAIN] leaf certificate only'])], deep ? '证书有效期、域名覆盖与三级证书链已核对。' : '叶证书处于有效期内，完整证书链需深入核对。', !deep); }
    case 17: {const hops=deep?7:3;return r(Array.from({length:hops},(_,i)=>`[HOP ${i+1}] ${deep&&i===hops-1?address:`198.51.100.${1+(seed+i*11)%250}`} · ${(2+i*5+seed%13).toFixed(1)} ms · loss ${i===2&&seed%2?'1':'0'}%`), `${deep?'完整':'初步'}路径包含 ${hops} 个跳点，${deep?'终点':'末次观测'}时延 ${(2+(hops-1)*5+seed%13).toFixed(1)} ms。`);}
    case 18: {const offset=(seed%240-120)/10;const corrected=deep?offset/40:offset/4;return r(['[CLOCK] edge-clock-01 · stratum 2', `[OFFSET BEFORE] ${offset.toFixed(3)} ms`, `[SAMPLES] ${deep?32:4}`, `[OFFSET AFTER] ${corrected.toFixed(3)} ms`, `[JITTER] ${deep?'0.083':'0.410'} ms`, `[SYNC] ${Math.abs(corrected)<1?'LOCKED':'ADJUSTING'}`], `同步后偏差 ${corrected.toFixed(3)} ms，${Math.abs(corrected)<1?'时钟已锁定。':'建议增加样本提高收敛精度。'}`,Math.abs(corrected)>=1);}
    default: { const delay=24+seed%160;const degraded=seed%4===0;return r([`[HTTP] ${degraded?'429 Too Many Requests':'200 OK'}`, `[RTT] ${delay} ms`, `[SAMPLES] ${deep?12:3}`, `[SUCCESS] ${degraded?(deep?'9/12':'2/3'):(deep?'12/12':'3/3')}`, ...(deep ? [`[P95] ${delay+35} ms`, `[RECOVERY] ${degraded?'rate limit clears after request interval adjustment':'response remains stable'}`] : [])], degraded ? '响应受到速率限制；建议调整请求间隔后复核。' : `服务响应稳定，基础时延 ${delay} ms。`,degraded); }
  }
}
export function mountQuickActions(host: HTMLElement, reveal: (title: string, detail: string) => void): () => void {
  let disposed = false; let activeDialog: HTMLDialogElement | undefined;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
  const dismiss = () => { clearTimers(); const dialog=activeDialog; activeDialog=undefined;if(dialog){if(dialog.open)dialog.close();dialog.remove();} };
  host.replaceChildren();
  for (const category of [...new Set(actions.map(a => a[0]))]) {
    const section=document.createElement('section');section.className='gag-group';const h=document.createElement('h3');h.textContent=category;const row=document.createElement('div');row.className='gag-row';section.append(h,row);host.append(section);
    actions.forEach((action,index)=>{
      if(action[0]!==category)return;const button=document.createElement('button');button.type='button';button.textContent=action[1];button.dataset.quick=String(index);row.append(button);
      button.onclick=()=>{
        if(disposed||activeDialog)return;const dialog=document.createElement('dialog');activeDialog=dialog;dialog.className='quick-dialog';dialog.setAttribute('aria-labelledby',`quick-title-${index}`);
        const title=document.createElement('h2');title.id=`quick-title-${index}`;title.textContent=action[1];const desc=document.createElement('p');desc.textContent=action[2];
        const form=document.createElement('form');const label=document.createElement('label');label.textContent='目标或样本';const input=document.createElement('input');input.name='sample';input.setAttribute('aria-label','目标或样本');input.maxLength=160;input.autocomplete='off';input.spellcheck=false;input.placeholder=index===4?'例如：7f83b1657ff1fc53b92dc18148a1d65d':index===3?'输入待评估口令':'例如：edge.example';if(index===3)input.type='password';label.append(input);if(action[3])form.append(label);
        const error=document.createElement('p');error.className='error';error.setAttribute('role','alert');const start=document.createElement('button');start.type='submit';start.textContent='开始检查';form.append(error,start);
        const output=document.createElement('pre');output.className='quick-output';output.setAttribute('aria-live','polite');const choices=document.createElement('div');choices.className='detail-actions';const close=document.createElement('button');close.type='button';close.textContent='关闭';close.onclick=()=>{dismiss();button.focus();};dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();button.focus();});dialog.addEventListener('close',()=>{if(activeDialog===dialog){activeDialog=undefined;clearTimers();dialog.remove();}});
        dialog.append(title,desc,form,output,choices,close);document.body.append(dialog);dialog.showModal();if(action[3])input.focus();else start.focus();
        form.onsubmit=e=>{
          e.preventDefault();if(start.disabled)return;const sample=input.value.trim();if(action[3]&&(!sample||/[<>\u0000-\u001f\u007f]/.test(sample))){error.textContent='请输入有效目标或样本，不支持控制字符';input.focus();return;}
          error.textContent='';start.disabled=true;input.disabled=true;output.textContent=`[INIT] ${action[1]}\n[TARGET] ${index===3?`${sample.length} characters · masked`:sample||'instrument-01'}\n[READY] 选择检查深度\n`;
          const run=(deep:boolean)=>{
            choices.replaceChildren();const result=inspect(index,sample,deep);output.textContent+=`\n${result.lines.join('\n')}\n[STATUS] ${result.review?'REVIEW REQUIRED':'VERIFIED'}\n[CONCLUSION] ${result.summary}\n`;
            if(!deep){const retry=document.createElement('button');retry.type='button';retry.textContent='深入核对';retry.onclick=()=>run(true);choices.append(retry);}
            const done=document.createElement('button');done.type='button';done.textContent='查看检查结论';done.onclick=()=>{dismiss();reveal(action[1],`${result.summary}\n刚才的记录、响应与检查结论均由页面生成，未执行真实探测或设备操作。`);};choices.append(done);
          };
          const timer=setTimeout(()=>{timers.delete(timer);if(disposed||activeDialog!==dialog||!dialog.isConnected)return;for(const [text,deep]of [['标准核对',false],['深入核对',true]] as const){const choice=document.createElement('button');choice.type='button';choice.textContent=text;choice.onclick=()=>run(deep);choices.append(choice);}},120);timers.add(timer);
        };
      };
    });
  }
  return ()=>{disposed=true;dismiss();};
}
