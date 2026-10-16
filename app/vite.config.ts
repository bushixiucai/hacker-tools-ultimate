import { defineConfig } from 'vite';
// 纯静态构建；不配置任何代理/远程资源
export default defineConfig({
  base: './',
  server: { fs: { allow: ['..'] } }, // 允许 dev 时读取 ../scripts（文案组脚本）
  build: { outDir: 'dist', assetsInlineLimit: 0, modulePreload: { polyfill: false } },
});
