#!/usr/bin/env node
/**
 * fix-tear.cjs — 修复 bh-mindmaps 的「撕裂/错位」数据
 * 1) 删除 DS 算法题的「问题描述/参考答案」重复碎片（内容已并入补全题卡）
 * 2) 重构 NLP 分类：把 5 条错位记录拆成正确的独立题卡
 * 3) 重排 code
 * 用法: node tools/fix-tear.cjs
 */
const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, '..', 'questions.json');

// ---------- 1. DS 撕裂碎片（与已补全的 6 道题重复，删除） ----------
const DS_TEAR = new Set([
  'DS-5', 'DS-6', 'DS-8', 'DS-9', 'DS-11', 'DS-12',
  'DS-14', 'DS-15', 'DS-17', 'DS-18', 'DS-20', 'DS-21',
]);

// ---------- 2. NLP 重构（13 道正确题卡） ----------
const NLP_NEW = [
  {
    category: 'NLP基础', question: '介绍一下 BERT？BERT 和 BiLSTM 有什么区别？BERT 和 Attention 是什么关系？',
    answer: [
      '**BERT（Bidirectional Encoder Representations from Transformers）：** 基于 Transformer Encoder 堆叠的双向预训练语言模型，通过 MLM（掩码语言模型）+ NSP（下一句预测）两个任务在大规模语料上预训练，再微调下游任务。',
      '',
      '**BERT vs BiLSTM：**',
      '- BiLSTM 是循环结构，串行处理、难以并行，长距离依赖靠隐状态逐层传递；BERT 用自注意力，可并行、直接建模任意两词间关系',
      '- BiLSTM 通常从零训练；BERT 大规模预训练 + 微调，泛化能力更强',
      '',
      '**BERT 和 Attention 的关系：** BERT 的 Encoder 内部核心就是多头自注意力（Multi-Head Self-Attention），Attention 是 BERT 的基本组成单元。'
    ].join('\n'),
    extend: '**面试追问：** BERT 是双向（看上下文两侧），GPT 是单向（只看左侧），这是两者本质区别；BERT 适合理解类任务（分类/NER），GPT 适合生成类任务。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: '解释 Q、K、V 分别的作用？',
    answer: '**Q（Query）** 代表查询张量，**K（Key）** 代表关键信息张量，**V（Value）** 代表实际取值张量。注意力机制先通过 Q 与 K 的交互（点积）计算匹配权重，再将权重作用到 V 上进行加权求和，得到最终输出。\n\n- **Q**：当前词在"找什么"（想关注哪些信息）\n- **K**：各词"有什么"可被关注的特征\n- **V**：各词实际携带的信息内容',
    extend: '**面试追问：** 自注意力里 Q=K=V 都来自同一输入（经不同权重矩阵 Wq/Wk/Wv 线性变换）；交叉注意力里 Q 来自目标、K/V 来自源。点积除以 √d_k 是为了防止维度大导致 softmax 梯度消失。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: '介绍一下 GloVe？',
    answer: [
      '2013 年 Google 提出 Word2Vec 后，斯坦福 NLP 小组于 2014 年提出 GloVe（Global Vectors for Word Representation）。',
      '',
      '此前词向量主要有两大类：全局矩阵分解（如 LSA，有效利用统计信息但类比任务表现差）与局部上下文窗口（如 skip-gram，类比好但少用全局统计）。',
      '',
      'GloVe 是基于全局词频统计的模型，实现三步：',
      '- 构建词-词共现矩阵',
      '- 建立词向量与共现矩阵的近似关系',
      '- 构造损失函数训练',
      '',
      'GloVe 结合了全局矩阵分解与局部上下文窗口两者的优点，只训练共现矩阵中的非零元素，有效利用统计信息，生成的向量空间有意义的子结构。'
    ].join('\n'),
    extend: '**面试追问：** GloVe 属于「计数类」词向量，Word2Vec 属于「预测类」；两者都难处理一词多义，之后被 ELMo/BERT 等上下文相关表示取代。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: '词向量是什么？有哪些方式生成词向量？句子的词向量怎么表示？',
    answer: [
      '词向量是自然语言的数字化表示，方便计算机处理。主要有三种模式：',
      '- **one-hot**：稀疏、维度爆炸、无语义',
      '- **Word2Vec / GloVe**：静态稠密向量，含语义，但一词一向量、无法处理多义',
      '- **Word Embedding（BERT 系列）**：上下文相关，同一词在不同语境向量不同',
      '',
      '句子的词向量表示：',
      '- 分词后各单词词向量的加权平均',
      '- 直接取 BERT 输出层的 [CLS] 向量（本质就是句向量）'
    ].join('\n'),
    extend: '**面试追问：** Word2Vec 有 CBOW（用上下文预测中心词）和 skip-gram（用中心词预测上下文）两种；静态词向量无法区分"苹果（水果）"和"苹果（公司）"。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: '说一下前缀树（Trie）？',
    answer: [
      '前缀树又称单词查找树、Trie 树，是一种树形结构，是哈希树的变种。典型应用是统计、排序和保存大量字符串，常用于搜索引擎的文本词频统计。',
      '',
      '**核心思想：** 空间换时间，利用字符串公共前缀降低查询时间开销。',
      '',
      '**三个基本特性：**',
      '- 根节点不含字符，其余节点只含一个字符',
      '- 从根到某节点路径上的字符连接起来，就是该节点对应的字符串',
      '- 每个节点的所有子节点字符互不相同',
      '',
      '搜索时从根节点开始逐字符匹配，查询效率高于哈希树。'
    ].join('\n'),
    extend: '**面试追问：** Trie 常用于自动补全、拼写检查、IP 路由最长前缀匹配；缺点是空间占用大，可用压缩 Trie（Patricia）或双数组 Trie 优化。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: '讲讲迁移学习、特征迁移和微调迁移？',
    answer: [
      '**迁移学习：** 构建新模型时，把已有预训练模型作为起点直接继承，达到"站在巨人肩膀上"的效果。',
      '',
      '**特征迁移（Feature-representation-transfer）：** 找到有代表性的特征，通过特征变换把源域和目标域数据映射到同一空间，使两者分布一致。',
      '',
      '**微调迁移（Fine-tuning）：** 把预训练模型作为训练起点，在特定数据集上做二次微调训练。'
    ].join('\n'),
    extend: '**面试追问：** 大模型时代主流就是「预训练 + 微调」范式；微调可只更新顶层（冻结主干）或全参数微调，数据少时用 LoRA 等参数高效微调。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: 'BERT 和 Transformer 的区别？',
    answer: [
      'BERT 是基于 Transformer 架构的模型，但有几个关键差异：',
      '- BERT 只用 Transformer 的 **Encoder** 部分，舍弃 Decoder',
      '- BERT 编码器含 **12 层** Encoder Block，原始 Transformer 是 6 层',
      '- BERT 的位置编码是**可训练的**，Transformer 中是写死的正余弦编码',
      '- BERT 激活函数用 **GELU**，Transformer 用 ReLU'
    ].join('\n'),
    extend: '**面试追问：** 正因只用 Encoder，BERT 擅长理解类任务（分类、NER、句对关系）；GPT 只用 Decoder 做生成。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: 'BERT 怎么解决超长文本？了解 XLNet 吗？',
    answer: [
      'BERT 限制序列长度不超过 512（本质不超过 510，扣除 [CLS]/[SEP]），处理更长文本的方案：',
      '- **截断**：只取前 510 字符，或只取后 510 字符',
      '- **不截断**：把超长文本切分成多段（每段 510），分别编码后取平均输出',
      '',
      '**XLNet** 是经典的排列语言模型，采用特殊的 mask 机制让 token 能同时"看见"前后文信息，且能应对更长的序列长度。'
    ].join('\n'),
    extend: '**面试追问：** 还可选 Longformer（稀疏注意力）、BigBird 等长序列模型；BERT 的绝对位置编码导致超长文本是硬限制。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: 'Word2Vec 是怎么计算的？霍夫曼树如何训练 Word2Vec？',
    answer: [
      '**Word2Vec 计算：** 隐藏层张量是通过对上下文词向量**加权平均**得到的（CBOW），再经 softmax 输出预测词概率。',
      '',
      '**霍夫曼树训练：**',
      '- 先对全体语料做词频统计',
      '- 按词频构建霍夫曼树，每个词是叶子节点，词频对应节点权值',
      '- 实际训练采用层次 softmax、负采样两种优化方法',
      '',
      '在霍夫曼树中，隐藏层到输出层的 softmax 不是一步完成，而是沿树逐步判断（每个中间节点是一次逻辑回归，路径标记 0/1），叶子节点对应最终词，路径上概率累乘得到词概率。',
      '',
      '**两大优点：** 计算量从 N 降到 logN；越靠近根节点路径越短、参数更新越快，加速训练收敛。'
    ].join('\n'),
    extend: '**面试追问：** 层次 softmax 用霍夫曼树替代 softmax 降低复杂度，负采样用少量负样本近似，两者都是为了加速大规模词表训练。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: 'BERT 不加 CRF 和 BERT+CRF 做 NER 会有什么差别？',
    answer: [
      '有相关论文，但特定数据集上的结论不能直接推广到生产实际。',
      '',
      '**BERT 不加 CRF：** 每个 token 独立做 softmax 分类，可能出现标签序列不合法（如 I-PER 出现在 B-PER 之前）。',
      '',
      '**BERT+CRF：** CRF 层建模标签间的转移约束，保证输出合法的标签序列；且能让模型更快收敛，用更小的数据集得到最优结果。',
      '',
      '实践中 NER 这类序列标注任务通常加 CRF 更稳。'
    ].join('\n'),
    extend: '**面试追问：** 也可以不加 CRF 而用指针网络/span 分类（如 BERT+Span 抽取）做 NER，近年倾向直接预测实体边界。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: 'AI 医生项目相关面试题',
    answer: [
      '**1) 为什么不用 MySQL 用 Neo4j？**',
      'AI 领域 Neo4j 更适配，选型时考虑到后期的多级查询、多跳推理，都是 Neo4j 更合适。图结构数据用 MySQL 多表匹配查询速度跟不上。',
      '',
      '**2) CRF 太大为什么不用规则？**',
      '医疗数据纷繁复杂，虽用了一部分规则，但规则表扩展太快、无法覆盖足够多 case，用 CRF 更优，泛化性更强。',
      '',
      '**3) 图谱样式、内容、怎么用、为什么提取这些内容？**',
      '多种类型的节点（疾病、症状、药品、饮食、康复等），提取的内容都是为了后续的查询与问答做准备。'
    ].join('\n'),
    extend: '**面试追问：** 项目题要讲清「背景 → 架构 → 自己职责 → 难点与优化」，突出图数据库选型的对比论证。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: '文本摘要项目相关面试题',
    answer: [
      '**1) 讲讲数据增强有哪些，原理是什么？**',
      '- 单词替换、回译数据法、半监督学习法',
      '- 对比学习',
      '',
      '**2) fasttext 这个项目 embedding_dim 是多少，为何如此设置？**',
      'embedding_dim = 300 或 200 都可以，按经验值给定。',
      '',
      '**3) 图谱有什么作用，为什么不用 MySQL？**',
      'Neo4j 更适配多级查询、多跳推理；图结构数据用 MySQL 多表匹配查询速度跟不上。',
      '',
      '**4) PGN 架构是怎么实现的，是一个网络吗？coverage 机制为什么能解决 OOV 问题？**',
      'PGN（指针生成网络）是 seq2seq + 指针网络的结合，既可从词表生成，也可从原文复制，缓解 OOV（未登录词）。'
    ].join('\n'),
    extend: '**面试追问：** 文本摘要分抽取式与生成式；PGN 的 coverage 机制惩罚重复关注同一位置，缓解生成重复问题。',
    source: 'bh-fixed',
  },
  {
    category: 'NLP基础', question: '传智大脑项目相关面试题',
    answer: [
      '**1) 怎么划分数据，train_test_split 有什么问题，数据集有多少特征，离散还是连续？**',
      'train_test_split 有时划分不均匀；特征类型有的离散、有的连续，需按具体数据集说明。',
      '',
      '**2) 数据预处理做了哪些操作？数据分析做了哪些展示？用 train_test_split 合理吗？用了哪些集成学习？**',
      '主要是去除噪声、去重；分析做了 max_length 分布、标签数量分布，用柱状图/折线图展示。',
      '',
      '**3) 要求从头到尾讲一遍项目流程，从项目背景开始讲起。**',
      '按项目背景 → 数据 → 建模 → 评估 → 上线 的完整流程讲，突出个人负责部分与难点解决。'
    ].join('\n'),
    extend: '**面试追问：** 项目题务必准备完整流程讲述（背景/数据/建模/评估/部署），并准备 2-3 个技术难点及解法。',
    source: 'bh-fixed',
  },
];

