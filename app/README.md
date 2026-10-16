# 黑客工具箱·搞怪版（app）

纯前端、纯静态的假黑客模拟器。**所有效果均为本地动画与随机文本，零网络请求**（见 `../PRD-v0.1.md` 第 2 章红线）。

技术栈：Vite 5 + 原生 TypeScript（无 UI 框架，零运行时依赖）。

## 目录结构

```
app/
├── index.html                 # 入口；含 CSP meta（connect-src 'none'）与常驻「纯属娱乐」横幅
├── public/_headers            # Cloudflare Pages 响应头（同等 CSP + Permissions-Policy）
├── scripts/check-no-network.mjs  # npm run check:no-network
├── src/
│   ├── main.ts                # 组装：代码雨、地图、终端、注册命令
│   ├── style.css
│   ├── effects/               # 可复用特效库
│   │   ├── terminal.ts        # Terminal：输入、历史(↑↓)、命令注册表、环形缓冲
│   │   ├── typewriter.ts      # 打字机输出
│   │   ├── codeRain.ts        # Matrix 代码雨 canvas
│   │   ├── progress.ts        # 假进度条
│   │   ├── glitchPopup.ts     # glitchFlash（闪现）/ glitchPopup（带揭晓）
│   │   ├── worldMap.ts        # 本地绘制世界地图 + IP 跳点追踪
│   │   └── util.ts
│   ├── scenario/              # 脚本框架
│   │   ├── types.ts           # 脚本 schema（TypeScript 类型）
│   │   ├── fakeData.ts        # 占位符与假数据生成
│   │   ├── registry.ts        # import.meta.glob 打包 + 校验
│   │   └── runner.ts          # 在终端中播放脚本
│   └── scripts/*.json         # （可选）内置格式脚本，目前为空；主要脚本在 ../scripts/
└── vite.config.ts
```

## 开发与构建

```bash
npm install
npm run dev               # 本地开发
npm run check:no-network  # 扫描 src/、index.html 与 ../scripts，有网络 API 则失败
npm run check:scripts     # 在 Node 中加载并校验全部脚本与彩蛋
npm run build             # = check:no-network + check:scripts + tsc + vite build → dist/
npm run preview           # 预览 dist
npm run check:names       # PRD §2.9 命名 lint（真实 CVE / 字典名 / 组织名 / 工具名）
npm run check             # 三项检查合集
npm run test:e2e          # build + check:dist-no-gags + E2E；再 build:gags + 一键神功 E2E（首次需 npx playwright install chromium）
```

## 添加一个脚本

在 `src/scripts/` 新建 `xxx.json`，构建时自动打包（`import.meta.glob` eager，**不会在运行时通过网络加载**），文件 `id` 自动成为终端命令。

```json
{
  "id": "ddos",                     // 小写字母/数字/-，即命令名
  "name": "DDoS 面板",
  "description": "投送爱心",
  "usage": "ddos <目标>",
  "defaultTarget": "谷鸽 Gugle",
  "steps": [
    { "type": "type", "text": "[*] 锁定 {target}" },
    { "type": "trace", "hops": 6 },
    { "type": "reveal", "texts": ["成功投送 100,000 ❤️"] }
  ]
}
```

### 步骤类型

| type | 字段 | 说明 |
|---|---|---|
| `type` | `text`, `kind?`, `speed?`(ms/字) | 打字机输出一行 |
| `log` | `lines[]`, `kind?`, `delay?:[min,max]`, `repeat?`, `shuffle?` | 逐行刷日志 |
| `progress` | `label`(字符串或数组=并行), `duration`(ms) | 假进度条 |
| `popup` | `title`, `sub?`, `ms?` | 故障风大字闪现（如 ACCESS GRANTED） |
| `delay` | `ms`(数字或 `[min,max]`) | 停顿 |
| `trace` | `hops?` | 世界地图追踪动画；终点写入 `{traceEnd}` |
| `reveal` | `texts[]`, `title?` | 揭晓弹窗（随机一条）。**必须是最后一步**，否则构建期校验报错 |

`kind`：`ok` / `warn` / `err` / `dim`。

### 占位符

`{target}` 用户输入的目标（只作文本显示）· `{ip}` 文档保留段 IP（192.0.2.x 等）· `{port}` · `{hex}` / `{hex:N}` · `{num:a-b}` · `{pick:a|b|c}` · `{cve}` 虚构 `CVE-2077-xxxx` · `{password}` 弱口令梗 · `{user}` 虚构人名 · `{city}` · `{traceEnd}`

