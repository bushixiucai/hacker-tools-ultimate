import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const MODULES = ['site-takeover','port-scan','password-bruteforce','camera-takeover','satellite-trace','ransom-prank','ddos-panel','wifi-crack','hacker-typer','phone-control','wallet-search','situation-board'];
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('htb.disclaimer.v1', '1')); });
async function open(page: Page, id: string) {
  if (!(await page.locator('#terminal-page').isVisible())) await page.locator('#terminal-button').click();
  await page.locator(`#module-nav [data-module="${id}"]`).click();
}
async function setFields(page: Page, params: Record<string,string>) {
  for (const [name, value] of Object.entries(params)) {
    const input = page.locator(`#module-form [name="${name}"]`);
    const details = input.locator('xpath=ancestor::details');
    if (await details.count()) await details.evaluate(node => (node as HTMLDetailsElement).open = true);
    if (await input.evaluate(node => node.tagName === 'SELECT')) await input.selectOption(value); else await input.fill(value);
  }
}
async function run(page: Page, id: string, target = 'cedar.example', params: Record<string,string> = {}) {
  await open(page,id);
  const input = page.locator('#module-form [name=target]'); if (await input.count()) await input.fill(target);
  await setFields(page,params);
  const before = await page.locator('#task-list [data-task-id]').count();
  await page.locator('#module-form button[type=submit]').click();
  await expect(page.locator('#task-list [data-task-id]')).toHaveCount(before+1);
  return page.locator('#task-list [data-task-id]').first();
}
async function choice(page: Page, value: string) {
  const input = page.getByRole('textbox',{name:'终端输入'});
  await expect(page.locator('#choice-panel button').first()).toBeVisible();
  await input.fill(`select ${value}`); await input.press('Enter');
}
async function done(task: Locator) { await expect(task).toContainText('完成',{timeout:20_000}); }
async function cleanPage(page: Page) {
  const errors: string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  const external: string[]=[];
  await page.route('**/*',route=> {
    const url=new URL(route.request().url());
    if (url.hostname==='127.0.0.1'||url.protocol==='data:'||url.protocol==='blob:') return route.continue();
    external.push(url.href); return route.abort();
  });
  return () => { expect(errors).toEqual([]); expect(external).toEqual([]); };
}

test('Original visual structure has twelve independent entry cards and no shared target bar',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#rain')).toBeVisible();
  await expect(page.locator('.classic-header h1.glitch')).toHaveText('黑客工具箱');
  await expect(page.locator('#cards [data-module]')).toHaveCount(12);
  await expect(page.locator('.sidebar,#target-select,#target-form')).toHaveCount(0);
  await expect(page.locator('#quick-actions [data-quick]')).toHaveCount(20);
  await page.locator('#cards [data-module="port-scan"]').click();
  await expect(page.locator('#module-form [name=target]')).toHaveValue('');
  await expect(page.locator('#task-list [data-task-id]')).toHaveCount(0);
  const left=await page.locator('.terminal-column').boundingBox(),right=await page.locator('.operation-column').boundingBox();
  expect(left).toBeTruthy();expect(right).toBeTruthy();expect(right!.x).toBeGreaterThanOrEqual(left!.x+left!.width-1);
  await page.screenshot({path:'../output/playwright/desktop-terminal.png',fullPage:true});
});

test('Empty targets and invalid ranges are rejected without task mutation; scan report is inspectable',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');await open(page,'port-scan');
  await page.locator('#module-form button[type=submit]').click();await expect(page.locator('#form-errors')).not.toBeEmpty();
  await page.locator('#module-form [name=target]').fill('cedar.example');await setFields(page,{preset:'custom',ports:'0,65536'});
  await page.locator('#module-form button[type=submit]').click();await expect(page.locator('#task-list [data-task-id]')).toHaveCount(0);
  await setFields(page,{ports:'22,443,65000'});await page.locator('#module-form button[type=submit]').click();
  await done(page.locator('#task-list [data-task-id]').first());
  await expect(page.locator('#module-detail')).toContainText('65000');await expect(page.locator('#module-detail')).toContainText('closed');
  await expect(page.locator('#reveal-dialog')).toBeHidden();check();
});

