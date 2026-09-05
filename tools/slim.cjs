// 题库瘦身脚本：把 422 题精简到必刷 200 以内
// 三步：①删拓展题(除软技能/人事面) ②删必刷冗余题 ③剩余仍多则降级到拓展
// 用法：node tools/slim.cjs
const fs = require('fs');
const path = require('path');
const BASE = path.resolve(__dirname, '..');
const QFILE = path.join(BASE, 'questions.json');

const data = JSON.parse(fs.readFileSync(QFILE, 'utf8'));

// ============================================================
// 清单 2：删除的必刷题（低价值/过细/重复，94 题）
// ============================================================
const DELETE_BS = [
  // Python 相关（16）
  'PY-5', 'PY-6', 'PY-10',                 // Python基础：运算符优先级/代码规范/三目混杂
  'PY-16',                                  // 数据结构：序列通用操作
  'PY-28', 'PY-31', 'PY-33',                // 面向对象：super多继承/类与对象基础/封装
  'PYH-6', 'PYH-9',                         // 并发：Queue vs Manager / Thread vs Process
  'PYH-13', 'PYH-18',                       // 综合进阶：for底层 / MySQL运算符(分类错位)
  'PY-45', 'PY-46', 'PY-47', 'PY-48', 'PY-49', // 正则：5 题元字符细节并入 PY-42
  // MySQL（12）
  'DB-2', 'DB-5', 'DB-6', 'DB-8',           // 系统库/字符串类型/日期类型/ALTER
  'DB-13', 'DB-14',                          // 排名函数/偏移函数(并入DB-12窗口)
  'DB-17', 'DB-18',                          // 数学日期函数(并入DB-16)/建表模板
  'DB-30', 'DB-32',                          // 不适合建索引(并入DB-29)/filesort(并入DB-31)
  'DB-36', 'DB-37',                          // 连接数过高/锁等待(并入DB-35)
  // NumPy（12）
  'PD-2', 'PD-3', 'PD-4',                    // 安装导入/数组vs列表/向量化(并入PD-1)
  'PD-6', 'PD-7',                            // 随机数系列/choice+shuffle
  'PD-10', 'PD-11',                          // astype/自动类型转换(并入PD-9)
  'PD-14', 'PD-15',                          // resize vs reshape / ravel vs flatten
  'PD-16', 'PD-17', 'PD-18',                 // 转置/堆叠/分割
  // Pandas（13）
  'PD-27', 'PD-28', 'PD-30',                 // 创建Series/属性/方法
  'PD-32', 'PD-35', 'PD-36', 'PD-37',        // 运算对齐/DataFrame方法/条件筛选/改表结构
  'PD-39', 'PD-40',                          // 日期时间/dt访问器
  'PD-42',                                   // 缺失值表示(并入PD-43)
  'PD-46', 'PD-48', 'PD-49',                 // pivot_table/Seaborn/选图表(并入PD-47)
  // Linux（7）
  'LNX-5', 'LNX-7',                          // man手册 / cat-tail-echo(并入LNX-6)
  'LNX-10', 'LNX-12',                        // su vs su-(并入LNX-9)/用户组(并入LNX-11)
  'LNX-15', 'LNX-20', 'LNX-23',              // chown/ kill+top(并入LNX-19)/ df-du(并入LNX-6)
  // 机器学习（17）
  'ML-2', 'ML-4', 'ML-11', 'ML-12',          // 传统vsAI/发展历史/深度学习四场景/为什么学基础
  'ML-14', 'ML-15', 'ML-16',                 // w和b/一元vs多元/X二维数组(并入ML-13)
  'ML-19', 'ML-20',                          // MSE/RMSE(并入ML-21)
  'ML-24', 'ML-27',                          // 更新公式(并入ML-23)/SGDRegressor
  'ML-32', 'ML-36',                          // Z-Score(并入ML-31)/图像归一化(并入ML-34)
  'ML-38', 'ML-42', 'ML-44', 'ML-49',        // 应用场景/交叉熵损失/train_test_split/天气预报
  // 深度学习（6）
  'DL-3', 'DL-4', 'DL-10',                   // 发展历史/与传统ML区别/黑盒
  'DL-13',                                   // batch_first(过细)
  'DL-29', 'DL-30',                          // nn.Transformer API/注意力是核心(并入DL-21)
  // FastAPI（3）
  'FS-6', 'FS-8', 'FS-13',                   // Query/Path验证(并入FS-3)/表单(并入FS-4)/CRUD(并入FS-12)
  // 数据结构算法（4）
  'DS-10', 'DS-11', 'DS-19', 'DS-20',        // 冒泡/快排(并入DS-15)/最远距离/写二叉树
  // 其他（4）
  'NG-2',                                    // Nginx vs Apache/Tomcat/IIS
  'HTTP-4',                                  // HTTP vs HTTPS(基础)
  'LLM-11', 'LLM-14',                        // LoRA训练推理(并入LLM-10)/分词器接口
];

