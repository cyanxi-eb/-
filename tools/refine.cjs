#!/usr/bin/env node
/**
 * refine.cjs — 题库质量治理：分类合并 + 重要性分级（1-5 星）
 *
 * 1) 分类合并：少于 5 道的 Python 细分（流程控制/异常处理/文件操作/网络编程/模块与包）
 *    合并进「Python基础」
 * 2) 重要性分级：加 star 字段（1-5 星）
 *    规则：
 *      - 基础分：v2.4=4 星，bh/bh-fixed=3 星
 *      - 5 星（必刷核心）：命中 CORE_KEYWORDS（面试高频必考）
 *      - 2 星（拓展）：人事面/软技能 分类
 *      - 1 星（兴趣/额外）：命中 COLD_KEYWORDS（冷门、价值低）
 * 3) 重新编号 id + code
 *
 * 用法: node tools/refine.cjs
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

// 5 星核心必考关键词（面试高频）
const CORE_KEYWORDS = [
  // MySQL
  '事务', '隔离级别', '索引', 'EXPLAIN', '锁', 'MVCC', '主从', '慢查询', '回表', '覆盖索引',
  // Python
  '深浅拷贝', '装饰器', '生成器', '迭代器', 'GIL', '闭包', '元类', 'is和==', '可变类型', '不可变类型',
  '垃圾回收', '多线程', '多进程', '协程', '内存管理', '装饰器的实质',
  // 算法/数据结构
  'LRU', '反转链表', '两数之和', '排序', '二分', '快排', '归并', '二叉树', '动态规划', '爬楼梯',
  '斐波那契', '哈希', '栈', '队列',
  // 深度学习
  'Transformer', '注意力', 'BERT', 'LSTM', '梯度消失', '梯度爆炸', '激活函数', '归一化', 'BatchNorm',
  'RNN', '反向传播', 'Dropout', '损失函数',
  // 机器学习
  '过拟合', '欠拟合', '正则化', '梯度下降', '逻辑回归', '线性回归', '偏差', '方差', '交叉验证',
  '特征工程', '随机森林',
];

// 1 星冷门/兴趣关键词（价值低）
const COLD_KEYWORDS = [
  '社保', '家庭', '朋友', '业余爱好', '星座', '加班', '跳槽', '性格', '薪资构成', '什么时候能入职',
  '性+格', '你欣赏哪种', '学历和能力', '谈谈你对跳槽', '对加班的看法',
];

// 分类合并映射（少于 5 道 → 合并目标）
const MERGE = {
  '流程控制': 'Python基础',
  '异常处理': 'Python基础',
  '文件操作': 'Python基础',
  '网络编程': 'Python基础',
  '模块与包': 'Python基础',
};

function assignStar(c) {
  const q = c.question || '';
  // 1) 核心必考 → 5 星（最高优先级）
  if (CORE_KEYWORDS.some(k => q.includes(k))) return 5;
  // 2) 冷门/兴趣 → 1 星
  if (COLD_KEYWORDS.some(k => q.includes(k))) return 1;
  // 3) 人事面/软技能 → 2 星（非技术核心）
  if (c.category === '人事面' || c.category === '软技能') return 2;
  // 4) 基础分：v2.4=4，bh=3
  return c.source === 'v2.4' ? 4 : 3;
}

function main() {
  let data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

  // ---- 1) 分类合并 ----
  let merged = 0;
  data.forEach(c => {
    if (MERGE[c.category]) { c.category = MERGE[c.category]; merged++; }
  });
  console.log(`✓ 分类合并：${merged} 道题并入目标分类`);

  // ---- 2) 星级分级 ----
  data.forEach(c => { c.star = assignStar(c); });

  // ---- 3) 重新编号 ----
  const counters = {};
  data.forEach((c, i) => {
    const p = PREFIX[c.category] || 'XX';
    counters[p] = (counters[p] || 0) + 1;
    c.code = `${p}-${counters[p]}`;
    c.id = i + 1;
  });

  fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');

  // ---- 统计 ----
  const byCat = {};
  const byStar = {};
  data.forEach(c => {
    byCat[c.category] = (byCat[c.category] || 0) + 1;
    byStar[c.star] = (byStar[c.star] || 0) + 1;
  });

  console.log(`✓ 写入完成：共 ${data.length} 题`);
  console.log('\n=== 星级分布 ===');
  [5, 4, 3, 2, 1].forEach(s => console.log(`  ${s}星: ${byStar[s] || 0} 题`));
  console.log(`  必刷(4-5星): ${(byStar[4] || 0) + (byStar[5] || 0)} 题`);
  console.log(`  拓展(1-3星): ${(byStar[1] || 0) + (byStar[2] || 0) + (byStar[3] || 0)} 题`);

  console.log('\n=== 分类分布（按题数） ===');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log('  ' + String(v).padStart(3) + '  ' + k + (v < 5 ? '  ← 少于5道' : ''));
  });
}

main();
