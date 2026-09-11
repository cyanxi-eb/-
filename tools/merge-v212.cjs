#!/usr/bin/env node
/**
 * merge-v212.cjs — 把 tools/newq-v212-part*.txt 中的新题合并进 questions.json
 *
 * 源文件格式（行式分隔，避免 JSON 转义地狱）：
 *   @@@Q|code|category|star|bank|source|question
 *   @@@A
 *   ...answer（可含空行/markdown）...
 *   @@@E
 *   ...extend...
 *   @@@END
 *
 * 用法：node tools/merge-v212.cjs [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'questions.json');
const PARTS = ['newq-v212-part1.txt', 'newq-v212-part2.txt', 'newq-v212-part3.txt'];
const DRY = process.argv.includes('--dry');

function parsePart(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const items = [];
  let cur = null, mode = null;
  for (const line of lines) {
    if (line.startsWith('@@@Q|')) {
      if (cur) throw new Error(file + ': 上一题缺少 @@@END');
      const parts = line.split('|');
      if (parts.length < 7) throw new Error(file + ': 头部字段不足 → ' + line);
      const [, code, category, star, bank, source, ...qrest] = parts;
      cur = {
        code: code.trim(),
        category: category.trim(),
        star: Number(star),
        bank: Number(bank),
        source: source.trim(),
        question: qrest.join('|').trim(),
        answer: [],
        extend: [],
      };
      mode = 'A';
    } else if (line.trim() === '@@@A') {
      mode = 'A';
    } else if (line.trim() === '@@@E') {
      mode = 'E';
    } else if (line.trim() === '@@@END') {
      if (!cur) throw new Error(file + ': @@@END 没有对应题目');
      cur.answer = cur.answer.join('\n').trim();
      cur.extend = cur.extend.join('\n').trim();
      items.push(cur);
      cur = null;
      mode = null;
    } else if (cur) {
      if (mode === 'A') cur.answer.push(line);
      else if (mode === 'E') cur.extend.push(line);
    }
  }
  if (cur) throw new Error(file + ': 文件结尾有未闭合的题目 ' + cur.code);
  return items;
}

function main() {
  const existing = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const existCodes = new Set(existing.map(c => c.code));
  const existIds = new Set(existing.map(c => c.id));
  let nextId = Math.max(...existing.map(c => c.id)) + 1;

  const added = [];
  for (const f of PARTS) {
    const file = path.join(ROOT, 'tools', f);
    const items = parsePart(file);
    for (const it of items) {
      // 校验
      if (!it.code || !it.question || !it.answer) throw new Error(it.code + ': 缺 code/question/answer');
      if (!(it.star >= 1 && it.star <= 5)) throw new Error(it.code + ': star 越界 ' + it.star);
      if (!(it.bank >= 1 && it.bank <= 4)) throw new Error(it.code + ': bank 越界 ' + it.bank);
      if (existCodes.has(it.code)) throw new Error('code 冲突: ' + it.code);
      while (existIds.has(nextId)) nextId++;
      it.id = nextId++;
      existCodes.add(it.code);
      existIds.add(it.id);
      added.push(it);
    }
    console.log(`  ${f}: ${items.length} 题`);
  }

  console.log('新增合计:', added.length, '题');
  const byCat = {};
  added.forEach(c => { byCat[c.category] = (byCat[c.category] || 0) + 1; });
  console.log('新增分类分布:');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + k + ': ' + v));

  // 字段顺序与既有题目保持一致
  const normalized = added.map(c => ({
    id: c.id, code: c.code, category: c.category, question: c.question,
    answer: c.answer, extend: c.extend, source: c.source, star: c.star, bank: c.bank,
  }));

  const merged = existing.concat(normalized);
  const allCodes = new Set(merged.map(c => c.code));
  if (allCodes.size !== merged.length) throw new Error('合并后 code 仍有重复');

  if (DRY) {
    console.log('[dry] 未写入。合并后总数:', merged.length);
    return;
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log('✓ 已写入 questions.json，总数:', merged.length);

  const banks = { 1: 0, 2: 0, 3: 0, 4: 0 };
  merged.forEach(c => banks[c.bank]++);
  const counts = { 1: merged.length, 2: banks[2] + banks[3] + banks[4], 3: banks[3] + banks[4], 4: banks[4] };
  console.log('✓ 档位：bank1=' + banks[1] + ' bank2=' + banks[2] + ' bank3=' + banks[3] + ' bank4=' + banks[4]);
  console.log('✓ 主题库：库1=' + counts[1] + ' 库2=' + counts[2] + ' 库3=' + counts[3] + ' 库4=' + counts[4]);
}
main();
