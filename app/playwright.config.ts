import { defineConfig, devices } from '@playwright/test';
const PORT = Number(process.env.E2E_PORT ?? 4321); // 并行跑多个 E2E 时用 E2E_PORT 区分
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
  // test:e2e 先 build；这里只起静态预览服务器（dist）
  webServer: { command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`, url: `http://127.0.0.1:${PORT}`, reuseExistingServer: false, timeout: 30_000 },
});
