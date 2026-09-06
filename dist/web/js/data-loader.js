/* ============================================================
   data-loader.js — 数据加载器（v2.7：多题库档位）
   策略：内联 banks(单文件版) → 分片 banks/*.json(dist版) → 整包回退
   兼容 file:// 与 http(s)。
   banks 结构：{ 1:[bank==1 的题], 2:[...], 3:[...], 4:[...] }（单档，无重叠）
   meta 结构：{ total, counts:{1:244,2:209,3:174,4:95} }
   v2.8：fetch 加 8s 超时保护，避免 SW 或网络异常时永久卡在加载页
   ============================================================ */
(function (global) {
  'use strict';

  // fetch 加超时：超时返回 reject，避免永久挂起
  const fetchWithTimeout = (url, opts, ms) => {
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () { reject(new Error('timeout ' + ms + 'ms')); }, ms);
      fetch(url, opts).then(
        function (r) { clearTimeout(timer); resolve(r); },
        function (e) { clearTimeout(timer); reject(e); }
      );
    });
  };

  const Loader = {
    /* 加载题库，回调 onProgress(loaded,total,msg) / onDone(banks, meta) / onFail(err) */
    load: function (opts) {
      opts = opts || {};
      const onProgress = opts.onProgress || function () {};
      const onDone = opts.onDone || function () {};
      const onFail = opts.onFail || function () {};

      // 1. 内联 banks（单文件版）
      if (global.__FC_BANKS) {
        onDone(global.__FC_BANKS, global.__FC_BANK_META || {});
        return;
      }

      // 2. 分片 banks（dist 版）：读 banks.manifest.json 后 fetch bank-N.json
      const base = './';
      const TIMEOUT = 8000;
      fetchWithTimeout(base + 'banks.manifest.json', { cache: 'no-cache' }, TIMEOUT)
        .then(r => r.json())
        .then(function (manifest) {
          const banks = (manifest.banks || [1, 2, 3, 4]);
          let i = 0;
          const result = {};
          function next() {
            if (i >= banks.length) {
              const total = Object.keys(result).reduce((s, k) => s + result[k].length, 0);
              onDone(result, { total: total, counts: manifest.counts || {} });
              return;
            }
            const b = banks[i++];
            onProgress(i, banks.length, '加载题库 ' + b + '…');
            fetchWithTimeout(base + 'banks/bank-' + b + '.json', { cache: 'no-cache' }, TIMEOUT)
              .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
              .then(function (arr) { result[b] = arr || []; next(); })
              .catch(function () {
                // 单档失败重试一次
                fetchWithTimeout(base + 'banks/bank-' + b + '.json', { cache: 'no-cache' }, TIMEOUT)
                  .then(r => r.json())
                  .then(function (arr) { result[b] = arr || []; next(); })
                  .catch(function (err) { onFail('题库分片加载失败: bank-' + b + '（' + (err.message || err) + '）'); });
              });
          }
          next();
        })
        .catch(function (err) {
          onFail('未找到题库数据（banks.manifest.json）：' + (err.message || err));
        });
    }
  };

  global.Loader = Loader;
})(window);
