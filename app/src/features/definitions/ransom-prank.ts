import type { ModuleDefinition } from '../../core/types';
const definition: ModuleDefinition = {
  reveal: '警报撤离，戏份拉满。文件全员平安，只有你的肾上腺素刚跑完马拉松——本次绑走的，其实是十秒钟的冷静。',
 id:'ransom-prank',code:'ransom',order:6,name:'勒索警报',category:'警报',view:'ransom',autoReveal:true,targetRequired:false,description:'拉响最高警报，让屏幕进入失控现场。',
 fields:[{key:'mode',label:'警报强度',type:'select',default:'mild',options:[{value:'mild',label:'标准警戒 · 最长 10 秒'},{value:'movie',label:'电影级 · 最长 15 秒'}]}],validate(params){return ['mild','movie'].includes(params.mode)?{}:{mode:'请选择强度'};},
 async execute(ctx,params){const duration=params.mode==='movie'?15000:10000;const scene=['Documents','Pictures','Projects'][ctx.target.seed%3];ctx.target.data.ransom={deadline:Date.now()+duration,mode:params.mode,scene};ctx.target.locked=true;ctx.changed();ctx.log(`FILE INDEX ${scene} / ACCESS RESTRICTED / 访问封锁，警戒拉满`);
 try{while(ctx.target.locked){const remaining=Number((ctx.target.data.ransom as {deadline:number}).deadline)-Date.now();if(remaining<=0)break;ctx.phase(`封锁倒计时 ${Math.ceil(remaining/1000)} 秒 · 把心跳稳住`,100*(1-remaining/duration));await ctx.wait(Math.min(250,remaining));}}finally{ctx.target.locked=false;ctx.changed();}ctx.log('ACCESS RESTORED / INTEGRITY VERIFIED / 警报撤离，文件全员归队');return '全员归队，文件一根汗毛都没少。刚才那阵仗，够拍三部灾难片。';}
};export default definition;
