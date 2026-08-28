/* ============================================================
   markdown.js — Markdown 渲染 + 题面关键词高亮 + 代码换行适配
   ============================================================ */
(function (global) {
  'use strict';

  /* 转义 HTML 特殊字符 */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 代码块：保护起来，避免被后续替换破坏；渲染时做折行适配 */
  function renderMarkdown(text) {
    if (!text) return '';
    let h = esc(text);

    // 1. 保护代码块 ```...```
    const blocks = [];
    h = h.replace(/```([\s\S]*?)```/g, function (m, code) {
      const langMatch = code.match(/^\s*(\w+)/);
      const lang = langMatch ? langMatch[1] : '';
      const body = code.replace(/^\s*\w+\s*/, '').replace(/\s+$/, '');
      blocks.push('<pre class="code-block"><code data-lang="' + lang + '">' + body + '</code></pre>');
      return '\x00BLOCK' + (blocks.length - 1) + '\x00';
    });

    // 2. 表格
    h = h.replace(/(\n|^)(\|[^\n]+\|)\s*\n\s*\|[-:| ]+\|\s*\n\s*(\|[^\n]+\|(?:\s*\n\s*\|[^\n]+\|)*)/g,
      function (m, pre, head, body) {
        const hc = head.replace(/^\||\|$/g, '').split('|').map(s => '<th>' + s.trim() + '</th>').join('');
        const rows = body.trim().split('\n').map(r => {
          const cells = r.replace(/^\||\|$/g, '').split('|').map(s => '<td>' + s.trim() + '</td>').join('');
          return '<tr>' + cells + '</tr>';
        }).join('');
        return '<table class="md-table"><thead><tr>' + hc + '</tr></thead><tbody>' + rows + '</tbody></table>';
      });

    // 3. 图片 ![](...)
    h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="md-img" src="$2" alt="$1" loading="lazy">');

    // 4. 行内代码
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 5. 加粗
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 6. 无序列表
    h = h.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    h = h.replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m.replace(/\n/g, '') + '</ul>');

    // 7. 有序列表
    h = h.replace(/^(\d+)[.、] (.+)$/gm, '<li data-n="$1">$2</li>');
    h = h.replace(/(<li data-n="\d+">.*<\/li>\n?)+/g, m => '<ol>' + m.replace(/\n/g, '') + '</ol>');

    // 8. h3 标题
    h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');

    // 9. 分段
    h = h.split(/\n\n+|\n(?=<strong>)/).map(function (seg) {
      if (!seg.trim()) return '';
      if (/^\x00BLOCK/.test(seg) || /^<table/.test(seg) || /^<ul/.test(seg) || /^<h3>/.test(seg) || /^<ol>/.test(seg)) return seg;
      const embedded = seg.match(/<(ul|table|ol)[\s\S]*?<\/(ul|table|ol)>/);
      if (embedded) {
        const rest = seg.replace(/<(ul|table|ol)[\s\S]*?<\/(ul|table|ol)>/, '').replace(/\n/g, '<br>').replace(/^<br>/, '').replace(/<br>$/, '').trim();
        return (rest ? ('<p' + (/^\s*<strong>/.test(rest) ? ' class="answer-point"' : '') + '>' + rest + '</p>') : '') + embedded[0].replace(/\n/g, '');
      }
      const inner = seg.replace(/\n/g, '<br>');
      const cls = /^\s*<strong>/.test(inner) ? ' class="answer-point"' : '';
      return '<p' + cls + '>' + inner + '</p>';
    }).join('');

    // 10. 还原代码块
    h = h.replace(/\x00BLOCK(\d+)\x00/g, (m, i) => blocks[parseInt(i)] || '');
    return h;
  }

  /* 题面渲染：高亮代码关键词 */
  function renderQuestion(text) {
    if (!text) return '';
    let h = esc(text);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/__(?:new|init|del|slots|call|str|len|repr|iter|next|eq|hash|enter|exit|getattr|setattr|getitem|setitem|getattribute|closure|dict|mro|name|main|class|doc|all|future)__(\.\w+)?/g, m => '<code>' + m + '</code>');
    h = h.replace(/@(?:property|classmethod|staticmethod|abstractmethod)\b/g, m => '<code>' + m + '</code>');
    h = h.replace(/\b(None|True|False)\b/g, '<code>$1</code>');
    return h;
  }

  /* 代码换行适配：按标点/运算符在长行内插入软换行（零宽空格，复制时不影响原码） */
  function wrapCodeLines(code, maxLen) {
    maxLen = maxLen || 100;
    return code.split('\n').map(function (line) {
      if (line.length <= maxLen) return line;
      let out = '';
      let col = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        out += ch;
        col++;
        // 在运算符/标点/空格后，且已超过阈值时，插入软换行机会
        if (col >= maxLen && /[\s,;\)\]\}:.+\-*\/%=&|^<>]/.test(ch)) {
          out += '\u200B'; // 零宽空格
          col = 0;
        }
      }
      return out;
    }).join('\n');
  }

  global.MD = { renderMarkdown: renderMarkdown, renderQuestion: renderQuestion, wrapCodeLines: wrapCodeLines };
})(window);
