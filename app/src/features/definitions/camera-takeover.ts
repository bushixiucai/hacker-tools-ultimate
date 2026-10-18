import type { ModuleDefinition } from '../../core/types';
const definition: ModuleDefinition = {
 id:'camera-takeover',code:'camera',order:4,name:'摄像头接管',category:'观察',view:'camera',continuous:true,description:'发现监控设备，接入通道并检查实时画面。',fields:[],validate(){return {};},
 async execute(ctx) { ctx.phase('发现视频设备',15); ctx.target.devices=['仓储通道','设备机房','装卸区','北侧走廊']; ctx.target.devices.forEach((name,i)=>ctx.log(`DEVICE ${i+1} / ${name} / RTSP 554 / ONLINE`)); await ctx.wait(500); const selected=await ctx.choose('选择接入设备',ctx.target.devices.map((label,i)=>({value:String(i),label:`CH ${i+1} · ${label}`}))); ctx.phase('协商视频通道',55); await ctx.wait(350); ctx.phase('建立视频会话',85); await ctx.wait(400); ctx.target.cameraConnected=true; ctx.target.data.camera={selected:Number(selected)}; ctx.changed(); ctx.log('VIDEO CHANNELS READY / H.264 / 12 FPS'); return '已连接 4 路视频，点击通道放大，控制面板作用于选中通道。'; }
}; export default definition;
