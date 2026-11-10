'use strict';

/* =========================================================
   今日计划 · 日程表 / 清单 / 智能排程
   ========================================================= */

Pages.plan = {
  date: todayKey(),
  view: 'timeline',

  render(el) {
    const d = Store.data;
    const date = this.date;
    const isToday = date === todayKey();
    const prefs = schedulePrefs();

    if (isToday && prefs.enabled !== false && !(d.plan.drafts || {})[date]) Scheduler.ensure(date);
    const draft = (d.plan.drafts || {})[date] || null;
    const draftOpen = draft ? draftOpenItems(draft) : [];

    const all = d.plan.items.filter((i) => i.date === date);
    const timedCount = all.filter((i) => i.start && i.end).length;
    const untimedCount = all.length - timedCount;
    const firstTimed = all
      .filter((i) => i.start)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)))[0];

    const bounds = planDayBounds(all, draft, scheduleBounds(prefs));

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
          '<button class="btn" data-act="smart">' + icon('sparkle') + '智能排程</button>' +
          '<button class="icon-btn" data-act="prefs" aria-label="排程偏好" title="排程偏好">' + icon('sliders') + '</button>' +
          '<button class="btn primary" data-act="add">' + icon('plus') + '添加计划</button>'
      ) +

      this.draftBanner(draft, draftOpen) +

      '<section class="card">' +
      '<div class="flex-between">' +
      '<div class="summary-row">' +
      '<div class="summary-cell"><div class="k">' + all.length + '<small>项</small></div><div class="m">计划总数</div></div>' +
      '<div class="summary-cell"><div class="k">' + timedCount + '<small>项</small></div><div class="m">已排时间</div></div>' +
      '<div class="summary-cell"><div class="k">' + untimedCount + '<small>项</small></div><div class="m">未排时间</div></div>' +
      '</div>' +
      '<div class="summary-right"><div class="tiny muted">' +
      (firstTimed ? '最早从 ' + esc(firstTimed.start) + ' 开始' : '用时间轴或智能排程，把一天排开') + '</div></div>' +
      '</div></section>' +

      '<div class="plan-toolbar mt-16">' +
      '<div class="view-toggle tabs">' +
      '<button class="tab' + (this.view === 'timeline' ? ' active' : '') + '" data-act="view" data-view="timeline">日程表</button>' +
      '<button class="tab' + (this.view === 'list' ? ' active' : '') + '" data-act="view" data-view="list">清单</button>' +
      '</div>' +
      (this.view === 'timeline'
        ? '<div class="tiny muted">拖动色块可以改时间；点色块编辑</div>'
        : '<div class="tiny muted">按时间排序，共 ' + all.length + ' 项</div>') +
      '</div>' +

      (this.view === 'timeline'
        ? this.timelineHtml(date, all, draft, bounds, isToday)
        : this.listHtml(all)) +

      (this.view === 'timeline' && all.some((i) => !i.start || !i.end) ? this.untimedHtml(all) : '') +

      (draft && draft.status !== 'discarded' && draft.items.some((i) => !i.ignored) ? this.draftRowsHtml(draft) : '');

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
      smart() {
        const drafts = Store.data.plan.drafts || {};
        const current = drafts[Pages.plan.date];
        if (!current || current.status === 'discarded') {
          Scheduler.regenerate(Pages.plan.date);
          toast('已生成今日参考日程');
        } else if (current.status === 'applied') {
          toast('今天的建议已经采用，点「重新生成」可以换一版');
        } else {
          toast('参考日程在页面顶部，可逐条采用或调整');
        }
        App.refresh();
      },
      prefs() {
        openSchedulePrefs();
      },
      adoptAll() {
        if (!draft) return;
        const res = adoptDraftAll(date, draft);
        Store.save();
        App.refresh();
        if (!res.count && res.skipped) toast('这些建议都和已有安排冲突，试试重新生成', 'err');
        else if (res.skipped) toast('已加入 ' + res.count + ' 项，' + res.skipped + ' 项冲突已跳过');
        else toast('已加入 ' + res.count + ' 项到今日计划');
      },
      regen() {
        Scheduler.regenerate(date);
        toast('已重新生成参考日程');
        App.refresh();
      },
      discard() {
        if (!draft) return;
        draft.status = 'discarded';
        Store.save();
        toast('已丢弃参考日程，需要时点「智能排程」再生成');
        App.refresh();
      },
      adoptOne(node) {
        if (!draft) return;
        const item = draft.items.filter((i) => i.id === node.dataset.id)[0];
        if (!item) return;
        if (adoptDraftItem(date, draft, item)) {
          finalizeDraftStatus(draft);
          Store.save();
          toast('已加入「' + item.title + '」');
        } else {
          finalizeDraftStatus(draft);
          Store.save();
          toast(item.skipReason || '加入失败', 'err');
        }
        App.refresh();
      },
      editDraft(node) {
        if (!draft) return;
        const item = draft.items.filter((i) => i.id === node.dataset.id)[0];
        if (item) openDraftItemModal(date, draft, item);
      },
      ignoreOne(node) {
        if (!draft) return;
        const item = draft.items.filter((i) => i.id === node.dataset.id)[0];
        if (!item) return;
        item.ignored = true;
        finalizeDraftStatus(draft);
        Store.save();
        App.refresh();
      },
      undoOne(node) {
        if (!draft) return;
        const item = draft.items.filter((i) => i.id === node.dataset.id)[0];
        if (!item) return;
        undoDraftItem(draft, item);
        Store.save();
        App.refresh();
      },
      undoAll() {
        if (!draft) return;
        undoDraftAll(draft);
        Store.save();
        toast('已撤销，参考建议都回来了');
        App.refresh();
      },
    });

    const dateInput = el.querySelector('#plan-date');
    dateInput.addEventListener('change', () => {
      if (!dateInput.value) return;
      Pages.plan.date = dateInput.value;
      App.refresh();
    });

    this.setupTimelineDrag(el, draft, bounds);
  },

  /* ---------------- 参考日程横幅 ---------------- */
  draftBanner(draft, open) {
    if (!draft) return '';
    if (draft.status === 'applied') {
      const n = draft.items.filter((i) => i.adopted).length;
      return (
        '<section class="card smart-card is-applied">' +
        '<div class="smart-main"><div class="smart-title">' + icon('check') + '已采用 ' + n + ' 项参考日程</div>' +
        '<div class="smart-sub">已经写进今日计划，可以继续拖动色块或手动修改</div></div>' +
        '<div class="smart-actions">' +
        '<button class="btn sm" data-act="undoAll">撤销全部</button>' +
        '<button class="btn ghost sm" data-act="regen">重新生成</button>' +
        '</div></section>'
      );
    }
    if (draft.status !== 'ready') return '';

    const adopted = draft.items.filter((i) => i.adopted).length;
    return (
      '<section class="card smart-card">' +
      '<div class="smart-main">' +
      '<div class="smart-title">' + icon('sparkle') + '今日参考日程' +
      '<span class="chip ' + (open.length ? 'violet' : 'gray') + '">' +
      (open.length ? open.length + ' 项待定' : '暂无待定建议') + '</span>' +
      (adopted ? '<span class="chip green">已加入 ' + adopted + ' 项</span>' : '') +
      '</div>' +
      '<div class="smart-sub">' + esc(draft.summary) + '</div>' +
      '</div>' +
      '<div class="smart-actions">' +
      (open.length ? '<button class="btn primary sm" data-act="adoptAll">采用全部</button>' : '') +
      '<button class="btn sm" data-act="regen">重新生成</button>' +
      '<button class="btn ghost sm" data-act="discard">丢弃</button>' +
      '</div></section>'
    );
  },

  /* ---------------- 时间轴 ---------------- */
  timelineHtml(date, items, draft, bounds, isToday) {
    const HOUR = 54;
    const dayStart = bounds.start;
    const dayEnd = bounds.end;
    const totalH = Math.round(((dayEnd - dayStart) / 60) * HOUR);
    const fixed = scheduleFixedBlocks(date, schedulePrefs());

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
        module: '',
      }));

    const ghost = draft && draft.status !== 'discarded'
      ? draft.items
          .filter((i) => !i.adopted && !i.ignored && !i.skipped && timeToMin(i.start) !== null && timeToMin(i.end) !== null)
          .map((i) => ({
            kind: 'draft',
            id: i.id,
            title: i.title,
            startMin: timeToMin(i.start),
            endMin: timeToMin(i.end),
            module: i.module || '',
            reason: i.reason || '',
          }))
      : [];

    const moving = timed.concat(ghost).sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const lanes = [];
    moving.forEach((b) => {
      let lane = 0;
      while (lane < lanes.length && lanes[lane] > b.startMin) lane++;
      lanes[lane] = b.endMin;
      b.lane = lane;
    });
    const laneCount = Math.max(1, lanes.length);
    moving.forEach((b) => (b.laneCount = laneCount));

    /* 冲突提示：两个计划/建议时间重叠 */
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
      const isDraft = b.kind === 'draft';
      const cls =
        'tl-block ' + (isDraft ? 'is-draft' : 'kind-plan') +
        (b.module ? ' m-' + b.module : '') +
        (short ? ' is-short' : '') +
        (b.conflict ? ' is-conflict' : '');
      const pos =
        b.laneCount > 1
          ? 'left:calc(' + left + '% + 3px);width:calc(' + width + '% - 6px)'
          : 'left:0;width:100%';
      return (
        '<button type="button" class="' + cls + '" draggable="true" data-kind="' + b.kind + '" data-block-id="' + esc(b.id) + '" ' +
        'data-act="' + (isDraft ? 'editDraft' : 'edit') + '" data-id="' + esc(b.id) + '" ' +
        'style="top:' + top + 'px;height:' + height + 'px;' + pos + '" ' +
        'title="' + esc((isDraft ? '建议 · ' : '') + (b.reason || b.title)) + '">' +
        (isDraft ? '<span class="tl-badge">建议</span>' : '') +
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
      '<span><i class="tl-dot draft"></i>建议</span>' +
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

  /* ---------------- 没排时间的计划 ---------------- */
  untimedHtml(all) {
    const list = all.filter((i) => !i.start || !i.end);
    return (
      '<section class="card mt-12">' +
      '<div class="card-head"><h2>未排时间</h2><span class="tiny muted">' + list.length + ' 项</span></div>' +
      '<div class="list">' +
      list
        .map(
          (i) =>
            '<div class="item">' +
            '<div class="item-body"><div class="item-title">' + esc(i.title) + '</div>' +
            '<div class="item-meta">' + chipsFor(PRIORITIES, i.priority) + '</div></div>' +
            '<div class="item-actions">' +
            '<button class="icon-btn" data-act="edit" data-id="' + i.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
            '</div></div>'
        )
        .join('') +
      '</div></section>'
    );
  },

  /* ---------------- 参考日程逐条列表 ---------------- */
  draftRowsHtml(draft) {
    const rows = draft.items
      .filter((i) => !i.ignored)
      .map((i) => {
        const time = minToTime(timeToMin(i.start)) + '–' + minToTime(timeToMin(i.end));
        if (i.adopted) {
          return (
            '<div class="draft-row is-adopted">' +
            '<span class="draft-time">' + time + '</span>' +
            '<div class="draft-body"><div class="draft-name">' + esc(i.title) + '</div>' +
            '<div class="draft-reason">' + esc(i.reason) + '</div></div>' +
            '<span class="chip green">已加入</span>' +
            '<div class="draft-actions"><button class="btn ghost sm" data-act="undoOne" data-id="' + i.id + '">撤销</button></div>' +
            '</div>'
          );
        }
        if (i.skipped) {
          return (
            '<div class="draft-row is-skipped">' +
            '<span class="draft-time">' + time + '</span>' +
            '<div class="draft-body"><div class="draft-name">' + esc(i.title) + '</div>' +
            '<div class="draft-reason">' + esc(i.skipReason || '与已有安排冲突') + '</div></div>' +
            '<div class="draft-actions"><button class="btn ghost sm" data-act="ignoreOne" data-id="' + i.id + '">忽略</button></div>' +
            '</div>'
          );
        }
        return (
          '<div class="draft-row">' +
          '<span class="draft-time">' + time + '</span>' +
          '<div class="draft-body"><div class="draft-name">' + esc(i.title) + '</div>' +
          '<div class="draft-reason">' + esc(i.reason) + '</div></div>' +
          '<div class="draft-actions">' +
          '<button class="btn sm" data-act="adoptOne" data-id="' + i.id + '">采用</button>' +
          '<button class="btn ghost sm" data-act="editDraft" data-id="' + i.id + '">调整</button>' +
          '<button class="btn ghost sm" data-act="ignoreOne" data-id="' + i.id + '">忽略</button>' +
          '</div></div>'
        );
      })
      .join('');

    return (
      '<section class="card mt-12 draft-card">' +
      '<div class="card-head"><h2>参考日程</h2><span class="tiny muted">逐条采用，或点「调整」改时间</span></div>' +
      '<div class="draft-list">' + rows + '</div></section>'
    );
  },

  /* ---------------- 拖动时间轴改时间 ---------------- */
  setupTimelineDrag(el, draft, bounds) {
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

    track.addEventListener('dragover', (e) => e.preventDefault());
    track.addEventListener('drop', (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('text/plain') || '';
      const parts = raw.split('|');
      if (parts.length !== 2) return;
      const kind = parts[0];
      const id = parts[1];
      const rect = track.getBoundingClientRect();
      const offset = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const span = bounds.end - bounds.start;
      let startMin = bounds.start + Math.round(((offset / rect.height) * span) / 15) * 15;

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

      if (kind === 'draft' && draft && draft.status === 'ready') {
        const item = draft.items.filter((i) => i.id === id)[0];
        if (!item) return;
        const s = timeToMin(item.start);
        const en = timeToMin(item.end);
        if (s === null || en === null) return;
        const dur = en - s;
        startMin = Math.max(bounds.start, Math.min(startMin, bounds.end - dur));
        item.start = minToTime(startMin);
        item.end = minToTime(startMin + dur);
        Store.save();
        toast('建议时间改成 ' + item.start + '–' + item.end);
        App.refresh();
      }
    });
  },
};