// ============================================================
// 清单 3：降级到拓展的题（4星→3星，37 题）
// ============================================================
const DOWNGRADE = [
  'DB-33', 'DB-34', 'DB-38', 'DB-39', 'DB-52', 'DB-55', // MySQL优化/UUID/BufferPool/Redis键过期/Redis vs MySQL
  'PD-22', 'PD-23',                                     // NumPy数学函数/统计函数
  'PD-38', 'PD-44', 'PD-47',                            // Pandas读写/apply/Matplotlib
  'LNX-16', 'LNX-19', 'LNX-21', 'LNX-22',               // find/ps/crontab/端口
  'ML-1', 'ML-6', 'ML-9', 'ML-18', 'ML-30', 'ML-45', 'ML-46', // AI-ML-DL关系/样本特征/建模流程/MAE/sklearn流程/混淆矩阵/精确率
  'DL-6', 'DL-7', 'DL-19', 'DL-24',                     // Tensor/训练循环/TeacherForcing/掩码
  'FS-9', 'FS-15',                                      // 文件上传/目录结构
  'LLM-12', 'LLM-16',                                   // LLaMA-Factory/Datasets
  'NG-4', 'NG-6',                                       // 反向代理配置/配置文件
  'HTTP-6', 'HTTP-7',                                   // 三次握手/上网流程
  'PY-7', 'PY-8', 'PY-9',                               // if分支/while/for循环
];

// ============================================================
// 执行
// ============================================================
const KEEP_EXT_CAT = new Set(['软技能', '人事面']);
const delSet = new Set(DELETE_BS);
const downSet = new Set(DOWNGRADE);

let deletedExt = 0, deletedBs = 0, downgraded = 0;
const kept = [];

for (const c of data) {
  const star = c.star || 0;
  // 第一步：删拓展题(除软技能/人事面)
  if (star <= 3 && !KEEP_EXT_CAT.has(c.category)) { deletedExt++; continue; }
  // 第二步：删必刷冗余题
  if (delSet.has(c.code)) { deletedBs++; continue; }
  // 第三步：降级
  if (downSet.has(c.code)) { c.star = 3; downgraded++; }
  kept.push(c);
}

// 统计
const bishua = kept.filter(c => (c.star || 0) >= 4);
const tuo = kept.filter(c => (c.star || 0) >= 1 && (c.star || 0) <= 3);

fs.writeFileSync(QFILE, JSON.stringify(kept, null, 2), 'utf8');

console.log('=== 瘦身结果 ===');
console.log(`删除拓展题(除软技能/人事面): ${deletedExt} 题`);
console.log(`删除必刷冗余题: ${deletedBs} 题`);
console.log(`降级到拓展(4→3星): ${downgraded} 题`);
console.log(`剩余总题数: ${kept.length}`);
console.log(`  必刷(4-5星): ${bishua.length} 题 ${bishua.length <= 200 ? '✓ ≤200' : '✗ 仍超200!'}`);
console.log(`  拓展(1-3星): ${tuo.length} 题`);

// 分类分布
const byCat = {};
kept.forEach(c => {
  if (!byCat[c.category]) byCat[c.category] = { t: 0, bs: 0 };
  byCat[c.category].t++;
  if ((c.star || 0) >= 4) byCat[c.category].bs++;
});
console.log('\n=== 瘦身后分类分布(总数/必刷) ===');
Object.entries(byCat).sort((a, b) => b[1].t - a[1].t).forEach(([k, v]) => {
  const flag = v.t < 5 ? ' ← <5道' : '';
  console.log(`  ${String(v.t).padStart(3)} (${String(v.bs).padStart(2)}必)  ${k}${flag}`);
});
