# 面试背记学习卡 v2.5

融合 `面试背记学习卡v2.4.html`（题库质量 + 轻量）与 `bh-mindmaps-main`（UI 架构 + 远程访问 + 代码/图片呈现）的新版本。

- **题库**：438 题 / 14 大类（以 v2.4 的 280 题为主体，并入 bh-mindmaps 互补分类；已清除 bh 的纯链接题与撕裂碎片）
- **四模式**：🎴 抽背卡(测试) + 📖 记背知识(学习) + 🎯 面试前指导(突击) + ✏️ 编辑(CRUD+存档回滚)
- **双形态**：单文件 `面试背记学习卡v2.5.html`（双击即用）+ `dist/`（PWA 分片可部署）
- **数据真源**：`questions.json`（唯一，禁止手改内联 HTML）

---

## 〇、访问方式（怎么用）

### 本地访问（单文件版）

直接双击打开 `dist/面试背记学习卡v2.5.html` 即可，无需联网、无需服务器。数据已内联，`file://` 协议下功能完整可用。

> 移动端：把该 HTML 文件发到手机，用浏览器打开即可。

### 远程访问（分片 PWA 版）

把 `dist/web/` 整个目录部署到任意静态托管平台，即可获得一个在线可访问、可安装、可离线的 PWA：

| 平台 | 方式 |
|------|------|
| GitHub Pages | 把 `dist/web/` 推送到仓库，开启 Pages 即可（已含 `.nojekyll` 语义） |
| 任意静态托管 | 上传 `dist/web/` 下所有文件（含 `sw.js`、`manifest.webmanifest`） |

部署后访问 `index.html`，浏览器会提示"添加到主屏幕"；`sw.js` 会在首次加载后缓存题库分片，之后离线也能用。

### 编辑模式入口

在 URL 后加 `?edit=1` 进入编辑模式（如 `index.html?edit=1`，或单文件版 `文件路径?edit=1`），可增删改查题库，改动存 localStorage。

### 重新构建（改了题库后）

```bash
node build-v25.cjs
```

生成单文件版 + 分片版两个产物。

---

## 一、目录结构

```
面试背记学习卡v2.5/
├── README.md                 # 本文件（含手动修改规范）
├── CHANGELOG.md              # 更新文档（变更记录 + 修改规范）
├── questions.json            # ★ 数据真源（唯一，所有题目都在这里）
├── build-v25.cjs             # 构建脚本（生成单文件版 + dist 分片版）
├── src/                      # 模块化源码
│   ├── index.html            # 记忆卡主页面（框架）
│   ├── css/                  # 样式模块
│   └── js/                   # 逻辑模块
├── tools/                    # 数据工具脚本
│   ├── extract.cjs           # 从 v2.4 / bh-mindmaps 提取原始数据
│   ├── merge.cjs             # 合并 + 题码分配 → questions.json
│   └── _*.json               # 中间文件（可删除，勿提交）
├── figures/                  # 源图（可选资源）
├── mindmaps/                 # markmap 思维导图页
├── vendor/                   # 第三方库（highlight.js）
└── dist/                     # 构建产物（自动生成，勿手改）
    ├── 面试背记学习卡v2.5.html   # 单文件版
    └── web/                  # 分片 PWA 版
```

---

## 二、数据层（questions.json）

### 2.1 字段 schema

```json
{
  "id": 1,                    // 全局自增索引（勿手动改，由脚本维护）
  "code": "PY-1",             // 统一题码（见 2.3 规范）
  "category": "流程控制",       // 细分分类（用于筛选/展示）
  "question": "请描述...",     // 题目（markdown）
  "answer": "**核心特点：**...", // 答案（markdown，支持代码块/表格/列表/图片）
  "extend": "**面试追问：**...",// 知识扩展（面试追问·易错·补充，仅学习页展示）
  "source": "v2.4"            // 来源：v2.4 / bh / pdf
}
```

### 2.2 markdown 语法约定（题面/答案统一）

| 语法 | 用途 |
|------|------|
| `**加粗**` | 要点标题、关键词 |
| `` `行内代码` `` | 变量名、函数名、字段名 |
| ` ```代码块``` ` | 多行代码（语言可选，如 ` ```python `） |
| `- 列表项` / `1. 编号项` | 列表 |
| `\| 表格 \|` | 表格（需含 `|---|` 分隔行） |
| `### 小标题` | 三级标题（渲染为 ◆ 前缀） |
| `![说明](figures/xxx.png)` | 图片（仅 dist 远程版保留） |

### 2.3 题码规范（重要）

- 格式：`{PREFIX}-{N}`，**序号不补零，有几位标几位**（`PY-1`、`PY-23`、`CV-38`）
- 题码唯一，全库不重复；`id` 与 `code` 均不可复用

**PREFIX 映射表**（大类 ↔ 前缀）：