// ---------- 3. PREFIX 映射（用于重排 code） ----------
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
  'NLP基础': 'NLP',
  '计算机视觉': 'CV',
  '数据结构算法': 'DS',
  '软技能': 'SK',
  '人事面': 'HR',
  'FastAPI': 'FS',
};

function main() {
  let data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

  // 1) 删除 DS 撕裂碎片
  const before = data.length;
  data = data.filter(c => !DS_TEAR.has(c.code));
  console.log(`✓ 删除 DS 撕裂碎片 ${before - data.length} 道（问题描述/参考答案 与已补全题重复）`);

  // 2) 删除旧 NLP 5 题
  const oldNlp = data.filter(c => c.code.startsWith('NLP-'));
  data = data.filter(c => !c.code.startsWith('NLP-'));

  // 3) 插入重构 NLP 题
  let maxId = data.reduce((m, c) => Math.max(m, c.id), 0);
  const nlpItems = NLP_NEW.map(n => ({
    id: ++maxId,
    code: '',           // 重排阶段填充
    category: n.category,
    question: n.question,
    answer: n.answer,
    extend: n.extend || '',
    source: n.source,
  }));
  data = data.concat(nlpItems);
  console.log(`✓ NLP 重构：删除错位 ${oldNlp.length} 题 → 重建 ${nlpItems.length} 道正确题卡`);

  // 4) 重排 code（按 PREFIX 分组，序号不补零；保持现有顺序）
  const counters = {};
  data.forEach(c => {
    const p = PREFIX[c.category] || 'XX';
    counters[p] = (counters[p] || 0) + 1;
    c.code = `${p}-${counters[p]}`;
  });

  // 5) 重新分配 id（保证连续）
  data.forEach((c, i) => c.id = i + 1);

  fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ 写入完成：共 ${data.length} 题`);

  // 统计各前缀
  const by = {};
  data.forEach(c => { const p = c.code.split('-')[0]; by[p] = (by[p] || 0) + 1; });
  console.log('\n题码分布：');
  Object.entries(by).sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => console.log(`  ${k}  ${v} 题`));
}

main();
