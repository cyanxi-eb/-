#!/usr/bin/env node
/**
 * build-v25.cjs — 构建脚本
 * 读取 questions.json + src/ 源码 → 生成：
 *   ① dist/面试背记学习卡v2.5.html   单文件版（CSS/JS/数据全内联，双击可用）
 *   ② dist/web/                       分片 PWA 版（css/js 分文件 + 数据分片 + manifest + sw.js）
 * 用法: node build-v25.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const DATA_FILE = path.join(ROOT, 'questions.json');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const WEB = path.join(DIST, 'web');
const PER_PART = 60;

const CSS_FILES = ['base.css', 'flashcard.css', 'memo.css', 'guide.css', 'editor.css'];
const JS_FILES = ['markdown.js', 'data-loader.js', 'store.js', 'flashcard.js', 'memo.js', 'guide.js', 'editor.js', 'app.js'];

// ---------- 1. 读取 + 校验 ----------
function loadData() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const codes = new Set(), ids = new Set(), errors = [];
  data.forEach(c => {
    if (!c.code || codes.has(c.code)) errors.push(`code 问题: ${c.code}`);
    else codes.add(c.code);
    if (ids.has(c.id)) errors.push(`id 重复: ${c.id}`);
    else ids.add(c.id);
    if (!c.question || !c.answer) errors.push(`${c.code}: 缺 question/answer`);
  });
  if (errors.length) { console.error('校验失败：'); errors.forEach(e => console.error('  ✗ ' + e)); process.exit(1); }
  console.log(`✓ 数据校验通过：${data.length} 题`);
  return data;
}

// ---------- 2. 生成单文件版 ----------
function buildSingle(data) {
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

  // 内联 CSS
  html = html.replace(/<link rel="stylesheet" href="css\/([^"]+)">/g, (m, file) => {
    const css = fs.readFileSync(path.join(SRC, 'css', file), 'utf8');
    return '<style>\n' + css + '\n</style>';
  });

  // 内联 JS（保留 __FC_DATA_PLACEHOLDER__ 与 App.init）
  html = html.replace(/<script src="js\/([^"]+)"><\/script>/g, (m, file) => {
    const js = fs.readFileSync(path.join(SRC, 'js', file), 'utf8');
    return '<script>\n' + js + '\n</script>';
  });

  // 内联数据（用 callback 替换，避免 String.replace 的 $ 特殊序列污染数据）
  const dataScript = '<script>window.__FC_DATA = ' + JSON.stringify(data) + ';</script>';
  html = html.replace('<!-- __FC_DATA_PLACEHOLDER__ -->', () => dataScript);

  const out = path.join(DIST, '面试背记学习卡v2.5.html');
  fs.writeFileSync(out, html, 'utf8');
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
  console.log(`✓ 单文件版：${out}（${kb} KB）`);
}

// ---------- 3. 生成分片 PWA 版 ----------
function buildWeb(data) {
  fs.mkdirSync(path.join(WEB, 'css'), { recursive: true });
  fs.mkdirSync(path.join(WEB, 'js'), { recursive: true });

  // 复制 index.html（去掉占位，靠 Loader 加载分片）
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  html = html.replace('<!-- __FC_DATA_PLACEHOLDER__ -->', '');
  fs.writeFileSync(path.join(WEB, 'index.html'), html, 'utf8');

  // 复制 css/js
  CSS_FILES.forEach(f => fs.copyFileSync(path.join(SRC, 'css', f), path.join(WEB, 'css', f)));
  JS_FILES.forEach(f => fs.copyFileSync(path.join(SRC, 'js', f), path.join(WEB, 'js', f)));

  // 生成数据分片 + manifest
  const parts = [];
  for (let i = 0; i < data.length; i += PER_PART) {
    const chunk = data.slice(i, i + PER_PART);
    const file = `flashcard-data-${parts.length}.js`;
    const js = 'window.__fcParts = window.__fcParts || [];\nwindow.__fcParts.push(' + JSON.stringify(chunk) + ');\n';
    fs.writeFileSync(path.join(WEB, file), js, 'utf8');
    parts.push({ file, bytes: Buffer.byteLength(js, 'utf8') });
  }
  fs.writeFileSync(path.join(WEB, 'flashcard-data.manifest.json'), JSON.stringify({ parts, total: data.length, source: 'v2.5', version: '2.5' }), 'utf8');

  // PWA：manifest + sw.js
  fs.writeFileSync(path.join(WEB, 'manifest.webmanifest'), JSON.stringify({
    name: '面试背记学习卡 v2.5', short_name: '记忆卡', description: 'AI 大模型面试背记闪卡',
    start_url: './index.html', scope: './', display: 'standalone', orientation: 'portrait',
    background_color: '#f5f7fa', theme_color: '#4299e1', icons: [],
  }, null, 2), 'utf8');

  const sw = `const CACHE = 'fc-v25';
const ASSETS = ['./index.html','./manifest.webmanifest','./css/base.css','./css/flashcard.css','./css/memo.css','./css/guide.css','./css/editor.css','./js/markdown.js','./js/data-loader.js','./js/store.js','./js/flashcard.js','./js/memo.js','./js/guide.js','./js/editor.js','./js/app.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const isData = /flashcard-data(-\\d+)?\\.js|flashcard-data\\.manifest\\.json/.test(req.url);
  if (isData) {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return res; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(c => c || fetch(req).then(res => { const cc = res.clone(); caches.open(CACHE).then(x => x.put(req, cc)).catch(()=>{}); return res; }).catch(() => c)));
});
`;
  fs.writeFileSync(path.join(WEB, 'sw.js'), sw, 'utf8');

  // 注册 SW 到 index.html
  let webHtml = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
  webHtml = webHtml.replace('<script>App.init();</script>',
    '<script>if(\'serviceWorker\' in navigator){navigator.serviceWorker.register(\'./sw.js\').catch(()=>{});}</script>\n<script>App.init();</script>');
  fs.writeFileSync(path.join(WEB, 'index.html'), webHtml, 'utf8');

  console.log(`✓ 分片 PWA 版：dist/web/（${parts.length} 片 + manifest + sw.js）`);
}

// ---------- 主流程 ----------
function main() {
  console.log('=== 构建 面试背记学习卡 v2.5 ===');
  const data = loadData();
  fs.mkdirSync(DIST, { recursive: true });
  buildSingle(data);
  buildWeb(data);
  console.log('=== 构建完成 ===');
}
main();
