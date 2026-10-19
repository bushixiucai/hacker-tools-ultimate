import type { ModuleDefinition } from '../../core/types';
const definition: ModuleDefinition = {
  reveal: '四路镜头，零位奥斯卡。原来你不是潜入者，是这场赛博监控大片的总导演——演员没喊卡，你先把夜视开成了蹦迪灯。',
 id:'camera-takeover',code:'camera',order:4,name:'摄像头接管',category:'观察',view:'camera',continuous:true,description:'四路画面一起拉进来，镜头今晚听你的。',fields:[],validate(){return {};},
 async execute(ctx) { ctx.phase('镜头阵列已露头，准备接管视野',15); ctx.target.devices=['仓储通道','设备机房','装卸区','北侧走廊']; ctx.target.devices.forEach((name,i)=>ctx.log(`DEVICE ${i+1} / ${name} / RTSP 554 / ONLINE`)); await ctx.wait(500); ctx.phase('四路并发协商，不给盲区留位置',55); ctx.log('RTSP SESSION / CH 01–04 / 自动选择主通道 CH 01'); await ctx.wait(550); ctx.phase('视频链路点亮，视野正在展开',85); await ctx.wait(500); ctx.target.cameraConnected=true; ctx.target.data.camera={selected:0}; ctx.changed(); ctx.log('VIDEO CHANNELS READY / H.264 / 12 FPS / 四路视野，全部上线'); return '四路全亮，盲区下班。点开任意镜头，云台、变焦、夜视任你调度。'; }
}; export default definition;
