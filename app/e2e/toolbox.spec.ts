import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const INDEX = JSON.parse(readFileSync(new URL('../../scripts/index.json', import.meta.url), 'utf8')) as { scripts: { id: string }[] };

const ORIGIN = `http://127.0.0.1:${process.env.E2E_PORT ?? 4321}`;
const DISCLAIMER_KEY = 'htb.disclaimer.v1';

/** 记录所有请求与控制台错误；拦截任何非同源请求（同时记为违规） */
async function guard(page: Page) {
  const requests: string[] = [], violations: string[] = [], errors: string[] = [];
  await page.context().route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(ORIGIN + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    violations.push(url); return route.abort();
  });
  page.on('request', (r) => requests.push(r.url()));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return { requests, violations, errors };
}
async function acceptDisclaimerUpfront(page: Page) {
  await page.addInitScript((k) => localStorage.setItem(k, '1'), DISCLAIMER_KEY);
}
/** 免责胶囊可见且未被遮挡：位于视口右下角、不透明度 ≥ 0.6、其中心点命中胶囊自身 */
async function expectSimPillVisible(page: Page) {
  const pill = page.locator('#sim-pill');
  await expect(pill).toBeVisible();
  await expect(pill).toContainText('本地模拟');
  const ok = await page.evaluate(() => {
    const b = document.getElementById('sim-pill')!, r = b.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { onTop: !!top && b.contains(top), opacity: Number(getComputedStyle(b).opacity), inView: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth };
  });
  expect(ok.onTop, '免责胶囊被遮挡').toBe(true);
  expect(ok.opacity).toBeGreaterThanOrEqual(0.6);
  expect(ok.inView).toBe(true);
}
function expectClean(g: Awaited<ReturnType<typeof guard>>) {
  expect(g.violations, '出现非同源请求').toEqual([]);
  expect(g.requests.filter((u) => !u.startsWith(ORIGIN + '/') && !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
  expect(g.errors, '控制台错误').toEqual([]);
}

test('免责声明：首访必须接受、记忆、可通过链接与命令重新打开', async ({ page }) => {
  const g = await guard(page);
  await page.goto('/');
  const modal = page.locator('.disclaimer');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('本地动画');
  await expectSimPillVisible(page);
  const btn = modal.locator('button.accept');
  await expect(btn).toBeEnabled();                        // 新版免责声明不再强制等待 3 秒
  await btn.click();
  await expect(modal).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), DISCLAIMER_KEY)).toBe('1');
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.locator('.disclaimer')).toHaveCount(0);   // 已记忆
  await page.goto('/#/tool');
  await page.click('#open-disclaimer');                       // 链接重新打开
  await expect(page.locator('.disclaimer')).toBeVisible();
  await page.locator('.disclaimer button.accept').click();
  await page.locator('.inputline input').fill('disclaimer');  // 命令重新打开
  // 新版免责声明打开即聚焦「我已了解」；真实 Enter 会在同一按键周期内直接确认，
  // 这里用合成 keydown 只验证命令分发，避免把“立即确认”误判为未打开
  await page.locator('.inputline input').dispatchEvent('keydown', { key: 'Enter' });
  await expect(page.locator('.disclaimer')).toBeVisible();
  await page.locator('.disclaimer button.accept').click();
  await expect(page.locator('.disclaimer')).toHaveCount(0);
  expectClean(g);
});

test('免责胶囊：常驻右下角，点击可重新打开免责声明', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/');
  await expectSimPillVisible(page);
  await page.click('#sim-pill');
  await expect(page.locator('.disclaimer')).toBeVisible();
  await page.locator('.disclaimer button.accept').click();
  await expect(page.locator('.disclaimer')).toHaveCount(0);
  expectClean(g);
});

test('全屏：按钮/命令切换，Esc 退出，免责胶囊始终可见', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/');
  await page.click('#fs-btn');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement || document.body.classList.contains('immersive'))).toBe(true);
  await expectSimPillVisible(page);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()); // headless 中 Esc 未必退出原生全屏
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement || document.body.classList.contains('immersive'))).toBe(false);
  // 降级路径：禁用 Fullscreen API 后应进入沉浸模式，Esc 退出
  await page.evaluate(() => { (document.documentElement as any).requestFullscreen = () => Promise.reject(new Error('nope')); });
  await page.click('[data-nav="tool"]');
  await page.locator('.inputline input').fill('fullscreen'); await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/immersive/);
  await expectSimPillVisible(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/immersive/);
  expectClean(g);
});

test('弹窗可用 Esc / 双击 关闭，且关闭前必经揭晓', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/#/tool');
  await page.waitForFunction(() => !document.querySelector('.inputline input')?.hasAttribute('disabled'));
  // 用最短的脚本触发揭晓弹窗
  const ids = (await page.locator('body').getAttribute('data-scripts'))!.split(',');
  await page.locator('.inputline input').fill(ids[0]); await page.keyboard.press('Enter');
  const pop = page.locator('.popup:not(.disclaimer)');
  await expect(pop).toBeVisible({ timeout: 90_000 });
  await expectSimPillVisible(page);
  await page.keyboard.press('Escape');                       // 惊吓阶段 → 先揭晓
  await expect(pop.locator('.psub')).not.toHaveText('正在注入载荷……');
  const vp = page.viewportSize()!;
  await page.mouse.dblclick(10, vp.height - 10);              // 双击遮罩（避开右下角免责胶囊）关闭
  await expect(pop).toHaveCount(0);
  expectClean(g);
});