test('Password audit fails causally and retry starts fresh without another tool prerequisite',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');
  const failed=await run(page,'password-bruteforce','cedar.example',{username:'nobody',dictionary:'extended'});
  await expect(failed).toContainText('账户响应不存在');
  await page.locator('#new-run').click();await expect(page.locator('#module-form [name=target]')).toHaveValue('');
  const success=await run(page,'password-bruteforce','cedar.example',{username:'admin',dictionary:'extended'});await done(success);
  await expect(success).toContainText('匹配');await page.locator('#end-tool').click();await expect(page.locator('#reveal-dialog')).toBeVisible();check();
});

test('Pending choices survive tool switching while inputs and histories stay isolated',async({page})=>{
  await page.goto('/');const phone=await run(page,'phone-control','device-7');await expect(page.locator('#choice-panel')).toContainText('确认设备');
  await open(page,'port-scan');await expect(page.locator('#module-form [name=target]')).toHaveValue('');await expect(page.locator('#task-list [data-task-id]')).toHaveCount(0);
  await open(page,'phone-control');await expect(page.locator('#choice-panel')).toContainText('确认设备');await expect(phone).toContainText('运行中');
  await choice(page,'connect');await done(phone);
  await open(page,'port-scan');const task=await run(page,'port-scan','other.example');await done(task);
  await open(page,'phone-control');await expect(page.locator('#task-list [data-task-id]')).toHaveCount(1);
});

test('Website uses public metadata when readable, two choices, editable CMS and explicit ending',async({page})=>{
  const metadataRequests:string[]=[];await page.route('https://cors-fixture.example.org/**',route=>{metadataRequests.push(route.request().url());return route.fulfill({status:200,contentType:'text/html',body:'<html lang="zh-CN"><head><title>青杉生活</title><meta name="description" content="日常用品与家居精选"></head><body><h1>青杉生活</h1></body></html>'});});
  await page.goto('/');const task=await run(page,'site-takeover','https://cors-fixture.example.org/zh-CN/catalog?season=autumn');
  await choice(page,'archive');await choice(page,'session');await choice(page,'admin');await choice(page,'session');await done(task);
  await page.getByRole('button',{name:'进入后台',exact:true}).click();const browser=page.locator('dialog.classic-browser');await expect(browser).toBeVisible();
  expect(metadataRequests).toContain('https://cors-fixture.example.org/zh-CN/catalog?season=autumn');await expect(browser.getByLabel('站点标题')).toHaveValue('青杉生活');const announcement=browser.getByLabel('站点公告');const original=await announcement.inputValue();await announcement.fill('秋季新品现已发布');
  await browser.getByRole('button',{name:'保存修改',exact:true}).click();await browser.getByRole('button',{name:'刷新前台',exact:true}).click();
  await expect(browser).toContainText('秋季新品现已发布');await page.screenshot({path:'../output/playwright/cms-browser.png',fullPage:true});await expect(page.locator('#reveal-dialog')).toBeHidden();
  await browser.getByRole('button',{name:'恢复原始内容',exact:true}).click();await browser.getByRole('button',{name:'刷新前台',exact:true}).click();await expect(browser).toContainText(original);
  await browser.getByRole('button',{name:'完成演示',exact:true}).click();await expect(page.locator('#reveal-dialog')).toBeVisible();
});

