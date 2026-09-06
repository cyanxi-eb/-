const CACHE = 'fc-v31';  // ★ cache name 变更会强制 Service Worker 重装+清理旧缓存（用户访问过旧版时必备）
// bump 记录：
//   v29: bump fc-v28→fc-v29（修复"配置类资源被 SW cache 掩盖"问题）
//   v30: bump fc-v29→fc-v30（修复"多用户数据共享污染"问题——store.js/cloud.js 加用户前缀）
//   v31: bump fc-v30→fc-v31（修复"老登录态缺 userId → fetch id=eq.null 400 → 卡加载页"问题）
const ASSETS = ['./index.html','./manifest.webmanifest','./css/base.css','./css/flashcard.css','./css/memo.css','./css/guide.css','./css/editor.css','./js/markdown.js','./js/data-loader.js','./js/cloud.js','./js/store.js','./js/flashcard.js','./js/memo.js','./js/guide.js','./js/editor.js','./js/app.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const isData = /banks\/bank-\d+\.json|banks\.manifest\.json/.test(req.url);
  const isConfig = /cloud\.js/.test(req.url);  // ★ cloud.js 含密钥，必须 network-first（避免缓存陈旧值）
  if (isData || isConfig) {
    // network-first：先网络再缓存；离线/失败时降级到缓存
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return res; }).catch(() => caches.match(req)));
    return;
  }
  // 其它资源：cache-first（首装快+离线可用）；失败时降级到缓存
  e.respondWith(caches.match(req).then(c => c || fetch(req).then(res => { const cc = res.clone(); caches.open(CACHE).then(x => x.put(req, cc)).catch(()=>{}); return res; }).catch(() => c)));
});
