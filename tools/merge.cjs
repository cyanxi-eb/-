#!/usr/bin/env node
/**
 * merge.cjs — 合并 v2.4 + bh-mindmaps 题库，分配统一题码，输出 questions.json
 * 策略（保守）：v2.4 280 题全保留（高质量主体）；bh-mindmaps 互补分类并入；
 *              重叠分类（Python/数据处理/ML/DL/Linux）暂不并入 → 存 _bh_overlap.json 待后续去重。
 * 用法: node tools/merge.cjs
 * 输出: questions.json  tools/_bh_overlap.json  tools/_review_report.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const v24 = JSON.parse(fs.readFileSync(path.join(__dirname, '_v24.json'), 'utf8'));
const bh = JSON.parse(fs.readFileSync(path.join(__dirname, '_bh.json'), 'utf8'));

// ---------- 1. category → PREFIX 映射（大类题码前缀） ----------
const PREFIX = {
  'Python基础': 'PY', '流程控制': 'PY', '数据结构': 'PY', '函数与作用域': 'PY',
  '面向对象': 'PY', '异常处理': 'PY', '文件操作': 'PY', '网络编程': 'PY',
  '正则表达式': 'PY', '模块与包': 'PY',
  'Python高级': 'PYH', '并发编程': 'PYH', '综合进阶': 'PYH',
  'NumPy': 'PD', 'Pandas': 'PD', '数据处理与统计分析': 'PD',
  'Linux': 'LNX', 'Linux&Shell基础': 'LNX',
  'Docker': 'OPS',
  'MySQL': 'DB', 'ORM 与数据库': 'DB', '缓存与Redis': 'DB',
  '机器学习': 'ML', '机器学习-线性回归': 'ML', '机器学习-逻辑回归': 'ML', '机器学习-数据处理': 'ML',
  '深度学习': 'DL', '深度学习-循环神经网络': 'DL', '深度学习-注意力与Transformer': 'DL',
  'NLP基础': 'NLP',
  '计算机视觉': 'CV',
  '数据结构算法': 'DS',
  '软技能': 'SK',
  '注意事项': 'HR',
  'FastAPI': 'FS', 'FastAPI 基础': 'FS', 'FastAPI 进阶特性': 'FS', 'FastAPI安全': 'FS',
  'FastAPI项目': 'FS', 'FastAPI应用': 'FS',
};

// 分类重命名（bh-mindmaps 粗糙分类名 → 规范名）
const RENAME = {
  '注意事项': '人事面',
  'FastAPI 基础': 'FastAPI',
  'FastAPI 进阶特性': 'FastAPI',
  'FastAPI安全': 'FastAPI',
  'FastAPI项目': 'FastAPI',
  'FastAPI应用': 'FastAPI',
  'ORM 与数据库': '数据库与ORM',
  'Linux&Shell基础': 'Linux',
};

// bh-mindmaps 中与 v2.4 重叠、需后续去重的分类（本轮不并入）
const OVERLAP_CATEGORIES = new Set([
  'Python基础', 'Python高级', '数据处理与统计分析', '机器学习', '深度学习', 'Linux&Shell基础',
]);

// ---------- 2. 代码审查：检测撕裂代码（answer 中 ``` 代码块未成对） ----------
function codeBlockPairs(text) {
  if (!text) return 0;
  return (text.match(/```/g) || []).length;
}
function reviewFlags(c) {
  const flags = [];
  const fences = codeBlockPairs(c.answer);
  if (fences % 2 !== 0) flags.push('代码块未闭合(可能撕裂)');
  if (c.answer && c.answer.length < 20) flags.push('答案过短');
  if (!c.question || c.question.trim().length === 0) flags.push('题目为空');
  // 排除数学符号 ×(U+00D7) ÷(U+00F7)，仅检测真正的 GBK 误读乱码字符
  if (/[\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff][\u4e00-\u9fa5]|[\u4e00-\u9fa5][\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff]/.test((c.question || '') + (c.answer || ''))) flags.push('疑似编码乱码');
  return flags;
}

// 清洗题面编号前缀（bh-mindmaps 的 "1."、"4. 1"、"2. 1" 等混编编号）
function cleanQuestion(q, isBh) {
  if (!isBh) return (q || '').trim();
  return (q || '').replace(/^\s*\d+(?:\.\s*\d+)*[.、]?\s+/, '').trim();
}

// ---------- 3. 组装题目（统一字段 + 分配 code） ----------
const counters = {}; // prefix -> 已用序号
let nextId = 1;
const items = [];
const review = [];

function addItem(src) {
  const prefix = PREFIX[src.category];
  if (!prefix) { review.push({ id: src.id, cat: src.category, src: src.source, flags: ['无 PREFIX 映射'] }); return; }
  const cat = RENAME[src.category] || src.category;
  const n = (counters[prefix] = (counters[prefix] || 0) + 1);
  const item = {
    id: nextId++,
    code: `${prefix}-${n}`,   // 序号不补零
    category: cat,
    question: cleanQuestion(src.question, src.source === 'bh'),
    answer: (src.answer || '').trim(),
    extend: (src.extend || '').trim(),
    source: src.source,
  };
  const flags = reviewFlags(item);
  if (flags.length) review.push({ id: item.id, code: item.code, cat: cat, src: item.source, flags });
  items.push(item);
  return item;
}

// v2.4 全量保留
v24.forEach(c => addItem({ ...c, source: 'v2.4' }));

// bh-mindmaps：互补分类并入，重叠分类暂存
const bhOverlap = [];
bh.forEach(c => {
  if (OVERLAP_CATEGORIES.has(c.category)) { bhOverlap.push(c); return; }
  addItem({ ...c, source: 'bh' });
});

// ---------- 4. 输出 ----------
fs.writeFileSync(path.join(ROOT, 'questions.json'), JSON.stringify(items, null, 2), 'utf8');
fs.writeFileSync(path.join(__dirname, '_bh_overlap.json'), JSON.stringify(bhOverlap, null, 2), 'utf8');
fs.writeFileSync(path.join(__dirname, '_review_report.json'), JSON.stringify(review, null, 2), 'utf8');

// ---------- 5. 统计 ----------
console.log(`合并完成：共 ${items.length} 题（v2.4 保留 ${v24.length} + bh 互补 ${items.length - v24.length}）`);
console.log(`重叠分类暂存 ${bhOverlap.length} 题 → tools/_bh_overlap.json`);
console.log(`待审查 ${review.length} 题 → tools/_review_report.json`);
const byPrefix = {};
items.forEach(i => { byPrefix[i.code.split('-')[0]] = (byPrefix[i.code.split('-')[0]] || 0) + 1; });
console.log('\n题码分布：');
Object.entries(byPrefix).sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => console.log(`  ${k}  ${v} 题`));
console.log('\n待审查项（前 30 条）：');
review.slice(0, 30).forEach(r => console.log(`  #${r.id} ${r.code || ''} [${r.cat}] ${r.flags.join(' / ')}`));
