'use strict';

/* =========================================================
   今日计划
   ========================================================= */

Pages.plan = {
  date: todayKey(),
  filter: 'all',

  render(el) {
    const d = Store.data;
    const date = this.date;
    const isToday = date === todayKey();

    const all = d.plan.items.filter((i) => i.date === date);
    const done = all.filter((i) => i.done).length;
    const total = all.length;
    const openCount = total - done;

    const list = all
      .filter((i) => (this.filter === 'open' ? !i.done : this.filter === 'done' ? i.done : true))
      .sort((a, b) => {
        if (!!a.done !== !!b.done) return a.done ? 1 : -1;
        return (a.start || '99:99').localeCompare(b.start || '99:99') || (a.createdAt || 0) - (b.createdAt || 0);
      });

    const moveTarget = date < todayKey() ? todayKey() : addDays(date, 1);

    el.innerHTML =
      pageHead(
        isToday ? '今日计划' : '计划 · ' + fmtDateCN(date, true),
        fmtDateCN(date, true) +
          ' · ' +
          (total ? '共 ' + total + ' 项，已完成 ' + done + ' 项' : '还没有安排'),
        '<div class="month-nav">' +
          '<button class="icon-btn" data-act="prev" aria-label="前一天">' + icon('chevronL') + '</button>' +
          '<input class="input" type="date" id="plan-date" value="' + esc(date) + '" style="width:140px;height:34px">' +
          '<button class="icon-btn" data-act="next" aria-label="后一天">' + icon('chevronR') + '</button>' +
          (isToday ? '' : '<button class="btn sm" data-act="today">回到今天</button>') +
          '</div>' +
          '<button class="btn primary" data-act="add">' + icon('plus') + '添加计划</button>'
      ) +

      '<section class="card">' +
      '<div class="flex-between">' +
      '<div class="summary-row">' +
      '<div class="summary-cell"><div class="k">' + total + '<small>项</small></div><div class="m">计划总数</div></div>' +
      '<div class="summary-cell"><div class="k">' + done + '<small>项</small></div><div class="m">已完成</div></div>' +
      '<div class="summary-cell"><div class="k">' + openCount + '<small>项</small></div><div class="m">未完成</div></div>' +
      '</div>' +
      '<div class="summary-right"><div class="progress-row"><div class="progress">' +
      '<div class="progress-fill" style="width:' + pct(done, total) + '%"></div></div>' +
      '<span class="progress-pct">' + pct(done, total) + '%</span></div>' +
      '<div class="tiny muted" style="margin-top:5px">' +
      (total ? '完成度 ' + pct(done, total) + '%，继续' : '添加第一项计划吧') + '</div></div>' +
      '</div></section>' +

      '<div class="flex-between mt-16">' +
      '<div class="tabs" style="margin-bottom:0">' +
      ['all', 'open', 'done']
        .map(
          (f) =>
            '<button class="tab' + (this.filter === f ? ' active' : '') + '" data-act="filter" data-filter="' + f + '">' +
            (f === 'all' ? '全部 ' + total : f === 'open' ? '未完成 ' + openCount : '已完成 ' + done) +
            '</button>'
        )
        .join('') +
      '</div>' +
      (openCount ? '<button class="btn sm" data-act="moveOpen">把未完成挪到' + (moveTarget === todayKey() ? '今天' : fmtDateCN(moveTarget)) + '</button>' : '') +
      '</div>' +

      '<section class="card mt-12">' +
      '<div class="list">' +
      (list.length
        ? list
            .map(
              (i) =>
                '<div class="item' + (i.done ? ' is-done' : '') + '">' +
                '<button class="tick' + (i.done ? ' on' : '') + '" data-act="toggle" data-id="' + i.id + '" aria-label="完成">' +
                icon('check') + '</button>' +
                '<div class="item-body"><div class="item-title">' + esc(i.title) + '</div>' +
                '<div class="item-meta">' +
                (i.start || i.end
                  ? '<span class="chip gray">' + esc(i.start || '—') + (i.end ? '–' + esc(i.end) : '') + '</span>'
                  : '') +
                chipsFor(PRIORITIES, i.priority) +
                (i.note ? '<span>' + esc(i.note) + '</span>' : '') +
                '</div></div>' +
                '<div class="item-actions">' +
                '<button class="icon-btn" data-act="edit" data-id="' + i.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="del" data-id="' + i.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
            )
            .join('')
        : emptyState(
            this.filter === 'all'
              ? '这一天还没有计划'
              : this.filter === 'open'
                ? '没有未完成的计划'
                : '还没有已完成的计划',
            this.filter === 'all' ? '点右上角「添加计划」，或先把想做的事写下来' : '切换上面的筛选看看'
          )) +
      '</div></section>';

    /* ---- 事件 ---- */
    bind(el, {
      prev() {
        Pages.plan.date = addDays(Pages.plan.date, -1);
        App.refresh();
      },
      next() {
        Pages.plan.date = addDays(Pages.plan.date, 1);
        App.refresh();
      },
      today() {
        Pages.plan.date = todayKey();
        App.refresh();
      },
      filter(node) {
        Pages.plan.filter = node.dataset.filter;
        App.refresh();
      },
      add() {
        openPlanModal(null, Pages.plan.date);
      },
      edit(node) {
        const item = findById(Store.data.plan.items, node.dataset.id);
        if (item) openPlanModal(item, item.date);
      },
      del(node) {
        const id = node.dataset.id;
        confirmAction({
          title: '删除这项计划？',
          message: '删除后无法恢复。',
          okText: '删除',
          danger: true,
          onOk() {
            removeById(Store.data.plan.items, id);
            Store.save();
            App.refresh();
          },
        });
      },
      toggle(node) {
        const item = findById(Store.data.plan.items, node.dataset.id);
        if (!item) return;
        item.done = !item.done;
        item.doneAt = item.done ? Date.now() : null;
        Store.save();
        App.refresh();
      },
      moveOpen() {
        const target = Pages.plan.date < todayKey() ? todayKey() : addDays(Pages.plan.date, 1);
        let moved = 0;
        Store.data.plan.items.forEach((i) => {
          if (i.date === Pages.plan.date && !i.done) {
            i.date = target;
            moved++;
          }
        });
        Store.save();
        toast('已把 ' + moved + ' 项挪到 ' + fmtDateCN(target));
        App.refresh();
      },
    });

    const dateInput = el.querySelector('#plan-date');
    dateInput.addEventListener('change', () => {
      if (!dateInput.value) return;
      Pages.plan.date = dateInput.value;
      Pages.plan.filter = 'all';
      App.refresh();
    });
  },
};

