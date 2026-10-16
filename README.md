# 黑客工具箱·搞怪版（hacker-toolbox-prank）

> ## ⚠️ 纯属娱乐 · 所有效果均为本地模拟 · 零网络请求
> 本项目是一个**假**黑客模拟器：所有"扫描 / 破解 / 入侵 / 追踪"都是本地动画与虚构文本。
> - **不发出任何网络请求**（CSP `connect-src 'none'`，构建期静态检查 + E2E 断言零非同源请求）
> - **不调用任何权限 API**（摄像头、麦克风、定位、剪贴板……），不收集任何数据，**无任何统计**
> - **不教授任何真实攻击技术**；剧本中的机构名、字典名、CVE（`CVE-2077-xxxx`）全部为虚构/恶搞
> - 请勿用于欺骗、恐吓他人或违法用途；整蛊请适度，玩完告诉对方这是假的

需求文档：[`PRD.md`](PRD.md)（v0.3，当前）· 历史版本见 [`docs/`](docs/)。

## 目录结构

```
.
├── PRD.md                  # 产品需求文档（当前版本）
├── app/                    # 正式前端（Vite + 原生 TypeScript，部署到 Cloudflare Pages）
│   ├── src/effects/        # 特效库：终端、打字机、代码雨、进度条、故障弹窗、世界地图追踪
│   ├── src/scenario/       # 剧本框架：schema、假数据、文案格式适配器、校验、播放器
│   ├── src/ui/             # 免责声明、全屏
│   ├── e2e/                # Playwright 端到端测试
│   ├── scripts/            # 构建期检查（零网络 / 命名 lint / 剧本校验）
│   └── README.md           # 详细开发文档（剧本格式、彩蛋写法等）
├── scripts/                # 文案组剧本 JSON（index.json + 各工具剧本），构建期打包
├── docs/                   # 历史 PRD、截图
├── prototype/              # 最早的单文件原型（仅供参考，不参与构建）
└── qa/                     # QA 文档
```

## 开发 / 构建 / 测试

```bash
cd app
npm install
npx playwright install chromium   # 首次运行 E2E 前
npm run dev            # 本地开发
npm run check          # 零网络检查 + 命名 lint（PRD §2.9）+ 剧本校验
npm run build          # check + 类型检查 + 构建到 app/dist
npm run test:e2e       # build + Playwright：跑完全部剧本、零非同源请求、无控制台错误、横幅常驻、免责声明、彩蛋、全屏、弹窗关闭
```

## Cloudflare Pages 设置

| 项 | 值 |
|---|---|
| Root directory | `app` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| 环境变量 | `NODE_VERSION=20` |

`app/public/_headers` 下发 CSP 等响应头。按 PRD R12a，请在 Cloudflare 侧**关闭** Web Analytics 自动注入、Zaraz、Rocket Loader、Email Obfuscation、Speculation/预取类功能。
