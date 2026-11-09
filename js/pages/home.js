'use strict';

/* =========================================================
   首页总览
   ========================================================= */

function homeMiniCard(modId, main, sub) {  const m = findById(MODULES, modId);
  if (!m) return '';
  return (
    '<a class="mini" href="#/' + m.id + '">' +
    '<span class="mini-ico" style="background:' + m.soft + ';color:' + m.color + '">' + icon(m.icon) + '</span>' +
    '<span class="mini-body"><span class="mini-title">' + esc(m.name) + '</span>' +
    '<span class="mini-main">' + esc(main) + '</span>' +
    '<span class="mini-sub">' + esc(sub) + '</span></span></a>'
  );
}

function quickBtn(act, iconName, label, color, soft) {
  return (
    '<button class="quick-btn" data-act="' + act + '">' +
    '<span class="q-ico" style="background:' + soft + ';color:' + color + '">' + icon(iconName) + '</span>' +
    esc(label) + '</button>'
  );
}

Pages.home = {
  render(el) {
    const d = Store.data;
    const t = todayKey();
    const mk = monthKeyOf(t);
    const weekStart = weekStartKey(t);

    const planItems = d.plan.items.filter((i) => i.date === t);
    const doneCount = planItems.filter((i) => i.done).length;
    const openItems = planItems
      .filter((i) => !i.done)
      .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'));
    const overdue = d.plan.items.filter((i) => !i.done && i.date < t);

    const memos = d.memos.filter((m) => !m.done).sort((a, b) => b.createdAt - a.createdAt);
    const doneMemos = d.memos.filter((m) => m.done).length;

    const studyToday = sumBy(d.study.logs.filter((l) => l.date === t), (l) => l.minutes);
    const studyWeek = sumBy(d.study.logs.filter((l) => l.date >= weekStart && l.date <= t), (l) => l.minutes);

    const gameWeek = sumBy(d.games.sessions.filter((s) => s.date >= weekStart && s.date <= t), (s) => s.minutes);
    const gameLimit = Number(d.settings.weeklyGameLimit) || 0;

    const spend = sumBy(
      d.money.txns.filter((x) => x.type === 'expense' && x.date.indexOf(mk) === 0),
      (x) => x.amount
    );
    const budget = Number(d.money.budgets[mk]) || 0;

    const planPct = pct(doneCount, planItems.length);
    const visible = App.visibleModules().map((m) => m.id);
    const has = (id) => visible.indexOf(id) >= 0;

    /* ---- 各模块摘要 ---- */
    const cards = [];

    if (has('work')) {
      const monthOrders = d.work.orders.filter((o) => o.date.indexOf(mk) === 0 && o.status !== 'refund');
      const sales = sumBy(monthOrders, (o) => toCNY(o.amount, o.currency));
      const restock = d.work.stock.filter((s) => Number(s.qty) <= Number(s.safe)).length;
      cards.push(
        homeMiniCard(
          'work',
          fmtMoney(sales, 'CNY'),
          '本月 ' + monthOrders.length + ' 单 · 待补货 ' + restock + ' 个'
        )
      );
    }
    if (has('study')) {
      const streak = studyStreak(d.study.logs);
      cards.push(
        homeMiniCard(
          'study',
          studyToday ? minutesText(studyToday) : '今天还没学',
          '本周 ' + hoursText(studyWeek) + ' · 连续 ' + streak + ' 天'
        )
      );
    }
    if (has('fitness')) {
      const weekSessions = d.fitness.sessions.filter((s) => s.date >= weekStart && s.date <= t);
      const latest = d.body.metrics.slice().sort(byDateDesc)[0];
      cards.push(
        homeMiniCard(
          'fitness',
          '本周 ' + weekSessions.length + ' 次训练',
          latest ? '最新体重 ' + latest.weight + ' kg' : '还没有体重记录'
        )
      );
    }
    if (has('diet')) {
      const todayMeals = d.diet.meals.filter((m) => m.date === t);
      const recorded = MEALS.filter((m) => todayMeals.some((x) => x.type === m.value)).length;
      const water = Number(d.diet.water[t]) || 0;
      const goal = Number(d.settings.waterGoal) || 2000;
      cards.push(
        homeMiniCard('diet', '已记录 ' + recorded + '/3 餐', '饮水 ' + water + ' / ' + goal + ' ml')
      );
    }
    if (has('games')) {
      const playing = d.games.items.filter((g) => g.status === 'playing').length;
      cards.push(
        homeMiniCard(
          'games',
          '本周 ' + hoursText(gameWeek),
          '在玩 ' + playing + ' 款' + (gameLimit ? ' · 上限 ' + gameLimit + ' 小时' : '')
        )
      );
    }
    if (has('money')) {
      cards.push(
        homeMiniCard(
          'money',
          '本月支出 ' + fmtMoney(spend, 'CNY'),
          budget ? '预算剩余 ' + fmtMoney(Math.max(0, budget - spend), 'CNY') : '还没有设置预算'
        )
      );
    }

    el.innerHTML =
      pageHead(
        greeting(),
        fmtDateCN(t, true) +
          ' · ' +
          (planItems.length
            ? '今天有 ' + planItems.length + ' 项计划，已完成 ' + doneCount + ' 项'
            : '今天还没有安排计划') +
          ' · 本周学习 ' + hoursText(studyWeek),
        '<a class="btn primary" href="#/plan">' + icon('calendar') + '今日计划</a>'
      ) +
      '<div class="grid grid-4">' +
      statCard({
        label: '今日计划',
        dot: true,
        value: doneCount + '<small>/ ' + planItems.length + ' 项</small>',
        sub: planItems.length ? '还剩 ' + (planItems.length - doneCount) + ' 项待完成' : '还没有安排',
      }) +
      statCard({
        label: '今日学习',
        dot: true,
        value: studyToday ? minutesText(studyToday) : '0 <small>分钟</small>',
        sub: '本周累计 ' + hoursText(studyWeek),
      }) +
      statCard({
        label: '本周娱乐',
        dot: true,
        value: hoursText(gameWeek),
        sub: gameLimit ? '每周上限 ' + gameLimit + ' 小时' : '还没有设置上限',
      }) +
      statCard({
        label: '本月支出',
        dot: true,
        value: fmtMoney(spend, 'CNY'),
        sub: budget ? '预算 ' + fmtMoney(budget, 'CNY') + ' · 剩余 ' + fmtMoney(Math.max(0, budget - spend), 'CNY') : '还没有设置预算',
      }) +
      '</div>' +

      '<div class="grid home-cols mt-16">' +
      '<div class="stack">' +

      /* ---- 今日计划 ---- */
      '<section class="card">' +
      '<div class="card-head"><div><h2>今日计划</h2>' +
      '<p class="card-sub">' +
      (planItems.length ? '已完成 ' + doneCount + ' / ' + planItems.length + ' 项' : '把今天要做的事排进来') +
      '</p></div><a class="link" href="#/plan">查看全部 ›</a></div>' +
      (planItems.length
        ? '<div class="progress-row"><div class="progress"><div class="progress-fill" style="width:' + planPct + '%"></div></div>' +
          '<span class="progress-pct">' + planPct + '%</span></div>'
        : '') +
      (overdue.length
        ? '<div class="hint-bar mt-12"><span>有 ' + overdue.length + ' 项以前没做完的计划</span>' +
          '<button class="btn sm" data-act="pullOverdue">挪到今天</button></div>'
        : '') +
      '<div class="list mt-12">' +
      (openItems.length
        ? openItems
            .slice(0, 6)
            .map(
              (i) =>
                '<div class="item"><button class="tick" data-act="togglePlan" data-id="' + i.id + '" aria-label="完成">' +
                icon('check') + '</button>' +
                '<div class="item-body"><div class="item-title">' + esc(i.title) + '</div>' +
                '<div class="item-meta">' +
                (i.start ? '<span class="chip gray">' + esc(i.start) + (i.end ? '–' + esc(i.end) : '') + '</span>' : '') +
                chipsFor(PRIORITIES, i.priority) +
                (i.note ? '<span>' + esc(i.note) + '</span>' : '') +
                '</div></div></div>'
            )
            .join('')
        : doneCount
          ? '<div class="tiny muted" style="padding:6px 2px">今天的计划都完成了。</div>'
          : emptyState('今天还没有计划', '在下面直接写一件要做的事，回车即可加入')) +
      '</div>' +
      (openItems.length > 6 ? '<div class="tiny muted mt-8">还有 ' + (openItems.length - 6) + ' 项未完成，去今日计划查看</div>' : '') +
      '<form class="quick-add" id="home-plan-add"><input class="input" name="title" maxlength="80" placeholder="添加一件今天要做的事，回车保存">' +
      '<button class="btn primary sm" type="submit">' + icon('plus') + '添加</button></form>' +
      '</section>' +

      /* ---- 模块摘要 ---- */
      '<section class="card"><div class="card-head"><div><h2>各模块摘要</h2>' +
      '<p class="card-sub">点开任意模块继续</p></div></div>' +
      '<div class="mini-grid">' + cards.join('') + '</div></section>' +

      '</div>' +

      /* ---- 快速备忘 ---- */
      '<div class="stack"><section class="card">' +
      '<div class="card-head"><div><h2>快速备忘</h2><p class="card-sub">' +
      (memos.length ? memos.length + ' 条待处理' : '随手记，不怕忘') + '</p></div>' +
      (doneMemos ? '<button class="btn ghost sm" data-act="clearMemos">清除已完成</button>' : '') +
      '</div>' +
      '<form class="memo-add" id="memo-add"><input class="input" name="text" maxlength="120" placeholder="记一句…">' +
      '<button class="btn sm" type="submit">记下</button></form>' +
      '<div class="list">' +
      (memos.length
        ? memos
            .slice(0, 10)
            .map(
              (m) =>
                '<div class="item"><button class="tick" data-act="toggleMemo" data-id="' + m.id + '" aria-label="完成">' +
                icon('check') + '</button>' +
                '<div class="item-body"><div class="item-title" style="white-space:normal">' + esc(m.text) + '</div>' +
                '<div class="item-meta">' + esc(fmtDateCN(m.date || dateKey(new Date(m.createdAt || Date.now())))) + '</div></div>' +
                '<div class="item-actions"><button class="icon-btn danger" data-act="delMemo" data-id="' + m.id + '" aria-label="删除">' +
                icon('trash') + '</button></div></div>'
            )
            .join('')
        : '<div class="mt-8">' + emptyState('还没有备忘', '临时想法、要买的东西都可以先放这里') + '</div>') +
      '</div>' +
      (memos.length > 10 ? '<div class="tiny muted mt-8">还有 ' + (memos.length - 10) + ' 条未显示</div>' : '') +
      '</section>' +
      '<section class="card"><div class="card-head"><div><h2>快捷记录</h2>' +
      '<p class="card-sub">不用切换模块，直接打开表单</p></div></div>' +
      '<div class="quick-grid">' +
      quickBtn('qPlan', 'calendar', '添加计划', '#2563eb', '#e8effd') +
      quickBtn('qTxn', 'wallet', '记一笔', '#b45309', '#fbf0dd') +
      quickBtn('qStudy', 'book', '学习打卡', '#7c3aed', '#f0eafd') +
      quickBtn('qTrain', 'dumbbell', '记录训练', '#ea580c', '#fdeee4') +
      quickBtn('qDiet', 'bowl', '添加饮食', '#16a34a', '#e6f5ea') +
      quickBtn('qGame', 'gamepad', '游戏时长', '#db2777', '#fce8f0') +
      '</div></section>' +
      '</div>' +
      '</div>';

    /* ---- 事件 ---- */
    bind(el, {
      qPlan() {
        openPlanModal(null, todayKey());
      },
      qTxn() {
        openTxnModal(null);
      },
      qStudy() {
        openStudyLogModal(null, '', todayKey());
      },
      qTrain() {
        openSessionModal(null, '');
      },
      qDiet() {
        openFoodModal(todayKey(), 'breakfast');
      },
      qGame() {
        openGameSessionModal();
      },
      togglePlan(node) {
        const item = findById(d.plan.items, node.dataset.id);
        if (!item) return;
        item.done = !item.done;
        item.doneAt = item.done ? Date.now() : null;
        Store.save();
        App.refresh();
      },
      pullOverdue() {
        let moved = 0;
        d.plan.items.forEach((i) => {
          if (!i.done && i.date < t) {
            i.date = t;
            moved++;
          }
        });
        Store.save();
        toast('已把 ' + moved + ' 项没做完的计划挪到今天');
        App.refresh();
      },
      toggleMemo(node) {
        const memo = findById(d.memos, node.dataset.id);
        if (!memo) return;
        memo.done = true;
        Store.save();
        App.refresh();
      },
      delMemo(node) {
        removeById(d.memos, node.dataset.id);
        Store.save();
        App.refresh();
      },
      clearMemos() {
        d.memos = d.memos.filter((m) => !m.done);
        Store.save();
        toast('已清除完成的备忘');
        App.refresh();
      },
    });

    const planForm = el.querySelector('#home-plan-add');
    planForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = String(new FormData(planForm).get('title') || '').trim();
      if (!title) return;
      d.plan.items.push({
        id: uid(),
        date: t,
        title: title,
        start: '',
        end: '',
        priority: 'mid',
        note: '',
        done: false,
        createdAt: Date.now(),
      });
      Store.save();
      toast('已加入今日计划');
      App.refresh();
    });

    const memoForm = el.querySelector('#memo-add');
    memoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = String(new FormData(memoForm).get('text') || '').trim();
      if (!text) return;
      d.memos.push({ id: uid(), text: text, done: false, createdAt: Date.now(), date: t });
      Store.save();
      App.refresh();
    });
  },
};
