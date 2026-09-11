#!/usr/bin/env node
/** docs-update-v212.cjs — 一次性更新 README.md / CHANGELOG.md 到 v2.12（幂等：逐条断言命中） */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function apply(file, pairs) {
  const p = path.join(ROOT, file);
  let s = fs.readFileSync(p, 'utf8');
  pairs.forEach(([oldS, newS], i) => {
    if (!s.includes(oldS)) throw new Error(`${file} 第 ${i + 1} 条未命中: ${oldS.slice(0, 50)}`);
    if (oldS === newS) throw new Error(`${file} 第 ${i + 1} 条新旧相同`);
    s = s.split(oldS).join(newS);
  });
  fs.writeFileSync(p, s, 'utf8');
  console.log('✓ ' + file + ' 已更新（' + pairs.length + ' 处）');
}

apply('README.md', [
  ['# 面试背记学习卡 v2.11', '# 面试背记学习卡 v2.12'],
  ['- **题库**：271 题，按 1-5 星重要性分级，支持「必刷/拓展」双开关筛选；**4 个主题库（4 级压缩）**——库1 完整(271) / 库2 标准(236) / 库3 精简(199) / 库4 极简(99)，首次打开可选，编辑模式可切换',
   '- **题库**：361 题（29 个分类），按 1-5 星重要性分级，支持「必刷/拓展」双开关筛选；**4 个主题库（4 级压缩）**——库1 完整(361) / 库2 标准(326) / 库3 精简(273) / 库4 极简(120)，首次打开可选，编辑模式可切换'],
  ['单文件 `面试背记学习卡v2.11.html`（双击即用）', '单文件 `面试背记学习卡v2.12.html`（双击即用）'],
  ['题库空白可一键恢复）', '题库空白可一键恢复；**v2.12 扩充**：题库 271→361 题，新增 MCP / LangGraph / Agent 智能体 / AI 应用工程 / 提示词工程 / SQLAlchemy / AI 场景设计 共 7 个分类，档位上限适当放宽（库3<320 / 库4<180））'],
  ['直接双击打开 `dist/面试背记学习卡v2.11.html` 即可', '直接双击打开 `dist/面试背记学习卡v2.12.html` 即可'],
  ['    ├── 面试背记学习卡v2.11.html  # 单文件版', '    ├── 面试背记学习卡v2.12.html  # 单文件版'],
  ['| 库1 完整版 | 必刷 + 拓展全量，零删减 | 271 | — |\n| 库2 标准版 | 去冷门与细微分枝 | 236 | — |\n| 库3 精简版 | 只留主干高频 | 199 | <200 ✓ |\n| 库4 极简版 | 面试冲刺最核心 | 99 | <100 ✓ |',
   '| 库1 完整版 | 必刷 + 拓展全量，零删减 | 361 | — |\n| 库2 标准版 | 去冷门与细微分枝 | 326 | — |\n| 库3 精简版 | 只留主干高频 | 273 | <320 ✓ |\n| 库4 极简版 | 面试冲刺最核心 | 120 | <180 ✓ |'],
  ['- 分配脚本 `tools/bank-assign.cjs`（显式题码清单：CORE/MINOR/COLD/HR_COLD 四组，幂等可重跑）。',
   '- 分配脚本 `tools/bank-assign.cjs`（显式题码清单：CORE/MINOR/COLD/HR_COLD 四组，幂等可重跑）。\n- **v2.12 增量并入脚本**：`tools/merge-v212.cjs`（解析 `tools/newq-v212-part*.txt` 行式源文件并追加；用文本分隔符而非 JSON，避免长中文答案的转义问题）；`tools/docs-update-v212.cjs` 同步更新文档。'],
  ['- `dist/面试背记学习卡v2.10.html` —— 单文件版（数据内联）', '- `dist/面试背记学习卡v2.12.html` —— 单文件版（数据内联）'],
]);

apply('CHANGELOG.md', [
  ['| **v2.11** | 2026-09-07 | 修 confirmLogin 中 markDirty debounced 500ms 被 location.reload() 砍掉导致"修改后再登录题库空白"的潜在根因：改用 await Cloud.push() 真正等推送完成再 reload；编辑工具栏新增「☁️ 从云端拉取」和「🔍 诊断」两个应急按钮；bump SW CACHE fc-v35→fc-v36 |',
   '| **v2.11** | 2026-09-07 | 修 confirmLogin 中 markDirty debounced 500ms 被 location.reload() 砍掉导致"修改后再登录题库空白"的潜在根因：改用 await Cloud.push() 真正等推送完成再 reload；编辑工具栏新增「☁️ 从云端拉取」和「🔍 诊断」两个应急按钮；bump SW CACHE fc-v35→fc-v36 |\n| **v2.12** | 2026-09-11 | 题库扩充+分类扩展：271→361 题（新增 90 题）；新增 MCP(7) / LangGraph(8) / Agent 智能体(10) / AI 应用工程(10) / 提示词工程(5) / SQLAlchemy(5) / AI 场景设计(8) 共 7 个分类，并扩展 LangChain(+12) / RAG(+11) / 大语言模型(+7) / 缓存与Redis(+4) / 软技能(+3)；来源为 `ai-agents-from-zero` 教材题库、`C:\\LLM0903` 实战课、SQLAlchemy 2.0 文档与 Comate 异步 ORM 指南；档位上限适当放宽（库3<200→<320、库4<100→<180）；bump SW CACHE fc-v36→fc-v37 |'],
]);
