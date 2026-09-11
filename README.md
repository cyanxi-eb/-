# 面试背记学习卡 v2.13

面向 **AI 大模型 / 算法 / 后端岗位** 的面试背记闪卡：**361 题、29 个分类、4 档题量**，抽背（测试）+ 记背（学习）+ 突击（面试前指导）+ 编辑（CRUD）四种模式，支持云端同步与离线使用。

> 数据真源只有一个文件：`questions.json`。所有页面、单文件版、PWA 分片都由它构建出来——**永远不要直接改产物**。

---

## 一、特性一览

| 能力 | 说明 |
|------|------|
| 题库 | 361 题 / 29 分类，按 1–5 星分级（282 题必刷、79 题拓展） |
| 主题库 | 4 档递进压缩：库1 完整(361) · 库2 标准(326) · 库3 精简(273) · 库4 极简(120)，首次打开可选题量 |
| 四模式 | 🎴 抽背卡（测试）· 📖 记背知识（学习）· 🎯 面试前指导（突击）· ✏️ 编辑（增删改查 + 存档回滚） |
| 双形态 | 单文件 HTML（双击即用、可发手机）+ 分片 PWA（可部署、可安装、可离线） |
| 云端同步 | 可选接入 Supabase，昵称登录后进度/设置/题库自动上云，多用户数据完全隔离 |
| 自动更新 | v2.13 起 Service Worker 自动检测新版本并静默升级，**不再需要用户硬刷新** |
| 本地优先 | 未登录时全部功能基于 `localStorage`，无网也能用 |

---

## 二、快速开始

### 1. 线上访问（推荐，零安装）

打开 **<https://cyanxi-eb.github.io/->**，浏览器会提示「添加到主屏幕」，装成 App 后可离线使用。

### 2. 本地单文件版（双击即用）

直接双击 `dist/面试背记学习卡v2.13.html`。CSS / JS / 4 档题库全部内联，**无需联网、无需服务器**，`file://` 协议下功能完整。

> 移动端：把该 HTML 发给手机，用浏览器打开即可。

### 3. 自建部署（PWA 分片版）

`dist/web/` 是完整的静态站点，丢到任意静态托管平台都行：

| 平台 | 做法 |
|------|------|
| GitHub Pages | 本仓库已配置自动部署（见「五、构建与部署」），push 到 `main` 即发布 |
| 任意静态托管 | 上传 `dist/web/` 下全部文件（含 `sw.js`、`manifest.webmanifest`、`.nojekyll`） |

---

## 三、四种模式

| 模式 | 入口 | 用途 |
|------|------|------|
| 🎴 抽背卡 | 默认模式 | 看题→翻卡→标记「记得 / 没记住」，按薄弱度和进度循环 |
| 📖 记背知识 | 顶部标签 | 全部题目答案展开式阅读，适合系统过一遍 |
| 🎯 面试前指导 | 顶部标签 | 按必刷题优先级给出临考突击顺序 |
| ✏️ 编辑 | 顶部标签，或 URL 后加 `?edit=1` | 增删改题、切换题库、撤销/重做、手动存档、导入导出 JSON |

**抽背卡快捷键**：`空格` 翻转 · `←/→` 翻页 · `G` 记得 · `B` 没记住 · `M` 切换模式 · 移动端左右滑动翻卡。

**筛选开关**：`必刷题`（4–5 星，默认开）/ `拓展题`（1–3 星，默认关）/ `只复习薄弱题` / `随机顺序`；另有 🔖 分类筛选弹层。

---

## 四、云端同步（可选）

- 顶部栏「🔑 登录」，输入**昵称**即可登录（无需密码），学习进度 / 设置 / 编辑的题库自动保存云端，换设备不丢
- 未接入 Supabase 时自动回退本地存储，功能完全不受影响
- 多用户数据按 `u_<userId>_<key>` 前缀隔离，互不污染
- 开通步骤见 [`docs/supabase-setup.md`](docs/supabase-setup.md)（注册 → 建项目 → 执行 SQL → 填 `src/js/cloud.js` 两个常量 → 重新构建）