test('Camera has four local videos, selected-channel controls and no device requests',async({page})=>{
  const check=await cleanPage(page);await page.addInitScript(()=>{Object.defineProperty(window,'__deviceAccess',{value:0,writable:true});if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{(window as unknown as {__deviceAccess:number}).__deviceAccess++;return Promise.reject(new Error('Unexpected device access'));};});
  await page.goto('/');await run(page,'camera-takeover','仓储东区');await choice(page,'0');
  await expect(page.locator('.camera-grid video')).toHaveCount(4);await page.screenshot({path:'../output/playwright/camera-grid.png',fullPage:true});const video=page.locator('.camera-grid video').first();
  await expect.poll(()=>video.evaluate((node:HTMLVideoElement)=>node.readyState)).toBeGreaterThanOrEqual(2);
  await page.getByRole('button',{name:'下一通道',exact:true}).click();await page.getByRole('button',{name:'放大',exact:true}).click();
  await page.getByRole('button',{name:/夜视/}).click();
  expect(await page.evaluate(()=>(window as unknown as {__deviceAccess:number}).__deviceAccess)).toBe(0);
  await page.locator('#end-tool').click();await expect(page.locator('#reveal-dialog')).toBeVisible();check();
});

test('Satellite requires coherent sampling then exposes continuous map levels',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');const task=await run(page,'satellite-trace','13800138000');
  await choice(page,'stable');await choice(page,'confirm');await expect(page.locator('.shell-output')).toContainText('Precision threshold');
  await expect(page.locator('#module-detail')).toContainText('采样 1');await choice(page,'sample');await expect(page.locator('#module-detail')).toContainText('采样 2');await choice(page,'sample');await choice(page,'confirm');await done(task);
  for(const label of ['全球','城市','街区'])await page.getByRole('button',{name:label,exact:true}).click();check();
});

test('Traffic parameters affect response, pause/resume and graceful stop',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');const task=await run(page,'ddos-panel','edge.example',{nodes:'4',rate:'80'});
  await expect(page.getByRole('button',{name:'应用参数',exact:true})).toBeVisible();await page.getByRole('button',{name:'暂停 / 恢复',exact:true}).click();
  await page.getByRole('button',{name:'暂停 / 恢复',exact:true}).click();await page.getByRole('button',{name:'停止负载',exact:true}).click();await done(task);check();
});

test('Ransom requires confirmation and Escape restores and reveals immediately',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');await run(page,'ransom-prank','');await choice(page,'start');
  await expect(page.getByRole('button',{name:/立即解除/})).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#reveal-dialog')).toBeVisible();check();
});

test('WiFi wrong channel cannot progress, valid handshake and candidate set complete',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');const task=await run(page,'wifi-crack','Office');await choice(page,'ap-0');
  const prompt=await page.locator('#choice-panel').innerText();const channel=prompt.match(/频道 (\d+) · 目标频道/)?.[1];expect(channel).toBeTruthy();
  await choice(page,channel==='1'?'6':'1');await choice(page,'stable');await expect(page.locator('.shell-output')).toContainText('NO EAPOL');
  await choice(page,channel!);await choice(page,'stable');await choice(page,'extended');await done(task);check();
});

test('Typer advances only with input and phone notes/settings keep actual state',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');await run(page,'hacker-typer','',{scene:'diagnostic'});
  const metrics=page.getByTestId('typer-metrics');await expect(metrics).toBeVisible();const before=(await metrics.textContent())!;await page.waitForTimeout(700);await expect(metrics).toHaveText(before);
  await page.getByRole('button',{name:'推进代码',exact:true}).click();await expect(metrics).not.toHaveText(before);
  const phone=await run(page,'phone-control','device-9');await choice(page,'connect');await done(phone);
  await page.getByRole('button',{name:/备忘录/}).click();await page.getByTestId('phone-note').fill('现场检查已完成');await page.getByRole('button',{name:'保存备忘录',exact:true}).click();
  await expect(page.getByTestId('phone-note')).toHaveValue('现场检查已完成');check();
});

