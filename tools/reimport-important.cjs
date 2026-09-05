#!/usr/bin/env node
/**
 * reimport-important.cjs — 从 v2.4（含 v2.0~v2.4 全量）挑出被精简删掉的「重要高频题」加回题库
 * 用法: node tools/reimport-important.cjs
 * 说明:
 *   - 数据源 tools/_v24.json（v2.4 全集 280 题），按 question 关键词精确匹配
 *   - 仅加回「面试高频 + 当前题库缺失」的题，避开用户明确删除的 Docker/算法题/公式推导/工具实操
 *   - 幂等：已存在的题（按 question 去空白匹配）自动跳过
 *   - 新题分配：id 全局递增、code 按 PREFIX 下一个序号、star 按面试频次、source=v2.4-reimport
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CUR = path.join(ROOT, 'questions.json');
const V24 = path.join(__dirname, '_v24.json');

// 分类重映射：v2.4 旧分类 → 当前分类
const CAT_MAP = {
  '流程控制': 'Python基础',
  'NumPy': 'Pandas',
  '机器学习-数据处理': '机器学习',
  '深度学习-循环神经网络': '深度学习',
  '深度学习-注意力与Transformer': '深度学习',
};

// 分类 → PREFIX
const CAT_PREFIX = {
  'Python基础': 'PY', '数据结构': 'PY', '函数与作用域': 'PY', '面向对象': 'PY',
  '并发编程': 'PYH', '综合进阶': 'PYH',
  'MySQL': 'DB', '缓存与Redis': 'DB',
  'Pandas': 'PD',
  'Linux': 'LNX',
  '机器学习': 'ML', '机器学习-逻辑回归': 'ML',
  '深度学习': 'DL',
  'FastAPI': 'FS',
  '软技能': 'SK', '人事面': 'HR', '大模型应用': 'LLM', 'Nginx': 'NG', 'HTTP协议': 'HTTP',
};

// 待加回清单：关键词 → [星级, 新分类]
// star 按面试频次：5=核心必考，4=重要，3=拓展（基础/命令细节）
const WANTED = [
  // MySQL（9）
  ['窗口函数？与GROUP BY', 5, 'MySQL'],
  ['ROW_NUMBER()、RANK()', 5, 'MySQL'],
  ['什么时候不适合建立索引', 5, 'MySQL'],
  ['Using filesort', 4, 'MySQL'],
  ['JOIN查询有哪些优化', 5, 'MySQL'],
  ['数据库CPU突然打满', 4, 'MySQL'],
  ['too many connections', 4, 'MySQL'],
  ['为什么不建议用UUID', 5, 'MySQL'],
  ['Buffer Pool、脏页和页分裂', 5, 'MySQL'],
  // 并发编程（3）
  ['Queue和Manager的区别', 4, '并发编程'],
  ['孤儿进程和僵尸进程', 4, '并发编程'],
  ['threading.Thread和multiprocessing.Process', 4, '并发编程'],
  // 面向对象（3）
  ['super()在单继承和多继承', 4, '面向对象'],
  ['类与对象的概念、__init__和self', 4, '面向对象'],
  ['封装机制：公有、保护、私有', 4, '面向对象'],
  // 流程控制（2 → Python基础）
  ['while循环、while-else', 3, '流程控制'],
  ['for循环原理、range()', 3, '流程控制'],
  // 综合进阶（1）
  ['for循环的底层实现原理', 4, '综合进阶'],
  // NumPy（1 → Pandas）
  ['布尔索引？什么是花式索引', 3, 'NumPy'],
  // Pandas（3）
  ['apply的用法？axis参数', 4, 'Pandas'],
  ['pivot_table透视表的参数', 4, 'Pandas'],
  ['如何读写CSV和Excel', 3, 'Pandas'],
  // Linux（4）
  ['su和su -的区别', 3, 'Linux'],
  ['find命令的用法', 3, 'Linux'],
  ['crontab定时任务的格式', 3, 'Linux'],
  ['df、du、basename', 3, 'Linux'],
  // 机器学习（3）
  ['机器学习三要素：模型', 4, '机器学习'],
  ['机器学习的标准建模流程', 4, '机器学习'],
  ['测试集只能用 transform', 5, '机器学习-数据处理'],
  // 逻辑回归（1）
  ['召回率比精确率更重要', 4, '机器学习-逻辑回归'],
  // 深度学习（5）
  ['深度学习与传统机器学习的区别', 5, '深度学习'],
  ['人工神经元的完整计算过程', 4, '深度学习'],
  ['为什么RNN之后出现了Transformer', 5, '深度学习-循环神经网络'],
  ['因果掩码和填充掩码', 4, '深度学习-注意力与Transformer'],
  ['残差连接和层归一化', 5, '深度学习-注意力与Transformer'],
  // FastAPI（4）
  ['response_model的作用', 4, 'FastAPI'],
  ['Query/Path/Body验证工具', 4, 'FastAPI'],
  ['APIRouter模块化路由', 4, 'FastAPI'],
  ['表单数据Form与JSON', 3, 'FastAPI'],
];

const norm = s => String(s == null ? '' : s).replace(/\s+/g, '');

function main() {
  const cur = JSON.parse(fs.readFileSync(CUR, 'utf8'));
  const v24 = JSON.parse(fs.readFileSync(V24, 'utf8'));

  const curSet = new Set(cur.map(c => norm(c.question)));
  // 各前缀当前最大序号
  const maxN = {};
  cur.forEach(c => {
    const m = (c.code || '').match(/^([A-Z]+)-(\d+)$/);
    if (m) maxN[m[1]] = Math.max(maxN[m[1]] || 0, parseInt(m[2], 10));
  });
  let nextId = cur.reduce((mx, c) => Math.max(mx, c.id || 0), 0);

  const added = [];
  const skipped = [];
  const missing = [];

  for (const [key, star, oldCat] of WANTED) {
    const hit = v24.find(c => (c.question || '').includes(key));
    if (!hit) { missing.push(key); continue; }
    if (curSet.has(norm(hit.question))) { skipped.push(key); continue; }

    const newCat = CAT_MAP[oldCat] || oldCat;
    const pfx = CAT_PREFIX[newCat];
    if (!pfx) { missing.push(key + '(无PREFIX: ' + newCat + ')'); continue; }

    maxN[pfx] = (maxN[pfx] || 0) + 1;
    nextId += 1;
    const item = {
      id: nextId,
      code: pfx + '-' + maxN[pfx],
      category: newCat,
      question: hit.question,
      answer: hit.answer,
      extend: hit.extend || '',
      source: 'v2.4-reimport',
      star,
    };
    cur.push(item);
    curSet.add(norm(hit.question));
    added.push(item.code + '  ' + newCat + '  ' + star + '星  ' + (hit.question || '').slice(0, 30));
  }

  // 校验：code/id 唯一
  const codes = new Set(), ids = new Set(), errs = [];
  cur.forEach(c => {
    if (codes.has(c.code)) errs.push('code 重复: ' + c.code); codes.add(c.code);
    if (ids.has(c.id)) errs.push('id 重复: ' + c.id); ids.add(c.id);
  });

  console.log('=== 加回重要题 ===');
  console.log('已加回 ' + added.length + ' 题：');
  added.forEach(a => console.log('  + ' + a));
  if (skipped.length) console.log('\n已存在跳过 ' + skipped.length + ' 题：' + skipped.join(' | '));
  if (missing.length) console.log('\n⚠ 未匹配 ' + missing.length + ' 题：' + missing.join(' | '));

  if (errs.length) {
    console.error('\n校验失败：');
    errs.forEach(e => console.error('  ✗ ' + e));
    process.exit(1);
  }

  fs.writeFileSync(CUR, JSON.stringify(cur, null, 2), 'utf8');
  console.log('\n✓ 写入 questions.json：' + cur.length + ' 题（原 ' + (cur.length - added.length) + ' + 新增 ' + added.length + '）');

  // 分类统计
  const catStat = {};
  cur.forEach(c => { catStat[c.category] = (catStat[c.category] || 0) + 1; });
  console.log('\n=== 当前分类分布 ===');
  Object.entries(catStat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(3) + '  ' + k));
}

main();