| PREFIX | 大类 | 覆盖细分分类 |
|--------|------|-------------|
| `PY` | Python基础 | 流程控制、数据结构、函数与作用域、面向对象、异常处理、文件操作、网络编程、正则表达式、模块与包 |
| `PYH` | Python高级 | 并发编程、综合进阶 |
| `PD` | 数据处理 | NumPy、Pandas |
| `ML` | 机器学习 | 机器学习、线性回归、逻辑回归、数据处理 |
| `DL` | 深度学习 | 深度学习、循环神经网络、注意力与Transformer |
| `NLP` | NLP | NLP基础 |
| `CV` | 计算机视觉 | 计算机视觉 |
| `DS` | 数据结构算法 | 数据结构算法 |
| `DB` | 数据库 | MySQL、数据库与ORM、缓存与Redis |
| `FS` | FastAPI | FastAPI |
| `LNX` | Linux | Linux |
| `OPS` | 运维容器 | Docker |
| `SK` | 软技能 | 软技能 |
| `HR` | 人事面 | 人事面 |

---

## 三、手动修改规范（★ 必读）

> 核心原则：**只改 `questions.json` 和 `src/`，永远不要直接改 `dist/` 或单文件 HTML**。改完运行构建脚本重新生成产物。

### 3.1 新增一道题

1. 打开 `questions.json`
2. 在对应分类的题目后追加一个对象：
   ```json
   {
     "id": 443,
     "code": "PY-50",
     "category": "流程控制",
     "question": "你的题目",
     "answer": "**要点：** 你的答案",
     "extend": "**面试追问：** 可选扩展",
     "source": "manual"
   }
   ```
3. 规则：
   - `id` = 当前最大 id + 1（查最后一条）
   - `code` = 对应 PREFIX 的**下一个序号**（不补零），保证唯一
   - `source` 填 `manual` 表示手动添加
4. 运行 `node build-v25.cjs` 重新构建

### 3.2 修改一道题

直接编辑 `questions.json` 里对应题目的 `question` / `answer` / `extend` / `category` 字段即可。改完重新构建。

> 改 `category` 时注意：若新分类属于不同 PREFIX，需同步改 `code` 前缀，并保证序号不冲突。

### 3.3 删除一道题

从 `questions.json` 删除该对象。**不要重新编号**其他题的 `id`/`code`（历史外链可能引用）。重新构建。

### 3.4 新增分类

1. 在 `tools/merge.cjs` 的 `PREFIX` 映射表里加一行 `'新分类': 'XX'`
2. 若分类名不规范，在 `RENAME` 里加映射
3. 在 `questions.json` 里新增题目时用新分类名 + 新前缀序号
4. 同步更新本文档 2.3 的 PREFIX 映射表

### 3.5 改样式

1. 打开 `src/css/` 对应模块（`base.css` 主题变量 / `flashcard.css` 卡片 / `memo.css` 记背 / `guide.css` 指导 / `editor.css` 编辑）
2. 全局颜色/圆角/阴影在 `base.css` 的 `:root` 变量里改，一处生效
3. 运行 `node build-v25.cjs` 重新构建

### 3.6 加/改功能逻辑

1. 逻辑代码在 `src/js/` 分模块：`data-loader.js`(加载) `markdown.js`(渲染) `flashcard.js`(抽背) `memo.js`(记背) `guide.js`(指导) `editor.js`(编辑) `store.js`(持久化) `app.js`(入口/模式切换)
2. 改完重新构建（构建脚本会把模块合并进最终 HTML）

### 3.7 重建产物（每次改动后必做）

```bash
node build-v25.cjs
```

产出：
- `dist/面试背记学习卡v2.5.html` —— 单文件版（数据内联）
- `dist/web/` —— 分片 PWA 版（数据分片 + manifest + sw.js）

---

## 四、构建流程

```
questions.json（真源）
      │
      ▼
build-v25.cjs ──► 校验(code唯一/字段齐全)
      │
      ├─► 生成单文件版（数据内联 + CSS/JS 合并）
      └─► 生成分片版（flashcard-data-0..n.js + manifest + PWA）
```

---

## 五、数据工具（tools/）

| 脚本 | 作用 |
|------|------|
| `extract.cjs` | 从 v2.4 HTML / bh-mindmaps 分片提取原始数据 → `_v24.json` / `_bh.json` |
| `merge.cjs` | 合并 + 题码分配 + 审查 → `questions.json` + `_review_report.json` |
| `extract-pdf.py` | 从 PDF 抽取全量文本（后续里程碑） |
| `extract-figures.cjs` | 图内容提取（后续里程碑） |

---

## 六、禁止事项（红线）

- ❌ **不要直接编辑** `dist/` 里的 HTML、`flashcard-data-*.js`、`manifest` —— 都是构建产物，下次构建会被覆盖
- ❌ **不要手工改** `id`/`code` 导致重复 —— 会破坏数据唯一性
- ❌ **不要**在 `questions.json` 里写非法 JSON（如裸换行、未转义引号）—— 代码块内换行用 `\n`
- ❌ **不要**把 399 张 figures 打包进单文件版 —— 保持轻量
- ❌ **不要删除** `figures/`、`mindmaps/`、`vendor/` 源目录（dist 远程版需要）
- ❌ **不要**在数据里手写 `{PREFIX}-{N}` 以外的题码格式

---

*更多版本演进细节见 `CHANGELOG.md`。*
