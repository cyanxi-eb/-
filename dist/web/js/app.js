/* ============================================================
   app.js — 主控制器：状态管理 · 模式切换 · 初始化 · 事件绑定
   ============================================================ */
(function (global) {
  'use strict';

  const App = {
    data: [],             // 全量题库（当前生效）
    builtin: [],          // 内置题库（合并后的 bank>=activeBank 题集）
    banks: null,          // 分档题集 {1:[],2:[],3:[],4:[]}（单档，无重叠）
    bankMeta: {},         // { total, counts:{1:244,2:209,3:174,4:95} }
    activeBank: 1,        // 当前题库档位 1-4（1=完整 4=极简）
    mode: 'flash',        // flash | memo | guide | editor
    selectedCategories: [],
    keyword: '',
    weakOnly: false,
    random: true,
    includeCore: true,     // 必刷题(4-5星)，默认开
    includeExtra: false,   // 拓展题(1-3星)，默认关
    progress: {},
    fontScale: 1,

    /* 星级匹配：必刷=4-5星，拓展=1-3星；两开关组合决定范围 */
    starMatch: function (c) {
      const core = (c.star || 4) >= 4;
      const extra = (c.star || 4) <= 3;
      if (this.includeCore && this.includeExtra) return true; // 都选 = 完整题库
      if (this.includeCore) return core;   // 只选必刷
      if (this.includeExtra) return extra; // 只选拓展
      return false;                        // 都不选 = 空
    },

    /* ---------- 进度 ---------- */
    loadProgress: function () {
      this.progress = Store.get(Store.progressKey(), {});
    },
    saveProgress: function () {
      Store.set(Store.progressKey(), this.progress);
    },
    getStatus: function (id) { return this.progress[id] || { status: 'new', count: 0 }; },
    mark: function (id, status) {
      this.progress[id] = { status: status, count: (this.progress[id] ? this.progress[id].count : 0) + 1, time: Date.now() };
      this.saveProgress();
    },
    resetAll: function () { this.progress = {}; this.saveProgress(); this.updateStats(); },

    updateStats: function () {
      const all = this.data.length;
      let mastered = 0, weak = 0;
      this.data.forEach(c => { const s = this.getStatus(c.id).status; if (s === 'mastered') mastered++; else if (s === 'weak') weak++; });
      const learned = mastered + weak, unlearned = all - learned;
      const set = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = v; };
      set('totalCount', '总计: ' + all);
      set('masteredCount', '已掌握: ' + mastered);
      set('weakCount', '薄弱: ' + weak);
      set('unlearnedCount', '未学: ' + unlearned);
      const fill = document.getElementById('progressFill');
      if (fill) fill.style.width = (all ? Math.round(learned / all * 100) : 0) + '%';
    },

    /* ---------- 分类 ---------- */
    getAllCategories: function () {
      const s = new Set();
      this.data.forEach(c => c.category && s.add(c.category));
      return Array.from(s);
    },
    renderCategories: function () {
      const bar = document.getElementById('categoryBar');
      bar.innerHTML = '';
      const all = document.createElement('span');
      all.className = 'category-tag active'; all.textContent = '全部';
      all.onclick = () => App.selectCategory('');
      bar.appendChild(all);
      this.getAllCategories().forEach(cat => {
        const t = document.createElement('span');
        t.className = 'category-tag'; t.textContent = cat;
        t.onclick = () => App.selectCategory(cat);
        bar.appendChild(t);
      });
    },
    selectCategory: function (cat) {
      if (!cat) this.selectedCategories = [];
      else {
        const i = this.selectedCategories.indexOf(cat);
        if (i > -1) this.selectedCategories.splice(i, 1);
        else this.selectedCategories.push(cat);
      }
      this.updateCategoryUI();
      this.refresh();
    },
    updateCategoryUI: function () {
      document.querySelectorAll('.category-tag').forEach(tag => {
        const c = tag.textContent === '全部' ? '' : tag.textContent;
        tag.classList.toggle('active', c === '' ? this.selectedCategories.length === 0 : this.selectedCategories.indexOf(c) >= 0);
      });
      // 更新分类按钮上的计数
      const count = document.getElementById('filterCount');
      if (count) count.textContent = this.selectedCategories.length ? '(' + this.selectedCategories.length + ')' : '';
      const trig = document.getElementById('filterTriggerBtn');
      if (trig) trig.classList.toggle('active', this.selectedCategories.length > 0);
    },

    /* ---------- 筛选 ---------- */
    cond: function () {
      return { categories: this.selectedCategories, keyword: this.keyword, weakOnly: this.weakOnly, random: this.random, includeCore: this.includeCore, includeExtra: this.includeExtra };
    },

    /* ---------- 模式切换 ---------- */
    switchMode: function (mode) {
      this.mode = mode;
      document.body.classList.toggle('mode-memo', mode === 'memo');
      document.body.classList.toggle('mode-guide', mode === 'guide');
      document.body.classList.toggle('mode-editor', mode === 'editor');
      ['flash', 'memo', 'guide', 'editor'].forEach(m => {
        const tab = document.getElementById('mode' + m[0].toUpperCase() + m.slice(1) + 'Btn');
        if (tab) tab.classList.toggle('active', m === mode);
        const view = document.getElementById(m + 'View');
        if (view) view.classList.toggle('active', m === mode);
      });
      this.refresh();
    },

    /* ---------- 刷新当前视图 ---------- */
    refresh: function () {
      if (this.mode === 'memo') {
        Memo.render(this.filteredCards());
      } else if (this.mode === 'guide') {
        Guide.render();
      } else if (this.mode === 'editor') {
        Editor.render();
      } else {
        const cards = FC.filter(this.cond());
        FC.renderCard();
        this.updateStats();
      }
    },

    filteredCards: function () {
      let cards = [].concat(this.data).filter(c => this.starMatch(c));
      if (this.selectedCategories.length) cards = cards.filter(c => this.selectedCategories.indexOf(c.category) >= 0);
      if (this.weakOnly) cards = cards.filter(c => this.getStatus(c.id).status === 'weak');
      if (this.keyword) {
        const kw = this.keyword.toLowerCase();
        cards = cards.filter(c => (c.question || '').toLowerCase().indexOf(kw) >= 0 || (c.answer || '').toLowerCase().indexOf(kw) >= 0);
      }
      return cards;
    },

    /* ---------- 主题 / 字体 ---------- */
    applyTheme: function () {
      const dark = Store.get(Store.key.dark, false);
      document.body.classList.toggle('dark-mode', !!dark);
      const btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = dark ? '☀️' : '🌙';
    },
    toggleTheme: function () {
      const dark = !document.body.classList.contains('dark-mode');
      document.body.classList.toggle('dark-mode', dark);
      Store.set(Store.key.dark, dark);
      const btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = dark ? '☀️' : '🌙';
    },
    applyFont: function () {
      document.documentElement.style.fontSize = (16 * this.fontScale) + 'px';
      const label = document.getElementById('fontSizeLabel');
      if (label) label.textContent = Math.round(this.fontScale * 100) + '%';
    },
    changeFont: function (d) {
      this.fontScale = Math.min(1.5, Math.max(0.8, Math.round((this.fontScale + d) * 10) / 10));
      Store.set(Store.key.font, this.fontScale);
      this.applyFont();
    },

    /* ---------- 导出 ---------- */
    getWeakList: function () {
      return this.data.filter(c => this.getStatus(c.id).status === 'weak');
    },

    /* ---------- 联动跳转（指导页） ---------- */
    gotoCategory: function (cat) {
      this.keyword = '';
      this.weakOnly = false;
      this.selectedCategories = [cat];
      const si = document.getElementById('searchInput'); if (si) si.value = '';
      const wt = document.getElementById('weakOnlyToggle'); if (wt) wt.checked = false;
      this.updateCategoryUI();
      this.switchMode('flash');
    },
    startWeakDrill: function () {
      this.keyword = '';
      this.selectedCategories = [];
      const si = document.getElementById('searchInput'); if (si) si.value = '';
      this.weakOnly = true;
      const wt = document.getElementById('weakOnlyToggle'); if (wt) wt.checked = true;
      this.updateCategoryUI();
      this.switchMode('flash');
    },

    exportJson: function () {
      const list = this.getWeakList();
      if (!list.length) { alert('当前没有薄弱题'); return; }
      App.download(JSON.stringify(list, null, 2), '薄弱题.json', 'application/json');
    },
    exportTxt: function () {
      const list = this.getWeakList();
      if (!list.length) { alert('当前没有薄弱题'); return; }
      let txt = '';
      list.forEach((c, i) => {
        txt += '【第' + (i + 1) + '题】' + c.question + '\n【分类】' + (c.category || '') + '\n【答案】\n' + (c.answer || '').replace(/[*#`|>-]/g, '') + '\n\n' + '='.repeat(50) + '\n\n';
      });
      App.download(txt, '薄弱题.txt', 'text/plain');
    },
    download: function (content, filename, type) {
      const blob = new Blob([content], { type: type + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    /* ---------- 题库档位 ---------- */
    /* 合并 bank>=n 的单档题，按 id 升序 */
    mergeBanks: function (n) {
      const out = [];
      for (let b = 4; b >= n; b--) {
        const arr = (this.banks && this.banks[b]) || [];
        for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
      out.sort((a, b) => (a.id || 0) - (b.id || 0));
      return out;
    },

    /* 应用当前档位：合并题集 + 覆盖编辑存档判断 + 重载进度 */
    applyActiveBank: function (saved) {
      const n = this.activeBank || 1;
      this.builtin = this.banks ? this.mergeBanks(n) : [];
      this.data = (saved && saved.length) ? saved : this.builtin;
      this.loadProgress();
    },

    /* 打开选择题库弹窗（首次 or 编辑模式手动触发） */
    openBankPicker: function () {
      const mask = document.getElementById('bankPicker');
      if (!mask) return;
      const counts = (this.bankMeta && this.bankMeta.counts) || { 1: 244, 2: 209, 3: 174, 4: 95 };
      const names = { 1: '库1 完整版', 2: '库2 标准版', 3: '库3 精简版', 4: '库4 极简版' };
      const desc = { 1: '必刷+拓展全量，无删减', 2: '去冷门与细微分枝', 3: '只留主干高频', 4: '面试冲刺最核心' };
      const cur = this.activeBank || 1;
      const box = document.getElementById('bankOptions');
      box.innerHTML = [1, 2, 3, 4].map(function (b) {
        return '<label class="bank-option' + (b === cur ? ' active' : '') + '">'
          + '<input type="radio" name="bankChoice" value="' + b + '"' + (b === cur ? ' checked' : '') + '>'
          + '<span class="bank-option-title">' + names[b] + '</span>'
          + '<span class="bank-option-count">' + (counts[b] != null ? counts[b] : '?') + ' 题</span>'
          + '<span class="bank-option-desc">' + desc[b] + '</span>'
          + '</label>';
      }).join('');
      mask.style.display = 'flex';
      box.querySelectorAll('input[name="bankChoice"]').forEach(function (r) {
        r.addEventListener('change', function () {
          box.querySelectorAll('.bank-option').forEach(function (o) { o.classList.remove('active'); });
          const opt = r.closest('.bank-option'); if (opt) opt.classList.add('active');
        });
      });
    },

    confirmBankPicker: function () {
      const r = document.querySelector('input[name="bankChoice"]:checked');
      const n = r ? parseInt(r.value, 10) : 1;
      const changed = n !== this.activeBank;
      this.activeBank = n;
      Store.set(Store.key.activeBank, n);
      const saved = Store.get(Store.bankKey(), null);
      this.applyActiveBank(saved);
      const mask = document.getElementById('bankPicker');
      if (mask) mask.style.display = 'none';
      this.reload();
      if (changed) {
        const names = { 1: '库1 完整版', 2: '库2 标准版', 3: '库3 精简版', 4: '库4 极简版' };
        const hint = document.getElementById('bankToast');
        if (hint) { hint.textContent = '已切换至 ' + names[n] + '（' + this.data.length + ' 题）'; hint.classList.add('show'); setTimeout(function () { hint.classList.remove('show'); }, 2500); }
      }
    },

    cancelBankPicker: function () {
      const mask = document.getElementById('bankPicker');
      if (mask) mask.style.display = 'none';
    },

    /* ---------- 初始化 ---------- */
    init: function () {
      // 主题字体
      this.fontScale = Store.get(Store.key.font, 1);
      this.applyTheme();
      this.applyFont();

      // 读取档位（null=首次，未选过）
      const bankVal = Store.get(Store.key.activeBank, null);
      this.activeBank = (bankVal == null) ? 1 : bankVal;
      const isFirst = bankVal == null;

      const saved = Store.get(Store.bankKey(), null);

      // 内联 banks（单文件版）直接进入；否则走分片加载
      if (global.__FC_BANKS) {
        this.banks = global.__FC_BANKS;
        this.bankMeta = global.__FC_BANK_META || {};
        this.applyActiveBank(saved);
        this.afterDataReady(isFirst);
      } else {
        Loader.load({
          onProgress: function (loaded, total, msg) {
            const m = document.getElementById('loadingMsg');
            if (m) m.textContent = msg + ' (' + loaded + '/' + total + ')';
          },
          onDone: function (banks, meta) {
            App.banks = banks;
            App.bankMeta = meta || {};
            App.applyActiveBank(saved);
            App.afterDataReady(isFirst);
          },
          onFail: function (err) {
            const m = document.getElementById('loadingMsg');
            if (m) m.textContent = err;
          },
        });
      }
    },

    afterDataReady: function (isFirst) {
      if (this._ready) return; // 防止重复初始化
      this._ready = true;
      FC.init(this.data);
      this.renderCategories();
      this.bindEvents();
      this.updateStats();
      this.refresh();
      const dl = document.getElementById('dataLoading');
      if (dl) dl.style.display = 'none';
      // 编辑模式入口 ?edit=1
      if (/[?&]edit=1/.test(location.search)) this.switchMode('editor');
      // 首次打开：弹题库选择（数据就绪后再弹，确保 meta 可用）
      if (isFirst) this.openBankPicker();
    },

    /* 数据变化后刷新（编辑模式增删改/回滚后调用，不重复绑事件） */
    reload: function () {
      FC.init(this.data);
      this.renderCategories();
      this.updateStats();
      this.refresh();
    },

    bindEvents: function () {
      // 卡片翻转
      document.getElementById('cardFront').addEventListener('click', () => FC.flip());
      document.querySelector('.card-answer-wrapper').addEventListener('click', () => FC.flip());
      document.getElementById('prevBtn').addEventListener('click', () => FC.goPrev());
      document.getElementById('nextBtn').addEventListener('click', () => FC.goNext());
      document.getElementById('shuffleBtn').addEventListener('click', () => FC.shuffle());
      document.getElementById('themeBtn').addEventListener('click', () => App.toggleTheme());
      document.getElementById('knowBtn').addEventListener('click', e => { e.stopPropagation(); FC.markAndNext('mastered'); });
      document.getElementById('unknownBtn').addEventListener('click', e => { e.stopPropagation(); FC.markAndNext('weak'); });

      // 模式切换
      document.getElementById('modeFlashBtn').addEventListener('click', () => App.switchMode('flash'));
      document.getElementById('modeMemoBtn').addEventListener('click', () => App.switchMode('memo'));
      document.getElementById('modeGuideBtn').addEventListener('click', () => App.switchMode('guide'));
      const eb = document.getElementById('modeEditorBtn');
      if (eb) eb.addEventListener('click', () => App.switchMode('editor'));

      // 分类弹层开关
      const ft = document.getElementById('filterTriggerBtn');
      const cp = document.getElementById('categoryPop');
      const cc = document.getElementById('categoryPopClose');
      if (ft && cp) {
        ft.addEventListener('click', e => { e.stopPropagation(); cp.classList.toggle('open'); });
        if (cc) cc.addEventListener('click', e => { e.stopPropagation(); cp.classList.remove('open'); });
        document.addEventListener('click', e => {
          if (cp.classList.contains('open') && !cp.contains(e.target) && !ft.contains(e.target)) cp.classList.remove('open');
        });
      }

      // 记背展开
      document.getElementById('memorizeList').addEventListener('click', function (e) {
        const hdr = e.target.closest('.memo-group-header');
        if (hdr) { hdr.parentElement.classList.toggle('open'); return; }
        // 仅点击题目文字行才展开/收起答案，避免点击答案内部（如代码块/链接）时误收起
        const q = e.target.closest('.memo-item-question');
        if (q) q.parentElement.classList.toggle('open');
      });
      document.getElementById('memoExpandAllBtn').addEventListener('click', () => Memo.toggleAll(true));
      document.getElementById('memoCollapseAllBtn').addEventListener('click', () => Memo.toggleAll(false));

      // 字体
      document.getElementById('fontDownBtn').addEventListener('click', () => App.changeFont(-0.1));
      document.getElementById('fontUpBtn').addEventListener('click', () => App.changeFont(0.1));

      // 搜索
      let timer;
      document.getElementById('searchInput').addEventListener('input', e => {
        clearTimeout(timer);
        timer = setTimeout(() => { App.keyword = e.target.value.trim(); App.refresh(); }, 250);
      });
      document.getElementById('weakOnlyToggle').addEventListener('change', e => { App.weakOnly = e.target.checked; App.refresh(); });
      document.getElementById('randomToggle').addEventListener('change', e => { App.random = e.target.checked; App.refresh(); });
      const coreToggle = document.getElementById('coreToggle');
      if (coreToggle) coreToggle.addEventListener('change', e => { App.includeCore = e.target.checked; App.refresh(); });
      const extraToggle = document.getElementById('extraToggle');
      if (extraToggle) extraToggle.addEventListener('change', e => { App.includeExtra = e.target.checked; App.refresh(); });

      // 导出
      document.getElementById('exportJsonBtn').addEventListener('click', () => App.exportJson());
      document.getElementById('exportTxtBtn').addEventListener('click', () => App.exportTxt());
      document.getElementById('resetBtn').addEventListener('click', () => { if (confirm('确定重置所有学习进度吗？此操作不可撤销。')) App.resetAll(); });

      // 题库选择弹窗
      const bpc = document.getElementById('bankPickerConfirm');
      if (bpc) bpc.addEventListener('click', () => App.confirmBankPicker());
      const bpx = document.getElementById('bankPickerCancel');
      if (bpx) bpx.addEventListener('click', () => App.cancelBankPicker());

      // 键盘
      document.addEventListener('keydown', e => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        switch (e.code) {
          case 'Space': e.preventDefault(); if (App.mode === 'flash') FC.flip(); break;
          case 'ArrowLeft': e.preventDefault(); if (App.mode === 'flash') FC.goPrev(); break;
          case 'ArrowRight': e.preventDefault(); if (App.mode === 'flash') FC.goNext(); break;
          case 'KeyG': if (FC.flipped) { e.preventDefault(); FC.markAndNext('mastered'); } break;
          case 'KeyB': if (FC.flipped) { e.preventDefault(); FC.markAndNext('weak'); } break;
          case 'KeyM': e.preventDefault(); {
            const order = ['flash', 'memo', 'guide', 'editor'];
            const ni = (order.indexOf(App.mode) + 1) % order.length;
            App.switchMode(order[ni]);
          } break;
        }
      });

      // 移动端滑动
      let sx = null;
      const swipeEl = document.querySelector('.card-wrapper');
      swipeEl.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
      swipeEl.addEventListener('touchend', e => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx; sx = null;
        if (Math.abs(dx) < 60) return;
        if (dx < 0) FC.goNext(); else FC.goPrev();
      }, { passive: true });
    },
  };

  global.App = App;
})(window);
