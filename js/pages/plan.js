'use strict';

/* =========================================================
   今日计划 · 日程表 / 清单 / 模块拖拽
   ========================================================= */

Pages.plan = {
  date: todayKey(),
  view: 'timeline',

  render(el) {
    const d = Store.data;
    const date = this.date;
    const isToday = date === todayKey();

    const all = d.plan.items.filter((i) => i.date === date);
    const timedCount = all.filter((i) => i.start && i.end).length;
    const untimedCount = all.length - timedCount;
    const firstTimed = all
      .filter((i) => i.start)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)))[0];

    const bounds = planTimelineBounds(all);

    el.innerHTML =
      pageHead(
        isToday ? '今日计划' : '计划 · ' + fmtDateCN(date, true),
        fmtDateCN(date, true) +
          ' · ' +
          (all.length ? '共 ' + all.length + ' 项，已排时间 ' + timedCount + ' 项' : '还没有安排'),
        '<div class="month-nav">' +
          '<button class="icon-btn" data-act="prev" aria-label="前一天">' + icon('chevronL') + '</button>' +
          '<input class="input" type="date" id="plan-date" value="' + esc(date) + '" style="width:140px;height:34px">' +
          '<button class="icon-btn" data-act="next" aria-label="后一天">' + icon('chevronR') + '</button>' +
          (isToday ? '' : '<button class="btn sm" data-act="today">回到今天</button>') +
          '</div>' +
          '<div class="plan-actions">' +
          '<button class="btn primary sm" data-act="add">' + icon('plus') + '添加计划</button>' +
          '</div>'
      ) +

      '<section class="card">' +
      '<div class="flex-between">' +
      '<div class="summary-row">' +
      '<div class="summary-cell"><div class="k">' + all.length + '<small>项</small></div><div class="m">计划总数</div></div>' +
      '<div class="summary-cell"><div class="k">' + timedCount + '<small>项</small></div><div class="m">已排时间</div></div>' +
      '<div class="summary-cell"><div class="k">' + untimedCount + '<small>项</small></div><div class="m">未排时间</div></div>' +
      '</div>' +
      '<div class="summary-right"><div class="tiny muted">' +
      (firstTimed ? '最早从 ' + esc(firstTimed.start) + ' 开始' : '拖色块或长按空白时间，把一天排开') + '</div></div>' +
      '</div></section>' +

      '<div class="plan-toolbar mt-16">' +
      '<div class="view-toggle tabs">' +
      '<button class="tab' + (this.view === 'timeline' ? ' active' : '') + '" data-act="view" data-view="timeline">日程表</button>' +
      '<button class="tab' + (this.view === 'list' ? ' active' : '') + '" data-act="view" data-view="list">清单</button>' +
      '</div>' +
      (this.view === 'timeline'
        ? '<div class="tiny muted">拖动色块改时间 · 长按空白时间段添加计划 · 点色块编辑</div>'
        : '<div class="tiny muted">按时间排序，共 ' + all.length + ' 项</div>') +
      '</div>' +

      (this.view === 'timeline'
        ? this.timelineHtml(date, all, bounds, isToday)
        : this.listHtml(all)) +

      this.paletteHtml(date);

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
      view(node) {
        Pages.plan.view = node.dataset.view;
        App.refresh();
      },
      paletteTab(node) {
        Pages.plan.paletteTab = node.dataset.tab;
        App.refresh();
      },
      paletteAdd(node) {
        if (Date.now() - (Pages.plan._dragAt || 0) < 400) return;
        let payload = null;
        try {
          payload = JSON.parse(node.dataset.payload || '{}');
        } catch (err) {
          payload = null;
        }
        if (!payload || !payload.title) return;
        openPlanModal(null, Pages.plan.date, { title: payload.title });
      },
      addDietPlan() {
        openFoodModal(Pages.plan.date, 'lunch');
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
    });

    const dateInput = el.querySelector('#plan-date');
    dateInput.addEventListener('change', () => {
      if (!dateInput.value) return;
      Pages.plan.date = dateInput.value;
      App.refresh();
    });

    this.setupTimelineDrag(el, bounds);
    this.setupTimelineLongPress(el, date, bounds);
  },

  /* ---------------- 参考日程横幅 ---------------- */
  /* ---------------- 时间轴 ---------------- */
  timelineHtml(date, items, bounds, isToday) {
    const HOUR = 54;
    const dayStart = bounds.start;
    const dayEnd = bounds.end;
    const totalH = Math.round(((dayEnd - dayStart) / 60) * HOUR);
    const fixed = planFixedBlocks();

    const timed = items
      .filter((i) => {
        const s = timeToMin(i.start);
        const e = timeToMin(i.end);
        return s !== null && e !== null && e > s;
      })
      .map((i) => ({
        kind: 'plan',
        id: i.id,
        title: i.title,
        startMin: timeToMin(i.start),
        endMin: timeToMin(i.end),
        module: i.module || '',
      }));

    const moving = timed.slice().sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const lanes = [];
    moving.forEach((b) => {
      let lane = 0;
      while (lane < lanes.length && lanes[lane] > b.startMin) lane++;
      lanes[lane] = b.endMin;
      b.lane = lane;
    });
    const laneCount = Math.max(1, lanes.length);
    moving.forEach((b) => (b.laneCount = laneCount));

    /* 冲突提示：两个计划时间重叠 */
    moving.forEach((a) => {
      moving.forEach((b) => {
        if (a !== b && a.startMin < b.endMin && a.endMin > b.startMin) a.conflict = true;
      });
    });

    const hourLines = [];
    const firstHour = Math.ceil(dayStart / 60) * 60;
    for (let t = firstHour; t <= dayEnd; t += 60) {
      hourLines.push(
        '<div class="tl-hour" style="top:' + ((t - dayStart) / 60) * HOUR + 'px"><span>' + minToTime(t) + '</span></div>'
      );
    }

    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const showNow = isToday && nowMin >= dayStart && nowMin <= dayEnd;

    const block = (b) => {
      const top = ((b.startMin - dayStart) / 60) * HOUR;
      const height = Math.max(26, ((b.endMin - b.startMin) / 60) * HOUR - 2);
      const width = 100 / b.laneCount;
      const left = b.lane * width;
      const short = b.endMin - b.startMin < 40;
      if (b.kind === 'fixed') {
        return (
          '<div class="tl-block is-fixed" style="top:' + top + 'px;height:' + height + 'px" title="' +
          esc(b.title) + '">' +
          '<span class="tl-name">' + esc(b.title) + '</span></div>'
        );
      }
      const cls =
        'tl-block kind-plan' +
        (b.module ? ' m-' + b.module : '') +
        (short ? ' is-short' : '') +
        (b.conflict ? ' is-conflict' : '');
      const pos =
        b.laneCount > 1
          ? 'left:calc(' + left + '% + 3px);width:calc(' + width + '% - 6px)'
          : 'left:0;width:100%';
      return (
        '<button type="button" class="' + cls + '" draggable="true" data-kind="plan" data-block-id="' + esc(b.id) + '" ' +
        'data-act="edit" data-id="' + esc(b.id) + '" ' +
        'style="top:' + top + 'px;height:' + height + 'px;' + pos + '" ' +
        'title="' + esc(b.title) + '">' +
        '<span class="tl-time">' + minToTime(b.startMin) + '–' + minToTime(b.endMin) + '</span>' +
        '<span class="tl-name">' + esc(b.title) + '</span>' +
        '</button>'
      );
    };

    return (
      '<section class="card timeline-card mt-12">' +
      '<div class="flex-between">' +
      '<div class="card-head" style="margin:0"><h2>日程表</h2></div>' +
      '<div class="tl-legend tiny muted">' +
      '<span><i class="tl-dot plan"></i>计划</span>' +
      '<span><i class="tl-dot fixed"></i>用餐 / 固定</span>' +
      '</div></div>' +
      '<div class="timeline" style="height:' + totalH + 'px">' +
      hourLines.join('') +
      '<div class="tl-track" id="plan-timeline" style="height:' + totalH + 'px">' +
      (showNow
        ? '<div class="tl-now" style="top:' + ((nowMin - dayStart) / 60) * HOUR + 'px"><span>现在</span></div>'
        : '') +
      fixed.map((b) => block({ kind: 'fixed', title: b.label, startMin: b.startMin, endMin: b.endMin })).join('') +
      moving.map(block).join('') +
      (!moving.length && !fixed.length
        ? '<div class="tl-empty tiny muted">今天还是空的，点右上角「智能排程」生成一版参考日程</div>'
        : '') +
      '</div></div></section>'
    );
  },

  /* ---------------- 清单 ---------------- */
  listHtml(all) {
    const list = all
      .slice()
      .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99') || (a.createdAt || 0) - (b.createdAt || 0));

    return (
      '<section class="card mt-12"><div class="list">' +
      (list.length
        ? list
            .map(
              (i) =>
                '<div class="item">' +
                '<div class="item-body"><div class="item-title">' + esc(i.title) + '</div>' +
                '<div class="item-meta">' +
                (i.start || i.end
                  ? '<span class="chip gray">' + esc(i.start || '—') + (i.end ? '–' + esc(i.end) : '') + '</span>'
                  : '') +
                chipsFor(PRIORITIES, i.priority) +
                (i.source === 'auto' ? '<span class="chip violet">智能建议</span>' : '') +
                (i.note ? '<span>' + esc(i.note) + '</span>' : '') +
                '</div></div>' +
                '<div class="item-actions">' +
                '<button class="icon-btn" data-act="edit" data-id="' + i.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="del" data-id="' + i.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
            )
            .join('')
        : emptyState('这一天还没有计划', '点右上角「添加计划」，或让智能排程先给一版参考')) +
      '</div></section>'
    );
  },

  /* ---------------- 可拖拽模块 ---------------- */

  paletteHtml(date) {
    const tab = this.paletteTab || 'study';
    const groups = this.paletteGroups(date);
    const tabs = [
      ['study', '学习'],
      ['fitness', '健身'],
      ['diet', '饮食'],
      ['work', '工作'],
      ['rest', '娱乐'],
    ];
    const items = groups[tab] || [];

    return (
      '<section class="card palette-card mt-12">' +
      '<div class="card-head"><div><h2>可拖拽模块</h2>' +
      '<p class="card-sub">按住卡片拖到日程表的空白时间；点卡片也能手动加计划</p></div>' +
      '<div class="tabs palette-tabs">' +
      tabs
        .map(
          (t) =>
            '<button class="tab' + (tab === t[0] ? ' active' : '') + '" data-act="paletteTab" data-tab="' + t[0] + '">' +
            t[1] + '<span class="palette-count">' + (groups[t[0]] || []).length + '</span></button>'
        )
        .join('') +
      '</div></div>' +
      '<div class="palette-grid">' +
      (items.length
        ? items.map((item) => this.paletteItem(item)).join('')
        : '<div class="palette-empty tiny muted">' + esc(this.paletteEmptyText(tab)) + '</div>') +
      (tab === 'diet'
        ? '<button type="button" class="palette-item palette-add" data-act="addDietPlan">' +
          '<span class="palette-ico">' + icon('plus') + '</span>' +
          '<span class="palette-body"><b>添加饮食</b><span>把食物排进当天搭配</span></span></button>'
        : '') +
      '</div></section>'
    );
  },

  paletteItem(item) {
    const mod = findById(MODULES, item.module);
    const color = mod ? mod.color : 'var(--accent)';
    const soft = mod ? mod.soft : 'var(--accent-soft)';
    return (
      '<div class="palette-item" draggable="true" data-act="paletteAdd" ' +
      'data-payload="' + esc(JSON.stringify(item.payload)) + '" title="拖到日程表，或点一下手动添加">' +
      '<span class="palette-ico" style="background:' + soft + ';color:' + color + '">' + icon(item.icon || (mod ? mod.icon : 'plus')) + '</span>' +
      '<span class="palette-body"><b>' + esc(item.title) + '</b><span>' + esc(item.meta || '') + '</span></span>' +
      '<span class="drag-grip" aria-hidden="true">' + icon('grip') + '</span>' +
      '</div>'
    );
  },

  paletteEmptyText(tab) {
    if (tab === 'study') return '还没有学习项目，去学习计划加一个';
    if (tab === 'fitness') return '还没有训练模板，去健身页新建推日 / 拉日';
    if (tab === 'diet') return '还没有饮食搭配，可以点下面的「添加饮食」';
    if (tab === 'work') return '没有待发货、库存预警或选品要做';
    return '还没有设备，去游戏娱乐添加';
  },

  paletteGroups(date) {
    const d = Store.data;
    const t = date;
    const groups = { study: [], fitness: [], diet: [], work: [], rest: [] };

    (d.study.goals || []).forEach((g) => {
      const days = g.deadline ? diffDays(t, g.deadline) : null;
      groups.study.push({
        title: g.title,
        meta:
          g.category +
          (days === null ? ' · 没有截止日' : days < 0 ? ' · 已过期' : ' · ' + days + ' 天后截止'),
        icon: 'book',
        module: 'study',
        payload: {
          title: '学习 · ' + g.title,
          duration: 50,
          module: 'study',
          priority: days !== null && days <= 3 ? 'high' : 'mid',
        },
      });
    });

    (d.fitness.routines || []).forEach((r) => {
      const exs = r.exercises || [];
      const parts = fitnessParts(exs);
      groups.fitness.push({
        title: r.name,
        meta: (parts.length ? parts.join(' / ') : r.note || '训练') + (exs.length ? ' · ' + exs.length + ' 个动作' : ''),
        icon: 'dumbbell',
        module: 'fitness',
        payload: { title: '训练 · ' + r.name, duration: 60, module: 'fitness', priority: 'mid' },
      });
    });

    MEALS.forEach((meal) => {
      const items = d.diet.meals.filter((m) => m.date === date && m.type === meal.value);
      groups.diet.push({
        title: meal.label,
        meta: items.length
          ? items.map((m) => m.name).join('、') + ' · ' + sumBy(items, (m) => Number(m.calories) || 0) + ' kcal'
          : '还没排搭配',
        icon: 'bowl',
        module: 'diet',
        payload: { title: meal.label, duration: 30, module: 'diet', priority: 'mid' },
      });
    });

    const pending = (d.work.orders || []).filter((o) => o.status === 'pending');
    if (pending.length) {
      groups.work.push({
        title: '处理 ' + pending.length + ' 个待发货订单',
        meta: '跨境工作 · 待发货',
        icon: 'briefcase',
        module: 'work',
        payload: { title: '处理 ' + pending.length + ' 个待发货订单', duration: 45, module: 'work', priority: 'high' },
      });
    }
    const low = (d.work.stock || []).filter((s) => Number(s.qty) <= Number(s.safe));
    if (low.length) {
      groups.work.push({
        title: '补货：' + low.slice(0, 2).map((s) => s.name).join('、'),
        meta: low.length + ' 项库存低于安全线',
        icon: 'briefcase',
        module: 'work',
        payload: { title: '补货：' + low.slice(0, 2).map((s) => s.name).join('、'), duration: 45, module: 'work', priority: 'mid' },
      });
    }
    const research = (d.work.products || []).filter((p) => p.stage === 'research' || p.stage === 'testing');
    if (research.length) {
      groups.work.push({
        title: '选品：' + research[0].name,
        meta: research[0].stage === 'testing' ? '测试阶段' : '调研阶段',
        icon: 'briefcase',
        module: 'work',
        payload: { title: '选品：' + research[0].name, duration: 45, module: 'work', priority: 'mid' },
      });
    }

    if ((d.games.devices || []).length) {
      groups.rest.push({
        title: '娱乐放松',
        meta: '设备 ' + d.games.devices.length + ' 件 · 留一段休息时间',
        icon: 'gamepad',
        module: 'rest',
        payload: { title: '娱乐放松', duration: 60, module: 'rest', priority: 'low' },
      });
    }

    return groups;
  },

  /* ---------------- 拖动时间轴改时间 ---------------- */
  setupTimelineDrag(el, bounds) {
    const track = el.querySelector('#plan-timeline');
    if (!track) return;

    el.querySelectorAll('.tl-block[draggable="true"]').forEach((node) => {
      node.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', node.dataset.kind + '|' + node.dataset.blockId);
        e.dataTransfer.effectAllowed = 'move';
        node.classList.add('dragging');
      });
      node.addEventListener('dragend', () => node.classList.remove('dragging'));
    });

    el.querySelectorAll('.palette-item[draggable="true"]').forEach((node) => {
      node.addEventListener('dragstart', (e) => {
        Pages.plan._dragAt = Date.now();
        node.classList.add('dragging');
        if (!e.dataTransfer) return;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-xya-module', node.dataset.payload || '{}');
        e.dataTransfer.setData('text/plain', 'module');
      });
      node.addEventListener('dragend', () => node.classList.remove('dragging'));
    });

    track.addEventListener('dragover', (e) => e.preventDefault());
    track.addEventListener('drop', (e) => {
      e.preventDefault();
      let modulePayload = null;
      try {
        const mime = e.dataTransfer.getData('application/x-xya-module');
        if (mime) modulePayload = JSON.parse(mime);
      } catch (err) {
        modulePayload = null;
      }
      const raw = e.dataTransfer.getData('text/plain') || '';
      const parts = raw.split('|');
      if (parts.length !== 2 && !modulePayload) return;
      const kind = parts[0];
      const id = parts[1];
      const rect = track.getBoundingClientRect();
      const offset = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const span = bounds.end - bounds.start;
      let startMin = bounds.start + Math.round(((offset / rect.height) * span) / 15) * 15;

      if (modulePayload) {
        addPalettePlan(Pages.plan.date, modulePayload, startMin, bounds);
        return;
      }

      if (kind === 'plan') {
        const item = findById(Store.data.plan.items, id);
        if (!item) return;
        const s = timeToMin(item.start);
        const en = timeToMin(item.end);
        if (s === null || en === null) return;
        const dur = en - s;
        startMin = Math.max(bounds.start, Math.min(startMin, bounds.end - dur));
        item.start = minToTime(startMin);
        item.end = minToTime(startMin + dur);
        Store.save();
        toast('已移到 ' + item.start + '–' + item.end);
        App.refresh();
        return;
      }

    });
  },

  /* ---------------- 长按空白时间段添加计划 ---------------- */
  setupTimelineLongPress(el, date, bounds) {
    const track = el.querySelector('#plan-timeline');
    if (!track) return;
    let timer = null;
    let startY = 0;
    let startX = 0;
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const minuteAt = (clientY) => {
      const rect = track.getBoundingClientRect();
      const span = bounds.end - bounds.start;
      const offset = Math.max(0, Math.min(rect.height, clientY - rect.top));
      return bounds.start + Math.round(((offset / rect.height) * span) / 15) * 15;
    };

    track.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.tl-block')) return;
      startY = e.clientY;
      startX = e.clientX;
      clear();
      timer = setTimeout(() => {
        timer = null;
        const start = Math.max(bounds.start, Math.min(minuteAt(startY), bounds.end - 30));
        const end = Math.min(bounds.end, start + 60);
        openPlanModal(null, date, { start: minToTime(start), end: minToTime(end) });
      }, 550);
    });
    track.addEventListener('pointermove', (e) => {
      if (!timer) return;
      if (Math.abs(e.clientY - startY) > 8 || Math.abs(e.clientX - startX) > 8) clear();
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => track.addEventListener(ev, clear));
  },
};