test('Wallet validates chain address and opens assets and confirmed transaction records',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');await open(page,'wallet-search');await page.locator('#module-form [name=target]').fill('bad-address');await page.locator('#module-form button[type=submit]').click();await expect(page.locator('#form-errors')).not.toBeEmpty();
  const task=await run(page,'wallet-search','NVA-7F2A9C18',{strategy:'extended'});await choice(page,'run');await done(task);
  await page.getByRole('button',{name:'交易记录',exact:true}).click();await expect(page.locator('#module-detail')).toContainText('已确认');await page.getByRole('button',{name:'资产',exact:true}).click();await expect(page.locator('#module-detail')).toContainText('Nova');check();
});

test('Board supports defense scene, filtering, focus and pause',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');await run(page,'situation-board','SEC-NORTH',{scenario:'defense'});
  await expect(page.getByTestId('board-map')).toBeVisible();await page.getByTestId('board-filter').selectOption('high');await page.getByTestId('board-focus').selectOption('N2');
  await page.getByRole('button',{name:'暂停推进',exact:true}).click();await page.getByRole('button',{name:'恢复推进',exact:true}).click();check();
});

test('Shell escapes user input and Ctrl+C cancels the actual waiting task',async({page})=>{
  const check=await cleanPage(page);await page.goto('/');await run(page,'phone-control','device-11');
  const input=page.getByRole('textbox',{name:'终端输入'});await input.fill('<img src=x onerror=alert(1)>');await input.press('Enter');
  await expect(page.locator('.shell-output')).toContainText('<img src=x onerror=alert(1)>');await expect(page.locator('.shell-output img')).toHaveCount(0);
  await input.press('Control+c');await expect(page.locator('#task-list [data-task-id]').first()).toContainText('已中断');await expect(page.locator('#choice-panel button')).toHaveCount(0);check();
});

for(const viewport of [{width:320,height:740},{width:390,height:844},{width:844,height:390}])test(`Mobile layout keeps all tools operable at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  for(const id of MODULES){await open(page,id);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id).toBe(true);await expect(page.locator('#module-form button[type=submit]')).toBeVisible();}
  await done(await run(page,'port-scan','mobile.example',{preset:'custom',ports:'22,443'}));
  const phone=await run(page,'phone-control','mobile-device');await choice(page,'connect');await done(phone);await page.screenshot({path:`../output/playwright/phone-home-${viewport.width}.png`,fullPage:true});
  await page.getByRole('button',{name:/备忘录/}).click();await page.getByTestId('phone-note').fill('移动端检查');await page.getByRole('button',{name:'保存备忘录',exact:true}).click();await expect(page.getByTestId('phone-note')).toHaveValue('移动端检查');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const pill=page.locator('#sim-pill');await expect(pill).toBeVisible();expect(await pill.evaluate(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})).toBe(true);
  await page.screenshot({path:`../output/playwright/mobile-${viewport.width}.png`,fullPage:true});
});

test('First visit disclosure can be accepted and reopened',async({page})=>{
  await page.addInitScript(()=>localStorage.removeItem('htb.disclaimer.v1'));await page.goto('/');await expect(page.locator('.disclaimer')).toBeVisible();await page.locator('.disclaimer button.accept').click();await expect(page.locator('.disclaimer')).toHaveCount(0);await page.locator('#sim-pill').click();await expect(page.locator('.disclaimer')).toBeVisible();
});

test('Report image exports and finite replay is independent of target network reads',async({page})=>{
  await page.goto('/');await done(await run(page,'port-scan','report.example',{preset:'custom',ports:'22,443'}));
  const downloaded=page.waitForEvent('download');await page.locator('#share-image').click();const download=await downloaded;expect(download.suggestedFilename()).toMatch(/\.png$/);const image=await readFile((await download.path())!);expect(image.length).toBeGreaterThan(5000);expect(image.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  await page.locator('#share-link').click();const link=await page.getByRole('textbox',{name:'回放链接'}).inputValue();expect(link).toContain('#/replay/');
  const external:string[]=[];await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1'||['blob:','data:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
  await page.goto(link);await expect(page.locator('#replay-page')).toContainText('过程回放');await page.getByRole('button',{name:'播放回放',exact:true}).click();await expect(page.locator('#replay-page')).toContainText('结果摘要',{timeout:15_000});await page.getByRole('button',{name:'结束回放',exact:true}).click();await expect(page.locator('#reveal-dialog')).toBeVisible();expect(external).toEqual([]);
});

test('Continuous report uses a snapshot and corrupt links offer recovery',async({page})=>{
  await page.goto('/');await run(page,'situation-board','OPS',{scenario:'attack'});await expect(page.getByTestId('board-map')).toBeVisible();await page.locator('#share-link').click();const link=await page.getByRole('textbox',{name:'回放链接'}).inputValue();await page.goto(link);await expect(page.locator('#replay-page')).toContainText('成果报告');await page.getByRole('button',{name:'结束回放',exact:true}).click();await page.locator('#reveal-dialog button').click();
  await page.goto('/#/replay/not-valid');await expect(page.locator('#replay-page .error')).not.toBeEmpty();await page.getByRole('button',{name:'返回首页',exact:true}).click();await expect(page.locator('#cards')).toBeVisible();
});


for (const behavior of ['denied', 'timeout']) test(`Website ${behavior} metadata silently follows its independent scenario`,async({page})=>{
  await page.route(`https://metadata-${behavior}.example.org/**`,async route=>{
    if(behavior==='denied') { await route.abort(); return; }
    await new Promise(resolve=>setTimeout(resolve,5000));
    await route.fulfill({status:200,contentType:'text/html',body:'<title>Delayed response</title>'}).catch(()=>{});
  });
  await page.goto('/');const task=await run(page,'site-takeover',`https://metadata-${behavior}.example.org`);
  await choice(page,'api');await choice(page,'session');await done(task);
  await expect(page.locator('#form-errors')).toBeEmpty();await expect(page.locator('.shell-output')).not.toContainText(/降级|读取失败|fallback/i);
  await page.getByRole('button',{name:'进入后台',exact:true}).click();await expect(page.locator('dialog.classic-browser')).toBeVisible();
});

