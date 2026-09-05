/* ============================================================
   store.js — 本地持久化（进度 / 主题 / 字体 / 题库档位 / 编辑存档）
   v2.7：新增「题库档位」概念，进度与编辑存档按当前档位分 key 存储，
        库1（完整版）沿用 v2.6 的 v25_ 老 key，保证老用户进度无缝迁移。
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = {
    activeBank: 'v27_activeBanks', // 当前题库档位 1-4（null=未选过）
    dark: 'v25_dark',
    font: 'v25_font',
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

    /* ---- 动态 key（依赖 App.activeBank，库1 沿用老 key 兼容）---- */
    progressKey: function () {
      const b = (global.App && App.activeBank) || 1;
      return b === 1 ? 'v25_progress' : 'v27_progress_' + b;
    },
    bankKey: function () {
      const b = (global.App && App.activeBank) || 1;
      return b === 1 ? 'v25_bank' : 'v27_bank_' + b;
    },
    archivesKey: function () {
      const b = (global.App && App.activeBank) || 1;
      return b === 1 ? 'v25_archives' : 'v27_archives_' + b;
    },
    oplogKey: function () {
      const b = (global.App && App.activeBank) || 1;
      return b === 1 ? 'v25_oplog' : 'v27_oplog_' + b;
    },
  };

  global.Store = Store;
})(window);