**出问题时的两个自救按钮**（编辑模式工具栏）：

| 按钮 | 作用 |
|------|------|
| 🔍 诊断 | 把登录态 / 内存题库 / 全部 localStorage key 打印到 Console，便于定位 |
| ☁️ 从云端拉取 | 用云端最新数据完整覆盖本地，题库异常时一键恢复 |

---

## 五、目录结构

```
面试背记学习卡/
├── questions.json              # ★ 数据真源（唯一，所有题目都在这里）
├── build-v25.cjs               # 构建脚本（生成单文件版 + dist/web 分片版）
├── README.md                   # 本文件
├── CHANGELOG.md                # 版本变更记录
├── .gitignore                  # 只保留构建所需的源码与文档
├── .github/workflows/deploy.yml  # GitHub Actions：push main → 构建 → 发布 Pages
├── docs/
│   ├── supabase-setup.md       # 云端同步开通指南
│   └── v2.9-*.md / v2.10-*.md  # 历史里程碑计划文档
├── src/                        # ★ 模块化源码（改这里）
│   ├── index.html              # 页面骨架（含 <!-- __FC_DATA_PLACEHOLDER__ --> 占位）
│   ├── css/                    # base / flashcard / memo / guide / editor
│   └── js/                     # markdown / data-loader / cloud / store /
│                               #   flashcard / memo / guide / editor / app / sw-register
├── tools/                      # 一次性数据工具与资料源（非构建必需）
│   ├── newq-v212-part*.txt     # v2.12 新增题的行式源文件
│   ├── merge-v212.cjs          # 行式源文件 → questions.json 的合并脚本
│   ├── bank-assign.cjs         # 4 档 bank 字段分配
│   └── *.cjs / *.json          # 历史提取/整理脚本与中间产物
├── figures/  mindmaps/  vendor/  # 可选资源目录（当前为空，勿删）
└── dist/                       # 构建产物（自动生成，已 gitignore）
    ├── 面试背记学习卡v2.13.html   # 单文件版
    └── web/                    # 分片 PWA 版（CI 部署的就是这个目录）
```

---

## 六、数据层（questions.json）

### 6.1 字段 schema

```json
{
  "id": 588,                   // 全局自增索引（脚本维护，手改易破坏唯一性）
  "code": "PY-49",             // 统一题码，见 6.4
  "category": "Python基础",     // 细分分类（29 个，用于筛选与展示）
  "question": "请描述 ...",      // 题目（Markdown）
  "answer": "**核心特点：** ...", // 答案（Markdown，支持代码块/表格/列表/图片）
  "extend": "**面试追问：** ...", // 知识扩展（追问·易错·类比，仅学习页展示，可为空串）
  "source": "ai-agents-from-zero", // 来源标记，见下
  "star": 4,                   // 重要性 1–5 星
  "bank": 3                    // 主题库档位 1–4
}
```

**`source` 取值**：`v2.4`、`v2.4-reimport`（加回的历史高频题）、`bh`、`bh-fixed`、`yd`（有道云课件）、`note`（笔记+图）、`903`/`904`/`905`/`0907`（各期学习笔记）、`LLM0903`（实战课）、`ai-agents-from-zero`（教材题库）、`comate`、`sqla-doc`、`manual`（手工添加）。

### 6.2 重要性分级（star）

| 星级 | 含义 | 题数 | 归属 |
|------|------|------|------|
| ★5 | 核心必考（事务/索引/Transformer/LRU/深浅拷贝等） | 110 | 必刷 |
| ★4 | 重要主干 | 172 | 必刷 |
| ★3 | 拓展（有价值但非高频） | 36 | 拓展 |
| ★2 | 拓展（人事面/软技能等非技术核心） | 33 | 拓展 |
| ★1 | 冷门（社保/家庭/爱好等） | 10 | 拓展 |

### 6.3 主题库档位（bank）

每题带 `bank` 字段（1–4，**值越大越核心**），主题库 N = 所有 `bank >= N` 的题（**累计语义，非互斥分区**）：