for(const [id,input,params] of [
  ['ddos-panel','stop.example',{nodes:'2',rate:'20'}],
  ['hacker-typer','',{scene:'diagnostic'}],
  ['situation-board','STOP-OPS',{scenario:'defense'}],
] as const)test(`Global stop gracefully completes ${id} and fresh runs have no stale state`,async({page})=>{
  await page.goto('/');const task=await run(page,id,input,params);await expect(page.locator('#stop-task')).toBeVisible();await page.locator('#stop-task').click();await done(task);
  await expect(page.locator('#reveal-dialog')).toBeHidden();await page.locator('#new-run').click();
  const target=page.locator('#module-form [name=target]');if(await target.count())await expect(target).toHaveValue('');
  await page.locator('#end-tool').click();await expect(page.locator('#reveal-dialog')).toBeVisible();await page.locator('#reveal-dialog button').click();
});

test('Ending a pending tool cancels its choice and permits a clean subsequent session',async({page})=>{
  await page.goto('/');const old=await run(page,'phone-control','old-device');await expect(page.locator('#choice-panel button')).not.toHaveCount(0);
  await page.locator('#end-tool').click();await expect(page.locator('#reveal-dialog')).toBeVisible();await page.locator('#reveal-dialog button').click();
  await expect(old).toContainText('已中断');await expect(page.locator('#choice-panel button')).toHaveCount(0);await expect(page.locator('#module-form [name=target]')).toHaveValue('');
  const fresh=await run(page,'phone-control','new-device');await choice(page,'connect');await done(fresh);await expect(page.getByTestId('phone-screen')).toContainText(/\d{2}:\d{2}/);
});