/* =========================================================
   智能排程：采用 / 撤销
   ========================================================= */

function draftOpenItems(draft) {
  return draft.items.filter((i) => !i.adopted && !i.ignored && !i.skipped);
}

/* 时间轴范围：作息时间兜底，但手动排到作息外的计划也要能显示出来 */
function planDayBounds(items, draft, base) {
  let start = base.start;
  let end = base.end;
  const consider = (item) => {
    const s = timeToMin(item.start);
    const e = timeToMin(item.end);
    if (s === null || e === null || e <= s) return;
    start = Math.min(start, s);
    end = Math.max(end, e);
  };
  items.forEach(consider);
  if (draft && draft.status !== 'discarded') draft.items.forEach((i) => { if (!i.ignored) consider(i); });
  return { start: Math.max(0, start), end: Math.min(24 * 60 - 1, end) };
}

function adoptDraftItem(date, draft, item) {
  if (item.adopted) return true;
  const conflict = scheduleConflictText(date, item.start, item.end);
  if (conflict) {
    item.skipped = true;
    item.skipReason = '与 ' + conflict + ' 冲突';
    return false;
  }
  const dup = Store.data.plan.items.some(
    (i) => i.date === date && scheduleNorm(i.title) === scheduleNorm(item.title)
  );
  if (dup) {
    item.skipped = true;
    item.skipReason = '今天已经有同样的安排';
    return false;
  }
  const planItem = {
    id: uid(),
    date: date,
    title: item.title,
    start: item.start,
    end: item.end,
    priority: item.priority || 'mid',
    note: '',
    createdAt: Date.now(),
    source: 'auto',
    reason: item.reason || '',
    batchId: draft.batchId,
  };
  Store.data.plan.items.push(planItem);
  item.adopted = true;
  item.planId = planItem.id;
  return true;
}