| 主题库 | 含义 | 题量 | 上限自检 |
|--------|------|------|----------|
| 库1 完整版 | 全量，零删减 | 361 | — |
| 库2 标准版 | 去最冷门 | 326 | — |
| 库3 精简版 | 只留主干高频 | 273 | `< 320` ✓ |
| 库4 极简版 | 面试冲刺最核心 | 120 | `< 180` ✓ |

- 上限常量在 `build-v25.cjs`：`const LIMIT3 = 320, LIMIT4 = 180;`（超限构建直接失败，防止档位被悄悄撑爆）
- 首次打开弹「选择题库」对话框，选择存入 `localStorage.v27_activeBanks`
- 编辑模式工具栏「📚 切换题库」可随时更换；进度按档位分 key 存储，互不干扰

### 6.4 题码规范

- 格式 `{PREFIX}-{N}`，**序号不补零**（`PY-1`、`PY-23`、`LLM-64`）
- 全库唯一，`id` 与 `code` **均不可复用**（历史外链可能引用）

**PREFIX ↔ 分类映射**（22 个前缀 / 29 个分类）：

| PREFIX | 大类 | 覆盖分类 | 题数 |
|--------|------|----------|------|
| `PY` | Python 基础 | Python基础、数据结构、函数与作用域、面向对象 | 39 |
| `PYH` | Python 高级 | 并发编程、综合进阶 | 17 |
| `PD` | 数据处理 | Pandas | 15 |
| `ML` | 机器学习 | 机器学习、机器学习-逻辑回归 | 22 |
| `DL` | 深度学习 | 深度学习 | 18 |
| `NLP` | NLP 基础 | （现存 2 题已并入「大语言模型」分类） | 2 |
| `FS` | FastAPI | FastAPI | 12 |
| `DB` | 数据库 | MySQL、缓存与Redis | 42 |
| `LNX` | Linux | Linux | 15 |
| `NG` | Nginx | Nginx | 5 |
| `HTTP` | HTTP 协议 | HTTP协议 | 4 |
| `LLM` | 大模型应用 | 大语言模型、RAG、LangChain | 60 |
| `LG` | LangGraph | LangGraph | 8 |
| `AG` | Agent 智能体 | Agent 智能体 | 10 |
| `AE` | AI 应用工程 | AI 应用工程 | 10 |
| `PE` | 提示词工程 | 提示词工程 | 5 |
| `MCP` | MCP | MCP | 7 |
| `SA` | SQLAlchemy | SQLAlchemy | 5 |
| `SD` | AI 场景设计 | AI 场景设计 | 8 |
| `GIT` | Git | Git | 11 |
| `SK` | 软技能 | 软技能 | 11 |
| `HR` | 人事面 | 人事面 | 35 |

### 6.5 Markdown 语法约定

| 语法 | 用途 |
|------|------|
| `**加粗**` | 要点标题、关键词 |
| `` `行内代码` `` | 变量名、函数名、字段名 |
| ` ```python ` 代码块 | 多行代码（语言标注可选） |
| `- ` / `1. ` | 列表 |
| 表格 | 用竖线分隔单元格（需含 `---` 分隔行） |
| `### 小标题` | 三级标题（渲染为 ◆ 前缀） |
| `![说明](figures/xxx.png)` | 图片（仅分片远程版保留） |

---

## 七、手动修改规范

> **核心原则**：只改 `questions.json` 和 `src/`，**永远不要直接改 `dist/` 或单文件 HTML**，改完跑一次构建。

### 7.1 新增一道题

1. 在 `questions.json` 中追加一个对象（`id` = 当前最大 id + 1；`code` = 对应 PREFIX 的下一个序号）
2. `star` 按重要性填 1–5，`bank` 按核心度填 1–4，`source` 填 `manual`
3. 运行 `node build-v25.cjs` 重新构建

> 题目较多时建议走「行式源文件 + 合并脚本」，避免长中文答案手写 JSON 转义出错，见 7.6。

