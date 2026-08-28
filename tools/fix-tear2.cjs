#!/usr/bin/env node
/**
 * fix-tear2.cjs — 修复 bh 数据源的题目撕裂
 * 1) HR-17：题目被截断，续句在答案开头 → 归位
 * 2) CV-10/CV-11：同一道「参数设置」题被拆成两半 → 合并，删 CV-11
 * 3) 重排 code + id
 */
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'questions.json');

const PREFIX = {
  'Python基础': 'PY', '流程控制': 'PY', '数据结构': 'PY', '函数与作用域': 'PY',
  '面向对象': 'PY', '异常处理': 'PY', '文件操作': 'PY', '网络编程': 'PY',
  '正则表达式': 'PY', '模块与包': 'PY',
  'Python高级': 'PYH', '并发编程': 'PYH', '综合进阶': 'PYH',
  'NumPy': 'PD', 'Pandas': 'PD', '数据处理与统计分析': 'PD',
  'Linux': 'LNX', 'Linux&Shell基础': 'LNX',
  'Docker': 'OPS',
  'MySQL': 'DB', '数据库与ORM': 'DB', '缓存与Redis': 'DB',
  '机器学习': 'ML', '机器学习-线性回归': 'ML', '机器学习-逻辑回归': 'ML', '机器学习-数据处理': 'ML',
  '深度学习': 'DL', '深度学习-循环神经网络': 'DL', '深度学习-注意力与Transformer': 'DL',
  'NLP基础': 'NLP', '计算机视觉': 'CV', '数据结构算法': 'DS',
  '软技能': 'SK', '人事面': 'HR', 'FastAPI': 'FS',
};

function main() {
  let data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

  // ---- 1) HR-17：题目续句归位 ----
  const hr17 = data.find(c => c.code === 'HR-17');
  if (hr17) {
    const m = hr17.answer.match(/^(怎么看这个问题\?你准备怎么办\?)\s*\n*\s*/);
    if (m) {
      hr17.question = hr17.question.trim() + m[1];
      hr17.answer = hr17.answer.slice(m[0].length).trim();
      console.log('✓ HR-17 续句归位');
    }
  }

  // ---- 2) CV-10/CV-11 合并 ----
  const cv10 = data.find(c => c.code === 'CV-10');
  const cv11 = data.find(c => c.code === 'CV-11');
  if (cv10 && cv11) {
    // CV-10 的 answer 结尾「一般初始设置为」接上 learning-rate 的完整描述 + CV-11 的答案
    cv10.answer = cv10.answer.replace(/一般初始设置为\s*$/, '一般初始设置为 0.01，然后每次除以 2 或者 5 来改进，得到最终值；')
      + '\n\n' + cv11.answer.trim();
    cv10.question = cv10.question.replace(/网路/g, '网络'); // 顺便修错字
    data = data.filter(c => c.code !== 'CV-11');
    console.log('✓ CV-10/CV-11 合并，删除 CV-11');
  }

  // ---- 3) 重排 code + id ----
  const counters = {};
  data.forEach((c, i) => {
    const p = PREFIX[c.category] || 'XX';
    counters[p] = (counters[p] || 0) + 1;
    c.code = `${p}-${counters[p]}`;
    c.id = i + 1;
  });

  fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ 写入完成：共 ${data.length} 题`);
}

main();
