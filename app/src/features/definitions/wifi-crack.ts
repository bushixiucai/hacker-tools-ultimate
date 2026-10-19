import type { ModuleDefinition } from '../../core/types';
import { accessPoints } from '../extraData';
const definition: ModuleDefinition = {
 id: 'wifi-crack', code: 'wifi', name: 'WiFi 破解', category: '无线', description: '锁定目标网络，自动追频、补齐握手，一路撞穿候选空间。', view: 'wifi', order: 8,
 reveal:'无线大门轰然打开——门后蹲着一只正在啃网线的仓鼠。4096 条候选全是它昨晚的宵夜菜单，你刚刚把路由器吃到的那口饭破译了。',
 fields: [], validate(_p,t) { return t.domain.trim().length > 80 ? {target:'网络关键词不能超过 80 个字符'} : {}; },
 async execute(ctx) {
  const aps=accessPoints(ctx.target); const ap=aps[0]; const state={aps,stage:'discovery',selected:ap.id,channel:ap.channel,handshake:false,dictionary:'common',attempts:0,matched:false};ctx.target.data.wifi=state;
  ctx.phase('扫开频谱，锁定主接入点',10);ctx.log(`RADIO LOCK · ${ap.name} · CH ${ap.channel} · RSSI ${ap.signal} dBm`);ctx.changed();await ctx.wait(450);
  state.stage='capture';ctx.phase('频道已咬住，截取握手',28);ctx.log(`AUTO TUNE CH ${ap.channel} · EAPOL CAPTURE ARMED`);ctx.changed();await ctx.wait(450);
  if(ap.signal < -65){ctx.log(`EAPOL 2/4 · RSSI ${ap.signal} dBm · 信号太弱？拉长窗口，别想甩掉我。`);ctx.phase('整合弱信号，补齐缺帧',35);await ctx.wait(650);}
  state.handshake=true;state.stage='search';ctx.log('EAPOL 4/4 · HANDSHAKE VERIFIED · 四帧到齐，候选空间开门。');ctx.changed();
  for(const dictionary of ['common','extended']){
   state.dictionary=dictionary;state.attempts++;ctx.changed();const total=dictionary==='common'?512:4096;
   for(let i=1;i<=4;i++){await ctx.wait(180);ctx.phase(dictionary==='common'?'常用口令火力覆盖':'扩展字典接管，继续撕开',45+i*10);ctx.log(`KEY CHECK ${Math.round(i/4*total)}/${total} · EAPOL VERIFIED`);}
   if(dictionary===ap.dictionary||dictionary==='extended'){state.matched=true;break;}
   ctx.log('WORDLIST EXHAUSTED · 常用集没咬住。扩展规则已装填，第二轮直接上。');
  }
  state.stage='matched';ctx.changed();return `${ap.name} 已拿下。频道 ${ap.channel}、有效握手、${state.attempts} 轮校验全部对上，无线大门现在听你的。`;
 }
}; export default definition;