### 7.2 修改 / 删除一道题

- **改**：直接编辑对应字段，注意改 `category` 时若归属不同 PREFIX 需同步改 `code` 前缀并保证序号不冲突
- **删**：从数组移除该对象即可，**不要重新编号**其他题的 `id` / `code`
- 两者改完都要重新构建

### 7.3 新增分类

1. 在 `tools/bank-assign.cjs`（或对应分配脚本）里登记新分类
2. 新题的 `category` 用新分类名、`code` 用新前缀序号
3. 同步更新本文件 6.4 的映射表

### 7.4 改样式

改 `src/css/` 下对应模块（`base.css` 主题变量 / `flashcard.css` 卡片 / `memo.css` 记背 / `guide.css` 指导 / `editor.css` 编辑）。全局颜色、圆角、阴影统一在 `base.css` 的 `:root` 变量里改，一处生效。

### 7.5 改功能逻辑

逻辑在 `src/js/` 按模块拆分：`data-loader.js`（加载）· `cloud.js`（云端同步）· `store.js`（持久化）· `markdown.js`（渲染）· `flashcard.js` / `memo.js` / `guide.js` / `editor.js`（四模式）· `app.js`（入口与模式切换）· `sw-register.js`（Service Worker 注册与自动更新）。

> 修改任何 JS / CSS，或调整 `src/index.html` 引用的资源后，**必须 bump `sw.js` 的 `CACHE`**（改 `build-v25.cjs` 里的 `const CACHE = 'fc-vNN'`），否则老用户的 Service Worker 仍会命中旧缓存。

### 7.6 批量新增（推荐做法）

长中文答案手写 JSON 极易被转义、换行、`|` 坑死，因此约定走行式源文件：

```
@@@Q|<code>|<category>|<star>|<bank>|<source>|<题目正文>
@@@A
<答案（可多行、可含 Markdown、空行、表格）>
@@@E
<易错 / 追问 / 类比（可空，但 @@@E 与 @@@END 保留）>
@@@END
```

```bash
# 预检（不写入）
node tools/merge-v212.cjs --dry
# 正式合并（自动续 id、校验必填字段与 star/bank 范围、拒绝重复 code）
node tools/merge-v212.cjs
```

---

## 八、构建与部署

### 8.1 本机构建

```bash
node build-v25.cjs
```

构建脚本内部会依次：**JS 全量语法检查 → 数据校验（code/id 唯一、字段齐全、bank 越界）→ 档位自检**，任一不过直接失败退出，不会产出半成品。

产出：

| 产物 | 说明 |
|------|------|
| `dist/面试背记学习卡v2.13.html` | 单文件版（4 档题库 + CSS/JS 全内联） |
| `dist/web/` | 分片 PWA 版：`index.html` + `css/` + `js/` + `banks/bank-{1..4}.json` + `banks.manifest.json` + `manifest.webmanifest` + `sw.js` |

> 构建后请**删除上一版的单文件**（如 `dist/面试背记学习卡v2.12.html`），避免双击到旧版。

### 8.2 自动部署（GitHub Actions）

仓库已配置 `.github/workflows/deploy.yml`：

```
push 到 main  ──►  actions/checkout
              ──►  node build-v25.cjs
              ──►  上传 dist/web 作为 Pages 产物
              ──►  deploy-pages 发布到 https://cyanxi-eb.github.io/-
```

也就是说 **只需要提交 `questions.json` / `src/` / `build-v25.cjs`，线上会自动重新构建并发布**（`dist/` 已 gitignore，不必也不应入库）。

### 8.3 推送

```bash
git add -A
git commit -m "feat(v2.13): ..."
git push origin main
```

Token 失效时用 `git-credential-manager get` 重新取（WorkBuddy 环境下凭据助手可能挂起，需绕过）。

### 8.4 线上验证（发布后 10–30 秒）

