/* ============================================================
   flashcard.js — 抽背卡（测试模式）
   ============================================================ */
(function (global) {
  'use strict';

  const FC = {
    cards: [],          // 筛选后的卡片
    index: 0,
    flipped: false,
    completed: false,

    /* 生成星级 HTML（★实星 + ☆空星） */
    starHtml: function (card) {
      const n = card.star || 0;
      if (!n) return '';
      return ' <span class="stars" title="' + n + '星">' + '★'.repeat(n) + '<span class="stars-empty">' + '☆'.repeat(5 - n) + '</span></span>';
    },

    init: function (data) {
      this.cards = [];
      this.index = 0;
      this.flipped = false;
      this.completed = false;
      this._data = data;
    },

    /* 应用筛选（分类/搜索/薄弱/随机），由 App 传入条件 */
    filter: function (cond) {
      const data = this._data || [];
      let cards = [].concat(data);
      cards = cards.filter(c => App.starMatch(c)); // 必刷/拓展组合过滤
      if (cond.categories && cond.categories.length) {
        cards = cards.filter(c => cond.categories.indexOf(c.category) >= 0);
      }
      if (cond.weakOnly) {
        cards = cards.filter(c => App.getStatus(c.id).status === 'weak');
      }
      if (cond.keyword) {
        const kw = cond.keyword.toLowerCase();
        cards = cards.filter(c =>
          (c.question || '').toLowerCase().indexOf(kw) >= 0 ||
          (c.answer || '').toLowerCase().indexOf(kw) >= 0);
      }
      if (cond.random && cards.length > 1) {
        for (let i = cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = cards[i]; cards[i] = cards[j]; cards[j] = t;
        }
      }
      this.cards = cards;
      this.index = 0;
      this.flipped = false;
      this.completed = false;
      return cards;
    },

    current: function () { return this.cards[this.index]; },

    renderCard: function () {
      const total = this.cards.length;
      const el = document.getElementById('flashcard');
      const card = this.current();

      document.getElementById('progressText').textContent = '第 ' + (total ? this.index + 1 : 0) + ' / ' + total + ' 题';
      if (!card) {
        document.getElementById('cardQuestion').innerHTML = '暂无题目';
        document.getElementById('frontCategory').textContent = '无';
        document.getElementById('frontIndex').textContent = '第 0 题';
        el.classList.remove('flipped');
        return;
      }
      document.getElementById('cardQuestion').innerHTML = '<span class="q-inner">' + MD.renderQuestion(card.question) + '</span>';
      document.getElementById('frontCategory').textContent = card.category;
      document.getElementById('frontIndex').innerHTML = (card.code || '') + FC.starHtml(card);
      document.getElementById('cardAnswer').innerHTML = MD.renderMarkdown(card.answer);
      document.getElementById('backCategory').textContent = card.category;
      document.getElementById('backIndex').innerHTML = (card.code || '') + FC.starHtml(card);
      el.classList.toggle('flipped', this.flipped);

      const backWrapper = document.querySelector('.card-answer-wrapper');
      if (backWrapper) backWrapper.scrollTop = 0;
    },

    flip: function () {
      if (!this.cards.length || this.completed) return;
      this.flipped = !this.flipped;
      document.getElementById('flashcard').classList.toggle('flipped', this.flipped);
    },

    goPrev: function () {
      if (this.index > 0) { this.index--; this.flipped = false; this.renderCard(); }
    },
    goNext: function () {
      if (this.index < this.cards.length - 1) { this.index++; this.flipped = false; this.renderCard(); }
    },

    markAndNext: function (status) {
      if (!this.cards.length) return;
      const card = this.current();
      App.mark(card.id, status);
      App.updateStats();
      const isLast = this.index >= this.cards.length - 1;
      setTimeout(function () {
        if (!isLast) { FC.goNext(); }
        else { FC.completed = true; FC.flipped = false; FC.renderCard(); }
      }, 220);
    },

    shuffle: function () {
      if (this.cards.length > 1) {
        for (let i = this.cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = this.cards[i]; this.cards[i] = this.cards[j]; this.cards[j] = t;
        }
        this.index = 0; this.flipped = false; this.completed = false;
        this.renderCard();
      }
    },
  };

  global.FC = FC;
})(window);
