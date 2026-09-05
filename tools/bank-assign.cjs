// bank-assign.cjs
// 给 questions.json 每题分配 bank 字段（1/2/3/4，值越大越核心）。
// 筛选规则：主题库 N 的题集 = 所有 bank >= N 的题。
// 分配策略（显式题码清单，避免关键词误命中）：
//   bank 4 = 5星全部 + CORE_CODES（4星主干高频，极简版也保留）
//   bank 3 = 3星 + 2星软技能 + 其余 4星（默认）
//   bank 2 = 2星人事面(高频) + MINOR_CODES（4星细分）
//   bank 1 = 1星冷门 + COLD_CODES（4星最冷细分）+ HR_COLD_CODES（2星冷门话术）
// 幂等：重复运行会重新计算并覆盖 bank 字段。
const fs = require('fs');
const path = require('path');

const QPATH = path.join(__dirname, '..', 'questions.json');
const cur = require(QPATH);

// 4星 → bank 4（极简版保留的核心主干，16 题）
const CORE_CODES = [
  'PY-11', 'PY-13', 'PY-14', 'PY-40',           // Python：可变不可变/深浅拷贝/列表元组/TCP-UDP
  'DB-15', 'DB-22', 'DB-60',                    // MySQL：JOIN/存储引擎/CPU排查
  'PD-26', 'PD-29',                             // Pandas：Series-DataFrame/loc-iloc
  'ML-10', 'DL-1',                              // ML/DL：学习范式/深度学习概念
  'FS-1', 'FS-7',                               // FastAPI：框架/异步原理
  'LLM-9', 'DB-67', 'DB-68',                    // 大模型：Agent/Redis双写/淘汰策略
];

// 4星 → bank 2（明显细分，20 题）
const MINOR_CODES = [
  'PY-3', 'PY-4', 'PY-20', 'PY-21', 'PY-26', 'PY-27', 'PY-29', 'PY-34', 'PY-37', 'PY-38',
  'PYH-5', 'PYH-10',
  'DB-9', 'DB-58',
  'PD-13', 'PD-47',
  'LNX-14',
  'FS-10', 'FS-15', 'FS-16',
];

// 4星 → bank 1（最冷细分，仅完整版保留，15 题）
const COLD_CODES = [
  'PY-42', 'PYH-12', 'DB-28', 'PD-48', 'LNX-8', 'LNX-18', 'ML-39', 'ML-47', 'ML-48',
  'FS-2', 'LLM-1', 'DB-54', 'PY-30', 'PD-41', 'PYH-21',
];

// 2星人事面 → bank 1（冷门话术，仅完整版保留，10 题）
const HR_COLD_CODES = [
  'HR-2', 'HR-12', 'HR-16', 'HR-17', 'HR-18', 'HR-22', 'HR-26', 'HR-29', 'HR-33', 'HR-34',
];

const coreSet = new Set(CORE_CODES);
const minorSet = new Set(MINOR_CODES);
const coldSet = new Set(COLD_CODES);
const hrColdSet = new Set(HR_COLD_CODES);

// 校验题码存在性 + 互斥
const allCodes = new Set(cur.map(c => c.code));
for (const code of [...CORE_CODES, ...MINOR_CODES, ...COLD_CODES, ...HR_COLD_CODES]) {
  if (!allCodes.has(code)) {
    console.error('[FAIL] 题码不存在:', code);
    process.exit(1);
  }
}
const overlap = [...coreSet].filter(c => minorSet.has(c) || coldSet.has(c))
  .concat([...minorSet].filter(c => coldSet.has(c)));
if (overlap.length) {
  console.error('[FAIL] 题码在多个清单中重复:', overlap.join(','));
  process.exit(1);
}

let stat = { 1: 0, 2: 0, 3: 0, 4: 0 };

for (const c of cur) {
  let bank;
  if (c.star === 5) {
    bank = 4;
  } else if (c.star === 1) {
    bank = 1;
  } else if (c.star === 2) {
    if (c.category === '软技能') bank = 3;
    else if (hrColdSet.has(c.code)) bank = 1;
    else bank = 2;
  } else if (c.star === 3) {
    bank = 3;
  } else if (c.star === 4) {
    if (coreSet.has(c.code)) bank = 4;
    else if (minorSet.has(c.code)) bank = 2;
    else if (coldSet.has(c.code)) bank = 1;
    else bank = 3;
  } else {
    bank = 3;
  }
  c.bank = bank;
  stat[bank]++;
}

fs.writeFileSync(QPATH, JSON.stringify(cur, null, 2), 'utf8');

console.log('=== bank 分布（单档题数）===');
console.log(JSON.stringify(stat));
console.log('总题数:', cur.length);

console.log('\n=== 主题库累计题量（bank >= N）===');
let acc = 0;
const names = { 4: '库4 极简', 3: '库3 精简', 2: '库2 标准', 1: '库1 完整' };
for (let n = 4; n >= 1; n--) {
  acc += stat[n];
  console.log('  ' + names[n] + ' (bank>=' + n + '): ' + acc + ' 题');
}

const bank4 = stat[4];
const bank3up = stat[4] + stat[3];
const ok4 = bank4 < 100;
const ok3 = bank3up < 200;
console.log('\n=== 自检 ===');
console.log('  库4 =', bank4, ok4 ? '✓ <100' : '✗ 超100！');
console.log('  库3 =', bank3up, ok3 ? '✓ <200' : '✗ 超200！');

if (!ok4 || !ok3) {
  console.error('\n[FAIL] 题量未达标，请微调清单后重跑。');
  process.exit(1);
}
console.log('\n[OK] bank 分配完成，已写回 questions.json');