```bash
curl -sS "https://cyanxi-eb.github.io/-/sw.js?t=$(date +%s)"           | grep -m1 "const CACHE"
curl -sS "https://cyanxi-eb.github.io/-/banks.manifest.json?t=$(date +%s)"
curl -sS "https://cyanxi-eb.github.io/-/index.html?t=$(date +%s)"      | grep -o "学习卡 <b>v[0-9.]*</b>"
```

三项应分别与本次版本一致：`sw.js` 的 `CACHE`、`manifest.version`、顶栏版本号。

---

## 九、缓存与版本更新（v2.13 起不再需要硬刷新）

**曾经的痛点**：每次发版都要通知用户按 `Ctrl+Shift+R`，否则看到旧页面。

**根因**：GitHub Pages 对 `index.html` 与 `sw.js` 都下发 `Cache-Control: max-age=600`，而旧版 Service Worker 对同源资源采用 **cache-first**——浏览器既看不到新 `sw.js`，也拿不到新 HTML，只能靠硬刷新绕过 HTTP 缓存。

**现在的机制（v2.13）**：

| 环节 | 做法 |
|------|------|
| `sw.js` 自身 | 注册时 `updateViaCache: 'none'`，永远绕过 HTTP 缓存回源检查更新 |
| 页面资源 | SW 改为 **network-first**（`fetch(req, { cache: 'no-cache' })` 强制向服务器校验），HTML 与 JS/CSS 永远来自同一次部署，不会新旧混用；离线时降级到缓存 |
| 接管 | SW 安装即 `skipWaiting()`、激活即 `clients.claim()`，无需用户关闭全部标签页 |
| 刷新 | `sw-register.js` 监听 `controllerchange`，新版本接管后**自动 reload 一次**；若用户正在输入框打字，则延后到失焦再刷新 |
| 检查时机 | 页面加载完成后、标签页重新可见时、以及每 30 分钟各检查一次 |
| 跨域请求 | Supabase 等跨域请求一律放行给浏览器直连，SW 不介入、不缓存用户数据 |

> 只有从 v2.12 及更早版本首次升级到 v2.13 时，需要硬刷新**一次**（为了让浏览器换上新的 `sw.js` 逻辑）；此后所有版本升级都自动完成。

---

## 十、排障与自救

| 症状 | 处理 |
|------|------|
| 题库显示异常 / 空白 | 编辑模式 →「☁️ 从云端拉取」一键用云端数据覆盖本地 |
| 想定位数据问题 | 编辑模式 →「🔍 诊断」→ 把 Console 输出截图 |
| 页面卡在「题库加载中…」 | 检查网络能否访问 Supabase；F12 看 Console 报错 |
| 本地改动没上云 | 确认已登录；登录态下改动会自动同步，失败会 3 秒后重试 |
| 想清空学习进度 | 抽背卡页脚「重置学习进度」 |
| 想恢复初始题库 | 编辑模式工具栏「♻️ 恢复内置题库」 |

---

## 十一、红线（禁止事项）

- ❌ **不要直接编辑** `dist/` 下任何文件（HTML / JS / JSON / manifest / sw.js）——都是构建产物，下次构建即被覆盖
- ❌ **不要手工改** `id` / `code` 导致重复——会破坏数据唯一性
- ❌ **不要在 `questions.json` 里写非法 JSON**（裸换行、未转义引号）；代码块内换行用 `\n`
- ❌ **不要**在注释中写入 `*/`（例如 `v25_*/v27_*`）——会提前结束块注释，导致整个 JS 文件 SyntaxError
- ❌ **不要**手写 `{PREFIX}-{N}` 以外的题码格式
- ❌ **不要**删除 `figures/`、`mindmaps/`、`vendor/` 源目录
- ❌ **不要**把含真实用户数据的文件提交入库（`tools/*cloud*.json` 已在 `.gitignore` 中拦截）

---

## 十二、相关文档

- [`CHANGELOG.md`](CHANGELOG.md) —— 各版本变更明细
- [`docs/supabase-setup.md`](docs/supabase-setup.md) —— 云端同步开通指南
- `docs/v2.9-*.md`、`docs/v2.10-*.md` —— 历史里程碑计划文档
