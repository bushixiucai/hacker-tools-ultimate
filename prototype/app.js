// 黑客工具箱·搞怪版 —— 全部本地模拟，无任何网络请求
(function(){
'use strict';
const $=s=>document.querySelector(s);
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const pick=a=>a[rnd(0,a.length-1)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fakeIP=()=>`${rnd(11,223)}.${rnd(0,255)}.${rnd(0,255)}.${rnd(1,254)}`;
const hex=n=>Array.from({length:n},()=>'0123456789abcdef'[rnd(0,15)]).join('');

/* ---------- 代码雨 ---------- */
const rain=$('#rain'),rc=rain.getContext('2d');
const chars='アイウエオカキクケコサシスセソ01黑客工具箱搞怪版ABCDEF<>/{}$#';
let cols=[],fs=16;
function resize(){rain.width=innerWidth;rain.height=innerHeight;cols=Array(Math.ceil(rain.width/fs)).fill(0).map(()=>rnd(-50,0));}
addEventListener('resize',resize);resize();
setInterval(()=>{rc.fillStyle='rgba(0,0,0,0.07)';rc.fillRect(0,0,rain.width,rain.height);rc.font=fs+'px monospace';
 cols.forEach((y,i)=>{rc.fillStyle=Math.random()<.05?'#ccffdd':'#1fd655';rc.fillText(pick(chars),i*fs,y*fs);
  cols[i]=(y*fs>rain.height&&Math.random()>.975)?0:y+1;});},50);

/* ---------- 终端 ---------- */
const term=$('#term'),inp=$('#cmd');let busy=false;const hist=[];let hi=0;
function line(cls){const d=document.createElement('div');if(cls)d.className=cls;term.appendChild(d);term.scrollTop=term.scrollHeight;return d;}
async function type(text,cls,speed=12){const d=line(cls);for(const ch of text){d.textContent+=ch;term.scrollTop=term.scrollHeight;await sleep(speed);}}
const out=(t,c)=>{line(c).textContent=t;};
async function logs(arr,delay=[60,220]){for(const a of arr){out(...(Array.isArray(a)?a:[a]));await sleep(rnd(...delay));}}

/* ---------- 进度条 ---------- */
function bar(label,ms){return new Promise(res=>{const wrap=document.createElement('div');wrap.className='bar';
 wrap.innerHTML=`<span></span><div class="track"><div class="fill"></div></div>`;$('#bars').prepend(wrap);
 const s=wrap.querySelector('span'),f=wrap.querySelector('.fill');let p=0;
 const t=setInterval(()=>{p=Math.min(100,p+Math.random()*(100*90/ms)*2);f.style.width=p+'%';s.textContent=`${label}… ${Math.floor(p)}%`;
  if(p>=100){clearInterval(t);s.textContent=`${label}… 100% ✔`;setTimeout(()=>wrap.remove(),4000);res();}},90);});}

/* ---------- 弹窗 ---------- */
const reveals=['开玩笑的啦 😜 你刚刚黑掉的是……你自己的浏览器标签页。','以上全部是本地生成的假数据，没有任何服务器受到伤害 🐹','真正的黑客技能：先学会写 Hello World 👨‍💻','恭喜获得成就：【键盘侠·入门】 🏆'];
async function popup(main){const p=$('#popup'),t=$('#ptext'),s=$('#psub');t.textContent=main;t.dataset.text=main;s.textContent='正在注入载荷……';
 p.classList.remove('hidden');$('#pclose').classList.add('hidden');await sleep(1600);s.textContent=pick(reveals);
 t.textContent='开个玩笑 :)';t.dataset.text='开个玩笑 :)';$('#pclose').classList.remove('hidden');}
$('#pclose').onclick=()=>{$('#popup').classList.add('hidden');inp.focus();};

/* ---------- 地图 ---------- */
const map=$('#map'),mc=map.getContext('2d'),W=map.width,H=map.height;
// 粗略手绘大陆轮廓（归一化坐标）
const lands=[
 [[.05,.18],[.2,.1],[.32,.14],[.3,.3],[.24,.42],[.2,.5],[.15,.4],[.08,.32]], // 北美
 [[.22,.52],[.3,.55],[.33,.68],[.28,.9],[.24,.85],[.22,.65]], // 南美
 [[.44,.14],[.55,.12],[.56,.28],[.47,.32],[.43,.25]], // 欧洲
 [[.44,.36],[.56,.34],[.6,.5],[.55,.78],[.5,.8],[.45,.55]], // 非洲
 [[.56,.1],[.85,.1],[.93,.25],[.85,.42],[.76,.5],[.68,.45],[.6,.38],[.56,.28]], // 亚洲
 [[.8,.65],[.9,.63],[.93,.75],[.85,.8],[.79,.74]] // 澳洲
];
const off=document.createElement('canvas');off.width=W;off.height=H;const oc=off.getContext('2d');
oc.fillStyle='#000a00';oc.fillRect(0,0,W,H);
const mask=document.createElement('canvas');mask.width=W;mask.height=H;const mk=mask.getContext('2d');
mk.fillStyle='#fff';lands.forEach(l=>{mk.beginPath();l.forEach(([x,y],i)=>i?mk.lineTo(x*W,y*H):mk.moveTo(x*W,y*H));mk.closePath();mk.fill();});
const md=mk.getImageData(0,0,W,H).data;
oc.strokeStyle='rgba(51,255,102,.08)';for(let x=0;x<W;x+=40){oc.beginPath();oc.moveTo(x,0);oc.lineTo(x,H);oc.stroke();}for(let y=0;y<H;y+=40){oc.beginPath();oc.moveTo(0,y);oc.lineTo(W,y);oc.stroke();}
oc.fillStyle='#1a8033';for(let y=2;y<H;y+=6)for(let x=2;x<W;x+=6)if(md[(y*W+x)*4]>0)oc.fillRect(x,y,3,3);
const cities=[['纽约',.27,.3],['旧金山',.1,.33],['圣保罗',.3,.72],['伦敦',.47,.2],['莫斯科',.6,.18],['开罗',.54,.38],['开普敦',.52,.76],['迪拜',.62,.42],['孟买',.68,.46],['北京',.8,.28],['东京',.9,.3],['新加坡',.77,.55],['悉尼',.9,.76],['南极企鹅站',.5,.97]];
let route=[],prog=0,tracing=false;
function drawMap(){mc.drawImage(off,0,0);const t=Date.now()/300;
 route.forEach((c,i)=>{const x=c[1]*W,y=c[2]*H;mc.fillStyle='#33ff66';mc.beginPath();mc.arc(x,y,3,0,7);mc.fill();
  if(i<=prog){mc.strokeStyle='rgba(51,255,102,'+(.4+.3*Math.sin(t+i))+')';mc.beginPath();mc.arc(x,y,6+4*Math.sin(t+i),0,7);mc.stroke();mc.fillStyle='#aaffcc';mc.font='11px monospace';mc.fillText(c[0],x+6,y-6);}});
 for(let i=0;i<route.length-1;i++){const seg=Math.min(1,Math.max(0,prog-i));if(seg<=0)break;
  const [a,b]=[route[i],route[i+1]],ax=a[1]*W,ay=a[2]*H,bx=b[1]*W,by=b[2]*H,cx=(ax+bx)/2,cy=Math.min(ay,by)-50;
  mc.strokeStyle='#ff4466';mc.lineWidth=2;mc.setLineDash([6,4]);mc.lineDashOffset=-t*4;mc.beginPath();mc.moveTo(ax,ay);
  for(let s=0;s<=seg;s+=.02){const u=1-s;mc.lineTo(u*u*ax+2*u*s*cx+s*s*bx,u*u*ay+2*u*s*cy+s*s*by);}mc.stroke();mc.setLineDash([]);mc.lineWidth=1;}
 requestAnimationFrame(drawMap);}
drawMap();
async function trace(){if(tracing)return;tracing=true;const pool=cities.slice();route=[];for(let i=0;i<rnd(5,7);i++)route.push(pool.splice(rnd(0,pool.length-1),1)[0]);
 prog=0;$('#hops').innerHTML='';
 for(let i=0;i<route.length;i++){const ip=fakeIP(),ms=rnd(12,480);const d=document.createElement('div');
  d.textContent=`HOP ${String(i+1).padStart(2,'0')}  ${ip.padEnd(16)} ${route[i][0].padEnd(6,'　')}  ${ms}ms`;$('#hops').appendChild(d);
  out(`  [hop ${i+1}] ${ip} → ${route[i][0]} (${ms}ms)`,'dim');
  if(i<route.length-1){const st=prog;for(let k=0;k<=20;k++){prog=st+k/20;await sleep(35);}}}
 tracing=false;return route[route.length-1];}

/* ---------- 命令 ---------- */
const cmds={
 async help(){await logs([['可用命令：','ok'],'  help            显示帮助','  scan <站点>     扫描目标（假的）','  crack           暴力破解密码（更假）','  hack <站点>     入侵目标（假到离谱）','  trace           全球追踪 IP 跳点','  clear           清屏',['提示：以上全部为本地动画，不会访问任何网络。','warn']],[20,40]);},
 async scan(a){const site=a||'example.com';await type(`[*] 正在扫描 ${site} ……`);
  const ports=[[21,'ftp'],[22,'ssh'],[80,'http'],[443,'https'],[3306,'mysql'],[8080,'奶茶订单系统'],[31337,'elite']];
  const p=bar('端口扫描',2500);for(const [n,s] of ports){await sleep(rnd(150,350));out(`  PORT ${String(n).padEnd(6)} ${Math.random()<.6?'OPEN  ':'CLOSED'}  ${s}`,Math.random()<.2?'warn':'');}
  await p;await logs([`[+] 操作系统指纹：Windows 95 + 土豆服务器 v${rnd(1,9)}.${rnd(0,9)}`,[`[!] 发现漏洞 CVE-2026-${rnd(1000,9999)}：管理员密码写在便利贴上`,'warn'],['[✔] 扫描完成（纯属虚构）','ok']]);},
 async crack(){await type('[*] 加载字典 rockyou_搞怪版.txt (14,344,391 条) ……');const b=bar('暴力破解中',4500);
  const pw=['123456','password','iloveyou','qwerty','admin','letmein','dragon','monkey','hunter2'];
  for(let i=0;i<14;i++){out(`  尝试 ${pick(pw)}${rnd(0,99)}  hash=${hex(32)}  ✘`,'dim');await sleep(rnd(150,320));}
  await b;await logs([['[✔] 密码已破解：P@ssw0rd_是我生日','ok'],'[i] 耗时 4.5 秒（因为是假的）']);await popup('权限已获取');},
 async hack(a){const site=a||'mainframe.local';await type(`[*] 正在连接 ${site} 的主机框架……`,'',20);
  await logs([`[*] 绕过防火墙…… 解析为 ${fakeIP()}`,'[*] 注入 SQL：\' OR 1=1; -- 🍕',`[*] 上传 rootkit_${hex(6)}.exe`,'[*] 重新校准量子通量电容器……',['[!] 检测到网管正在喝咖啡，加速！','warn']],[300,600]);
  await Promise.all([bar('解密数据库',3000),bar('下载机密文件',3800)]);
  await logs([`[+] 获取文件：${site}/secret/午餐菜单.xlsx`,['[✔] ACCESS GRANTED','ok']]);await popup('ACCESS GRANTED');},
 async trace(){await type('[*] 启动全球追踪协议……');const end=await trace();await logs([[`[✔] 目标定位：${end[0]}，坐标精确到他家猫的窝`,'ok'],['[i] 实际上什么都没追踪，全是随机生成的 :)','warn']]);},
 async clear(){term.innerHTML='';}
};
async function run(raw){const s=raw.trim();if(!s)return;hist.push(s);hi=hist.length;out(`root@toolbox:~# ${s}`,'ok');
 const [c,...args]=s.split(/\s+/);const f=cmds[c.toLowerCase()];busy=true;inp.disabled=true;
 try{if(f)await f(args.join(' '));else out(`bash: ${c}: 命令未找到。输入 help 查看可用命令。`,'err');}finally{busy=false;inp.disabled=false;inp.focus();}}
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!busy){const v=inp.value;inp.value='';run(v);}
 else if(e.key==='ArrowUp'&&hi>0){inp.value=hist[--hi];}else if(e.key==='ArrowDown'){hi=Math.min(hist.length,hi+1);inp.value=hist[hi]||'';}});
document.querySelectorAll('.quick button').forEach(b=>b.onclick=()=>{if(!busy)run(b.dataset.c);});
document.addEventListener('click',e=>{if(e.target.tagName!=='BUTTON'&&!busy)inp.focus();});
(async()=>{await type('欢迎使用 黑客工具箱·搞怪版 v0.1','ok',30);await type('本工具所有效果均为本地模拟，请放心“入侵”。输入 help 开始。','warn',15);
 if(location.hash==='#demo'){await run('scan pentagon.gov');run('trace');}})();
})();
