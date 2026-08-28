/* ============================================================
   store.js — 本地持久化（进度 / 主题 / 字体 / 编辑存档）
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = {
    progress: 'v25_progress',
    dark: 'v25_dark',
    font: 'v25_font',
    bank: 'v25_bank',        // 编辑模式：题库覆盖
    archives: 'v25_archives', // 编辑模式：存档点列表
    opLog: 'v25_oplog',       // 编辑模式：操作日志
  };

  const Store = {
    get: function (k, def) {
      try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    },
    getRaw: function (k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    setRaw: function (k, v) {
      try { localStorage.setItem(k, v); } catch (e) {}
    },
    key: KEY,
  };

  global.Store = Store;
})(window);
