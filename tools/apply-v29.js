// apply-v29.js —— 应用 v2.9 内容扩充与分类重组
// 1. 拆分「大模型应用」→ 大语言模型 / RAG / LangChain
// 2. SK-9 → GIT-1（迁入 Git 分类）
// 3. SK-6 删除失效图片引用
// 4. 合并 tools/new-questions-v29.json 的 27 道新题（自动分配 id）
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const questionsPath = path.join(ROOT, 'questions.json');
const newQuestionsPath = path.join(__dirname, 'new-questions-v29.json');

const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

// ---------- 1. 分类拆分映射 ----------
const CATEGORY_MAP = {
  'NLP-1': '大语言模型',
  'NLP-7': '大语言模型',
  'LLM-1': '大语言模型',
  'LLM-8': '大语言模型',
  'LLM-9': '大语言模型',
  'LLM-10': '大语言模型',
  'LLM-13': '大语言模型',
  'LLM-15': '大语言模型',
  'LLM-2': 'RAG',
  'LLM-3': 'RAG',
  'LLM-5': 'RAG',
  'LLM-6': 'RAG',
  'LLM-7': 'RAG',
  'LLM-19': 'RAG',
  'LLM-20': 'RAG',
  'LLM-16': 'LangChain',
  'LLM-17': 'LangChain',
  'LLM-18': 'LangChain',
};

let splitCount = 0;
data.forEach(q => {
  if (CATEGORY_MAP[q.code]) {
    if (q.category !== CATEGORY_MAP[q.code]) {
      q.category = CATEGORY_MAP[q.code];
      splitCount++;
    }
  }
});
console.log('分类拆分：', splitCount, '题');

// ---------- 2. SK-9 → GIT-1 ----------
const sk9 = data.find(q => q.code === 'SK-9');
if (sk9) {
  sk9.code = 'GIT-1';
  sk9.category = 'Git';
  console.log('SK-9 → GIT-1（category 软技能 → Git）');
}

// ---------- 3. SK-6 删除图片引用 ----------
const sk6 = data.find(q => q.code === 'SK-6');
if (sk6 && sk6.answer) {
  const before = sk6.answer;
  sk6.answer = sk6.answer.replace(/\s*!\[[^\]]*\]\(\.\/figures\/[^)]*\)\s*/g, '\n');
  if (before !== sk6.answer) console.log('SK-6 删除图片引用成功');
}

// ---------- 4. 合并新题 ----------
const newQuestions = JSON.parse(fs.readFileSync(newQuestionsPath, 'utf8'));
let maxId = 0;
data.forEach(q => { if (q.id > maxId) maxId = q.id; });

// 校验 code 不冲突
const existingCodes = new Set(data.map(q => q.code));
const conflicts = newQuestions.filter(q => existingCodes.has(q.code)).map(q => q.code);
if (conflicts.length) {
  console.error('错误：code 冲突', conflicts);
  process.exit(1);
}

newQuestions.forEach(q => {
  maxId++;
  data.push({ id: maxId, ...q });
});
console.log('合并新题：', newQuestions.length, '题');

// 写回
fs.writeFileSync(questionsPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('总题数：', data.length);

// ---------- 输出最终统计 ----------
const cats = {};
data.forEach(q => { cats[q.category] = (cats[q.category] || 0) + 1; });
console.log('\n=== 最终分类统计 ===');
Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ': ' + v));

const prefixes = {};
data.forEach(q => {
  const p = (q.code || '').split('-')[0];
  prefixes[p] = (prefixes[p] || 0) + 1;
});
console.log('\n=== 最终 code 前缀统计 ===');
Object.entries(prefixes).sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, v]) => console.log('  ' + k + ': ' + v));

const bk = { 1: 0, 2: 0, 3: 0, 4: 0 };
data.forEach(q => { bk[q.bank] = (bk[q.bank] || 0) + 1; });
console.log('\n=== bank 分布 ===');
Object.entries(bk).forEach(([k, v]) => console.log('  bank ' + k + ': ' + v));