内容规范（PRD R5–R9、R13）：不写真实攻击命令/payload、真实 CVE、真实工具/恶意软件名、真实品牌（用戏仿名）。

## Cloudflare Pages 设置

- Framework preset：None（或 Vite）
- Build command：`npm run build`
- Build output directory：`dist`
- Root directory：`app`（若仓库根为 `hacker-toolbox/`）
- Node 版本：18+（建议设置环境变量 `NODE_VERSION=20`）

`public/_headers` 会被复制到 `dist/`，Pages 据此下发 CSP 响应头。

## 全局能力

- **免责声明**（PRD R16）：首访弹出，3 秒后才能点「我已了解」；记忆在 `localStorage['htb.disclaimer.v1']`；可通过标题下「免责声明」链接或 `disclaimer` 命令重新打开。
- **全屏**（G5）：标题下按钮或 `fullscreen` 命令；Fullscreen API 失败时降级为 CSS 沉浸模式；Esc 退出；横幅始终可见。
- **弹窗**（`glitchPopup`）：按钮 / Esc / 双击遮罩 均可关闭；惊吓阶段的首次关闭操作先切到揭晓文案（R15），不劫持浏览器、不注册 beforeunload。M6 勒索弹窗将复用。
- **彩蛋 click**：`match` 必须指明目标元素（页面 `[data-egg]` 值），缺失即构建失败，绝不默认为 logo。现有目标：`logo`、`night-vision`、`record`、`close-prank`。内置彩蛋（`src/eggs.builtin.ts`）：`night-vision` ×3、`record` ×1，剧本若定义同一目标则以剧本为准。
- **M4 摄像头**：`camera-takeover` 运行时右侧换成 Canvas 生成的假监控网格（橘猫 + OSD，标注 FAKE），控制条：云台 ◀▶、「🌙 夜视 3x」、「🎙 录音」，右上「✕ 关闭整蛊」/ Esc / 双击画面 → 立即进入揭晓。绝不调用真实摄像头或请求权限。

- **主题**（G3）：标题下「绿 / 紫 / 红」按钮或 `theme [matrix|cyber|alert]`；CSS 变量驱动，代码雨与地图同步换色；记入 `localStorage['htb.theme']`。
- **音效**（G4）：WebAudio 本地合成（打字、进度完成、警报、揭晓鼓点），无音频文件；按 PRD §6.2 默认开、音量 40%，首次用户手势后才发声；「🔊/🔇」按钮或 `mute` 命令切换，记入 `localStorage['htb.muted']`。
- **页面**：`#/` 首页宫格（7 个剧本卡片，整蛊类带标签）· `#/tool[/<id>][?target=]` 终端 · `#/about` 关于（赞助占位）· `#/reveal/<base64url>` 揭晓页（可分享，内容仅以文本渲染）。

## M11 一键神功

数据：`../scripts/gags/*.json`（目前为文案组的 `gags.json`）。**构建期开关**：只有 `VITE_GAGS=1` 构建（`npm run build:gags` → `dist-gags/`）才会把数据打进包；默认 `npm run build` 中该动态 import 被摇掉，`dist/` 里不含任何按钮文案（`npm run check:dist-no-gags` 校验）。审核通过后在 Cloudflare Pages 环境变量里设 `VITE_GAGS=1` 即上线。分类显示名在 `src/gags.categories.ts`（PM 定：网站魔法/拆解实验室/夺旗练习场/空中信号站/铁盒子们/玄学办公室），gags.json 内的显示名一律忽略。

```json
{ "id": "site-01", "category": "site", "label": "一键……", "duration": 4, "stall": 88, "twist": "一句话反转", "logs": ["可选假日志 1", "2", "3"], "steps": [ /* 可选：完整内部步骤，优先于自动生成 */ ] }
```

| 字段 | 规则（`check:scripts` 校验） |
|---|---|
| `id` | 必填，小写字母/数字/连字符，全局唯一 |
| `category` | 必填，`site` \| `crack` \| `ctf` \| `wireless` \| `hardware` \| `mystic`；显示名在 `src/gags.categories.ts`（唯一配置处，可直接改名） |
| `label` / `twist` | 必填，非空 |
| `duration` | 必填，3–5（秒） |
| `stall` | 可选，两位数整数 10–99：进度条在该百分比卡顿一下再走完；缺省不卡 |
| `logs` / `steps` | 可选；无 `steps` 时自动生成：日志在 duration 内打出 + 进度条卡在 stall → 一句话反转弹窗 |

文本同样经过 `check:names`。

## 零网络保障