/* 把底部模块拖进日程表 */
function addPalettePlan(date, payload, startMin, bounds) {
  const duration = Math.max(15, Math.min(180, Number(payload.duration) || 30));
  const start = Math.max(bounds.start, Math.min(startMin, bounds.end - duration));
  const end = Math.min(bounds.end, start + duration);
  const dup = Store.data.plan.items.some(
    (i) => i.date === date && planTitleKey(i.title) === planTitleKey(payload.title)
  );
  if (dup) {
    toast('今天已经有「' + payload.title + '」');
    return false;
  }
  Store.data.plan.items.push({
    id: uid(),
    date: date,
    title: payload.title,
    start: minToTime(start),
    end: minToTime(end),
    priority: payload.priority || 'mid',
    note: '',
    module: payload.module || '',
    source: 'module',
    createdAt: Date.now(),
  });
  Store.save();
  toast('已加入「' + payload.title + '」 ' + minToTime(start) + '–' + minToTime(end));
  App.refresh();
  return true;
}

/* 时间轴范围：默认 07:00–23:30，手动排到范围外的计划也能显示 */
function planTimelineBounds(items) {
  let start = 7 * 60;
  let end = 23 * 60 + 30;
  (items || []).forEach((item) => {
    const s = timeToMin(item.start);
    const e = timeToMin(item.end);
    if (s === null || e === null || e <= s) return;
    start = Math.min(start, s);
    end = Math.max(end, e);
  });
  return { start: Math.max(0, start), end: Math.min(24 * 60 - 1, end) };
}

