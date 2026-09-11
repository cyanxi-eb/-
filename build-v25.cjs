#!/usr/bin/env node
/**
 * build-v25.cjs — 构建脚本（多题库档位）
 * 读取 questions.json + src/ 源码 → 生成：
 *   ① dist/面试背记学习卡v<VER>.html   单文件版（CSS/JS/4档题库全内联，双击可用）
 *   ② dist/web/                       分片 PWA 版（css/js 分文件 + 4档 banks/*.json + manifest + sw.js）
 * 题库档位：bank 字段 1-4，值越大越核心；主题库 N = 所有 bank>=N 的题。
 * 用法: node build-v25.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const DATA_FILE = path.join(ROOT, 'questions.json');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const WEB = path.join(DIST, 'web');
const VERSION = '2.13';

const CSS_FILES = ['base.css', 'flashcard.css', 'memo.css', 'guide.css', 'editor.css'];
const JS_FILES = ['markdown.js', 'data-loader.js', 'cloud.js', 'store.js', 'flashcard.js', 'memo.js', 'guide.js', 'editor.js', 'app.js', 'sw-register.js'];

// ---------- 0. JS 语法检查（避免 `*/` 在注释里提前结束块注释导致 SyntaxError）----------
function syntaxCheckAll() {
  const { execSync } = require('child_process');
  const errors = [];
  for (const f of JS_FILES) {
    const full = path.join(SRC, 'js', f);
    try {
      execSync(`node --check "${full}"`, { stdio: 'pipe' });
    } catch (e) {
      errors.push(`${f}: ${e.stderr ? e.stderr.toString().split('\n')[0] : e.message}`);
    }
  }
  if (errors.length) {
    console.error('✗ JS 语法检查失败（中止构建）：');
    errors.forEach(e => console.error('  ' + e));
    process.exit(1);
  }
  console.log(`✓ JS 语法检查通过（${JS_FILES.length} 个文件）`);
}

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
    if (!(c.bank >= 1 && c.bank <= 4)) errors.push(`${c.code}: bank 字段缺失或越界(${c.bank})`);
  });
  if (errors.length) { console.error('校验失败：'); errors.forEach(e => console.error('  ✗ ' + e)); process.exit(1); }
  console.log(`✓ 数据校验通过：${data.length} 题`);
  return data;
}

// ---------- 2. 按 bank 分组（单档，无重叠）----------
function groupByBank(data) {
  const banks = { 1: [], 2: [], 3: [], 4: [] };
  data.forEach(c => { banks[c.bank].push(c); });
  return banks;
}

// 库 N 累计题量 = bank>=N 的题
function calcCounts(banks, total) {
  return {
    1: total,
    2: banks[2].length + banks[3].length + banks[4].length,
    3: banks[3].length + banks[4].length,
    4: banks[4].length,
  };
}

// ---------- 3. 生成单文件版 ----------
function buildSingle(data, banks, counts) {
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

  // 内联 CSS
  html = html.replace(/<link rel="stylesheet" href="css\/([^"]+)">/g, (m, file) => {
    const css = fs.readFileSync(path.join(SRC, 'css', file), 'utf8');
    return '<style>\n' + css + '\n</style>';
  });

  // 内联 JS
  html = html.replace(/<script src="js\/([^"]+)"><\/script>/g, (m, file) => {
    const js = fs.readFileSync(path.join(SRC, 'js', file), 'utf8');
    return '<script>\n' + js + '\n</script>';
  });

  // 内联 4 档题库（用 callback 替换，避免 $ 特殊序列污染数据）
  const banksScript = '<script>window.__FC_BANKS = ' + JSON.stringify(banks) + ';</script>';
  const metaScript = '<script>window.__FC_BANK_META = ' + JSON.stringify({ total: data.length, counts: counts }) + ';</script>';
  html = html.replace('<!-- __FC_DATA_PLACEHOLDER__ -->', () => banksScript + metaScript);

  const out = path.join(DIST, '面试背记学习卡v2.13.html');
  fs.writeFileSync(out, html, 'utf8');
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
  console.log(`✓ 单文件版：${out}（${kb} KB）`);
}

// ---------- 4. 生成分片 PWA 版 ----------
function buildWeb(data, banks, counts) {
  fs.mkdirSync(path.join(WEB, 'css'), { recursive: true });
  fs.mkdirSync(path.join(WEB, 'js'), { recursive: true });
  fs.mkdirSync(path.join(WEB, 'banks'), { recursive: true });

  // 复制 index.html（去掉占位，靠 Loader 加载分片）
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  html = html.replace('<!-- __FC_DATA_PLACEHOLDER__ -->', '');
  fs.writeFileSync(path.join(WEB, 'index.html'), html, 'utf8');

  // 复制 css/js
  CSS_FILES.forEach(f => fs.copyFileSync(path.join(SRC, 'css', f), path.join(WEB, 'css', f)));
  JS_FILES.forEach(f => fs.copyFileSync(path.join(SRC, 'js', f), path.join(WEB, 'js', f)));

  // 生成 4 档 banks/*.json
  [1, 2, 3, 4].forEach(b => {
    fs.writeFileSync(path.join(WEB, 'banks', `bank-${b}.json`), JSON.stringify(banks[b]), 'utf8');
  });  // banks.manifest.json
  fs.writeFileSync(path.join(WEB, 'banks.manifest.json'), JSON.stringify({
    banks: [1, 2, 3, 4], counts: counts, version: VERSION, source: 'v' + VERSION,
  }), 'utf8');

  // .nojekyll（避免 GitHub Pages 用 Jekyll 处理，保留原样）
  fs.writeFileSync(path.join(WEB, '.nojekyll'), '', 'utf8');

  // PWA：manifest + sw.js
  fs.writeFileSync(path.join(WEB, 'manifest.webmanifest'), JSON.stringify({
    name: '面试背记学习卡 v' + VERSION, short_name: '记忆卡', description: 'AI 大模型面试背记闪卡',
    start_url: './index.html', scope: './', display: 'standalone', orientation: 'portrait',
    background_color: '#f5f7fa', theme_color: '#4299e1', icons: [],
  }, null, 2), 'utf8');

  const sw = `/* 本文件由 build-v25.cjs 生成，请勿直接手改 dist/web/sw.js */
