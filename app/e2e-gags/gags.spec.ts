import { test, expect } from '@playwright/test';

test.beforeEach(async ({page})=>{await page.addInitScript(()=>localStorage.setItem('htb.disclaimer.v1','1'));});

test('All twenty quick actions validate their own inputs and produce a distinct conclusion',async({page})=>{
  const errors:string[]=[];const external:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname==='127.0.0.1'||['data:','blob:'].includes(url.protocol))return route.continue();external.push(url.href);return route.abort();});
  await page.goto('/');await expect(page.locator('#quick-actions [data-quick]')).toHaveCount(20);
  const titles=new Set<string>();const reports=new Set<string>();
  const evidence=['[ASSETS]','Cache-Control:','/admin →','[ENTROPY]','[FORMAT]','[AUTH]','[EXPOSURE]','[ROLE]','[BASELINE]','[CHANNEL 1]','[EAPOL]','[AP 1]','[INTERFACE]','[ARCH]','[OFFSET AFTER]','[HOST]','[SUBJECT]','[HOP 1]','[JITTER]','[SUCCESS]'];
  for(let index=0;index<20;index++){
    const trigger=page.locator(`#quick-actions [data-quick="${index}"]`);const title=(await trigger.innerText()).trim();titles.add(title);expect(title).not.toMatch(/玄学|搞怪|意念/);await trigger.click();
    const dialog=page.locator('dialog.quick-dialog');await expect(dialog).toBeVisible();await expect(dialog.locator('h2')).toHaveText(title);
    const field=dialog.getByRole('textbox',{name:'目标或样本'});
    if(await field.count()){
      await dialog.getByRole('button',{name:'开始检查',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('请输入');
      await field.fill('sample.example');
    }
    await dialog.getByRole('button',{name:'开始检查',exact:true}).click();
    await dialog.getByRole('button',{name:index%2?'深入核对':'标准核对',exact:true}).click();
    await expect(dialog.locator('.quick-output')).toContainText('[STATUS]');await expect(dialog.locator('.quick-output')).toContainText('[CONCLUSION]');
    const report=(await dialog.locator('.quick-output').innerText()).split('\n').filter(line=>!/^\[(INIT|TARGET|READY|PROFILE)\]/.test(line)).join('\n').trim();reports.add(report);
    expect(report).toContain(evidence[index]);await expect(page.locator('#reveal-dialog')).toBeHidden();
    await dialog.getByRole('button',{name:'查看检查结论',exact:true}).click();await expect(page.locator('#reveal-dialog')).toBeVisible();await expect(page.locator('#reveal-dialog')).toContainText(title);
    await page.locator('#reveal-dialog button').click();
  }
  expect(titles.size).toBe(20);expect(reports.size).toBe(20);expect(errors).toEqual([]);expect(external).toEqual([]);
});

test('Quick action cancel and mobile dialog are operable without overflow',async({page})=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/');
  await page.locator('#quick-actions [data-quick="0"]').click();await page.locator('dialog.quick-dialog input').fill('sample.example');await page.locator('dialog.quick-dialog button[type=submit]').click();
  await page.keyboard.press('Escape');await expect(page.locator('dialog.quick-dialog')).toHaveCount(0);
  await page.waitForTimeout(800);await expect(page.locator('#reveal-dialog')).toBeHidden();
  await page.locator('#quick-actions [data-quick="14"]').click();await expect(page.locator('dialog.quick-dialog input')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.locator('dialog.quick-dialog').getByRole('button',{name:'关闭',exact:true}).click();
});
