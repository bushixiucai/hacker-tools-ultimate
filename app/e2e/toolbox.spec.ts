import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const INDEX = JSON.parse(readFileSync(new URL('../../scripts/index.json', import.meta.url), 'utf8')) as { scripts: { id: string }[] };

const ORIGIN = 'http://127.0.0.1:4321';
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
/** 横幅可见且未被遮挡：位于视口顶部、不透明度 ≥ 0.6、其中心点命中横幅自身 */
async function expectBannerVisible(page: Page) {
  const banner = page.locator('#banner');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('纯属娱乐');
  const ok = await page.evaluate(() => {
    const b = document.getElementById('banner')!, r = b.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { onTop: !!top && b.contains(top), opacity: Number(getComputedStyle(b).opacity), inView: r.top >= 0 && r.bottom <= innerHeight };
  });
  expect(ok.onTop, '横幅被遮挡').toBe(true);
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
  await expectBannerVisible(page);
  const btn = modal.locator('button.accept');
  await expect(btn).toBeDisabled();                       // 3 秒后才可点
  await expect(btn).toBeEnabled({ timeout: 6000 });
  await btn.click();
  await expect(modal).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), DISCLAIMER_KEY)).toBe('1');
  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.locator('.disclaimer')).toHaveCount(0);   // 已记忆
  await page.click('#open-disclaimer');                       // 链接重新打开
  await expect(page.locator('.disclaimer')).toBeVisible();
  await page.locator('.disclaimer button.accept').click();
  await page.locator('.inputline input').fill('disclaimer');  // 命令重新打开
  await page.keyboard.press('Enter');
  await expect(page.locator('.disclaimer')).toBeVisible();
  await page.locator('.disclaimer button.accept').click();
  await expect(page.locator('.disclaimer')).toHaveCount(0);
  expectClean(g);
});

test('Logo 连点 5 次彩蛋：粉色 Hello Kitty 模式', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/');
  for (let i = 0; i < 5; i++) await page.locator('h1').click();
  await expect(page.locator('body')).toHaveClass(/kitty/);
  await expect(page.locator('.term-out')).toContainText('Hello Kitty');
  await expectBannerVisible(page);
  expectClean(g);
});

test('全屏：按钮/命令切换，Esc 退出，横幅始终可见', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/');
  await page.click('#fs-btn');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement || document.body.classList.contains('immersive'))).toBe(true);
  await expectBannerVisible(page);
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()); // headless 中 Esc 未必退出原生全屏
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement || document.body.classList.contains('immersive'))).toBe(false);
  // 降级路径：禁用 Fullscreen API 后应进入沉浸模式，Esc 退出
  await page.evaluate(() => { (document.documentElement as any).requestFullscreen = () => Promise.reject(new Error('nope')); });
  await page.locator('.inputline input').fill('fullscreen'); await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveClass(/immersive/);
  await expectBannerVisible(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/immersive/);
  expectClean(g);
});

test('弹窗可用 Esc / 双击 关闭，且关闭前必经揭晓', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/');
  await page.waitForFunction(() => !document.querySelector('.inputline input')?.hasAttribute('disabled'));
  // 用最短的脚本触发揭晓弹窗
  const ids = (await page.locator('body').getAttribute('data-scripts'))!.split(',');
  await page.locator('.inputline input').fill(ids[0]); await page.keyboard.press('Enter');
  const pop = page.locator('.popup:not(.disclaimer)');
  await expect(pop).toBeVisible({ timeout: 90_000 });
  await expectBannerVisible(page);
  await page.keyboard.press('Escape');                       // 惊吓阶段 → 先揭晓
  await expect(pop.locator('.psub')).not.toHaveText('正在注入载荷……');
  const vp = page.viewportSize()!;
  await page.mouse.dblclick(10, vp.height - 10);              // 双击遮罩（避开顶部横幅）关闭
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
      await expectBannerVisible(page);                        // 弹窗中横幅仍可见
      await expect(page.locator('body')).toHaveAttribute('data-autorun-done', '1', { timeout: 30_000 });
      await expect(page.locator('.term-out')).toContainText('[揭晓]');
      await expectBannerVisible(page);
      expectClean(g);
    });
  }
  test('页面注册的脚本与 index.json 一致', async ({ page }) => {
    await acceptDisclaimerUpfront(page); await page.goto('/');
    expect((await page.locator('body').getAttribute('data-scripts'))!.split(',')).toEqual(ids);
  });
});
