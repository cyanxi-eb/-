/* ============================================================
   memo.js — 记背知识（学习模式）：分类分组 + 展开 + 知识扩展
   ============================================================ */
(function (global) {
  'use strict';

  const Memo = {
    render: function (cards) {
      const list = document.getElementById('memorizeList');
      const total = document.getElementById('memoTotal');
      if (!list) return;
      if (total) total.textContent = '共 ' + cards.length + ' 题';
      if (!cards.length) { list.innerHTML = '<div class="empty-state">🔍 没有符合条件的题目</div>'; return; }

      const groups = {}, order = [];
      cards.forEach(function (c) {
        if (!groups[c.category]) { groups[c.category] = []; order.push(c.category); }
        groups[c.category].push(c);
      });

      let html = '';
      // 仅筛选单个分类时，自动展开该分组，避免「看到分类名还要再点一次」
      const autoOpen = order.length === 1;
      order.forEach(function (cat) {
        const g = groups[cat];
        html += '<div class="memo-group' + (autoOpen ? ' open' : '') + '"><div class="memo-group-header"><span class="memo-group-name">' + cat + '</span><span class="memo-group-count">' + g.length + ' 题</span></div>';
        g.forEach(function (c) {
          const code = c.code ? '<span class="memo-item-code">' + c.code + '</span>' : '';
          const ext = c.extend ? '<div class="memo-item-extend"><div class="memo-extend-title">📚 知识扩展</div>' + MD.renderMarkdown(c.extend) + '</div>' : '';
          html += '<div class="memo-item">'
            + '<div class="memo-item-question">' + code + MD.renderQuestion(c.question) + '</div>'
            + '<div class="memo-item-answer card-answer">' + MD.renderMarkdown(c.answer) + ext + '</div>'
            + '</div>';
        });
        html += '</div>';
      });
      list.innerHTML = html;
    },

    toggleAll: function (expand) {
      // 同时控制「分组」与「题目答案」的展开/收起
      document.querySelectorAll('.memo-group').forEach(function (el) { el.classList.toggle('open', expand); });
      document.querySelectorAll('.memo-item').forEach(function (el) { el.classList.toggle('open', expand); });
    },
  };

  global.Memo = Memo;
})(window);
