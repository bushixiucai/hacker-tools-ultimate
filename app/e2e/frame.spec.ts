import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

// 跨域宿主：127.0.0.1 上另起一个真实端口（端口不同即跨域）。
// 不能用 page.route 伪造宿主或用公网域名：Chrome 的本地网络访问检查会直接拦掉 iframe，测不到 frameBust。
const ORIGIN = `http://127.0.0.1:${process.env.E2E_PORT ?? 4321}`;
let server: Server; let FRAMER = '';
test.beforeAll(async () => {
  server = createServer((req, res) => {
    const sandbox = req.url?.includes('sandbox') ? ' sandbox="allow-scripts allow-same-origin"' : '';
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><title>framer</title><iframe${sandbox} src="${ORIGIN}/#/tool" width="800" height="600"></iframe>`);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  FRAMER = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});
test.afterAll(() => new Promise<void>((r) => server.close(() => r())));

async function framedText(page: import('@playwright/test').Page) {
  const f = page.frames().find((x) => x.url().startsWith(ORIGIN));
  return f ? f.locator('body').innerText().catch(() => '') : '';
}

test('跨域 iframe 嵌入：要么跳出到顶层，要么只显示固定提示', async ({ page }) => {
  await page.goto(FRAMER);
  await expect.poll(async () => page.url().startsWith(ORIGIN) || (await framedText(page)).includes('本站不允许被嵌入'), { timeout: 10_000 }).toBe(true);
  if (page.url().startsWith(ORIGIN)) return; // 已跳出
  const f = page.frames().find((x) => x.url().startsWith(ORIGIN))!;
  await expect(f.locator('body')).toContainText('纯属娱乐');
  expect(await f.locator('body *').count()).toBeLessThanOrEqual(3); // 只有 p + a，没有正文
  const a = f.locator('a[target="_top"]');
  await expect(a).toHaveCount(1);
  expect(await a.getAttribute('href')).toMatch(new RegExp('^' + ORIGIN.replace(/\./g, '\\.')));
});

test('沙箱 iframe（不能顶层跳转）同样只显示提示', async ({ page }) => {
  await page.goto(FRAMER + 'sandbox');
  await expect.poll(() => framedText(page), { timeout: 10_000 }).toContain('本站不允许被嵌入');
  expect(page.url()).toBe(FRAMER + 'sandbox');
});
