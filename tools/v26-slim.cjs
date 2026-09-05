// v2.6 面试导向精简脚本
// ①删所有算法题 ②大幅简化 ML/DL/Transformer ③其他题以"通过面试"为唯一目标精简
// ④合并 <5 道的小分类
// 用法：node tools/v26-slim.cjs
const fs = require('fs');
const path = require('path');
const BASE = path.resolve(__dirname, '..');
const QFILE = path.join(BASE, 'questions.json');

const data = JSON.parse(fs.readFileSync(QFILE, 'utf8'));

// ============================================================
// 删除清单（面试导向：删算法题 + 删公式推导/实现细节/过深内容，81 题）
// ============================================================
const DELETE = [
  // ---- 数据结构算法（全部 LeetCode 算法题，笔试才考） ----
  'DS-4', 'DS-6', 'DS-7', 'DS-8', 'DS-9', 'DS-15', 'DS-16', 'DS-17', 'DS-21', 'DS-25',

  // ---- 深度学习（删数学计算/工具/实操，留概念） ----
  'DL-2', 'DL-6', 'DL-7',

  // ---- 循环神经网络（删输入输出模式/Teacher Forcing/为什么Transformer） ----
  'DL-14', 'DL-19', 'DL-20',

  // ---- Transformer（删公式推导/过深细节，只留架构+位置编码+注意力概念） ----
  'DL-21', 'DL-23', 'DL-24', 'DL-27', 'DL-28',

  // ---- 机器学习（删理论/实操细节） ----
  'ML-3', 'ML-5', 'ML-8', 'ML-9', 'ML-35',

  // ---- 线性回归（删公式/正规方程/手写梯度/sklearn流程） ----
  'ML-17', 'ML-18', 'ML-22', 'ML-25', 'ML-26', 'ML-28', 'ML-30',

  // ---- 逻辑回归（删交叉熵推导/sklearn实操） ----
  'ML-41', 'ML-43',

  // ---- NLP（删超长文本XLNet/BERT+CRF过深） ----
  'NLP-8', 'NLP-10',

  // ---- NumPy（删函数/属性/创建细节，留核心概念） ----
  'PD-5', 'PD-8', 'PD-9', 'PD-12', 'PD-20', 'PD-22', 'PD-23', 'PD-24',

  // ---- Pandas（删创建/属性/读写/apply/绘图细节） ----
  'PD-33', 'PD-34', 'PD-38', 'PD-44', 'PD-47',

  // ---- FastAPI（删响应模型/上传/路由/目录，留核心） ----
  'FS-5', 'FS-9', 'FS-11', 'FS-15',

  // ---- 大模型应用（删文档解析实操/LLaMA-Factory/Datasets工具） ----
  'LLM-4', 'LLM-12', 'LLM-16',

  // ---- Python 基础（删过基础的分支/循环语法题） ----
  'PY-7', 'PY-8', 'PY-9',

  // ---- 并发（删孤儿/僵尸进程底层） ----
  'PYH-8',

  // ---- MySQL（删建表语法/数据类型/函数/窗口函数/底层BufferPool） ----
  'DB-3', 'DB-4', 'DB-10', 'DB-12', 'DB-16', 'DB-34', 'DB-35', 'DB-38', 'DB-39', 'DB-40',

  // ---- Linux（删APT/用户管理/find/ps/crontab细节） ----
  'LNX-4', 'LNX-11', 'LNX-16', 'LNX-19', 'LNX-21',

  // ---- Nginx（删配置文件细节） ----
  'NG-6',

  // ---- HTTP（删三次握手[并入TCP/UDP题]/上网流程） ----
  'HTTP-6', 'HTTP-7',

  // ---- Redis（删键过期细节/Redis vs MySQL基础） ----
  'DB-52', 'DB-55',
];

// ============================================================
// 分类合并（<5 道的类）
// ============================================================
const MERGE_CAT = {
  '深度学习-循环神经网络': '深度学习',
  '深度学习-注意力与Transformer': '深度学习',
  'NLP基础': '大模型应用',
  'NumPy': 'Pandas',
};

const delSet = new Set(DELETE);
let deleted = 0;
const kept = [];
for (const c of data) {
  if (delSet.has(c.code)) { deleted++; continue; }
  if (MERGE_CAT[c.category]) c.category = MERGE_CAT[c.category];
  kept.push(c);
}

fs.writeFileSync(QFILE, JSON.stringify(kept, null, 2), 'utf8');

const bishua = kept.filter(c => (c.star || 0) >= 4);
const tuo = kept.filter(c => (c.star || 0) >= 1 && (c.star || 0) <= 3);

console.log('=== v2.6 精简结果 ===');
console.log(`删除题目: ${deleted} 题`);
console.log(`剩余总题数: ${kept.length}`);
console.log(`  必刷(4-5星): ${bishua.length} 题`);
console.log(`  拓展(1-3星): ${tuo.length} 题`);

const byCat = {};
kept.forEach(c => { byCat[c.category] = (byCat[c.category] || 0) + 1; });
console.log('\n=== 最终分类分布 ===');
Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
  const bs = kept.filter(c => c.category === k && (c.star || 0) >= 4).length;
  console.log(`  ${String(v).padStart(3)} (${String(bs).padStart(2)}必)  ${k}${v < 5 ? ' ← <5' : ''}`);
});
