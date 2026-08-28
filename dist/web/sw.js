const CACHE = 'fc-v25';
const ASSETS = ['./index.html','./manifest.webmanifest','./css/base.css','./css/flashcard.css','./css/memo.css','./css/guide.css','./css/editor.css','./js/markdown.js','./js/data-loader.js','./js/store.js','./js/flashcard.js','./js/memo.js','./js/guide.js','./js/editor.js','./js/app.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const isData = /flashcard-data(-\d+)?\.js|flashcard-data\.manifest\.json/.test(req.url);
  if (isData) {
    e.respondWith(fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)).catch(()=>{}); return res; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(c => c || fetch(req).then(res => { const cc = res.clone(); caches.open(CACHE).then(x => x.put(req, cc)).catch(()=>{}); return res; }).catch(() => c)));
});
