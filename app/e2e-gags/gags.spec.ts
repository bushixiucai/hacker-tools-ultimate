import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GAG_CATEGORIES } from '../src/gags.categories';

const GAG_DATA = JSON.parse(readFileSync(new URL('../../scripts/gags/gags.json', import.meta.url), 'utf8')) as { id: string; category: keyof typeof GAG_CATEGORIES }[];
const ORIGIN = `http://127.0.0.1:${process.env.E2E_GAGS_PORT ?? Number(process.env.E2E_PORT ?? 4321) + 1}`;
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


test('一键神功（VITE_GAGS=1 构建）：按分类渲染（PM 显示名），点一个跑到反转弹窗', async ({ page }) => {
  const g = await guard(page); await acceptDisclaimerUpfront(page);
  await page.goto('/');
  await expect(page.locator('#gags')).toBeVisible();
  await expect(page.locator('.gag-btn')).toHaveCount(GAG_DATA.length);
  for (const cat of Object.keys(GAG_CATEGORIES) as (keyof typeof GAG_CATEGORIES)[]) {
    const n = GAG_DATA.filter((x) => x.category === cat).length;
    const grp = page.locator(`.gag-group[data-category="${cat}"]`);
    if (!n) { await expect(grp).toHaveCount(0); continue; }
    await expect(grp.locator('h3')).toHaveText(GAG_CATEGORIES[cat]);
    await expect(grp.locator('.gag-btn')).toHaveCount(n);
  }
  await expectBannerVisible(page);
  const btn = page.locator('.gag-btn').first();
  const label = (await btn.textContent())!;
  await btn.click();
  await expect(page.locator('.gag-run')).toBeVisible();
  await expect(page.locator('.gag-run .bar span')).toContainText(/\d+%/, { timeout: 8_000 });
  const pop = page.locator('.popup:not(.disclaimer)');
  await expect(pop).toBeVisible({ timeout: 10_000 });
  await expect(pop.locator('.big')).toHaveText(label);
  await expect(pop.locator('.psub')).not.toHaveText('正在注入载荷……', { timeout: 5_000 });
  await expectBannerVisible(page);
  await pop.locator('.close-btn').click();
  await expect(page.locator('.gag-run')).toHaveCount(0);
  expectClean(g);
});
