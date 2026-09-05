// import-905-llm.cjs
// 把 905（Git 分支工作流）+ LLM0903（LangChain/RAG 实操）+ 903（Redis 系列）+ 904（RAG PDF 解析）
// 中「当前题库缺失的高频面试题」统一入库。
// 幂等：按 code 去重，重复则跳过。
const fs = require('fs');
const path = require('path');

const QPATH = path.join(__dirname, '..', 'questions.json');
const cur = require(QPATH);

const existing = new Set(cur.map(c => c.code));

// 新题：id 从当前最大 id + 1 递增
let nextId = Math.max(...cur.map(c => c.id)) + 1;

const newQuestions = [
  {
    code: 'SK-9',
    category: '软技能',
    question: '描述团队协作中 Git 分支开发的标准工作流程（从创建分支到合并到主分支）？',
    answer: [
      '1. **创建分支**：基于本地最新代码创建新分支（new branch），并默认切换到该分支。',
      '2. **编写代码**：在分支上开发功能。注意：分支若没有 push 到远程，远程仓库是看不到这个分支的。',
      '3. **提交并推送**：将代码 commit 到本地分支，再 push 推送到远程仓库，保证远程有该分支。',
      '4. **合并到 master**：',
      '   - checkout 切换到 master 分支；',
      '   - 先更新（pull）master 最新代码，避免基于旧版本合并；',
      '   - 选择要合并的分支（如 oy0903_1），执行 merge（merge 分支 into master）；',
      '   - 解决冲突后提交代码。',
    ].join('\n'),
    extend: '核心思想：用分支隔离开发、保证主干稳定。合并前一定先更新主干再合并，减少冲突；合并后要回归测试。命令行等价操作：`git checkout -b feat`（创建并切换）→ `git add . && git commit -m "..."` → `git push -u origin feat` → `git checkout master && git pull` → `git merge feat` → 处理冲突 → `git push`。团队常用 PR/MR 做代码评审后再合并。',
    source: '905',
    star: 4,
  },
  {
    code: 'DB-64',
    category: '缓存与Redis',
    question: 'Redis 有哪些高可用架构？主从复制、哨兵（Sentinel）、集群（Cluster）有什么区别？',
    answer: [
      '**主从复制**：一主多从，主节点负责写、从节点复制数据并承担读。解决读压力和数据冗余，但主节点故障需**手动**切换，不能自动故障转移。',
      '**哨兵 Sentinel**：在主从基础上增加哨兵进程，持续监控主从节点健康；主节点宕机时自动选举新主并通知客户端，实现**自动故障转移**。但仍是单主写，容量受单机内存限制。',
      '**集群 Cluster**：多主多从，通过 16384 个哈希槽（hash slot）把数据分片到不同主节点，支持**横向扩容**、高并发读写，数据自动分片与迁移。',
    ].join('\n'),
    extend: '三者演进关系：主从 → 哨兵 → 集群。前两者是"复制"架构（解决高可用/读扩展），集群是"分片"架构（解决容量与写扩展）。记忆：主从=备份读、哨兵=自动换主、集群=分片扩容。',
    source: '903',
    star: 5,
  },
  {
    code: 'DB-65',
    category: '缓存与Redis',
    question: '什么是缓存穿透、缓存击穿、缓存雪崩？分别如何解决？',
    answer: [
      '**缓存穿透**：查询一个根本不存在的数据，缓存和数据库都没有，请求全部打到数据库。解决：缓存空值（null）、用布隆过滤器提前过滤不存在的 key。',
      '**缓存击穿**：某个热点 key 恰好过期，瞬间大量请求同时打到数据库。解决：热点 key 设置永不过期或逻辑过期、加互斥锁（只有一个线程回源 DB 重建缓存）、缓存预热。',
      '**缓存雪崩**：大量 key 在同一时间过期，或 Redis 整体宕机，请求全部落到数据库。解决：过期时间加随机值打散、多级缓存、Redis 集群高可用、限流降级。',
    ].join('\n'),
    extend: '记忆口诀："穿透"查不存在、"击穿"单热点过期、"雪崩"大范围过期/宕机。三者本质都是"缓存失效导致请求穿透到 DB"，区别在于失效的范围和原因。',
    source: '903',
    star: 5,
  },
  {
    code: 'DB-66',
    category: '缓存与Redis',
    question: 'Redis 的持久化方式有哪些？RDB 和 AOF 有什么区别？',
    answer: [
      '**RDB（快照）**：定时把某个时间点的内存数据生成二进制文件 dump.rdb。优点：文件小、恢复快、fork 子进程不影响主进程；缺点：两次快照之间可能丢数据。',
      '**AOF（追加日志）**：记录每次写命令并追加到日志文件，通过 appendfsync 策略（always/everysec/no）控制刷盘。优点：数据更完整（最多丢 1 秒）；缺点：文件大、恢复慢、需重写（rewrite）压缩。',
      '**混合持久化**：RDB 快照 + 期间增量 AOF，兼顾恢复速度与数据安全。',
    ].join('\n'),
    extend: '生产常用"RDB 定时快照 + AOF everysec"或混合模式。取舍核心：RDB 侧重恢复性能、AOF 侧重数据安全。',
    source: '903',
    star: 5,
  },
  {
    code: 'DB-67',
    category: '缓存与Redis',
    question: 'Redis 与 MySQL 双写一致性如何保证？为什么推荐"先更新数据库、再删除缓存"？',
    answer: [
      '**核心策略 Cache Aside（旁路缓存）**：',
      '  读：先查缓存，命中直接返回；未命中查 DB 并回填缓存。',
      '  写：先更新数据库，再删除缓存。',
      '**为什么先更新 DB 再删缓存**：若"先删缓存再更新 DB"，在删除与更新之间的窗口期，其他请求会读到旧 DB 值并回填缓存，造成脏数据；而"先更新 DB 再删缓存"，即便删缓存失败，也最多读到短暂旧值，影响更小。',
      '**高一致性要求场景**：延迟双删（更新 DB 后延迟再删一次缓存）、订阅 binlog（如 Canal）异步删缓存、消息队列保证最终一致性。',
    ].join('\n'),
    extend: '本质是"强一致 vs 最终一致"的取舍——缓存天然以牺牲一致性换性能。一般业务用最终一致性即可；强一致场景（如金额）应绕过缓存直接读库或用分布式锁。',
    source: '903',
    star: 4,
  },
  {
    code: 'DB-68',
    category: '缓存与Redis',
    question: 'Redis 的内存淘汰策略有哪些？为什么数据过期了有时还能读到？',
    answer: [
      '**内存淘汰策略（内存不足时）**：noeviction（不淘汰、写入报错）、allkeys-lru、volatile-lru、allkeys-lfu、volatile-lfu、allkeys-random、volatile-random、volatile-ttl 共 8 种。常用 allkeys-lru（对所有 key 按最近最少使用淘汰）。',
      '**过期删除策略**：惰性删除（访问 key 时才判断是否过期，过期则删）+ 定期删除（定时抽样检查并删除过期 key）二者组合。',
      '**为什么过期了还能读到**：因为采用惰性删除，数据过期后若一直没被访问，不会被立即删除；访问时 get 该 key 会先判断过期才删除并返回 nil——所以"能读到"其实是指它仍占用内存、可能短暂可见，但正常 get 时会触发删除。',
    ].join('\n'),
    extend: '惰性删除省 CPU 但省不了内存，故搭配定期删除。这也解释了"过期 key 仍占内存"的现象。面试常追问：过期删除策略和内存淘汰策略是两回事——前者针对过期 key，后者针对内存不足时对所有 key 的淘汰。',
    source: '903',
    star: 4,
  },
  {
    code: 'LLM-16',
    category: '大模型应用',
    question: 'LangChain 是什么？它有哪些核心能力？',
    answer: [
      'LangChain 是用于构建 LLM（大语言模型）应用的开源框架，把大模型接上"数据、工具、流程、记忆"，从单纯的聊天接口变成能完成复杂任务的工程框架。',
      '核心能力：',
      '1. **模型调用**：统一接口对接 GPT/Claude/Gemini/Qwen/Llama/本地模型，方便切换。',
      '2. **Prompt 管理**：提供模板、few-shot 示例、动态变量等构建与管理提示词的工具。',
      '3. **Chain 链式调用**：把多个步骤（如"提问→检索→总结→返回"）串联成处理流程。',
      '4. **Agent 智能体**：自主决定下一步，调用工具、查库、搜网页、执行代码、访问 API。',
      '5. **Memory 记忆**：保存历史对话，让模型具备上下文记忆。',
      '6. **文档加载与检索**：读取 PDF/Word/网页/Markdown/数据库并切分、向量化，配合向量库做 RAG。',
    ].join('\n'),
    extend: '适用场景：知识库问答、AI Agent、聊天机器人、工作流自动化。缺点：抽象层多、学习曲线陡；版本迭代快、API 常变；复杂项目可能过度封装，有时不如自己写逻辑清晰。',
    source: 'LLM0903',
    star: 4,
  },
  {
    code: 'LLM-17',
    category: '大模型应用',
    question: '什么是 LCEL？`prompt | llm | output_parser` 链式调用为什么能串联所有组件？',
    answer: [
      'LCEL（LangChain Expression Language）是 LangChain 的声明式组合语法，用管道符 `|` 把各组件串成一条 Runnable 链。',
      '为什么能串联：每个组件（PromptTemplate、ChatModel、StrOutputParser 等）都实现了 Runnable 接口，`|` 运算符会把左边组件的输出作为右边组件的输入自动传递，因此可以任意组合。',
      '示例：`chain = prompt | llm | outputParser`，调用 `chain.invoke({"topic":"咖啡"})` 依次执行：模板填充变量 → 模型生成 → 解析器提取字符串。',
      '优点：可读性强、组件可复用、统一支持流式/批处理/异步调用。',
    ].join('\n'),
    extend: '三个组件职责：PromptTemplate 负责把输入格式化成提示词；ChatModel 负责生成（返回 AIMessage）；StrOutputParser 把 AIMessage 转成纯字符串。LCEL 是 LangChain 现代 API 的核心，也是 RAG 链式编排的基础。',
    source: 'LLM0903',
    star: 4,
  },
  {
    code: 'LLM-18',
    category: '大模型应用',
    question: '用 LangChain 实现 RAG 的完整代码流程是什么？涉及哪些核心组件？',
    answer: [
      '1. **加载文档**：创建 Document 对象，正文存入 page_content。',
      '2. **切分**：用 RecursiveCharacterTextSplitter（chunk_size、chunk_overlap 控制块大小与重叠）把长文档切成小块。',
      '3. **向量化**：创建 Embedding 模型（如 DashScopeEmbeddings / OpenAIEmbeddings）把文本块转成向量。',
      '4. **建库**：用 FAISS.from_documents(documents, embeddings) 建立向量索引，并可 save_local 持久化。',
      '5. **检索**：vector_store.as_retriever(search_type="similarity", search_kwargs={"k":3}) 检索语义最相似的 Top-K 块。',
      '6. **生成**：把检索内容作为 {context} 拼进 PromptTemplate，与问题一起走 chain（prompt | llm | parser），chain.invoke 生成最终答案。',
    ].join('\n'),
    extend: '关键：检索质量决定 RAG 上限。chunk_size 太小则语义不完整、太大则检索不精准；chunk_overlap 用于保留跨块的上下文连贯；k 值控制拼进提示词的上下文长度，避免超窗口。',
    source: 'LLM0903',
    star: 4,
  },
  {
    code: 'LLM-19',
    category: '大模型应用',
    question: 'RAG 和 Fine-tuning（微调）有什么区别？什么场景用哪个？',
    answer: [
      '| 维度 | RAG | 微调 |',
      '|------|-----|------|',
      '| 知识更新 | 改文档即可 | 需重新训练 |',
      '| 成本 | 较低 | 较高 |',
      '| 事实准确性 | 高（有检索依据） | 中（仍可能幻觉） |',
      '| 可追溯性 | 能引用来源 | 黑盒 |',
      '| 领域风格内化 | 一般 | 较好 |',
      '选择：需要实时/频繁更新的知识、要求可追溯 → RAG；需要改变模型风格/特定领域表达、知识相对稳定 → 微调。实际项目常二者组合使用。',
    ].join('\n'),
    extend: '一句话记忆：RAG = 给模型"外接知识库"，微调 = "改变模型本身"。RAG 先检索再生成，回答有据可依；微调把知识固化进权重。',
    source: 'LLM0903',
    star: 4,
  },
  {
    code: 'LLM-20',
    category: '大模型应用',
    question: 'RAG 知识库中，PDF 文档有纯文本、扫描件、表格等多种类型，分别如何处理？',
    answer: [
      '**纯文本 PDF**：文档自带文本层，直接提取文本（pdfplumber / PyMuPDF / pypdf），切分后向量化即可。',
      '**扫描件（图片型 PDF）**：没有文本层，需先做 OCR 识别（PaddleOCR / Tesseract），把图片转成文字后再切分向量化。',
      '**表格**：需用表格解析（pdfplumber 的 extract_tables / camelot / unstructured），把表格还原成保留行列关系的结构化文本，避免直接抽文本导致语义错乱。',
      '**混合文档**：先做版面分析（layout detection），区分段落/表格/图片，分类用不同解析器处理。',
    ].join('\n'),
    extend: '关键：不同类型用不同解析器。表格若当普通文本抽取，会丢失行列语义，导致检索不准；扫描件漏做 OCR 则完全抽不出内容。工程上常按"格式识别 → 分类解析 → 统一切分向量化"的流水线处理。',
    source: '904',
    star: 5,
  },
];

const added = [];
for (const q of newQuestions) {
  if (existing.has(q.code)) {
    console.log('跳过（已存在）:', q.code);
    continue;
  }
  cur.push({ id: nextId++, ...q });
  added.push(q.code);
}

fs.writeFileSync(QPATH, JSON.stringify(cur, null, 2), 'utf8');
console.log('新增', added.length, '题:', added.join(', '));
console.log('题库总数:', cur.length, '→', cur.length);
