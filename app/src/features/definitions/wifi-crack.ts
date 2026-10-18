import type { ModuleDefinition } from '../../core/types';
import { accessPoints } from '../extraData';
const definition: ModuleDefinition = {
 id: 'wifi-crack', code: 'wifi', name: 'WiFi 破解', category: '无线', description: '发现接入点，采集握手并检查候选匹配。', view: 'wifi', order: 8,
 fields: [], validate(_p,t) { return t.domain.trim().length > 80 ? {target:'网络关键词不能超过 80 个字符'} : {}; },
 async execute(ctx) {
  const aps = accessPoints(ctx.target); ctx.target.data.wifi = {aps,stage:'discovery'}; ctx.phase('发现接入点',10); ctx.log(`RADIO INDEX ${aps.length} ACCESS POINTS`); ctx.changed();
  const id = await ctx.choose('选择接入点',aps.map(ap=>({value:ap.id,label:`${ap.name} · CH ${ap.channel} · ${ap.signal} dBm · ${ap.security}`})));
  const ap=aps.find(a=>a.id===id)!; const state=ctx.target.data.wifi as Record<string,unknown>; state.selected=id; state.stage='capture'; ctx.changed();
  let valid=false;
  while(!valid) {
   const channel=await ctx.choose(`配置监听频道 · ${ap.name}`, [1,6,11,36].map(ch=>({value:String(ch),label:`频道 ${ch}${ch===ap.channel?' · 目标频道':''}`})));
   const capture=await ctx.choose(`采集方式 · 信号 ${ap.signal} dBm`,[{value:'quick',label:'快速采样 · 低信号可能丢失握手'},{value:'stable',label:'延长采样 · 信号整合'}]);
   ctx.phase('采集握手',30); await ctx.wait(capture==='stable'?950:450); valid=Number(channel)===ap.channel && (ap.signal>=-65 || capture==='stable');
   state.handshake=valid; state.channel=Number(channel); state.stage=valid?'dictionary':'capture'; ctx.log(valid?'EAPOL 4/4 · HANDSHAKE VERIFIED':Number(channel)!==ap.channel?`CHANNEL ${channel} · NO EAPOL · TARGET CH ${ap.channel}`:`EAPOL 2/4 · RSSI ${ap.signal} dBm · 延长采样可补齐握手`); ctx.changed();
  }
  let matched=false; let attempts=0;
  while(!matched) {
   const dictionary=await ctx.choose('选择候选集',[{value:'common',label:'常用口令 · 512 条'},{value:'extended',label:'扩展网络口令 · 4096 条'}]);
   state.dictionary=dictionary; state.stage='search'; ctx.changed();
   for(let i=1;i<=5;i++){ await ctx.wait(260); ctx.phase('校验候选',45+i*9); ctx.log(`KEY CHECK ${Math.round(i/5*(dictionary==='common'?512:4096))} · EAPOL VERIFIED`); }
   attempts++; matched=dictionary===ap.dictionary || dictionary==='extended'; state.attempts=attempts; state.stage=matched?'matched':'exhausted'; ctx.changed();
   if(!matched) ctx.log('WORDLIST EXHAUSTED · 扩展候选集覆盖设备配置规则，请更换后重试');
  }
  state.matched=true; ctx.changed(); return `${ap.name} · 握手有效，候选匹配完成；共执行 ${attempts} 轮校验。`;
 }
}; export default definition;
