/* ============================================================
   data-loader.js — 数据加载器
   策略：内联数据(单文件版) → 分片加载(dist版) → 整包回退
   兼容 file:// 与 http(s)；含进度条 + 超时重试
   ============================================================ */
(function (global) {
  'use strict';

  const Loader = {
    /* 加载题库，回调 onProgress(loaded, total, msg) */
    load: function (opts) {
      opts = opts || {};
      const onProgress = opts.onProgress || function () {};
      const onDone = opts.onDone || function () {};
      const onFail = opts.onFail || function () {};

      // 1. 内联数据（单文件版）
      if (global.__FC_DATA && global.__FC_DATA.length) {
        onDone(global.__FC_DATA);
        return;
      }

      // 2. 分片加载（dist 版）
      global.__fcParts = global.__fcParts || [];
      const base = './';

      function collect() {
        return [].concat.apply([], global.__fcParts || []);
      }

      function loadScript(src, timeout) {
        return new Promise(function (resolve, reject) {
          const s = document.createElement('script');
          s.src = src;
          s.async = false;
          const timer = setTimeout(function () { s.remove(); reject(new Error('timeout')); }, timeout || 15000);
          s.onload = function () { clearTimeout(timer); resolve(); };
          s.onerror = function () { clearTimeout(timer); s.remove(); reject(new Error('load fail')); };
          document.head.appendChild(s);
        });
      }

      function tryLoadParts() {
        // 先读 manifest
        return fetch(base + 'flashcard-data.manifest.json', { cache: 'no-cache' })
          .then(r => r.json())
          .then(function (manifest) {
            const files = (manifest.parts || []).map(p => p.file);
            return loadSequential(files, manifest.total || files.length * 60);
          })
          .catch(function () {
            // manifest 读不到（file:// 或旧版），回退：顺序试加载分片
            onProgress(0, 0, '分片加载中…');
            return loadSequentialFallback();
          });
      }

      function loadSequential(files, total) {
        let i = 0;
        function next() {
          if (i >= files.length) {
            const data = collect();
            if (data.length) { onDone(data); } else { onFail('题库为空'); }
            return;
          }
          const f = files[i++];
          onProgress(i, files.length, '加载分片 ' + f + '…');
          loadScript(base + f, 20000).then(next).catch(function () {
            // 单分片失败重试一次
            loadScript(base + f, 20000).then(next).catch(function () {
              onFail('分片加载失败: ' + f + '，请检查网络或重新部署');
            });
          });
        }
        next();
      }

      function loadSequentialFallback() {
        // 无 manifest，尝试 flashcard-data-0.js、-1.js … 直到连续失败
        let i = 0;
        function next() {
          const f = 'flashcard-data-' + i + '.js';
          onProgress(i + 1, i + 2, '尝试加载 ' + f + '…');
          loadScript(base + f, 12000).then(function () {
            i++;
            next();
          }).catch(function () {
            const data = collect();
            if (data.length) { onDone(data); } else { onFail('未找到题库数据'); }
          });
        }
        next();
      }

      tryLoadParts();
    }
  };

  global.Loader = Loader;
})(window);