function planFixedBlocks() {
  return [
    { kind: 'fixed', title: '午餐', startMin: 12 * 60, endMin: 13 * 60 },
    { kind: 'fixed', title: '晚餐', startMin: 18 * 60, endMin: 19 * 60 },
  ];
}

/* 比较标题时忽略数字，避免「处理 3 个订单」和「处理 2 个订单」被当成两件事 */
function planTitleKey(text) {
  return String(text || '').replace(/\s+/g, '').replace(/[0-9]+/g, '').toLowerCase();
}

/* =========================================================
   计划新增 / 编辑
   ========================================================= */

function openPlanModal(item, date, preset) {
  const editing = !!item;
  const p = preset || {};
  openModal({
    title: editing ? '编辑计划' : '添加计划',
    subtitle: editing ? '' : p.start ? '已按长按的时间填好，改完保存即可' : '把要做的事写清楚，时间可以留空',
    size: 'small',
    body:
      fInput('title', '要做什么', { value: editing ? item.title : p.title || '', placeholder: '例如：处理 3 个待发货订单', required: true, maxlength: 80 }) +
      fRow(
        fDate('date', '日期', editing ? item.date : date || todayKey()),
        fSelect('priority', '优先级', PRIORITIES, editing ? item.priority : p.priority || 'mid')
      ) +
      fRow(
        fTime('start', '开始时间（可不填）', editing ? item.start : p.start || ''),
        fTime('end', '结束时间（可不填）', editing ? item.end : p.end || '')
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
          createdAt: Date.now(),
        });
        toast('已添加计划');
      }
      Store.save();
      App.refresh();
    },
  });
}
