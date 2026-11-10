'use strict';

/* =========================================================
   消费记录 · 账单 / 预算 / 资产 / 分析
   ========================================================= */

function moneyPeriodInfo(range, mk) {
  const year = String(mk).slice(0, 4);
  if (range === 'week') {
    const ws = weekStartKey(todayKey());
    return {
      from: ws,
      to: addDays(ws, 6),
      label: '本周（' + fmtShortDate(ws) + '–' + fmtShortDate(addDays(ws, 6)) + '）',
      divisor: 7,
      avgLabel: '平均每天',
    };
  }
  if (range === 'year') {
    return { from: year + '-01-01', to: year + '-12-31', label: year + ' 年', divisor: 12, avgLabel: '平均每月' };
  }
  const days = new Date(Number(year), Number(mk.slice(5, 7)), 0).getDate();
  return {
    from: mk + '-01',
    to: mk + '-' + pad2(days),
    label: monthLabel(mk),
    divisor: days,
    avgLabel: '平均每天',
  };
}

Pages.money = {
  month: monthKeyOf(todayKey()),
  range: 'month',

  render(el) {
    const d = Store.data;
    const mk = this.month;
    const isCurrent = mk === monthKeyOf(todayKey());
    const year = mk.slice(0, 4);

    const txns = d.money.txns.filter((x) => x.date.indexOf(mk) === 0);
    const expenses = txns.filter((t) => t.type === 'expense');
    const incomes = txns.filter((t) => t.type === 'income');
    const expenseTotal = sumBy(expenses, (t) => t.amount);
    const incomeTotal = sumBy(incomes, (t) => t.amount);
    const budget = Number(d.money.budgets[mk]) || 0;
    const remaining = budget - expenseTotal;
    const budgetPct = budget ? Math.max(0, Math.min(100, Math.round((remaining / budget) * 100))) : 0;
    const overBudget = !!budget && expenseTotal > budget;

    /* ---- 资产 ---- */
    const assets = (d.money.assets || []).filter((a) => a.type !== 'liability');
    const debts = (d.money.assets || []).filter((a) => a.type === 'liability');
    const assetTotal = sumBy(assets, (a) => Number(a.amount) || 0);
    const debtTotal = sumBy(debts, (a) => Number(a.amount) || 0);
    const netWorth = assetTotal - debtTotal;

    /* ---- 支出分析（周 / 月 / 年） ---- */
    const period = moneyPeriodInfo(this.range, mk);
    const periodExpenses = d.money.txns.filter(
      (x) => x.type === 'expense' && x.date >= period.from && x.date <= period.to
    );
    const periodTotal = sumBy(periodExpenses, (x) => x.amount);
    const periodAvg = periodTotal / (period.divisor || 1);
    const periodCats = {};
    periodExpenses.forEach((x) => {
      const key = x.category || '其他';
      periodCats[key] = (periodCats[key] || 0) + (Number(x.amount) || 0);
    });
    const periodRank = Object.keys(periodCats)
      .map((name) => ({ name: name, value: periodCats[name] }))
      .sort((a, b) => b.value - a.value);
    const periodMax = periodRank.length ? periodRank[0].value : 1;

    /* ---- 近 6 个月趋势 ---- */
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

    /* ---- 明细 ---- */
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

      /* ---- 账单 ---- */
      '<section class="card money-hero">' +
      '<div class="money-hero-month"><span>账单 · ' + esc(year) + ' 年</span><b>' + Number(mk.slice(5, 7)) +
      '<small>月</small></b></div>' +
      '<div class="money-hero-metrics">' +
      '<div><span>收入</span><b>' + fmtMoney(incomeTotal, 'CNY') + '</b></div>' +
      '<div><span>支出</span><b>' + fmtMoney(expenseTotal, 'CNY') + '</b></div>' +
      '<div><span>结余</span><b class="' + (incomeTotal - expenseTotal < 0 ? 'neg' : 'pos') + '">' +
      fmtMoney(incomeTotal - expenseTotal, 'CNY') + '</b></div>' +
      '</div>' +
      '<div class="money-hero-count">' + txns.length + ' 笔记录</div>' +
      '</section>' +

      '<div class="grid grid-2 mt-16" style="align-items:start">' +

      /* ---- 预算 ---- */
      '<section class="card"><div class="card-head"><div><h2>' + Number(mk.slice(5, 7)) + ' 月总预算</h2>' +
      '<p class="card-sub">' + (budget ? '按本月支出实时计算' : '设一个预算，看看还剩多少') + '</p></div>' +
      '<button class="btn sm" data-act="setBudget">' + (budget ? '修改预算' : '+ 设置预算') + '</button></div>' +
      '<div class="budget-body">' +
      '<div class="budget-ring" style="--p:' + budgetPct + ';--ring:' + (overBudget ? '#dc2626' : '#16a34a') + '">' +
      '<div class="budget-ring-in"><b>' + (budget ? (overBudget ? '超支' : budgetPct + '%') : '—') + '</b>' +
      '<span>' + (budget ? '剩余' : '未设置') + '</span></div></div>' +
      '<div class="budget-lines">' +
      '<div><span>剩余预算</span><b class="' + (remaining < 0 ? 'neg' : '') + '">' +
      (budget ? fmtMoney(remaining, 'CNY') : '—') + '</b></div>' +
      '<div><span>本月预算</span><b>' + (budget ? fmtMoney(budget, 'CNY') : '—') + '</b></div>' +
      '<div><span>本月支出</span><b>' + fmtMoney(expenseTotal, 'CNY') + '</b></div>' +
      '</div></div></section>' +

      /* ---- 资产管家 ---- */
      '<section class="card"><div class="card-head"><div><h2>资产管家</h2>' +
      '<p class="card-sub">' + (d.money.assets.length ? '资产减负债，就是净资产' : '把存款、负债记进来，看净资产') + '</p></div>' +
      '<button class="btn sm" data-act="addAsset">' + icon('plus') + '添加</button></div>' +
      '<div class="asset-sums">' +
      '<div><span>净资产</span><b>' + fmtMoney(netWorth, 'CNY') + '</b></div>' +
      '<div><span>资产</span><b class="pos">' + fmtMoney(assetTotal, 'CNY') + '</b></div>' +
      '<div><span>负债</span><b class="neg">' + fmtMoney(debtTotal, 'CNY') + '</b></div>' +
      '</div>' +
      ((d.money.assets || []).length
        ? '<div class="asset-list">' +
          d.money.assets
            .map(
              (a) =>
                '<div class="asset-row"><span class="chip ' + (a.type === 'liability' ? 'red' : 'green') + '">' +
                (a.type === 'liability' ? '负债' : '资产') + '</span>' +
                '<span class="asset-name">' + esc(a.name) + '</span>' +
                '<b>' + fmtMoney(a.amount, 'CNY') + '</b>' +
                '<button class="icon-btn danger" data-act="delAsset" data-id="' + a.id + '" aria-label="删除">' + icon('trash') + '</button></div>'
            )
            .join('') +
          '</div>'
        : '<div class="tiny muted mt-12">还没有资产记录，点右上角「添加」</div>') +
      '</section>' +

      '</div>' +

      '<div class="grid grid-2 mt-16" style="align-items:start">' +

      /* ---- 支出分析 ---- */
      '<section class="card"><div class="card-head"><div><h2>支出分析</h2>' +
      '<p class="card-sub">' + esc(period.label) + ' · 总支出 ' + fmtMoney(periodTotal, 'CNY') +
      ' · ' + period.avgLabel + ' ' + fmtMoney(periodAvg, 'CNY') + '</p></div>' +
      '<div class="tabs money-range-tabs">' +
      [['week', '周'], ['month', '月'], ['year', '年']]
        .map(
          (r) =>
            '<button class="tab' + (this.range === r[0] ? ' active' : '') + '" data-act="setRange" data-range="' + r[0] + '">' + r[1] + '</button>'
        )
        .join('') +
      '</div></div>' +
      (periodRank.length
        ? '<div class="rank">' +
          periodRank
            .slice(0, 8)
            .map(
              (c) =>
                '<div class="rank-row"><span class="rank-name">' + esc(c.name) + '</span>' +
                '<span class="rank-bar"><i style="width:' + Math.max(2, Math.round((c.value / periodMax) * 100)) + '%"></i></span>' +
                '<span class="rank-pct">' + pct(c.value, periodTotal) + '%</span>' +
                '<span class="rank-val">' + fmtMoney(c.value, 'CNY') + '</span></div>'
            )
            .join('') +
          '</div>'
        : emptyState('这段时间还没有支出', '记一笔之后，排行榜会出现在这里')) +
      '</section>' +

      /* ---- 近 6 个月 ---- */
      '<section class="card"><div class="card-head"><div><h2>近 6 个月支出</h2>' +
      '<p class="card-sub">看看花销的走势</p></div></div>' +
      (hasHistory
        ? barChart(months, { height: 160, format: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)) })
        : emptyState('还没有历史数据', '多记几个月，就能看出花销变化')) +
      '</section>' +

      '</div>' +

      /* ---- 明细 ---- */
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
      setRange(node) {
        Pages.money.range = node.dataset.range;
        App.refresh();
      },
      setBudget() {
        openBudgetModal(Pages.money.month);
      },
      addAsset() {
        openAssetModal(null);
      },
      delAsset(node) {
        const id = node.dataset.id;
        confirmDelete('删除这条资产记录？', () => {
          removeById(Store.data.money.assets || [], id);
          Store.save();
          App.refresh();
        });
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

function openAssetModal(asset) {
  const editing = !!asset;
  openModal({
    title: editing ? '编辑资产' : '添加资产',
    subtitle: '存款、理财记成资产，信用卡、借款记成负债',
    size: 'small',
    body:
      fInput('name', '名称', { value: editing ? asset.name : '', placeholder: '例如：招行存款 / 信用卡', required: true, maxlength: 30 }) +
      fRow(
        fSelect(
          'type',
          '类型',
          [
            { value: 'asset', label: '资产' },
            { value: 'liability', label: '负债' },
          ],
          editing ? asset.type : 'asset'
        ),
        fNumber('amount', '金额（元）', { value: editing ? asset.amount : '', min: 0, step: '0.01', required: true })
      ),
    onSubmit(data) {
      const name = String(data.name || '').trim();
      const amount = Number(data.amount);
      if (!name) {
        toast('请填写名称', 'err');
        return false;
      }
      if (!isFinite(amount) || amount < 0) {
        toast('请填写正确的金额', 'err');
        return false;
      }
      const payload = {
        name: name,
        type: data.type === 'liability' ? 'liability' : 'asset',
        amount: amount,
      };
      Store.data.money.assets = Store.data.money.assets || [];
      if (editing) {
        Object.assign(asset, payload);
      } else {
        Store.data.money.assets.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast(editing ? '资产已更新' : '资产已添加');
      App.refresh();
    },
  });
}
