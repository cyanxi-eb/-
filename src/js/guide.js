/* ============================================================
   guide.js — 面试前指导（突击模式）
   左栏：8 大突击模块（行动步骤/检查表/话术模板/提醒）
   右栏：软技能知识卡片（来自题库「软技能」分类）
   ============================================================ */
(function (global) {
  'use strict';

  const GUIDE_MODULES = [
    { icon: '🎯', num: '01', title: '定位与策略：先定岗位，再倒推准备', goal: '明确投什么、考什么，用最短周期拿到 offer，不浪费一天时间。', steps: [
      '锁定目标岗位（≤3 个，如 AI 应用开发/后端/算法），把 JD 要求的技术栈逐条抄下来',
      '对照 JD 盘点自己：会（可深聊）/ 了解（可聊）/ 不会（需补）三栏',
      '用「简历倒推法」：假设自己是面试官，对简历每句话写出 3 个可能追问',
      '定突击周期（2~4 周）并拆成每日任务：八股占 X、项目占 Y、算法占 Z',
      '第 1 周末就投出第一批简历——边面边校准，比闭门准备高效得多'],
      check: ['目标岗位与 JD 技术栈已列成清单', '简历每句都有对应追问和答案草稿', '每日任务表已排好并开始执行'],
      script: '我计划投 AI 应用开发方向，JD 要求 Python/FastAPI/RAG/Agent 这些我都有项目落地过，先把简历和八股按 JD 倒排准备，两周内进入面试节奏。',
      tips: ['别等「准备好了」再投——机会不等人，准备 70% 就该开始投', '面试是免费的深度交流，是校准方向最准的指南针'],
      cats: ['Python基础', 'FastAPI'] },
    { icon: '📊', num: '02', title: '简历武器化：让面试官只问你会答的', goal: '简历过筛 + 面试官提问范围被锁死在你精心准备的内容里。', steps: [
      '内容排序：项目/经历 > 技术栈 > 边缘加分；删掉与岗位无关的堆砌',
      '每个技术点写成三段式：用了什么 + 解决什么 + 量化结果（如「用 RocketMQ 异步化下单，削峰 40%」）',
      '把简历贴给 AI，让它以面试官身份出 20 个追问；逐个写出答案',
      '每个追问准备 60 分答案 + 1 个 150 分扩展（对比/本源/结合场景）',
      '用 AI 简化包装：把「高吞吐分布式架构」这类大词改成你能扛住追问的表述，避免被贴"过度包装"标签'],
      check: ['简历里每个字都能扛住追问', '每个技术点有可量化结果', 'AI 出的 20 个追问全部有答案'],
      script: '我在 XX 项目里用 XX 解决了 XX 问题，效果是 XX（带数字）。——讲到这里提高声量，引导面试官顺着这个点追问。',
      tips: ['简历不是技术清单，是"你想被问什么"的菜单', '过度包装会被面评挂——写上去的必须 100% 能讲透'],
      cats: ['数据结构', '面向对象', 'FastAPI'] },
    { icon: '📡', num: '03', title: '投递与面试节奏：海投 × 早面 × 复盘', goal: '用数量对抗概率，用复盘迭代精度，保持稳定面试流。', steps: [
      '海投：官网+招聘平台双线，目标每天 20+，累计 500+（数量是王）',
      '投递顺序：小厂/外包练手 2~3 场 → 目标厂 → 梦厂；面评严的厂留到后面',
      '每场面试后 30 分钟内复盘：问了什么 / 哪里卡住 / 下次怎么答',
      '把高频追问回填到简历和背诵清单，简历每 3~5 场迭代一次'],
      check: ['每天投递量达标', '每场面试都有复盘记录', '高频问题已回填背诵清单'],
      tips: ['骑驴找马：在职面试低调安排（工作日晚上/调休），拿到 offer 再提离职', '背调敏感：离职时间、岗位、项目描述必须真实可查', '机会是争取来的——面试中一切能争取的都要争取'],
      cats: ['综合进阶', '并发编程'] },
    { icon: '🧠', num: '04', title: '八股答题法：60 分 → 150 分', goal: '任何八股都能答出"有思考"的深度，并掌控问答节奏。', steps: [
      '选八股：只背「高频 + 重点 + 透彻」的，拒绝百科全书式清单',
      '60 分模板：定义 + 经典解法（先保证及格）',
      '150 分模板：背景 → 方案对比 → 本源逻辑 → 结合项目 → 埋钩子',
      '用本卡刷题：每道题先答 60 分版，再补 150 分扩展，直到形成肌肉记忆',
      '简历写什么背什么——让面试官只从你准备的范围内提问'],
      check: ['高频八股 30 题能流畅背出 150 分版本', '每道题都能关联到自己的项目场景'],
      script: '这个问题本质是 XX 与 XX 的权衡。我项目里遇到过类似场景（……），当时对比了 A/B 方案，因为（……）选了 A。顺带一提，相关的 XX 我也踩过坑（……）。——答完主动展开，让面试官无题可问。',
      tips: ['八股本质是"通用问题的解决思想"，要理解不要死记', '面试官平时不记八股，他问的基本都来自你的简历'],
      cats: ['MySQL', '并发编程', '数据结构', '面向对象', '综合进阶', '机器学习', 'FastAPI'] },
    { icon: '🛠️', num: '05', title: '项目深挖：九问讲透，不怕层层追问', goal: '主推项目经得起任意角度深挖，成为整场面试的主场。', steps: [
      '选 1 个主推项目：真实做过/深度掌握的优先，宁可小但要讲透',
      '对项目里每个技术点过九问清单（是什么/为什么选/流程/兜底/数据怎么测得/同类对比/真需要吗/产出/每字可讲）',
      '写 3 分钟项目介绍稿，练到脱稿自然，每次面试都"吟唱"同一版',
      '介绍稿里埋 2~3 个钩子（你精通的技术点），把面试官引向你会的领域'],
      check: ['九问清单全部能答', '3 分钟介绍背熟且自然', '钩子点 ≤3 个且全部精通'],
      script: '这个项目我引入了 XX（提高声量）……当时对比了 A/B 两种方案，我选了 A，因为（……）。——钩子抛出后，面试官大概率顺着追问，而那是你准备最充分的领域。',
      tips: ['项目不在高大上，在于"你能讲出多少思考"', '面试官有项目先问项目，没项目才问八股——项目就是你的护城河'],
      cats: ['FastAPI', 'MySQL', '综合进阶', '机器学习'] },
    { icon: '⌨️', num: '06', title: '算法与手撕：hot100 默写 + 卡壳话术', goal: '手撕环节不丢分，卡住也能把损失降到最低。', steps: [
      'hot100 抄答案 → 理解思路 → 分板块肌肉记忆默写（每天 3~5 题，一个月过一遍）',
      '拿到题先讲思路 30 秒，和面试官对齐再动手',
      '卡住时嘴不要停：不断输出你的思路，让面试官觉得你有思维',
      '细听面试官暗示——他开口必有原因，顺着他的话思考',
      '真不会：主动请求换题或提示，别干等发呆'],
      check: ['hot100 高频题默写过一遍', '已练习"边敲边说"输出思路'],
      script: '我的思路是用 XX，目前卡在 XX 的边界处理。这块我最近刷得少，能否给个提示，或者换一道我熟悉的类型？——争取永远比沉默强。',
      tips: ['前面项目八股答得好 → 算法大概率出简单题走流程', '手撕没跑通不等于挂（真实案例：一面没跑通也拿过 offer）'],
      cats: ['函数与作用域', '流程控制'] },
    { icon: '🎤', num: '07', title: '面试对话术：掌控节奏，把面试变成开卷', goal: '整场面试只在你擅长的领域里进行。', steps: [
      '准备 60 秒自我介绍：名字+经历+技术栈+主推项目，引导提问方向',
      '回答用「结论先行 + 分层展开」：先给答案，再按面试官兴趣决定展开深度',
      '不会的问题：诚实承认 + 给思路 + 转移到你熟悉的相关领域',
      '反问环节准备 2~3 个高质量问题（团队技术栈/项目阶段/对你的期望）',
      '每场面试都主动"吟唱"准备好的项目介绍，越练越熟'],
      check: ['60 秒自我介绍背熟', '2~3 个反问问题备好', '高频盲区问题都有转移话术'],
      script: '这块我实际接触不多，但我理解它是解决 XX 问题的，我的思路会从 XX 入手。我们项目里类似的是 XX，我可以展开讲讲那个吗？——把盲区转移到主场。',
      tips: ['面试本质是"草台班子选新人"，从容感来自多面', '埋钩子：介绍时提高声量强调精通的点，一次面试埋 2 个钩子就成功大半'],
      cats: ['Python基础', '机器学习', '深度学习', 'FastAPI'] },
    { icon: '📅', num: '08', title: '面试后：复盘迭代 + 谈薪与选择', goal: '每场面试都有产出，offer 到手会谈判、会取舍。', steps: [
      '30 分钟复盘：问题清单、卡壳点、面试官反馈，记录成档',
      '高频问题回填到简历和背诵清单，简历持续迭代',
      '多拿 offer 做对比，用 offer A 去谈 offer B 的薪资',
      '谈薪要点：摸清行情区间、明确涨幅预期、算清 package（现金+期权+福利）'],
      check: ['每场面试有复盘记录', '简历每 3~5 场迭代一次', '目标公司薪资区间已了解'],
      tips: ['谈薪是正常的商业行为，敢开口才有空间', '综合评估：平台成长性 > 短期薪资差，想清楚自己要什么'],
      cats: ['MySQL', '机器学习-逻辑回归'] },
  ];

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function moduleHtml(m) {
    let pts = '';
    if (m.goal) pts += '<div class="guide-goal"><strong>🎯 目标：</strong>' + esc(m.goal) + '</div>';
    if (m.steps && m.steps.length) pts += '<div class="guide-steps">' + m.steps.map((s, i) => '<div class="guide-step"><span class="gsn">' + (i + 1) + '</span><span>' + esc(s) + '</span></div>').join('') + '</div>';
    if (m.script) pts += '<div class="guide-script"><span class="gs-tag">💬 话术模板</span><p>' + esc(m.script) + '</p></div>';
    if (m.check && m.check.length) pts += '<ul class="guide-checklist">' + m.check.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>';
    if (m.tips && m.tips.length) pts += '<div class="guide-point"><span class="gp-title">⚠️ 提醒</span><ul>' + m.tips.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul></div>';
    let links = '';
    if (m.cats && m.cats.length) links = '<div class="guide-links"><span class="guide-links-label">📖 本卡相关考点：</span>' + m.cats.map(c => '<button class="guide-catlink" onclick="App.gotoCategory(\'' + c + '\')">' + esc(c) + '</button>').join('') + '</div>';
    return '<div class="guide-module"><div class="guide-module-header"><span class="gi">' + m.icon + '</span><span class="gt">' + esc(m.title) + '</span><span class="gn">' + m.num + '</span><span class="arrow">▶</span></div><div class="guide-module-body">' + pts + links + '</div></div>';
  }

  function statsHtml() {
    let mastered = 0, weak = 0;
    App.data.forEach(c => { const s = App.getStatus(c.id).status; if (s === 'mastered') mastered++; else if (s === 'weak') weak++; });
    const all = App.data.length, unlearned = all - mastered - weak;
    const catWeak = {};
    App.data.forEach(c => { if (App.getStatus(c.id).status === 'weak') catWeak[c.category] = (catWeak[c.category] || 0) + 1; });
    const top = Object.keys(catWeak).map(k => ({ cat: k, n: catWeak[k] })).sort((a, b) => b.n - a.n).slice(0, 4);
    let h = '<div class="guide-stats">'
      + '<div class="guide-stat"><div class="num mastered">' + mastered + '</div><div class="lbl">已掌握</div></div>'
      + '<div class="guide-stat"><div class="num weak">' + weak + '</div><div class="lbl">薄弱</div></div>'
      + '<div class="guide-stat"><div class="num">' + unlearned + '</div><div class="lbl">未学</div></div>'
      + '<div class="guide-stat"><div class="num">' + all + '</div><div class="lbl">总题数</div></div>'
      + '</div>';
    h += '<div class="guide-drill"><div class="txt">' + (weak > 0 ? '你当前有 <strong>' + weak + ' 道薄弱题</strong>，面试前优先攻克。' : '当前没有薄弱题，保持！')
      + '<span class="top-label">薄弱分类 TOP：</span>'
      + (top.length ? top.map(t => '<button class="guide-catlink" onclick="App.gotoCategory(\'' + t.cat + '\')">' + t.cat + ' (' + t.n + ')</button>').join('') : '<span class="muted">无</span>')
      + '</div>'
      + '<button class="guide-btn" onclick="App.startWeakDrill()">🚀 薄弱题突击</button>'
      + '<button class="guide-btn ghost" onclick="App.switchMode(\'flash\')">🎴 全部随机刷</button>'
      + '</div>';
    return h;
  }

  /* 软技能右栏卡片 */
  function softSkillsHtml() {
    const cards = App.data.filter(c => c.category === '软技能');
    if (!cards.length) return '<div class="empty-state">暂无软技能卡片</div>';
    return cards.map(c =>
      '<div class="skill-card"><div class="skill-q">' + MD.renderQuestion(c.question) + '</div>' +
      '<div class="skill-a card-answer">' + MD.renderMarkdown(c.answer) + '</div></div>'
    ).join('');
  }

  const Guide = {
    render: function () {
      const box = document.getElementById('guideView');
      if (!box) return;
      const h = '<div class="guide-banner"><h2>🎯 面试前指导</h2>'
        + '<p>面向 <strong>AI 大模型应用开发岗</strong>求职人士的突击手册：8 个模块 × 可执行步骤 + 检查表 + 话术模板。核心原则：<b>把面试当开卷考试，简历就是你的考试范围。</b></p>'
        + '<span class="guide-tag">先定岗位再倒推</span><span class="guide-tag">简历=考试范围</span><span class="guide-tag">海投×早面×复盘</span><span class="guide-tag">60分→150分答题</span><span class="guide-tag">复盘迭代谈薪</span></div>';
      box.innerHTML = h
        + '<div class="guide-layout">'
        + '<div class="guide-left">' + statsHtml() + GUIDE_MODULES.map(moduleHtml).join('') + '</div>'
        + '<div class="guide-right"><h3 class="guide-right-title">💼 软技能知识卡片</h3>' + softSkillsHtml() + '</div>'
        + '</div>';

      // 模块折叠
      box.querySelectorAll('.guide-module-header').forEach(hdr => {
        hdr.addEventListener('click', () => hdr.parentElement.classList.toggle('open'));
      });
      // 软技能卡片折叠
      box.querySelectorAll('.skill-q').forEach(q => {
        q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
      });
    },
  };

  global.Guide = Guide;
})(window);
