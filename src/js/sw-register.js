/* ============================================================
   sw-register.js — Service Worker 注册与「自动更新」（v2.13 新增）
   ------------------------------------------------------------
   目标：新版本发布后浏览器自动装载，用户无需再按 Ctrl+Shift+R。
   背景：GitHub Pages 给 index.html / sw.js 都加了 max-age=600 的 HTTP 缓存，
        旧版又对同源资源用 cache-first，于是"浏览器既看不到新 sw.js，
        也拿不到新 HTML"，只能靠硬刷新绕过缓存。

   做法（四道保险）：
     1) register 时 updateViaCache:'none' —— 让 sw.js 自身绕过 HTTP 缓存，
        每次检查更新都真的回源，不受 max-age 影响。
     2) 页面加载完成、标签页重新可见、以及每 30 分钟，主动 reg.update()。
     3) 新 SW 装配完成并接管（controllerchange）后自动 reload 一次，
        新 HTML / JS / CSS 一次到位（SW 侧 skipWaiting + clients.claim）。
     4) 若此刻用户正在输入框里打字，延后到失焦后再刷新，避免打断编辑。

   仅在 http(s) 下生效；file:// 打开的单文件版自动跳过（不报错）。
   ============================================================ */
(function () {
  'use strict';

  // 单文件版（file://）与不支持 SW 的浏览器：静默跳过
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  var reloading = false;

  // 本次加载时页面是否已被旧 SW 接管：
  // 首次安装（controller 为空）时页面本身就是最新版，不需要多刷一次。
  var hadController = !!navigator.serviceWorker.controller;

  // 刷新（正在输入则等失焦后再刷）
  function safeReload() {
    if (reloading) return;
    var el = document.activeElement;
    var typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    reloading = true;
    if (typing) {
      var handler = function () {
        el.removeEventListener('blur', handler);
        setTimeout(function () { location.reload(); }, 150);
      };
      el.addEventListener('blur', handler);
      return;
    }
    location.reload();
  }

  // ★ 核心：新 SW 接管控制权 → 自动刷新，用户无感升级
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController) return;   // 首次安装，无需刷新
    safeReload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then(function (reg) {
        // 已有等待中的新版本（例如上次更新时页面正开着）→ 直接升级
        if (reg.waiting && navigator.serviceWorker.controller) safeReload();

        // 加载后立即查一次
        reg.update().catch(function () {});

        // 标签页重新可见时再查（长期挂着的页面也能拿到新版本）
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') reg.update().catch(function () {});
        });

        // 兜底：每 30 分钟查一次
        setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
      })
      .catch(function () { /* 注册失败不影响正常使用（例如隐私模式）*/ });
  });
})();