function openPlanModal(item, date) {
  const editing = !!item;
  openModal({
    title: editing ? '编辑计划' : '添加计划',
    subtitle: editing ? '' : '把要做的事写清楚，时间可以留空',
    size: 'small',
    body:
      fInput('title', '要做什么', { value: editing ? item.title : '', placeholder: '例如：处理 3 个待发货订单', required: true, maxlength: 80 }) +
      fRow(
        fDate('date', '日期', editing ? item.date : date || todayKey()),
        fSelect('priority', '优先级', PRIORITIES, editing ? item.priority : 'mid')
      ) +
      fRow(
        fTime('start', '开始时间（可不填）', editing ? item.start : ''),
        fTime('end', '结束时间（可不填）', editing ? item.end : '')
      ) +
      fTextarea('note', '备注', editing ? item.note : '', { rows: 2, placeholder: '补充说明，可不填' }),
    onSubmit(data) {
      const title = String(data.title || '').trim();
      if (!title) {
        toast('请填写要做的事', 'err');
        return false;
      }
      if (data.start && data.end && data.end <= data.start) {
        toast('结束时间要晚于开始时间', 'err');
        return false;
      }
      if (editing) {
        Object.assign(item, {
          title: title,
          date: data.date || item.date,
          start: data.start || '',
          end: data.end || '',
          priority: data.priority || 'mid',
          note: String(data.note || '').trim(),
        });
        toast('已更新计划');
      } else {
        Store.data.plan.items.push({
          id: uid(),
          date: data.date || todayKey(),
          title: title,
          start: data.start || '',
          end: data.end || '',
          priority: data.priority || 'mid',
          note: String(data.note || '').trim(),
          done: false,
          createdAt: Date.now(),
        });
        toast('已添加计划');
      }
      Store.save();
      App.refresh();
    },
  });
}
