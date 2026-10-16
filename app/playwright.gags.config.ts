import { defineConfig, devices } from '@playwright/test';
// 一键神功专用：针对 VITE_GAGS=1 的独立构建（dist-gags）
const PORT = Number(process.env.E2E_GAGS_PORT ?? Number(process.env.E2E_PORT ?? 4321) + 1);
export default defineConfig({
  testDir: 'e2e-gags', timeout: 60_000, workers: 2, reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
  webServer: { command: `npx vite preview --outDir dist-gags --host 127.0.0.1 --port ${PORT} --strictPort`, url: `http://127.0.0.1:${PORT}`, reuseExistingServer: false, timeout: 30_000 },
});
