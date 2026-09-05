#!/usr/bin/env node
/**
 * remove.cjs — 删除指定分类的题目（图片损坏的计算机视觉 + 暂不需要的 Docker）
 * 用法: node tools/remove.cjs
 */
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'questions.json');

const PREFIX = {
  'Python基础': 'PY', '数据结构': 'PY', '函数与作用域': 'PY', '面向对象': 'PY', '正则表达式': 'PY',
  'Python高级': 'PYH', '并发编程': 'PYH', '综合进阶': 'PYH',
  'NumPy': 'PD', 'Pandas': 'PD', '数据处理与统计分析': 'PD',
  'Linux': 'LNX', 'Docker': 'OPS',
  'MySQL': 'DB', '数据库与ORM': 'DB', '缓存与Redis': 'DB',
  '机器学习': 'ML', '机器学习-线性回归': 'ML', '机器学习-逻辑回归': 'ML', '机器学习-数据处理': 'ML',
  '深度学习': 'DL', '深度学习-循环神经网络': 'DL', '深度学习-注意力与Transformer': 'DL',
  'NLP基础': 'NLP', '计算机视觉': 'CV', '数据结构算法': 'DS',
  '软技能': 'SK', '人事面': 'HR', 'FastAPI': 'FS',
};

const REMOVE = new Set(['计算机视觉', 'Docker']);

function main() {
  let data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const before = data.length;
  data = data.filter(c => !REMOVE.has(c.category));
  const removed = before - data.length;

  // 重新编号
  const counters = {};
  data.forEach((c, i) => {
    const p = PREFIX[c.category] || 'XX';
    counters[p] = (counters[p] || 0) + 1;
    c.code = `${p}-${counters[p]}`;
    c.id = i + 1;
  });

  fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ 删除 ${removed} 题（计算机视觉 + Docker），剩余 ${data.length} 题`);

  const byCat = {};
  data.forEach(c => { byCat[c.category] = (byCat[c.category] || 0) + 1; });
  console.log('\n=== 剩余分类 ===');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + String(v).padStart(3) + '  ' + k));
}

main();
