import type { ModuleDefinition } from '../../core/types';
const definition: ModuleDefinition = {
  reveal: '锁刚投降，你就已经在庆功宴上了。现在宣布：你是候选词典首席摇号大师，下一把钥匙建议用来打开冰箱。',
  id: 'password-bruteforce', code: 'audit', order: 3, name: '密码审计', category: '访问', view: 'audit', description: '账号交给引擎，候选扩展、冷却重试自动打到底。',
  fields: [{ key:'username',label:'账号',required:true,default:'admin' }, {key:'dictionary',label:'候选集',type:'select',default:'common',options:[{value:'common',label:'常用口令 · 3 条'},{value:'extended',label:'扩展口令 · 9 条'},{value:'legacy',label:'历史默认口令 · 6 条'}],help:'起始候选不同，未命中将自动扩展覆盖。'}],
  validate(params) { const errors: Record<string,string> = {}; if (!params.username || params.username.length>64) errors.username='请输入 1–64 字符账号'; if(!['common','extended','legacy'].includes(params.dictionary)) errors.dictionary='请选择候选集'; return errors; },
  async execute(ctx,params) {
    ctx.phase('账户响应已捕获，准备撞开凭据链',10); ctx.log(`AUTH ${ctx.target.domain} / USER ${params.username}`); await ctx.wait(350);
    if(params.username!==ctx.target.username) { ctx.target.data.audit={status:'account-missing',count:0}; ctx.changed(); throw new Error('这个账号没在目标响应里露面。账号不存在，再猛的候选也敲不开空气。'); }
    const initial=params.dictionary==='common'?['welcome','admin123','cedar-2026']:params.dictionary==='legacy'?['admin','root','123456','password','guest','test']:['welcome','admin123','cedar-2026','orbit-2026','harbor-2026','demo','guest','local','test'];
    const candidates=[...new Set([...initial,'orbit-2026','harbor-2026','cedar-2026'])];
    let expanded=false;
    for(let i=0;i<candidates.length;i++) { if(i>=initial.length&&!expanded){expanded=true;ctx.log('INITIAL SET EXHAUSTED / 首轮没开门，自动切入扩展候选');} await ctx.wait(240); ctx.phase('候选轮转，凭据正在现形',15+75*(i+1)/candidates.length); const matched=candidates[i]===ctx.target.password; ctx.log(`[${i+1}/${candidates.length}] ${candidates[i]} / ${matched?'MATCH / 凭据链已贯通':'REJECTED / 自动换下一组'}`); ctx.target.data.audit={status:matched?'matched':'running',count:i+1,total:candidates.length,username:params.username,password:matched?candidates[i]:undefined}; ctx.changed(); if(matched) { ctx.target.credentials=true; return `凭据到手：${params.username} / ${candidates[i]}。${i+1} 条候选，门锁先认输了。`; } if(i===4) { ctx.phase('限流器亮红灯，冷却后继续压进',65); ctx.log('429 Retry-After: 2 / 不跟限流硬碰，计时后自动恢复'); await ctx.wait(2000); } }
    ctx.target.data.audit={status:'exhausted',count:candidates.length,total:candidates.length}; ctx.changed(); throw new Error('扩展候选已打完，凭据仍未命中。目标这道锁，暂时守住了。');
  },
}; export default definition;