const CACHE = 'fc-v38';  // ★ cache name 变更会强制 Service Worker 重装 + 清理旧缓存
// bump 记录：
//   v29: bump fc-v28→fc-v29（修复"配置类资源被 SW cache 掩盖"问题）
//   v30: bump fc-v29→fc-v30（修复"多用户数据共享污染"问题——store.js/cloud.js 加用户前缀）
//   v31: bump fc-v30→fc-v31（修复"老登录态缺 userId → fetch id=eq.null 400 → 卡加载页"问题）
//   v32: bump fc-v31→fc-v32（修复"Cloud._req 无超时→国内访问海外 Supabase 挂起→boot 永不启动→卡加载页"问题）
//   v33: bump fc-v32→fc-v33（修复"store.js 注释 v25_*/v27_* 提前结束块注释 SyntaxError"——上次只改源码没 bump，SW 仍缓存旧 store.js）
//   v34: bump fc-v33→fc-v34（v2.9 内容扩充+分类重组：题库 244→271、分类图标 🏷→🔖、新增 Git/LangChain/RAG/Redis 题）
//   v35: bump fc-v34→fc-v35（v2.10 多用户数据恢复与登录稳定性：applyToLocal 总是跑 / push 失败重试 / POST 409 GET 重试 / 本地无前缀数据自动迁移 / pullAndApply 二次重试）
//   v36: bump fc-v35→fc-v36（v2.11 修复"confirmLogin 中 markDirty debounced 500ms 被 location.reload 砍掉 → push 没真上云"问题；
//                          改 await Cloud.push() 真正等推送完成再 reload；
//                          编辑工具栏新增「☁️ 从云端拉取」「🔍 诊断」两个应急按钮，
//                          以后题库空白再发生不用再修代码，一键恢复 + 一键 dump 状态给 AI 定位）
//   v37: bump fc-v36→fc-v37（v2.12 题库扩充+分类扩展：271→361 题；
//                          新增 MCP / LangGraph / Agent 智能体 / AI 应用工程 / 提示词工程 /
//                          SQLAlchemy / AI 场景设计 共 7 个新分类；
//                          来源：ai-agents-from-zero 教材题库、LLM0903 实战课、SQLAlchemy 文档；
//                          档位上限适当放宽：库3<200→<320、库4<100→<180）
//   v38: bump fc-v37→fc-v38（v2.13 修掉"每次发布都要用户硬刷新"的缺陷：
//                          ① 同源资源由 cache-first 改为 network-first（fetch 带 cache:'no-cache' 强制回源校验），
//                             HTML 与 JS/CSS 永远来自同一次部署，不会新旧混用；
//                          ② 新增 src/js/sw-register.js：注册用 updateViaCache:'none' 让 sw.js 绕过
//                             GitHub Pages 的 max-age=600，并在 controllerchange 时自动 reload 一次；
//                          ③ 修掉隐患：跨域请求（Supabase 登录/同步的用户数据）此前会被 SW 拦截缓存）
const ASSETS = ['./index.html','./manifest.webmanifest','./css/base.css','./css/flashcard.css','./css/memo.css','./css/guide.css','./css/editor.css','./js/markdown.js','./js/data-loader.js','./js/cloud.js','./js/store.js','./js/flashcard.js','./js/memo.js','./js/guide.js','./js/editor.js','./js/app.js','./js/sw-register.js'];
/* 安装：尽力预缓存静态资源（单个失败不阻断安装，避免"装不上就永远是旧版"），随后立即接管 */
self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE)
    .then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: 'no-cache' })).catch(() => null))))
    .then(() => self.skipWaiting())
));