function adoptDraftAll(date, draft) {
  let count = 0;
  let skipped = 0;
  draft.items.forEach((item) => {
    if (item.adopted || item.ignored) return;
    if (item.skipped) {
      skipped++;
      return;
    }
    if (adoptDraftItem(date, draft, item)) count++;
    else skipped++;
  });
  finalizeDraftStatus(draft);
  return { count: count, skipped: skipped };
}

function undoDraftItem(draft, item) {
  if (!item.adopted) return;
  removeById(Store.data.plan.items, item.planId);
  item.adopted = false;
  delete item.planId;
  delete item.skipped;
  delete item.skipReason;
  if (draft.status === 'applied') draft.status = 'ready';
}

function undoDraftAll(draft) {
  draft.items.forEach((item) => {
    if (item.adopted) undoDraftItem(draft, item);
  });
  draft.status = 'ready';
}

function finalizeDraftStatus(draft) {
  const adopted = draft.items.filter((i) => i.adopted).length;
  const open = draftOpenItems(draft).length;
  if (adopted && !open) draft.status = 'applied';
  else if (!adopted && !open) draft.status = 'discarded';
  else draft.status = 'ready';
}

/* =========================================================
   计划新增 / 编辑
   ========================================================= */

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
          createdAt: Date.now(),
        });
        toast('已添加计划');
      }
      Store.save();
      App.refresh();
    },
  });
}

