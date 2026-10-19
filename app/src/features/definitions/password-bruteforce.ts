import type { ModuleDefinition } from '../../core/types';
const definition: ModuleDefinition = {
  id: 'password-bruteforce', code: 'audit', order: 3, name: '密码审计', category: '访问', view: 'audit', description: '检查账户响应，使用候选集执行凭据审计。',
  fields: [{ key:'username',label:'账号',required:true,default:'admin' }, {key:'dictionary',label:'候选集',type:'select',default:'common',options:[{value:'common',label:'常用口令 · 3 条'},{value:'extended',label:'扩展口令 · 9 条'},{value:'legacy',label:'历史默认口令 · 6 条'}],help:'候选覆盖范围不同，未匹配时可更换。'}],
  validate(params) { const errors: Record<string,string> = {}; if (!params.username || params.username.length>64) errors.username='请输入 1–64 字符账号'; if(!['common','extended','legacy'].includes(params.dictionary)) errors.dictionary='请选择候选集'; return errors; },
  async execute(ctx,params) {
    ctx.phase('检查账户响应',10); ctx.log(`AUTH ${ctx.target.domain} / USER ${params.username}`); await ctx.wait(350);
    if(params.username!==ctx.target.username) { ctx.target.data.audit={status:'account-missing',count:0}; ctx.changed(); throw new Error('账户响应不存在。请核对账号后重试。'); }
    const candidates=params.dictionary==='common'?['welcome','admin123','cedar-2026']:params.dictionary==='legacy'?['admin','root','123456','password','guest','test']:['welcome','admin123','cedar-2026','orbit-2026','harbor-2026','demo','guest','local','test'];
    for(let i=0;i<candidates.length;i++) { await ctx.wait(240); ctx.phase('检查候选口令',15+75*(i+1)/candidates.length); const matched=candidates[i]===ctx.target.password; ctx.log(`[${i+1}/${candidates.length}] ${candidates[i]} / ${matched?'MATCH':'REJECTED'}`); ctx.target.data.audit={status:matched?'matched':'running',count:i+1,total:candidates.length,username:params.username,password:matched?candidates[i]:undefined}; ctx.changed(); if(matched) { ctx.target.credentials=true; return `匹配成功：${params.username} / ${candidates[i]}，检查 ${i+1} 条候选。`; } if(i===4) { ctx.phase('服务限制尝试，等待冷却',65); ctx.log('429 Retry-After: 2 / throttling applied'); await ctx.wait(2000); } }
    ctx.target.data.audit={status:'exhausted',count:candidates.length,total:candidates.length}; ctx.changed(); throw new Error('候选集已耗尽，未匹配。请选择扩展候选集后重试。');
  },
}; export default definition;
