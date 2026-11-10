'use strict';

/* =========================================================
   首页总览
   ========================================================= */

function homeMiniCard(modId, main, sub) {
  const m = findById(MODULES, modId);
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

    const planItems = d.plan.items
      .filter((i) => i.date === t)
      .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99') || (a.createdAt || 0) - (b.createdAt || 0));
    const timed = planItems.filter((i) => i.start && i.end);
    const overdue = d.plan.items.filter((i) => i.date < t);
    const firstTimed = planItems.filter((i) => i.start)[0];

    const memos = d.memos.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const goals = d.study.goals || [];
    const upcomingGoal = goals
      .filter((g) => g.deadline && g.deadline >= t)
      .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0];

    const weekPlans = (d.fitness.plans || []).filter((p) => p.date >= weekStart && p.date <= addDays(weekStart, 6));
    const routineNames = (d.fitness.routines || []).map((r) => r.name).filter(Boolean);

    const spend = sumBy(
      d.money.txns.filter((x) => x.type === 'expense' && x.date.indexOf(mk) === 0),
      (x) => x.amount
    );
    const budget = Number(d.money.budgets[mk]) || 0;

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
      cards.push(
        homeMiniCard(
          'study',
          goals.length ? '目标 ' + goals.length + ' 个' : '还没有目标',
          upcomingGoal ? '最近截止 ' + fmtDateCN(upcomingGoal.deadline) : '去设一个学习目标'
        )
      );
    }
    if (has('fitness')) {
      cards.push(
        homeMiniCard(
          'fitness',
          weekPlans.length ? '本周 ' + weekPlans.length + ' 次安排' : '本周还没排训练',
          routineNames.length ? routineNames.join(' / ') : '先建推日 / 拉日模板'
        )
      );
    }
    if (has('diet')) {
      const water = Number(d.diet.water[t]) || 0;
      const goal = Number(d.settings.waterGoal) || 2000;
      const todayMeals = d.diet.meals.filter((m) => m.date === t);
      const kcal = sumBy(todayMeals, (m) => Number(m.calories) || 0);
      cards.push(
        homeMiniCard(
          'diet',
          kcal ? '今日搭配 ' + kcal + ' kcal' : '今日还没排搭配',
          '饮水 ' + water + ' / ' + goal + ' ml'
        )
      );
    }
    if (has('games')) {
      const devices = d.games.devices || [];
      const countType = (type) => devices.filter((item) => item.type === type).length;
      cards.push(
        homeMiniCard(
          'games',
          devices.length ? '共 ' + devices.length + ' 件设备' : '还没有设备',
          '键盘 ' + countType('keyboard') + ' · 鼠标 ' + countType('mouse') + ' · 耳机 ' + countType('headset')
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
          (planItems.length ? '今天有 ' + planItems.length + ' 项计划' : '今天还没有安排计划') +
          ' · 本周训练 ' + weekPlans.length + ' 次',
        '<a class="btn primary" href="#/plan">' + icon('calendar') + '今日计划</a>'
      ) +
      '<div class="grid grid-4">' +
      statCard({
        label: '今日计划',
        dot: true,
        value: planItems.length + '<small>项</small>',
        sub: firstTimed ? '最早 ' + firstTimed.start + ' 开始' : planItems.length ? '还没有排时间' : '还没有安排',
      }) +
      statCard({
        label: '学习目标',
        dot: true,
        value: goals.length + '<small>个</small>',
        sub: upcomingGoal ? '最近截止 ' + fmtDateCN(upcomingGoal.deadline) : '还没有设截止日期',
      }) +
      statCard({
        label: '本周训练',
        dot: true,
        value: weekPlans.length + '<small>次</small>',
        sub: weekPlans.length
          ? weekPlans
              .slice()
              .sort(byDateAsc)
              .map((p) => weekdayCN(p.date) + ' ' + p.name)
              .slice(0, 3)
              .join(' · ')
          : '去健身页安排本周训练',
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
      (planItems.length ? '共 ' + planItems.length + ' 项，已排时间 ' + timed.length + ' 项' : '把今天要做的事排进来') +
      '</p></div><a class="link" href="#/plan">查看全部 ›</a></div>' +
      (overdue.length
        ? '<div class="hint-bar mt-12"><span>有 ' + overdue.length + ' 项之前排的计划</span>' +
          '<button class="btn sm" data-act="pullOverdue">挪到今天</button></div>'
        : '') +
      '<div class="list mt-12">' +
      (planItems.length
        ? planItems
            .slice(0, 6)
            .map(
              (i) =>
                '<div class="item">' +
                '<div class="item-body"><div class="item-title">' + esc(i.title) + '</div>' +
                '<div class="item-meta">' +
                (i.start ? '<span class="chip gray">' + esc(i.start) + (i.end ? '–' + esc(i.end) : '') + '</span>' : '<span class="chip gray">未排时间</span>') +
                chipsFor(PRIORITIES, i.priority) +
                (i.note ? '<span>' + esc(i.note) + '</span>' : '') +
                '</div></div></div>'
            )
            .join('')
        : emptyState('今天还没有计划', '在下面直接写一件要做的事，回车即可加入')) +
      '</div>' +
      (planItems.length > 6 ? '<div class="tiny muted mt-8">还有 ' + (planItems.length - 6) + ' 项，去今日计划查看</div>' : '') +
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
      (memos.length ? memos.length + ' 条备忘' : '随手记，不怕忘') + '</p></div></div>' +
      '<form class="memo-add" id="memo-add"><input class="input" name="text" maxlength="120" placeholder="记一句…">' +
      '<button class="btn sm" type="submit">记下</button></form>' +
      '<div class="list">' +
      (memos.length
        ? memos
            .slice(0, 10)
            .map(
              (m) =>
                '<div class="item"><div class="item-body"><div class="item-title" style="white-space:normal">' + esc(m.text) + '</div>' +
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
      quickBtn('qStudy', 'book', '学习目标', '#7c3aed', '#f0eafd') +
      quickBtn('qTrain', 'dumbbell', '训练安排', '#ea580c', '#fdeee4') +
      quickBtn('qDiet', 'bowl', '饮食搭配', '#16a34a', '#e6f5ea') +
      quickBtn('qDevice', 'gamepad', '添加设备', '#db2777', '#fce8f0') +
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
        openGoalModal(null);
      },
      qTrain() {
        App.go('fitness');
      },
      qDiet() {
        App.go('diet');
      },
      qDevice() {
        openDeviceModal(null);
      },
      pullOverdue() {
        let moved = 0;
        d.plan.items.forEach((i) => {
          if (i.date < t) {
            i.date = t;
            moved++;
          }
        });
        Store.save();
        toast('已把 ' + moved + ' 项计划挪到今天');
        App.refresh();
      },
      delMemo(node) {
        removeById(d.memos, node.dataset.id);
        Store.save();
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
      d.memos.push({ id: uid(), text: text, createdAt: Date.now(), date: t });
      Store.save();
      App.refresh();
    });
  },
};
