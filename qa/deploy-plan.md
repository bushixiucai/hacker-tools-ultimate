# Cloudflare Pages 部署方案（草案，未执行）

## 项目设置
| 项 | 值 |
|---|---|
| Framework preset | None（或 Vite） |
| Root directory | `app` |
| Build command | `npm run build`（内含 check:no-network + check:scripts + tsc + vite build） |
| Output directory | `dist` |
| 环境变量 | `NODE_VERSION=20`（Production 与 Preview 都设） |

> 注意：构建会 import `../../../scripts/*.json`（仓库根 `scripts/`，root 之外）。Cloudflare 会 clone 整个仓库，所以可行，但仓库里**必须同时提交 `scripts/`**。

## 分支
- Production branch：`main` → `<project>.pages.dev`
- Preview：其它分支/PR 自动预览 `<hash>.<project>.pages.dev`；建议在 Preview 开启 Cloudflare Access 或 robots noindex（可选）。

## 头部（app/public/_headers，已存在，会被复制到 dist）
现有内容已足够严格（connect-src 'none'，无 unsafe-eval）。建议补充：
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; worker-src 'none'; manifest-src 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), bluetooth=(), clipboard-read=(), usb=(), payment=(), interest-cohort=()
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```
（`frame-ancestors` 在 meta CSP 中无效，只能经 _headers 下发。）
**必须**：Cloudflare Web Analytics = OFF（PRD 零统计）。另关闭 Web Analytics / Zaraz / Email obfuscation / Rocket Loader、Speed Brain/预取类功能，否则会注入第三方脚本并违反 CSP 与"零统计"。

## SPA 回退
单页、无前端路由（只用 hash），**不需要** `_redirects`。若将来加路由：`/* /index.html 200`。

## 上线步骤
1. Tiger 建 GitHub 仓库并推送（含 app/ 与 scripts/）。
2. Pages → Connect to Git → 按上表配置 → 首次部署到 Preview 分支验证。
3. 用 test-checklist.md 在 preview URL 上复测（DevTools Network 只见同源、响应头含 CSP）。
4. 合并到 main 发布 Production。
