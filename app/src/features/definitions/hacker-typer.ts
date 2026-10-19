import type { ModuleDefinition } from '../../core/types';
import { sceneLines } from '../extraData';
const definition: ModuleDefinition = {
 id:'hacker-typer',code:'type',name:'黑客打字机',category:'终端',description:'选择工作场景，以键盘推进代码、检查与监测输出。',view:'typer',order:9,continuous:true,targetRequired:false,
 fields:[{key:'scene',label:'工作场景',type:'select',default:'diagnostic',options:[{value:'diagnostic',label:'系统诊断'},{value:'analysis',label:'程序分析'},{value:'network',label:'网络监测'}]}],
 validate(p){return sceneLines[p.scene]?{}:{scene:'请选择工作场景'};},
 async execute(ctx,p){const s={scene:p.scene,count:0,processed:0,rate:0,lastInputAt:0,stop:false};ctx.target.data.typer=s;ctx.phase('等待键盘输入',0);ctx.changed();
 while(!s.stop&&!ctx.target.data.stop){await ctx.wait(100);if(s.stop||ctx.target.data.stop)break;if(ctx.target.data.paused){if(s.rate){s.rate=0;ctx.changed();}continue;}const previous=s.processed;const previousRate=s.rate;const count=Math.min(s.count,s.processed+12);while(s.processed<count){const n=s.processed++; const lines=sceneLines[s.scene];ctx.log(`${String(Math.floor(n/lines.length)+1).padStart(3,'0')}:${String(n%lines.length+1).padStart(2,'0')} ${lines[n%lines.length].replace(/sample|graph|snapshot|stream/g, token=>`${token}_${Math.floor(n/lines.length)+1}`)}`);}s.rate=Date.now()-s.lastInputAt<1000?Math.min(120,(s.processed-previous)*10||s.rate):0;if(s.processed!==previous){ctx.phase('工作会话运行中',Math.min(95,10+Math.floor(s.processed/5)));ctx.changed();}else if(s.rate!==previousRate)ctx.changed();}
 s.rate=0;ctx.changed();return `会话已关闭，输出 ${s.processed} 行，检查 ${Math.floor(s.processed/7)} 个工作单元。`;}
};export default definition;
