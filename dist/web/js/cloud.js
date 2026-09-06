/* ============================================================
   cloud.js — 云端同步层（v2.8：Supabase + 简单昵称登录）
   原理：直接调用 Supabase PostgREST（REST API），无需引入 SDK。
   数据模型：profiles 表一行一个用户，data(jsonb) 存该用户全部状态。
   同步范围：学习进度 + 设置(档位/主题/字体) + 编辑后的题库。
             （存档点 archives / 操作日志 oplog 属编辑本地辅助，不同步）
   未配置 key 时 enabled=false，自动回退为纯本地（localStorage），
   离线或请求失败时静默降级，不影响本地使用。
   ============================================================ */
(function (global) {
  'use strict';

  /* ★★★ 在这里填入你的 Supabase 项目配置（开通步骤见 docs/supabase-setup.md）★★★ */
  const SUPABASE_URL = 'https://imbzbrtgexcpofllelok.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYnpicnRnZXhjcG9mbGxlbG9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2OTE1ODgsImV4cCI6MjEwNDI2NzU4OH0.SXadb7QX287584mCvJHjGCb9X8433kfY6SBGop-cJiY';

  const NICK_KEY = 'v27_nickname';   // 本地记住「当前登录昵称」（不同步上云）
  const USERID_KEY = 'v27_userid';   // 当前登录用户的 Supabase userId（不同步上云）
  const PUSH_DELAY = 500;            // 停止操作后多久自动推送（毫秒）
  const REQ_TIMEOUT = 8000;          // 云端请求超时（毫秒），避免国内访问海外 Supabase 时永久挂起

  // fetch 加超时（带 AbortController 真取消请求），避免海外 API 永远 pending 卡住页面
  const _fetchWithTimeout = (url, opts, ms) => {
    const ctlr = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const finalOpts = ctlr ? Object.assign({}, opts, { signal: ctlr.signal }) : opts;
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () {
        if (ctlr) try { ctlr.abort(); } catch (e) {}
        reject(new Error('云端请求超时 ' + ms + 'ms（请检查网络）'));
      }, ms);
      fetch(url, finalOpts).then(
        function (r) { clearTimeout(timer); resolve(r); },
        function (e) { clearTimeout(timer); reject(e); }
      );
    });
  };

  const Cloud = {
    enabled: false,
    nickname: null,
    userId: null,
    _data: null,     // 云上该用户的数据快照 { key: value }
    _timer: null,

    /* ---------- 初始化 ---------- */
    init: function () {
      this.enabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
      if (!this.enabled) return;
      try {
        this.nickname = localStorage.getItem(NICK_KEY) || null;
        this.userId = localStorage.getItem(USERID_KEY) || null;
        // ★ 防御：旧版未记 userId，强制降级为本地模式（避免 fetch id=eq.null 400 报错）
        if (this.nickname && !this.userId) {
          console.warn('[cloud] 检测到旧登录态（缺 userId），自动降级为本地模式，请重新登录');
          this.nickname = null;
          this.userId = null;
          try { localStorage.removeItem(NICK_KEY); } catch (e) {}
        }
      } catch (e) { this.nickname = null; this.userId = null; }
    },

    isLoggedIn: function () { return this.enabled && !!this.nickname; },
    getNickname: function () { return this.nickname; },

    /* ---------- 底层请求 ---------- */
    _headers: function () {
      return {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      };
    },
    _req: function (method, path, body) {
      return _fetchWithTimeout(SUPABASE_URL + '/rest/v1/' + path, {
        method: method,
        headers: this._headers(),
        body: body == null ? undefined : JSON.stringify(body),
      }, REQ_TIMEOUT).then(function (r) {
        if (!r.ok) throw new Error('云端请求失败 HTTP ' + r.status);
        const ct = r.headers.get('content-type') || '';
        return ct.indexOf('json') >= 0 ? r.json() : null;
      });
    },

    /* ---------- 登录：查昵称，不存在则创建 ---------- */
    login: function (nickname) {
      if (!this.enabled) return Promise.reject(new Error('云端未配置（见 docs/supabase-setup.md）'));
      nickname = String(nickname == null ? '' : nickname).trim();
      if (!nickname) return Promise.reject(new Error('昵称不能为空'));
      if (nickname.length > 30) return Promise.reject(new Error('昵称最长 30 个字符'));
      const self = this;
      const enc = encodeURIComponent(nickname);
      return this._req('GET', 'profiles?nickname=eq.' + enc + '&select=id,nickname,data')
        .then(function (rows) {
          if (rows && rows.length) return { userId: rows[0].id, data: rows[0].data || {} };
          return self._req('POST', 'profiles', { nickname: nickname, data: {} })
            .then(function (created) {
              const row = Array.isArray(created) ? created[0] : created;
              return { userId: row.id, data: row.data || {} };
            });
        })
        .then(function (res) {
          self.nickname = nickname;
          self.userId = res.userId;
          self._data = res.data || {};
          try { localStorage.setItem(NICK_KEY, nickname); localStorage.setItem(USERID_KEY, res.userId); } catch (e) {}
          return res;
        });
    },

    logout: function () {
      this.nickname = null;
      this.userId = null;
      this._data = null;
      try { localStorage.removeItem(NICK_KEY); localStorage.removeItem(USERID_KEY); } catch (e) {}
    },

    /* ---------- 数据收集 / 落盘 ---------- */
    /* 剥掉用户前缀（u_<userId>_xxx → xxx），便于按"业务 key 名"判断 */
    _stripPrefix: function (k) {
      return k.replace(/^u_[^_]+_/, '');
    },
    /* 判断某个 localStorage key 是否要同步上云（按剥前缀后的业务 key 判断） */
    _shouldSync: function (key) {
      const k = this._stripPrefix(key);
      if (k === NICK_KEY) return false;
      if (/archives|oplog/.test(k)) return false;   // 编辑辅助数据不同步
      return k.indexOf('v25_') === 0 || k.indexOf('v27_') === 0;
    },
    /* 收集本地所有可同步 key → { 业务key: value }（已剥前缀，云端按业务 key 存）
       登录态只收集「当前用户前缀」的数据，未登录只收集无前缀数据，
       避免把其它用户的残留数据（u_<otherId>_*）误推上云造成污染 */
    collect: function () {
      const map = {};
      const prefix = this.isLoggedIn() ? 'u_' + this.userId + '_' : '';
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (prefix) {
            if (k.indexOf(prefix) !== 0) continue;      // 只要当前用户
            const biz = k.slice(prefix.length);
            if (!this._shouldSync(biz)) continue;
            map[biz] = JSON.parse(localStorage.getItem(k));
          } else {
            if (k.indexOf('u_') === 0) continue;          // 未登录不碰任何带前缀数据
            if (!this._shouldSync(k)) continue;
            map[k] = JSON.parse(localStorage.getItem(k));
          }
        }
      } catch (e) {}
      return map;
    },
    /* 把云数据 map 写回本地 localStorage（按当前用户加前缀，userId 在登录后已设置） */
    applyToLocal: function (data) {
      const map = data || {};
      const prefix = 'u_' + (this.userId || 'unknown') + '_';
      Object.keys(map).forEach(function (k) {
        try { localStorage.setItem(prefix + k, JSON.stringify(map[k])); } catch (e) {}
      });
    },

    /* ---------- 推送（debounce，停止操作后自动） ---------- */
    markDirty: function () {
      if (!this.isLoggedIn()) return;
      clearTimeout(this._timer);
      this._timer = setTimeout(function () { Cloud.push(); }, PUSH_DELAY);
    },
    push: function () {
      if (!this.isLoggedIn()) return Promise.resolve();
      clearTimeout(this._timer);
      const data = this.collect();
      this._data = data;
      return this._req('PATCH', 'profiles?id=eq.' + this.userId, {
        data: data,
        updated_at: new Date().toISOString(),
      }).catch(function (err) {
        console.warn('[cloud] 推送失败，稍后重试：', err && err.message);
      });
    },

    /* 拉取云数据并写回本地（登录态） */
    pullAndApply: function () {
      if (!this.isLoggedIn()) return Promise.reject(new Error('未登录'));
      const self = this;
      return this._req('GET', 'profiles?id=eq.' + this.userId + '&select=id,nickname,data')
        .then(function (rows) {
          if (!rows || !rows.length) throw new Error('用户不存在');
          self._data = rows[0].data || {};
          self.applyToLocal(self._data);
          return self._data;
        });
    },
  };

  global.Cloud = Cloud;
})(window);