test.describe('每个已注册脚本跑到结尾', () => {
  // 用例按 index.json 生成；另有一条用例断言页面实际注册的脚本与之一致
  const ids = INDEX.scripts.map((s) => s.id);
  for (const id of ids) {
    test(`autorun ${id}`, async ({ page }) => {
      const g = await guard(page); await acceptDisclaimerUpfront(page);
      await page.goto(`/#autorun=${encodeURIComponent(id)}`);
      const registered = (await page.locator('body').getAttribute('data-scripts'))!.split(',');
      expect(registered).toContain(id);
      await expect(page.locator('.popup:not(.disclaimer)')).toBeVisible({ timeout: 90_000 });
      await expectSimPillVisible(page);                        // 弹窗中免责胶囊仍可见
      // 新版交互模块：site-takeover 虚拟浏览器 / ransom-prank 勒索警报需要手动收尾
      if (id === 'site-takeover' || id === 'ransom-prank') {
        const finish = id === 'site-takeover' ? page.locator('.vb-finish-btn') : page.locator('.ransom-esc-btn').first();
        await expect(finish).toBeVisible({ timeout: 30_000 });
        await finish.click();
      }
      await expect(page.locator('body')).toHaveAttribute('data-autorun-done', '1', { timeout: 30_000 });
      await expect(page.locator('.term-out')).toContainText('[揭晓]');
      // G6：结束后进入统一揭晓页
      await expect(page).toHaveURL(/#\/reveal\//);
      await expect(page.locator('#view-reveal')).toBeVisible();
      await expect(page.locator('#reveal-title')).not.toHaveText('');
      await expect(page.locator('#view-reveal .reveal-note')).toContainText('本地模拟');
      await expectSimPillVisible(page);
      expectClean(g);
    });
  }
  test('页面注册的脚本与 index.json 一致', async ({ page }) => {
    await acceptDisclaimerUpfront(page); await page.goto('/');
    expect((await page.locator('body').getAttribute('data-scripts'))!.split(',')).toEqual(ids);
  });
});

const autoDismiss = (page: Page) => page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.body.dataset.autoDismiss = '1'; }));

test('首页宫格：7 张卡片、整蛊类标签、点击卡片启动剧本并到达揭晓页', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page); await autoDismiss(page);
  await page.goto('/');
  await expect(page.locator('#view-home')).toBeVisible();
  const cards = page.locator('#cards .card');
  await expect(cards).toHaveCount(INDEX.scripts.length);
  for (const sc of INDEX.scripts) await expect(page.locator(`.card[data-script="${sc.id}"]`)).toBeVisible();
  await expect(page.locator('.card[data-script="camera-takeover"] .tag')).toHaveText('整蛊类');
  await expectSimPillVisible(page);
  await page.locator('.card[data-script="port-scan"]').click();
  await expect(page.locator('#view-tool')).toBeVisible();
  await expect(page).toHaveURL(/#\/reveal\//, { timeout: 90_000 });
  await expect(page.locator('#reveal-tool')).toHaveText('端口扫描');
  await page.click('#reveal-home');
  await expect(page.locator('#view-home')).toBeVisible();
  expectClean(g);
});

test('关于页：赞助入口为无 href 占位，页面无任何外部链接', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/#/about');
  await expect(page.locator('#view-about')).toBeVisible();
  const sp = page.locator('#view-about a.sponsor');
  await expect(sp).toHaveCount(1);
  expect(await sp.getAttribute('href')).toBeNull();
  // 全站当前没有任何外部 <a>；将来加入时必须带 noopener noreferrer + no-referrer，且只在关于/揭晓页
  const ext = await page.$$eval('a[href^="http"]', (as) => as.map((a) => ({ rel: a.getAttribute('rel'), rp: a.getAttribute('referrerpolicy'), inAllowed: !!a.closest('#view-about,#view-reveal') })));
  for (const a of ext) { expect(a.inAllowed).toBe(true); expect(a.rel).toContain('noopener'); expect(a.rp).toBe('no-referrer'); }
  await page.click('#reset-settings');
  await expect(page.locator('#reset-msg')).toContainText('已清除');
  await expectSimPillVisible(page);
  expectClean(g);
});

