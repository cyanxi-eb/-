/* ============================================================
   editor.js — 编辑模式（CRUD + 操作日志 + 手动/自动存档 + 回滚）
   入口：URL ?edit=1
   持久化：localStorage.v25_bank（题库） / v25_archives（存档点） / v25_oplog（日志）
   ============================================================ */
(function (global) {
  'use strict';

  const Editor = {
    history: [],   // 操作日志 [{type, code, before, after}]
    redoStack: [],
    archives: [],
    editing: null, // 正在编辑的题 id
    step: 0,

    init: function () {
      this.history = Store.get(Store.oplogKey(), []);
      this.archives = Store.get(Store.archivesKey(), []);
      this.redoStack = [];
    },

    /* 记录操作日志（快照） */
    log: function (type, before, after, code) {
      this.history.push({ type, code: code || (after ? after.code : before.code), before: before ? JSON.parse(JSON.stringify(before)) : null, after: after ? JSON.parse(JSON.stringify(after)) : null, time: Date.now() });
      if (this.history.length > 200) this.history.shift();
      this.redoStack = [];
      Store.set(Store.oplogKey(), this.history);
      this.step++;
      // 自动存档：每 10 步
      if (this.step % 10 === 0) this.archive('自动存档（第 ' + this.step + ' 步）');
      this.saveBank();
    },

    /* 保存题库到 localStorage */
    saveBank: function () {
      Store.set(Store.bankKey(), App.data);
    },

    /* 存档点 */
    archive: function (note) {
      this.archives.push({ time: Date.now(), note: note || '手动存档', data: JSON.parse(JSON.stringify(App.data)) });
      if (this.archives.length > 30) this.archives.shift();
      Store.set(Store.archivesKey(), this.archives);
    },
    restore: function (idx) {
      const a = this.archives[idx];
      if (!a) return;
      if (!confirm('回滚到存档「' + a.note + '」（' + new Date(a.time).toLocaleString() + '）？当前未保存改动将丢失。')) return;
      App.data = JSON.parse(JSON.stringify(a.data));
      this.saveBank();
      App.reload();
      this.render();
      this.log('restore', null, null, '—');
    },

    /* 撤销 / 重做 */
    undo: function () {
      const op = this.history.pop();
      if (!op) return;
      this.redoStack.push(op);
      if (op.type === 'add') this._removeByCode(op.after.code);
      else if (op.type === 'delete') App.data.push(op.before);
      else if (op.type === 'edit') this._replace(op.after, op.before);
      else if (op.type === 'restore') { /* 忽略 */ }
      Store.set(Store.oplogKey(), this.history);
      this.saveBank();
      this._renumber();
      this.render();
    },
    redo: function () {
      const op = this.redoStack.pop();
      if (!op) return;
      this.history.push(op);
      if (op.type === 'add') App.data.push(op.after);
      else if (op.type === 'delete') this._removeByCode(op.before.code);
      else if (op.type === 'edit') this._replace(op.before, op.after);
      Store.set(Store.oplogKey(), this.history);
      this.saveBank();
      this._renumber();
      this.render();
    },

    _removeByCode: function (code) { App.data = App.data.filter(c => c.code !== code); },
    _replace: function (oldItem, newItem) {
      const i = App.data.findIndex(c => c.code === oldItem.code);
      if (i > -1 && newItem) App.data[i] = newItem;
      else if (i > -1) App.data.splice(i, 1);
    },
    _renumber: function () {
      App.data.forEach((c, i) => c.id = i + 1);
    },

    /* ---------- 渲染 ---------- */
    render: function () {
      const box = document.getElementById('editorView');
      if (!box) return;
      const cards = App.data;
      let rows = '';
      cards.forEach(c => {
        rows += '<div class="ed-row">'
          + '<span class="ed-code">' + (c.code || '') + '</span>'
          + '<span class="ed-cat">' + (c.category || '') + '</span>'
          + '<span class="ed-q">' + esc((c.question || '').slice(0, 40)) + '</span>'
          + '<span class="ed-ops"><button class="ed-btn" data-act="edit" data-code="' + c.code + '">✏️</button><button class="ed-btn danger" data-act="del" data-code="' + c.code + '">🗑</button></span>'
          + '</div>';
      });

      const form = this.editing ? this._formHtml(this.editing) : '';

      box.innerHTML = '<div class="ed-toolbar">'
        + '<button class="btn primary" id="edAdd">➕ 新增题目</button>'
        + '<button class="btn" id="edBankSwitch">📚 切换题库</button>'
        + '<button class="btn" id="edUndo">↩️ 撤销</button>'
        + '<button class="btn" id="edRedo">↪️ 重做</button>'
        + '<button class="btn" id="edArchive">💾 手动存档</button>'
        + '<button class="btn" id="edExport">⬇️ 导出JSON</button>'
        + '<button class="btn" id="edImport">⬆️ 导入JSON</button>'
        + '<button class="btn" id="edReset">♻️ 恢复内置题库</button>'
        + '<button class="btn" id="edPullFromCloud" title="把云端最新数据完整覆盖本地（修题库空白等异常）">☁️ 从云端拉取</button>'
        + '<button class="btn" id="edDiagnose" title="打印登录态/题库/localStorage 详细状态到 Console">🔍 诊断</button>'
        + '<span class="ed-note">共 ' + cards.length + ' 题 · 操作日志 ' + this.history.length + ' 条 · 存档点 ' + this.archives.length + ' 个</span>'
        + '</div>'
        + form
        + '<div class="ed-list">' + rows + '</div>'
        + '<div class="ed-archives"><h4>存档点（点击回滚）</h4>'
        + (this.archives.length ? this.archives.map((a, i) => '<button class="btn" data-arch="' + i + '">' + new Date(a.time).toLocaleString() + ' · ' + esc(a.note || '') + '</button>').join('') : '<span class="muted">暂无存档点</span>')
        + '</div>';

      this._bind();
    },

    _formHtml: function (item) {
      return '<div class="ed-form"><h4>' + (item._isNew ? '新增题目' : '编辑题目') + '</h4>'
        + '<label>题码 <input id="f-code" value="' + esc(item.code || '') + '"></label>'
        + '<label>分类 <input id="f-cat" value="' + esc(item.category || '') + '" list="cat-list"></label>'
        + '<datalist id="cat-list">' + App.getAllCategories().map(c => '<option value="' + esc(c) + '">').join('') + '</datalist>'
        + '<label>题目 <textarea id="f-q" rows="2">' + esc(item.question || '') + '</textarea></label>'
        + '<label>答案（markdown）<textarea id="f-a" rows="6">' + esc(item.answer || '') + '</textarea></label>'
        + '<label>扩展 <textarea id="f-e" rows="3">' + esc(item.extend || '') + '</textarea></label>'
        + '<div class="ed-form-ops"><button class="btn primary" id="f-save">保存</button><button class="btn" id="f-cancel">取消</button></div>'
        + '</div>';
    },

    _bind: function () {
      const box = document.getElementById('editorView');
      box.querySelectorAll('.ed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.dataset.code;
          if (btn.dataset.act === 'edit') this.openEdit(code);
          else if (btn.dataset.act === 'del') this.del(code);
        });
      });
      const add = document.getElementById('edAdd');
      if (add) add.addEventListener('click', () => { this.editing = { _isNew: true, code: '', category: '', question: '', answer: '', extend: '' }; this.render(); });
      const bankSwitch = document.getElementById('edBankSwitch');
      if (bankSwitch) bankSwitch.addEventListener('click', () => App.openBankPicker());
      const undo = document.getElementById('edUndo'); if (undo) undo.addEventListener('click', () => this.undo());
      const redo = document.getElementById('edRedo'); if (redo) redo.addEventListener('click', () => this.redo());
      const archive = document.getElementById('edArchive'); if (archive) archive.addEventListener('click', () => { const n = prompt('存档备注（可选）：', '手动存档'); this.archive(n || '手动存档'); this.render(); });
      const exp = document.getElementById('edExport'); if (exp) exp.addEventListener('click', () => App.download(JSON.stringify(App.data, null, 2), 'questions-edit.json', 'application/json'));
      const imp = document.getElementById('edImport'); if (imp) imp.addEventListener('click', () => this._import());
      const reset = document.getElementById('edReset');
      if (reset) reset.addEventListener('click', () => { if (confirm('恢复内置题库？所有编辑将丢失。')) { Store.set(Store.bankKey(), []); App.data = JSON.parse(JSON.stringify(App.builtin)); this.saveBank(); App.reload(); this.render(); } });
      const pullBtn = document.getElementById('edPullFromCloud');
      if (pullBtn) pullBtn.addEventListener('click', () => this._pullFromCloud());
      const diagBtn = document.getElementById('edDiagnose');
      if (diagBtn) diagBtn.addEventListener('click', () => this._diagnose());
      box.querySelectorAll('[data-arch]').forEach(b => b.addEventListener('click', () => this.restore(parseInt(b.dataset.arch, 10))));
      const save = document.getElementById('f-save'); if (save) save.addEventListener('click', () => this.save());
      const cancel = document.getElementById('f-cancel'); if (cancel) cancel.addEventListener('click', () => { this.editing = null; this.render(); });
    },

    _import: function () {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = () => {
        const f = input.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const list = JSON.parse(r.result);
            if (!Array.isArray(list)) throw new Error('非数组');
            this.archive('导入前存档');
            App.data = list;
            this._renumber();
            this.saveBank();
            this.log('import', null, null, '—');
            App.reload();
            this.render();
          } catch (e) { alert('导入失败：' + e.message); }
        };
        r.readAsText(f);
      };
      input.click();
    },

    openEdit: function (code) {
      const item = App.data.find(c => c.code === code);
      if (item) { this.editing = JSON.parse(JSON.stringify(item)); this.render(); }
    },

    save: function () {
      const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
      const code = g('f-code'), cat = g('f-cat'), q = g('f-q'), a = g('f-a'), e = g('f-e');
      if (!code || !q || !a) { alert('题码/题目/答案不能为空'); return; }
      const newItem = { code, category: cat, question: q, answer: a, extend: e, source: 'edited' };

      if (this.editing && this.editing._isNew) {
        if (App.data.some(c => c.code === code)) { alert('题码已存在：' + code); return; }
        const before = null;
        newItem.id = App.data.length + 1;
        App.data.push(newItem);
        this.log('add', before, newItem);
      } else {
        const old = App.data.find(c => c.code === this.editing.code);
        if (old && code !== old.code && App.data.some(c => c.code === code)) { alert('题码已存在：' + code); return; }
        const before = JSON.parse(JSON.stringify(old));
        Object.assign(old, newItem);
        this.log('edit', before, JSON.parse(JSON.stringify(old)));
      }
      this._renumber();
      this.saveBank();
      this.editing = null;
      App.reload();
      this.render();
    },

    del: function (code) {
      const item = App.data.find(c => c.code === code);
      if (!item) return;
      if (!confirm('删除题目「' + item.question.slice(0, 30) + '」？')) return;
      App.data = App.data.filter(c => c.code !== code);
      this._renumber();
      this.log('delete', item, null);
      this.saveBank();
      this.render();
    },

    /* ★ v2.11 fc-v36 新增：编辑工具栏「☁️ 从云端拉取」按钮 —— 应急恢复题库用
       用途：题库出现空白/丢失/与他人混了时，一键用云端最新版本覆盖本地。
       行为：调 Cloud.pullAndApply()（v2.10 已实现），拉云端 data 按 u_<id>_<key> 写回本地 → reload */
    _pullFromCloud: async function () {
      if (!window.Cloud || !window.Cloud.isLoggedIn()) {
        alert('请先登录后再使用此功能（未登录没有云端可拉）');
        return;
      }
      if (!confirm('⚠️ 从云端拉取最新数据覆盖本地？\n\n· 本地的所有未推送编辑/进度将被云端版本覆盖\n· 建议仅在「题库空白」「数据错乱」等异常时使用\n· 正常修改请直接走「自动同步」，无需点此按钮')) return;
      const btn = document.getElementById('edPullFromCloud');
      const originText = btn ? btn.textContent : '';
      try {
        if (btn) { btn.disabled = true; btn.textContent = '拉取中…'; }
        console.log('[pullFromCloud] 开始，云端 userId =', window.Cloud.userId);
        const data = await window.Cloud.pullAndApply();
        console.log('[pullFromCloud] 成功，云端 data keys =', data && Object.keys(data));
        if (data && data.v25_bank) {
          console.log('[pullFromCloud] v25_bank.length =', data.v25_bank.length);
        }
        // 写完本地后 reload，重新走 init → boot 用新的 saved（云端覆盖后的本地）
        location.reload();
      } catch (e) {
        console.error('[pullFromCloud] 失败：', e && e.message);
        alert('拉取失败：' + (e && e.message ? e.message : e));
        if (btn) { btn.disabled = false; btn.textContent = originText; }
      }
    },

    /* ★ v2.11 fc-v36 新增：编辑工具栏「🔍 诊断」按钮 —— 把登录态/题库/localStorage 全打到 Console
       用途：题库空白/异常时，让用户一键 dump 状态贴给我，便于精准定位根因 */
    _diagnose: function () {
      console.group('🔍 v2.11 题库诊断（' + new Date().toLocaleString() + '）');
      try {
        const C = window.Cloud, S = window.Store, A = window.App;
        console.log('1. 登录态：', C && {
          enabled: C.enabled,
          nickname: C.nickname,
          userId: C.userId,
          _data_keys: C._data && Object.keys(C._data),
          _data_v25_bank_length: C._data && C._data.v25_bank && C._data.v25_bank.length,
        });
        console.log('2. App 状态：', A && {
          data_length: A.data && A.data.length,
          activeBank: A.activeBank,
          builtin_length: A.builtin && A.builtin.length,
        });
        if (A && A.data && A.data.length) {
          console.log('3. App.data 前 3 项（注意 code/question 是否为空）：');
          A.data.slice(0, 3).forEach((c, i) => console.log('   Q' + (i + 1) + ':', JSON.stringify(c)));
        }
        console.log('4. localStorage 全部 key（按前缀分类）：');
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
        keys.sort().forEach(function (k) {
          const v = localStorage.getItem(k);
          const tag = /^(v25_|v27_|u_[^_]+_)/.test(k) ? '[USER] ' : '[META] ';
          console.log('   ' + tag + k, '→', v == null ? 'null' : (v.length > 250 ? v.substring(0, 250) + '...[' + v.length + ' 字符]' : v));
        });
        console.log('5. userPrefix:', S && S.userPrefix());
      } catch (e) {
        console.error('诊断脚本异常：', e);
      }
      console.groupEnd();
      alert('诊断信息已输出到 Console（F12 → Console），请把这段截图或复制给我');
    },
  };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  global.Editor = Editor;
})(window);
