'use strict';

/* =========================================================
   消费记录
   ========================================================= */

Pages.money = {
  month: monthKeyOf(todayKey()),

  render(el) {
    const d = Store.data;
    const mk = this.month;
    const isCurrent = mk === monthKeyOf(todayKey());
    const txns = d.money.txns.filter((x) => x.date.indexOf(mk) === 0);
    const expenses = txns.filter((t) => t.type === 'expense');
    const incomes = txns.filter((t) => t.type === 'income');
    const expenseTotal = sumBy(expenses, (t) => t.amount);
    const incomeTotal = sumBy(incomes, (t) => t.amount);
    const budget = Number(d.money.budgets[mk]) || 0;
    const remaining = budget - expenseTotal;

    /* 分类统计 */
    const catMap = {};
    expenses.forEach((t) => {
      const key = t.category || '其他';
      catMap[key] = (catMap[key] || 0) + (Number(t.amount) || 0);
    });
    const catList = Object.keys(catMap)
      .map((name) => ({ name: name, value: catMap[name] }))
      .sort((a, b) => b.value - a.value);
    const maxCat = catList.length ? catList[0].value : 1;

    /* 近 6 个月趋势 */
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const key = addMonths(mk, -i);
      const total = sumBy(
        d.money.txns.filter((x) => x.date.indexOf(key) === 0 && x.type === 'expense'),
        (x) => x.amount
      );
      months.push({ label: Number(key.split('-')[1]) + '月', title: monthLabel(key), value: total });
    }
    const hasHistory = months.some((m) => m.value > 0);

    /* 按日期分组 */
    const sorted = txns.slice().sort(byDateDesc);
    const groups = {};
    sorted.forEach((t) => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });

    el.innerHTML =
      pageHead(
        '消费记录',
        monthLabel(mk) + ' · 支出 ' + fmtMoney(expenseTotal, 'CNY') + '，收入 ' + fmtMoney(incomeTotal, 'CNY'),
        '<div class="month-nav">' +
          '<button class="icon-btn" data-act="prevMonth" aria-label="上个月">' + icon('chevronL') + '</button>' +
          '<span class="month-title">' + esc(monthLabel(mk)) + '</span>' +
          '<button class="icon-btn" data-act="nextMonth" aria-label="下个月">' + icon('chevronR') + '</button>' +
          (isCurrent ? '' : '<button class="btn sm" data-act="thisMonth">本月</button>') +
          '</div>' +
          '<button class="btn" data-act="setBudget">' + icon('wallet') + '预算</button>' +
          '<button class="btn primary" data-act="add">' + icon('plus') + '记一笔</button>'
      ) +

      '<div class="grid grid-4">' +
      statCard({ label: '支出', dot: true, value: fmtMoney(expenseTotal, 'CNY'), sub: expenses.length + ' 笔支出' }) +
      statCard({ label: '收入', dot: true, value: fmtMoney(incomeTotal, 'CNY'), sub: incomes.length + ' 笔收入' }) +
      statCard({ label: '结余', dot: true, value: fmtMoney(incomeTotal - expenseTotal, 'CNY'), sub: '收入 − 支出' }) +
      statCard({
        label: '预算',
        dot: true,
        value: budget ? fmtMoney(Math.max(0, remaining), 'CNY') : '未设置',
        sub: budget
          ? remaining >= 0
            ? '预算 ' + fmtMoney(budget, 'CNY') + ' · 还剩 ' + pct(remaining, budget) + '%'
            : '已超支 ' + fmtMoney(-remaining, 'CNY')
          : '点右上角「预算」设置',
      }) +
      '</div>' +

      '<div class="grid grid-2 mt-16" style="align-items:start">' +
      '<section class="card"><div class="card-head"><div><h2>分类占比</h2>' +
      '<p class="card-sub">' + (expenses.length ? '按支出分类统计' : '还没有支出记录') + '</p></div></div>' +
      (catList.length
        ? '<div class="rank">' +
          catList
            .slice(0, 8)
            .map(
              (c) =>
                '<div class="rank-row"><span class="rank-name">' + esc(c.name) + '</span>' +
                '<span class="rank-bar"><i style="width:' + Math.max(2, Math.round((c.value / maxCat) * 100)) + '%"></i></span>' +
                '<span class="rank-val">' + fmtMoney(c.value, 'CNY') + '</span></div>'
            )
            .join('') +
          '</div>'
        : emptyState('这个月还没有支出', '记一笔之后，分类占比会出现在这里')) +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>近 6 个月支出</h2>' +
      '<p class="card-sub">看看花销的走势</p></div></div>' +
      (hasHistory
        ? barChart(months, { height: 126, format: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)) })
        : emptyState('还没有历史数据', '多记几个月，就能看出花销变化')) +
      '</section>' +
      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>明细</h2>' +
      '<p class="card-sub">' + (txns.length ? '共 ' + txns.length + ' 笔' : '这个月还没有记录') + '</p></div></div>' +
      (sorted.length
        ? Object.keys(groups)
            .sort()
            .reverse()
            .map((date) => {
              const dayTxns = groups[date];
              const dayExpense = sumBy(dayTxns.filter((x) => x.type === 'expense'), (x) => x.amount);
              return (
                '<div class="day-head"><b>' + esc(fmtDateCN(date, true)) + '</b>' +
                (dayExpense ? '<span>支出 ' + fmtMoney(dayExpense, 'CNY') + '</span>' : '<span></span>') + '</div>' +
                dayTxns
                  .map(
                    (x) =>
                      '<div class="item"><div class="item-body"><div class="item-title">' +
                      esc(x.category || '其他') +
                      (x.note ? ' <span class="muted" style="font-weight:400">· ' + esc(x.note) + '</span>' : '') +
                      '</div></div>' +
                      '<div class="item-amount' + (x.type === 'income' ? ' income' : '') + '">' +
                      (x.type === 'income' ? '+' : '−') + fmtMoney(x.amount, 'CNY') + '</div>' +
                      '<div class="item-actions">' +
                      '<button class="icon-btn" data-act="edit" data-id="' + x.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                      '<button class="icon-btn danger" data-act="del" data-id="' + x.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                      '</div></div>'
                  )
                  .join('')
              );
            })
            .join('')
        : emptyState('这个月还没有记账', '记下第一笔，支出和分类统计会自动更新', '<button class="btn sm" data-act="add">+ 记一笔</button>')) +
      '</section>';

    bind(el, {
      prevMonth() {
        Pages.money.month = addMonths(Pages.money.month, -1);
        App.refresh();
      },
      nextMonth() {
        Pages.money.month = addMonths(Pages.money.month, 1);
        App.refresh();
      },
      thisMonth() {
        Pages.money.month = monthKeyOf(todayKey());
        App.refresh();
      },
      setBudget() {
        openBudgetModal(Pages.money.month);
      },
      add() {
        openTxnModal(null);
      },
      edit(node) {
        const txn = findById(Store.data.money.txns, node.dataset.id);
        if (txn) openTxnModal(txn);
      },
      del(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.money.txns, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },
};

/* ---------------- 弹窗 ---------------- */

function openTxnModal(txn) {
  const editing = !!txn;
  const cats = Store.data.money.categories;
  const type = editing ? txn.type : 'expense';
  const catOptions = cats[type] || cats.expense;

  openModal({
    title: editing ? '编辑记录' : '记一笔',
    size: 'small',
    body:
      fRow(
        fSelect(
          'type',
          '类型',
          [
            { value: 'expense', label: '支出' },
            { value: 'income', label: '收入' },
          ],
          type
        ),
        fSelect('category', '分类', catOptions, editing ? txn.category : catOptions[0])
      ) +
      fRow(
        fNumber('amount', '金额（元）', { value: editing ? txn.amount : '', min: 0, step: '0.01', required: true }),
        fDate('date', '日期', editing ? txn.date : todayKey())
      ) +
      fInput('note', '备注', { value: editing ? txn.note : '', placeholder: '买了什么、和谁，可不填', maxlength: 60 }),
    onMount(form) {
      const typeSel = form.elements.type;
      const catSel = form.elements.category;
      if (!typeSel || !catSel) return;
      typeSel.addEventListener('change', () => {
        const list = cats[typeSel.value] || cats.expense;
        const current = catSel.value;
        catSel.innerHTML = list.map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join('');
        catSel.value = list.indexOf(current) >= 0 ? current : list[0] || '';
      });
    },
    onSubmit(data) {
      const amount = Number(data.amount);
      if (!isFinite(amount) || amount <= 0) {
        toast('请填写正确的金额', 'err');
        return false;
      }
      const payload = {
        type: data.type === 'income' ? 'income' : 'expense',
        category: data.category || '其他',
        amount: amount,
        date: data.date || todayKey(),
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(txn, payload);
      } else {
        Store.data.money.txns.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast(editing ? '记录已更新' : '已记一笔');
      App.refresh();
    },
  });
}

function openBudgetModal(mk) {
  const current = Number(Store.data.money.budgets[mk]) || 0;
  openModal({
    title: monthLabel(mk) + ' 预算',
    size: 'small',
    body: fNumber('amount', '本月预算（元）', {
      value: current || '',
      min: 0,
      step: '1',
      placeholder: '例如：5000',
      hint: '填 0 或留空表示不设预算',
    }),
    onSubmit(data) {
      const amount = Number(data.amount) || 0;
      Store.data.money.budgets[mk] = amount;
      Store.save();
      toast(amount ? '预算已设置为 ' + fmtMoney(amount, 'CNY') : '已取消本月预算');
      App.refresh();
    },
  });
}