test('揭晓页：hash 状态可分享/刷新，内容只按文本渲染，再玩一次/回首页', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  const st = { s: 'port-scan', n: '端口扫描', t: '<img src=x onerror=alert(1)>标题', b: '第一行\n第二行' };
  const payload = Buffer.from(JSON.stringify(st)).toString('base64url');
  await page.goto(`/#/reveal/${payload}`);
  await expect(page.locator('#view-reveal')).toBeVisible();
  await expect(page.locator('#reveal-title')).toHaveText(st.t);            // 以文本显示
  await expect(page.locator('#reveal-title img')).toHaveCount(0);
  await expect(page.locator('#view-reveal .sponsor')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#reveal-body')).toContainText('第二行');
  await page.goto('/#/reveal/!!!garbage');
  await expect(page.locator('#reveal-title')).toHaveText('你被骗啦 🤡');  // 非法 payload 兜底
  await page.goto(`/#/reveal/${payload}`);
  await page.click('#reveal-again');
  await expect(page.locator('#view-tool')).toBeVisible();
  await expect(page.locator('.term-out')).toContainText('Starting nmap', { timeout: 10_000 });
  expectClean(g);
});

test('M4 摄像头：假画面网格、夜视 3x 彩蛋、✕ 关闭整蛊直接揭晓，无权限请求', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.addInitScript(() => {
    const w = window as any; w.__perm = 0;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { w.__perm++; return Promise.reject(new Error('blocked')); };
  });
  await page.goto('/#/tool/camera-takeover');
  await expect(page.locator('.cam-grid canvas')).toHaveCount(4, { timeout: 15_000 });
  await expect(page.locator('#map-wrap')).toBeHidden();
  await expectSimPillVisible(page);
  for (let i = 0; i < 3; i++) await page.click('.cam-nv');
  await expect(page.locator('.cam')).toHaveAttribute('data-nv-clicks', '3');
  await expect(page.locator('.term-out')).toContainText('眼睛疼');
  const box = await page.locator('.cam-close').boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(40); expect(box!.height).toBeGreaterThanOrEqual(40);
  await page.click('.cam-close');
  const pop = page.locator('.popup:not(.disclaimer)');
  await expect(pop).toBeVisible({ timeout: 5_000 });
  await expect(pop.locator('.close-btn')).toHaveText('给橘猫喂罐头', { timeout: 5_000 });
  await pop.locator('.close-btn').click();
  await expect(page).toHaveURL(/#\/reveal\//);
  await expect(page.locator('#map-wrap')).toBeAttached();
  expect(await page.evaluate(() => (window as any).__perm)).toBe(0);
  expectClean(g);
});

test('主题：三套主题切换、命令切换、刷新后保持', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/');
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  const fg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fg').trim());
  expect(await theme()).toBe('matrix');
  await page.click('[data-theme-choice="cyber"]');
  expect(await theme()).toBe('cyber'); expect(await fg()).toBe('#ff2d95');
  await page.click('[data-theme-choice="alert"]');
  expect(await fg()).toBe('#ff3333');
  await page.reload();
  expect(await theme()).toBe('alert');
  await page.goto('/#/tool');
  await page.waitForFunction(() => !document.querySelector('.inputline input')?.hasAttribute('disabled'));
  await page.locator('.inputline input').fill('theme matrix'); await page.keyboard.press('Enter');
  await expect.poll(theme).toBe('matrix');
  await expectSimPillVisible(page);
  expectClean(g);
});

test('音效：默认开启，用户手势后发声；静音开关生效并持久化', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/#/tool');
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-sound', 'on');
  await page.waitForFunction(() => !document.querySelector('.inputline input')?.hasAttribute('disabled'));
  await page.locator('.inputline input').click();                       // 用户手势解锁 AudioContext
  await page.locator('.inputline input').fill('help'); await page.keyboard.press('Enter');
  await page.locator('.inputline input').fill('trace'); await page.keyboard.press('Enter');
  await expect.poll(async () => Number(await body.getAttribute('data-sfx-count')), { timeout: 15_000 }).toBeGreaterThan(0);
  await page.click('#sound-btn');
  await expect(body).toHaveAttribute('data-sound', 'off');
  await expect(page.locator('#sound-btn')).toContainText('静音');
  const before = Number(await body.getAttribute('data-sfx-count'));
  await page.locator('.inputline input').fill('trace'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('.inputline input')?.hasAttribute('disabled'), null, { timeout: 15_000 });
  expect(Number(await body.getAttribute('data-sfx-count'))).toBe(before);  // 静音后不再发声
  await page.reload();
  await expect(body).toHaveAttribute('data-sound', 'off');
  expectClean(g);
});

// ---- M11 一键神功：默认构建中不存在（完整用例见 e2e-gags/，针对 VITE_GAGS=1 构建）----
test('一键神功：默认构建不含宫格', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/#gags-preview');
  await expect(page.locator('#view-home .hero')).toBeVisible();
  await expect(page.locator('#gags')).toHaveCount(0);
  await expect(page.locator('.gag-btn')).toHaveCount(0);
  expect(g.requests.some((u) => /gagsData/.test(u))).toBe(false);
  expectClean(g);
});

test('关于页：纯文字致谢灵感来源（无链接）', async ({ page }) => {
  await acceptDisclaimerUpfront(page); await page.goto('/#/about');
  await expect(page.locator('#credits')).toContainText('GodOfHacker');
  await expect(page.locator('#credits a')).toHaveCount(0);
});
