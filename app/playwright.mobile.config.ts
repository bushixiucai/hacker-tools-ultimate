import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.E2E_MOBILE_PORT ?? 4323);
export default defineConfig({
  testDir: 'e2e', testMatch: 'toolbox.spec.ts', grep: /Mobile layout|Camera has|Report image|Website uses|Phone|phone notes|Review:/,
  timeout: 90_000, workers: 2, reporter: [['list']],
  use: { ...devices['iPhone 13'], browserName: 'webkit', baseURL: `http://127.0.0.1:${port}` },
  webServer: { command: `npx vite preview --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
