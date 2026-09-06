/* ============================================================
   store.js — 本地持久化（进度 / 主题 / 字体 / 题库档位 / 编辑存档）
   v2.7：新增「题库档位」概念，进度与编辑存档按当前档位分 key 存储，
        库1（完整版）沿用 v2.6 的 v25_ 老 key，保证老用户进度无缝迁移。
   v2.8：所有用户维度数据（v25_ 前缀 / v27_ 前缀）按当前登录用户自动加前缀 u_<userId>_，
        实现多用户数据隔离。未登录用户保持原 key 命名（纯本地模式兼容）。
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = {
    activeBank: 'v27_activeBanks', // 当前题库档位 1-4（null=未选过）
    dark: 'v25_dark',
    font: 'v25_font',
  };

  // 登录态元数据（不分用户、不随数据同步、绝不能被 clearAllUsersLocal 清掉）
  const NICK_KEY = 'v27_nickname';
  const USERID_KEY = 'v27_userid';

  // 判定某个 key 是否属于「用户维度数据」（需要按用户隔离）
  // ★ 必须排除 v27_nickname / v27_userid 这两个登录态元数据，
  //   否则 clearAllUsersLocal() 会把刚写入的 v27_userid 一起删掉 → reload 后降级本地、登录失效
  const isUserKey = (k) => k !== NICK_KEY && k !== USERID_KEY && (/^v25_/.test(k) || /^v27_/.test(k));

  // 当前登录用户的 key 前缀（未登录返回空）
  const userPrefix = () => {
    if (global.Cloud && Cloud.isLoggedIn() && Cloud.userId) return 'u_' + Cloud.userId + '_';
    return '';
  };

  const Store = {
    get: function (k, def) {
      try {
        const final = isUserKey(k) ? userPrefix() + k : k;
        const v = localStorage.getItem(final);
        return v === null ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set: function (k, v) {
      try {
        const final = isUserKey(k) ? userPrefix() + k : k;
        localStorage.setItem(final, JSON.stringify(v));
      } catch (e) {}
      // 登录态下标记云端脏数据，稍后自动推送（见 cloud.js）
      if (global.Cloud) global.Cloud.markDirty();
    },
    getRaw: function (k) {
      try {
        const final = isUserKey(k) ? userPrefix() + k : k;
        return localStorage.getItem(final);
      } catch (e) { return null; }
    },
    setRaw: function (k, v) {
      try {
        const final = isUserKey(k) ? userPrefix() + k : k;
        localStorage.setItem(final, v);
      } catch (e) {}
    },
    key: KEY,

    /* ---- 动态 key（依赖 App.activeBank，库1 沿用老 key 兼容）---- */
    /* 这些方法返回「裸 key」，调用方需通过 Store.get/set 访问（自动加用户前缀） */
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

    /* ---- 用户维度辅助（外部需要直接构造带前缀 key 时使用）---- */
    isUserKey: isUserKey,
    userPrefix: userPrefix,
    /** 清空 localStorage 里所有带当前用户前缀的 key（切用户/退出登录时调用） */
    clearUserLocal: function () {
      const prefix = userPrefix();
      if (!prefix) return 0;
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      return toRemove.length;
    },
    /** 清空所有用户维度数据（不论哪个用户，用于「切用户/登录」类操作；保留登录态元数据 v27_nickname/v27_userid） */
    clearAllUsersLocal: function () {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        // 无前缀用户数据（v25_*/v27_*，已排除登录态元数据）或带 u_<userId>_ 前缀的历史用户数据
        if (isUserKey(k) || /^u_[^_]+_/.test(k)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      return toRemove.length;
    },
  };

  global.Store = Store;
})(window);