test('Ended camera sessions release media and do not restart on return',async({page})=>{
  await page.goto('/');await run(page,'camera-takeover','camera-closed');await choice(page,'0');await expect(page.locator('.camera-grid video')).toHaveCount(4);
  await page.locator('#end-tool').click();await page.locator('#reveal-dialog button').click();await expect(page.locator('#module-detail video')).toHaveCount(0);
  await open(page,'port-scan');await open(page,'camera-takeover');await expect(page.locator('#module-detail video')).toHaveCount(0);await expect(page.locator('#module-detail')).toContainText('会话已结束');
});

test('Background ransom restoration reveals when its tool is reopened',async({page})=>{
  await page.goto('/');await run(page,'ransom-prank','');await choice(page,'start');await expect(page.getByRole('button',{name:/立即解除/})).toBeVisible();
  await open(page,'port-scan');await expect(page.locator('#reveal-dialog')).toBeHidden();await expect(page.locator('#running-note')).toHaveText('',{timeout:15_000});
  await open(page,'ransom-prank');await expect(page.locator('#reveal-dialog')).toBeVisible();await expect(page.locator('#reveal-dialog')).toContainText('没有读取、加密或修改');
});

test('Report Escape removes the dialog and allows another report to open',async({page})=>{
  await page.goto('/');await done(await run(page,'port-scan','report-close.example',{preset:'custom',ports:'22'}));
  await page.locator('.task-section summary').click();await page.getByRole('button',{name:'查看报告',exact:true}).click();await expect(page.locator('dialog.report-dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('dialog.report-dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'查看报告',exact:true}).click();await expect(page.locator('dialog.report-dialog')).toHaveCount(1);await page.locator('dialog.report-dialog').getByRole('button',{name:'关闭',exact:true}).click();await expect(page.locator('dialog.report-dialog')).toHaveCount(0);
});

test('Replay completion automatically reveals and a second playback restarts the presentation',async({page})=>{
  await page.goto('/');await done(await run(page,'port-scan','replay-auto.example',{preset:'custom',ports:'22'}));await page.locator('#share-link').click();const link=await page.getByRole('textbox',{name:'回放链接'}).inputValue();await page.goto(link);
  await page.getByRole('button',{name:'播放回放',exact:true}).click();await expect(page.locator('#reveal-dialog')).toBeVisible({timeout:15_000});await page.locator('#reveal-dialog button').click();
  await page.getByRole('button',{name:'播放回放',exact:true}).click();await expect(page.locator('#reveal-dialog')).toBeHidden();await expect(page.locator('#reveal-dialog')).toBeVisible({timeout:15_000});
});

test('Mobile CMS uses touch-sized controls in a readable native browser dialog',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await run(page,'site-takeover','mobile-shop.example');await choice(page,'admin');await choice(page,'session');await page.getByRole('button',{name:'进入后台',exact:true}).click();
  const dialog=page.locator('dialog.classic-browser');await expect(dialog).toBeVisible();
  const dimensions=await dialog.locator('button').evaluateAll(buttons=>buttons.map(button=>({text:button.textContent,height:button.getBoundingClientRect().height,width:button.getBoundingClientRect().width})));
  for(const control of dimensions){expect(control.height,control.text??'').toBeGreaterThanOrEqual(44);expect(control.width,control.text??'').toBeGreaterThanOrEqual(44);}
  expect(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);await page.screenshot({path:'../output/playwright/cms-mobile-390.png',fullPage:true});
  await dialog.getByRole('button',{name:'完成演示',exact:true}).click();await expect(page.locator('#reveal-dialog')).toBeVisible();
});