/* 激活：清掉旧版本缓存，并立即接管已打开的页面（用户无需重开标签页） */
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

/* 取数据：同源 GET 一律 network-first（cache:'no-cache' 强制向服务器校验）
   —— 保证 HTML / JS / CSS / 题库分片永远来自同一次部署，不会新旧混用；
   网络不可用时降级到缓存，保住离线可用。 */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  // ★ 跨域请求（Supabase 登录 / 云端同步）交给浏览器直连，SW 绝不缓存用户数据
  if (url.origin !== self.location.origin) return;
  const isNavigate = req.mode === 'navigate';
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        // 导航请求不入缓存（离线兜底统一走预缓存的 ./index.html）
        if (res && res.ok && !isNavigate) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(c => c || (isNavigate ? caches.match('./index.html') : undefined)))
  );
});
`;
  fs.writeFileSync(path.join(WEB, 'sw.js'), sw, 'utf8');

  // SW 注册已移入源码 src/js/sw-register.js（v2.13 起由 JS_FILES 统一复制/内联），
  // 此处不再注入内联脚本，避免"注册逻辑在源码与产物两处维护"。

  console.log(`✓ 分片 PWA 版：dist/web/（4 档 banks/*.json + manifest + sw.js）`);
}

// ---------- 主流程 ----------
function main() {
  console.log('=== 构建 面试背记学习卡 v' + VERSION + ' ===');
  syntaxCheckAll();  // 先做语法检查，避免 `*/` 在注释里提前结束块注释导致 SyntaxError 推到线上
  const data = loadData();
  const banks = groupByBank(data);
  const counts = calcCounts(banks, data.length);
  console.log('✓ 题库档位：bank1=' + banks[1].length + ' bank2=' + banks[2].length + ' bank3=' + banks[3].length + ' bank4=' + banks[4].length);
  console.log('✓ 主题库：库1=' + counts[1] + ' 库2=' + counts[2] + ' 库3=' + counts[3] + ' 库4=' + counts[4]);

  // 自检断言（v2.12 起随题库扩充"适当放宽"上限：原 库3<200 / 库4<100）
  const LIMIT3 = 320, LIMIT4 = 180;
  const ok4 = counts[4] < LIMIT4;
  const ok3 = counts[3] < LIMIT3;
  if (!ok4) { console.error('✗ 自检失败：库4 = ' + counts[4] + ' 超过 ' + LIMIT4); process.exit(1); }
  if (!ok3) { console.error('✗ 自检失败：库3 = ' + counts[3] + ' 超过 ' + LIMIT3); process.exit(1); }
  console.log('✓ 自检通过：库3(' + counts[3] + ') < ' + LIMIT3 + '，库4(' + counts[4] + ') < ' + LIMIT4);

  fs.mkdirSync(DIST, { recursive: true });
  buildSingle(data, banks, counts);
  buildWeb(data, banks, counts);
  console.log('=== 构建完成 ===');
}
main();
