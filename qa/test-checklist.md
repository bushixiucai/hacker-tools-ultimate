# 测试清单（基于 /workspace/hacker-toolbox/PRD.md v0.3）

## 网络 / 隐私
- [ ] `npm run check:no-network`、`npm run check:scripts` 通过
- [ ] src/dist 无 fetch/XMLHttpRequest/WebSocket/EventSource/sendBeacon/navigator.connection/远程 import/外链 <script>/<link>/字体/CDN
- [ ] Headless Chromium 加载 + 跑完所有脚本：只有同源 3 个请求（/、js、css）
- [ ] 零统计：无任何 analytics；Cloudflare Web Analytics 必须 OFF（线上 HTML 无 beacon.min.js / cloudflareinsights）
- [ ] 线上响应头含 CSP（connect-src 'none'，无 unsafe-eval）、nosniff、frame-ancestors

## 声明横幅
- [ ] "纯属娱乐"横幅加载即见、固定顶部、不可关闭；375/390/1280 均可见；彩蛋（Kitty 模式）下仍可见

## 功能
- [ ] `#autorun=<命令>` 下 site-takeover / password-bruteforce / port-scan / trace 跑到结束，无 console 报错
- [ ] 7 个脚本（site-takeover, password-bruteforce, port-scan, camera-takeover, satellite-trace, ransom-prank, ddos-panel）`#autorun=` 跑到结束；`npm run test:e2e` 12/12
- [ ] 首访免责弹窗：约 3s 出现、需接受、localStorage `htb.disclaimer.v1` 记忆、可经链接/`disclaimer` 命令重开
- [ ] camera-takeover 不调用 getUserMedia/enumerateDevices（零摄像头权限请求）
- [ ] 彩蛋（每脚本 3 个，以 scripts/*.json easter_eggs 为准）逐个触发；标题连点 5 次 → Kitty 模式，再 5 次退出
- [ ] ⏸ PENDING：camera `night-vision-3x`（待摄像头夜视按钮实现后再加入；当前 loader 会把 click 当作 logo 点击，暂不测）

## §2.9 命名规则（扫描：`rg -niE 'CVE-(19|20)\d{2}-\d+|rockyou|google|nasa|tencent|alibaba' scripts app/src`，匹配串 match 字段除外）
- [ ] 通用软件名（Apache、nginx）可用
- [ ] 脚本中硬编码的机构名/字典名必须是戏仿（Goggle、NASB、rocku-and-rollyou.txt），不得出现 Google/NASA/rockyou 原名输出
- [ ] 假 CVE 一律 `CVE-2077-` + 4 位数字（当前 port-scan 用 CVE-2077-1337 ✔；`check:names` 强制）
- [ ] 真实安全工具/恶意软件/勒索家族/黑客组织名禁用
- [ ] 用户自己输入的目标（如 google.com、nasa 作为匹配串）不受限

## §2.8 勒索弹窗 / 浏览器行为
- [ ] 「✕ 关闭整蛊」+ ESC + 双击 均可立即退出到揭晓页；按钮桌面 ≥40×40、移动 ≥48×48，不隐藏/不延迟
- [ ] 惊吓阶段 ≤15 秒自动反转；尊重 prefers-reduced-motion；电影级需开关+二次确认
- [ ] 无收款码/钱包/电话/下载链接/账号输入框；无文件访问
- [ ] 无 Pointer Lock / Keyboard Lock；全屏仅用户手势触发（src/ui/fullscreen.ts 已确认）
- [ ] 勒索弹窗默认温和；影院模式需主动开启
- [ ] 任何弹窗始终可一键关闭（按钮 + Esc）
- [ ] 无浏览器劫持：无 beforeunload 陷阱、不锁全屏、不刷 history（pushState/replaceState 刷屏）、无 window.open 轰炸、无 alert 循环

## §2.10 赞助链接
- [ ] 仅纯 `<a href target=_blank rel="noopener noreferrer" referrerpolicy=no-referrer>`，无第三方脚本/iframe/远程图片/二维码/像素
- [ ] 只出现在「关于」页与揭晓页底部；惊吓阶段不出现
- [ ] 无 prefetch/preconnect/dns-prefetch/Speculation Rules；点击前零外部请求

## 移动端
- [ ] 375x667、390x844 无横向溢出，输入框可见可用，按钮可点