test('Review: camera channel settings and status stay scoped to the selected feed',async({page})=>{
  await page.goto('/');await run(page,'camera-takeover','仓储东区');await choice(page,'0');
  await expect.poll(()=>page.locator('.camera-grid video').first().evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
  await page.getByRole('button',{name:'放大',exact:true}).click();await page.getByRole('button',{name:'夜视开关',exact:true}).click();
  const before=await page.locator('.camera-grid video').first().getAttribute('style');
  await page.getByRole('button',{name:'下一通道',exact:true}).click();
  await expect(page.locator('.camera-grid video').first()).toHaveAttribute('style',before!);
  await expect(page.locator('#module-detail .detail-feedback')).toContainText('CH 02');
  await expect(page.locator('.camera-grid video').nth(1)).not.toHaveAttribute('style',/brightness\(1\.3/);
});

test('Review: stopped traffic clears error metrics and disables session controls',async({page})=>{
  await page.goto('/');const task=await run(page,'ddos-panel','edge.example',{preset:'high'});
  await expect(page.locator('.traffic-response')).toContainText('429');await page.getByRole('button',{name:'停止负载',exact:true}).click();await done(task);
  await expect(page.locator('.detail-metrics article').nth(2).locator('strong')).toHaveText('0%');
  for(const name of ['应用参数','暂停 / 恢复','停止负载'])await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();
});

test('Review: phone wallpaper resolves and mobile editor remains readable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');const task=await run(page,'phone-control','review-device');await choice(page,'connect');await done(task);
  const url=await page.getByTestId('phone-screen').evaluate(n=>getComputedStyle(n).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]);
  expect(url).toContain('/media/phone-lake.webp');expect(url).not.toContain('/assets/media/');expect((await page.request.get(url!)).ok()).toBe(true);
  await page.getByRole('button',{name:/备忘录/}).click();expect(await page.locator('.extra-phone-screen textarea').evaluate(n=>getComputedStyle(n).fontSize)).toBe('16px');
});

test('Review: board focus and filters survive switching and typer idles at zero',async({page})=>{
  await page.goto('/');await run(page,'situation-board','review-center');await page.getByTestId('board-filter').selectOption('high');await page.getByTestId('board-focus').selectOption('N2');
  await open(page,'port-scan');await open(page,'situation-board');await expect(page.getByTestId('board-filter')).toHaveValue('high');await expect(page.getByTestId('board-focus')).toHaveValue('N2');await expect(page.locator('#module-detail .extra-row')).toContainText('N2');
  await run(page,'hacker-typer','');await page.getByRole('button',{name:'推进代码',exact:true}).click();await expect(page.getByTestId('typer-metrics')).toContainText('1');await expect(page.getByTestId('typer-metrics')).toContainText('0 行/s',{timeout:5000});
  await page.locator('#stop-task').click();await expect(page.getByRole('button',{name:'推进代码',exact:true})).toBeDisabled();
});

test('Review: lower home cards open at the input area and landscape CMS stays touch sized',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('#cards [data-module="wallet-search"]').click();
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);expect((await page.locator('#module-form').boundingBox())!.y).toBeGreaterThan(0);
  const task=await run(page,'site-takeover','touch-shop.example');await choice(page,'admin');await choice(page,'session');await done(task);await page.getByRole('button',{name:'进入后台',exact:true}).click();await page.setViewportSize({width:844,height:390});
  const dimensions=await page.locator('dialog.classic-browser button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));expect(dimensions.length).toBeGreaterThan(4);expect(dimensions.every(height=>height>=44)).toBe(true);
});


test('Review: fullscreen board keeps its disclosure accessible',async({page,browserName})=>{
  test.skip(browserName==='webkit','iPhone browser does not expose arbitrary element fullscreen');
  await page.goto('/');await run(page,'situation-board','review-center');await page.getByRole('button',{name:'全屏查看',exact:true}).click();
  await expect(page.locator('#fullscreen-disclosure')).toBeVisible();await page.locator('#fullscreen-disclosure').click();await expect(page.locator('.disclaimer')).toBeVisible();
  expect(await page.evaluate(()=>document.fullscreenElement?.contains(document.querySelector('.disclaimer')))).toBe(true);
  await page.getByRole('button',{name:'我已了解，进入工具'}).click();await page.evaluate(()=>document.exitFullscreen());await expect(page.locator('#fullscreen-disclosure')).toHaveCount(0);
});
