#!/usr/bin/env node
/**
 * extract.cjs — 从 v2.4 HTML 与 bh-mindmaps 分片提取题库数据，输出中间 JSON 并打印统计
 * 用法: node tools/extract.cjs
 * 输出: tools/_v24.json  tools/_bh.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const V24_HTML = path.join(ROOT, '..', '面试背记学习卡v2.4.html');
const BH_DIR = path.join(ROOT, '..', 'bh-mindmaps-main');

// ---------- 1. 提取 v2.4 flashcardData ----------
function extractV24() {
  const html = fs.readFileSync(V24_HTML, 'utf8');
  const start = html.indexOf('const flashcardData = [');
  if (start < 0) throw new Error('v2.4 未找到 flashcardData');
  const arrStart = html.indexOf('[', start);
  const end = html.indexOf('\n];', arrStart);
  if (end < 0) throw new Error('v2.4 未找到数组结束符');
  // '\n];' 中：end=换行, end+1=']', end+2=';' → slice 到 end+2 含 ']' 不含 ';'
  const arrText = html.slice(arrStart, end + 2);
  // 用 Function 安全求值（数据是字面量对象数组）
  const data = new Function('return ' + arrText)();
  return data;
}

// ---------- 2. 提取 bh-mindmaps 分片 ----------
function extractBh() {
  const parts = [0, 1, 2].map(i => {
    const f = path.join(BH_DIR, `flashcard-data-${i}.js`);
    const txt = fs.readFileSync(f, 'utf8');
    const s = txt.indexOf('window.__fcParts.push([');
    if (s < 0) throw new Error(`分片 ${i} 未找到 push 起始`);
    const a = txt.indexOf('[', s);
    const e = txt.lastIndexOf(']);');
    if (e < 0) throw new Error(`分片 ${i} 未找到结束符`);
    const arrText = txt.slice(a, e + 1);
    return new Function('return ' + arrText)();
  });
  const all = [].concat(...parts);
  return all;
}

// ---------- 3. 统计分类 ----------
function stats(data, label) {
  const m = {};
  data.forEach(c => { const k = c.category || '(未分类)'; m[k] = (m[k] || 0) + 1; });
  console.log(`\n===== ${label} 共 ${data.length} 题 =====`);
  Object.entries(m).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
  return m;
}

try {
  const v24 = extractV24();
  const bh = extractBh();
  fs.writeFileSync(path.join(__dirname, '_v24.json'), JSON.stringify(v24, null, 2), 'utf8');
  fs.writeFileSync(path.join(__dirname, '_bh.json'), JSON.stringify(bh, null, 2), 'utf8');
  stats(v24, 'v2.4');
  stats(bh, 'bh-mindmaps');
  console.log('\n中间文件已输出: tools/_v24.json, tools/_bh.json');
} catch (e) {
  console.error('提取失败:', e.message);
  process.exit(1);
}