/* =========================================================
   调整参考建议
   ========================================================= */

function openDraftItemModal(date, draft, item) {
  openModal({
    title: '调整参考建议',
    subtitle: '改完只是更新建议；选「保存并加入计划」才会写进今日计划',
    size: 'small',
    body:
      fInput('title', '做什么', { value: item.title, required: true, maxlength: 80 }) +
      fRow(fTime('start', '开始时间', item.start), fTime('end', '结束时间', item.end)) +
      fRow(
        fSelect('priority', '优先级', PRIORITIES, item.priority || 'mid'),
        fSelect(
          'mode',
          '保存后',
          [
            { value: 'update', label: '只更新建议' },
            { value: 'adopt', label: '保存并加入计划' },
          ],
          'update'
        )
      ),
    onSubmit(data) {
      const title = String(data.title || '').trim();
      if (!title) {
        toast('请填写要做的事', 'err');
        return false;
      }
      if (!data.start || !data.end || data.end <= data.start) {
        toast('结束时间要晚于开始时间', 'err');
        return false;
      }
      item.title = title;
      item.start = data.start;
      item.end = data.end;
      item.priority = data.priority || 'mid';
      if (data.mode === 'adopt') {
        if (!adoptDraftItem(date, draft, item)) {
          toast(item.skipReason || '加入失败，换个时间试试', 'err');
          return false;
        }
        finalizeDraftStatus(draft);
        toast('已加入「' + item.title + '」');
      }
      Store.save();
      App.refresh();
    },
  });
}

