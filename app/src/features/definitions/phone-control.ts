import type { ModuleDefinition } from '../../core/types';
const definition: ModuleDefinition={id:'phone-control',code:'phone',name:'手机远控',category:'设备',description:'确认设备身份，建立会话并管理应用内容。',view:'phone',order:10,
 fields:[],validate(_p,t){return t.domain.length>64?{target:'请输入不超过 64 个字符的设备代号或号码'}:{};},
 async execute(ctx){const model=['Orion S12','Orion Mini 8','Vela X4'][ctx.target.seed%3];ctx.target.data.phone={model,system:'Atlas OS 14.2',connected:false,app:'home',note:'项目交付清单\n09:30 检查设备\n14:00 现场沟通',brightness:70,volume:45};ctx.phase('确认设备',15);ctx.changed();const choice=await ctx.choose(`设备 ${ctx.target.domain} · ${model} · Atlas OS 14.2 · 在线`,[{value:'connect',label:'确认设备并建立连接'},{value:'cancel',label:'取消连接'}]);if(choice==='cancel')throw new Error('连接已取消，可修改目标后重新连接');ctx.log(`DEVICE ${model} · SESSION NEGOTIATION`);await ctx.wait(700);(ctx.target.data.phone as Record<string,unknown>).connected=true;ctx.changed();return `${model} 会话已建立，可打开应用与调整设备设置。`;}
};export default definition;