1. `index.html` CSP meta：`default-src 'self'; connect-src 'none'; …`
2. `public/_headers` 同等 CSP 响应头
3. `npm run check:no-network`（`build` 的一部分）：禁止网络 API（`fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `sendBeacon` / `RTCPeerConnection` / `importScripts`）、权限 API（R4）、预取；外部 URL **只允许**出现在带 `rel="noopener noreferrer"` + `referrerpolicy="no-referrer"` 的普通 `<a href>` 赞助外链中（PRD §2.10，仅「关于」页与揭晓页）
5. E2E：拦截并记录所有请求，断言零非同源请求
4. 无任何运行时依赖、CDN、字体、统计

## 文案组脚本格式（`../scripts/`）

`hacker-toolbox/scripts/index.json` + 各脚本文件由 `src/scenario/copywriter.ts` 在构建期 import 并转换为内部格式，按 `index.json` 顺序注册为终端命令（命令名 = `id`，说明 = `title`）。修改后重新 `npm run build` 即可。

| 文案格式 | 内部映射 |
|---|---|
| `lines[].t`（绝对毫秒） | `at` 步骤（等到脚本开始后 t ms）+ `type` 打字输出 |
| `lines[].progress {from,to,ms,stuck_at,stuck_ms}` | 非阻塞 `progress`（`async:true`），标签取该行文本；`reveal` 前等待全部完成 |
| `{{target}}` `{{username}}` 等 | `{target}` …；位置参数按 `vars` 键顺序，也可 `--名称=值` |
| `{{rand:a-b}}` / `{{year:2026}}` | `{num:a-b}` / `{year:2026}`（给定年份原样输出，缺省为当前年） |
| `vars` 描述中的「默认 xxx」 | 变量默认值 |
| `twist {popup_title, popup_body, button}` | 结尾 `reveal`（标题保持、正文多行、按钮文案） |
| `disclaimer` | 脚本开始时打印 |
| `easter_eggs`（自然语言） | 解析为：``输入 `X` `` → 全局隐藏命令；`输入 X`/`用户名填 X`/`密码字典选『X』` → 参数触发；`连续输入同一… N 次` → 重复触发；`连续点 N 次 Logo` → 点标题触发（粉色模式）。无法解析的条目会在隐藏命令 `eggs` 中列出 |

### 结构化彩蛋（推荐）

`easter_eggs` 数组中可混用字符串（旧的自然语言写法，自动解析）与对象：

```json
"easter_eggs": [
  { "trigger": "command", "match": "sudo make me a sandwich", "output": "[OK] 三明治已加入扫描队列。" },
  { "trigger": "arg", "var": "username", "match": "root", "output": "[!] root 正在午睡，请勿打扰。" },
  { "trigger": "repeat", "count": 3, "output": "再点我就报警给隔壁猫" },
  { "trigger": "click", "match": "logo", "count": 5, "effect": "pink", "output": "已切换到 Hello Kitty 安全模式" },
  { "trigger": "click", "match": "night-vision", "count": 3, "output": "[👽] 别闪了，眼睛疼。" }
]
```

| trigger | 含义 | 字段 |
|---|---|---|
| `command` | 整行输入精确匹配（忽略大小写，优先于普通命令） | `match` |
| `arg` | 运行本脚本时变量值等于 `match` | `match`，`var`（默认第一个变量，通常 `target`；也可为 `--名称=值` 传入的变量如 `dict`） |
| `repeat` | 同一目标连续运行本脚本 N 次 | `count`（或数字 `match`） |
| `click` | 点击页面上 `data-egg="<match>"` 的元素 N 次（1.5s 内连续） | `match`（**必填**，目标元素名：`logo`=标题、`night-vision`=摄像头「夜视 3x」按钮、`record`=录音按钮、`close-prank`=弹窗/整蛊关闭按钮），`count`（默认 1；也可写成后缀 `night-vision-3x` / `logo-click-5`），`effect?: "pink"` |

`output` 支持 `{{target}}` 等变量。兼容写法：`trigger` 直接写变量名（如 `"username"`、`"target"`）等同 `arg`；`repeat`/`click` 的次数也可写在 `match` 字符串里（如 `"same-target-3x"`、`"logo-click-5"`）；`{"trigger":"ui","match":"logo-click-N"}` 等同 `click`。`click` 的输出含 Kitty/粉 时默认启用粉色效果。

字段非法或彩蛋无法解析时，`npm run check:scripts`（`build` 的一部分）会失败，不会等到运行时才报错。

测试钩子：`#autorun=<URL 编码命令>`（多条用 `;;` 分隔，自动关闭揭晓弹窗）。