/* =========================================================
   排程偏好
   ========================================================= */

function scheduleFixedRowHtml(block) {
  const b = block || {};
  return (
    '<div class="fixed-row" data-fixed-row>' +
    '<input class="input" type="time" name="fixedStart" value="' + esc(b.start || '') + '" aria-label="开始时间">' +
    '<input class="input" type="time" name="fixedEnd" value="' + esc(b.end || '') + '" aria-label="结束时间">' +
    '<input class="input" type="text" name="fixedLabel" value="' + esc(b.label || '') + '" placeholder="例如：上班 / 健身课" maxlength="20">' +
    '<button type="button" class="icon-btn danger" data-remove-fixed aria-label="删除">' + icon('x') + '</button>' +
    '</div>'
  );
}

function openSchedulePrefs() {
  const p = schedulePrefs();
  const fixed = (p.fixed || []).map(scheduleFixedRowHtml).join('');

  openModal({
    title: '排程偏好',
    subtitle: '智能排程会按这里的作息、用餐和固定安排来排；保存后点「重新生成」生效',
    body:
      fRow(fTime('wake', '起床时间', p.wake), fTime('sleep', '睡觉时间', p.sleep)) +
      fRow(fTime('lunchStart', '午餐开始', p.lunchStart), fTime('lunchEnd', '午餐结束', p.lunchEnd)) +
      fRow(fTime('dinnerStart', '晚餐开始', p.dinnerStart), fTime('dinnerEnd', '晚餐结束', p.dinnerEnd)) +
      fRow3(
        fNumber('focusMin', '专注时长（分钟）', { value: p.focusMin, min: 15, max: 180, step: 5 }),
        fNumber('breakMin', '间隔休息（分钟）', { value: p.breakMin, min: 0, max: 30, step: 5 }),
        fNumber('gymPerWeek', '每周训练目标', { value: p.gymPerWeek, min: 0, max: 14 })
      ) +
      fNumber('entertainmentMin', '娱乐时长上限（分钟）', { value: p.entertainmentMin, min: 0, max: 300, step: 10 }) +
      '<div class="field"><span class="field-label">固定安排（每天生效）</span>' +
      '<div class="fixed-rows" id="fixed-rows">' + fixed + '</div>' +
      '<button type="button" class="btn sm mt-8" data-add-fixed>+ 添加固定安排</button>' +
      '<span class="field-hint">比如上班、通勤、固定课程；这些时段不会被排进任务</span>' +
      '</div>',
    onSubmit(data, form) {
      if (data.sleep <= data.wake) {
        toast('睡觉时间要晚于起床时间', 'err');
        return false;
      }
      if (data.lunchEnd <= data.lunchStart) {
        toast('午餐结束要晚于开始', 'err');
        return false;
      }
      if (data.dinnerEnd <= data.dinnerStart) {
        toast('晚餐结束要晚于开始', 'err');
        return false;
      }
      const focus = Number(data.focusMin);
      if (!(focus >= 15 && focus <= 180)) {
        toast('专注时长请填 15–180 分钟', 'err');
        return false;
      }

      const rows = Array.prototype.slice.call(form.querySelectorAll('[data-fixed-row]'));
      const blocks = [];
      for (const row of rows) {
        const start = row.querySelector('[name="fixedStart"]').value;
        const end = row.querySelector('[name="fixedEnd"]').value;
        const label = row.querySelector('[name="fixedLabel"]').value.trim();
        if (!start && !end) continue;
        if (!start || !end || end <= start) {
          toast('固定安排的时间不完整，或结束早于开始', 'err');
          return false;
        }
        blocks.push({ start: start, end: end, label: label || '固定安排' });
      }

      const s = Store.data.settings.schedule || (Store.data.settings.schedule = scheduleDefaults());
      Object.assign(s, {
        wake: data.wake,
        sleep: data.sleep,
        lunchStart: data.lunchStart,
        lunchEnd: data.lunchEnd,
        dinnerStart: data.dinnerStart,
        dinnerEnd: data.dinnerEnd,
        focusMin: focus,
        breakMin: Math.max(0, Math.min(30, Number(data.breakMin) || 0)),
        gymPerWeek: Math.max(0, Math.min(14, Number(data.gymPerWeek) || 0)),
        entertainmentMin: Math.max(0, Math.min(300, Number(data.entertainmentMin) || 0)),
        fixed: blocks,
      });
      Store.save();
      toast('排程偏好已保存，点「重新生成」看看新安排');
      App.refresh();
    },
    onMount(form) {
      form.querySelector('[data-add-fixed]').addEventListener('click', () => {
        const rows = form.querySelector('#fixed-rows');
        rows.insertAdjacentHTML('beforeend', scheduleFixedRowHtml(null));
      });
      form.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove-fixed]');
        if (!btn) return;
        e.preventDefault();
        const row = btn.closest('[data-fixed-row]');
        if (row) row.remove();
      });
    },
  });
}
