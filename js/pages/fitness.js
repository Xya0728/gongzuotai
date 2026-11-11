'use strict';

/* =========================================================
   健身计划 · 一周训练安排
   ========================================================= */

const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function fitnessWeekDates(weekStart) {
  return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
}

function fitnessRoutineOf(plan) {
  return findById(Store.data.fitness.routines, plan.routineId);
}

function fitnessPlanExercises(plan) {
  const routine = fitnessRoutineOf(plan);
  if (routine && routine.exercises && routine.exercises.length) return routine.exercises;
  return plan.exercises || [];
}

function fitnessPlanName(plan) {
  const routine = fitnessRoutineOf(plan);
  return (routine && routine.name) || plan.name || '训练';
}

function fitnessPlanNote(plan) {
  const routine = fitnessRoutineOf(plan);
  return (routine && routine.note) || plan.note || '';
}

function fitnessParts(exercises) {
  const parts = [];
  (exercises || []).forEach((ex) => {
    if (ex.part && parts.indexOf(ex.part) === -1) parts.push(ex.part);
  });
  return parts;
}

function fitnessWeekLabel(weekStart) {
  return fmtShortDate(weekStart) + ' – ' + fmtShortDate(addDays(weekStart, 6));
}

function fitnessDayCell(date, plans, today, selected) {
  const isToday = date === today;
  return (
    '<div class="week-day' + (isToday ? ' today' : '') + (date === selected ? ' selected' : '') +
    (plans.length ? ' has' : '') + '" data-act="pickDay" data-date="' + date + '" role="button" tabindex="0">' +
    '<div class="wd-head"><b>' + WEEK_LABELS[(parseDate(date).getDay() + 6) % 7] + '</b>' +
    '<span' + (isToday ? ' class="wd-today"' : '') + '>' + fmtShortDate(date) + '</span></div>' +
    '<div class="wd-body">' +
    (plans.length
      ? plans.map((plan) => fitnessWeekPlanCard(plan)).join('')
      : '<span class="wd-empty">把训练模板拖到这里</span>') +
    '</div></div>'
  );
}

function fitnessWeekPlanCard(plan) {
  if (plan.kind === 'rest') {
    return (
      '<div class="wd-plan is-rest">' +
      '<div class="wd-plan-top"><b>休息日</b>' +
      '<button class="wd-del" data-act="delPlan" data-id="' + plan.id + '" aria-label="移除">' + icon('x') + '</button></div>' +
      '<div class="wd-tags"><span>恢复</span><span>拉伸</span></div>' +
      '<div class="wd-ex">散步 / 拉伸 / 早点睡</div>' +
      '</div>'
    );
  }
  const exercises = fitnessPlanExercises(plan);
  const parts = fitnessParts(exercises);
  return (
    '<div class="wd-plan">' +
    '<div class="wd-plan-top"><b>' + esc(fitnessPlanName(plan)) + '</b>' +
    '<button class="wd-del" data-act="delPlan" data-id="' + plan.id + '" aria-label="移除">' + icon('x') + '</button></div>' +
    (parts.length ? '<div class="wd-tags">' + parts.map((p) => '<span>' + esc(p) + '</span>').join('') + '</div>' : '') +
    (exercises.length
      ? '<div class="wd-ex">' + exercises.slice(0, 2).map((ex) => esc(ex.name) + (ex.sets ? ' ' + esc(ex.sets) : '')).join(' · ') +
        (exercises.length > 2 ? ' 等 ' + exercises.length + ' 个动作' : '') + '</div>'
      : fitnessPlanNote(plan)
        ? '<div class="wd-ex">' + esc(fitnessPlanNote(plan)) + '</div>'
        : '') +
    '</div>'
  );
}

Pages.fitness = {
  weekStart: weekStartKey(todayKey()),
  selected: todayKey(),

  render(el) {
    const d = Store.data;
    const t = todayKey();
    const ws = this.weekStart;
    const weekDates = fitnessWeekDates(ws);
    if (weekDates.indexOf(this.selected) === -1) this.selected = weekDates.indexOf(t) >= 0 ? t : ws;

    const plansByDate = {};
    (d.fitness.plans || []).forEach((plan) => {
      if (!plansByDate[plan.date]) plansByDate[plan.date] = [];
      plansByDate[plan.date].push(plan);
    });
    const weekPlans = [];
    weekDates.forEach((date) => (plansByDate[date] || []).forEach((p) => weekPlans.push(p)));

    const selectedPlans = plansByDate[this.selected] || [];
    const coveredDays = weekDates.filter((date) => (plansByDate[date] || []).length).length;
    const exerciseCount = sumBy(weekPlans, (p) => fitnessPlanExercises(p).length);

    const metrics = d.body.metrics.slice().sort(byDateAsc);
    const latest = metrics[metrics.length - 1];
    const previous = metrics[metrics.length - 2];
    const change = latest && previous ? (Number(latest.weight) || 0) - (Number(previous.weight) || 0) : null;
    const changeText =
      change === null
        ? '继续记录才能看到变化'
        : change === 0
          ? '与上次持平'
          : (change > 0 ? '+' : '') + change.toFixed(1) + ' kg（较上次）';
    const chartPoints = metrics.slice(-20).map((m) => ({ label: fmtShortDate(m.date), value: Number(m.weight) || 0 }));

    el.innerHTML =
      pageHead(
        '健身计划',
        '按周安排训练：把推日 / 拉日 / 腿日拖进某一天，当天内容和组数一眼看到',
        '<div class="month-nav">' +
          '<button class="icon-btn" data-act="prevWeek" aria-label="上一周">' + icon('chevronL') + '</button>' +
          '<span class="month-title">' + esc(fitnessWeekLabel(ws)) + '</span>' +
          '<button class="icon-btn" data-act="nextWeek" aria-label="下一周">' + icon('chevronR') + '</button>' +
          (ws === weekStartKey(t) ? '' : '<button class="btn sm" data-act="thisWeek">本周</button>') +
          '</div>' +
          '<button class="btn primary" data-act="addRoutine">' + icon('plus') + '新建模板</button>'
      ) +

      '<div class="grid grid-4">' +
      statCard({ label: '本周安排', dot: true, value: weekPlans.length + '<small>次</small>', sub: '本周 ' + fitnessWeekLabel(ws) }) +
      statCard({ label: '覆盖天数', dot: true, value: coveredDays + '<small>/ 7 天</small>', sub: coveredDays ? '把训练排进日程' : '还没排训练' }) +
      statCard({ label: '计划动作', dot: true, value: exerciseCount + '<small>个</small>', sub: '来自 ' + d.fitness.routines.length + ' 个模板' }) +
      statCard({
        label: '最新体重',
        dot: true,
        value: latest ? latest.weight + '<small>kg</small>' : '—',
        sub: latest ? fmtDateCN(latest.date) + ' · ' + changeText : '还没有体重记录',
      }) +
      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>本周训练</h2>' +
      '<p class="card-sub">' + esc(fitnessWeekLabel(ws)) + ' · 点某一天看当天完整内容</p></div></div>' +
      '<div class="week-grid">' +
      weekDates.map((date) => fitnessDayCell(date, plansByDate[date] || [], t, this.selected)).join('') +
      '</div></section>' +

      '<div class="grid fitness-bottom mt-16">' +

      '<section class="card"><div class="card-head"><div><h2>训练模板</h2>' +
      '<p class="card-sub">按住模板，拖进上面某一天</p></div>' +
      '<button class="btn ghost sm" data-act="addRoutine">+ 新增</button></div>' +
      '<div class="rest-template" draggable="true" data-rest-day="1" title="拖进某一天，安排恢复">' +
      '<span class="drag-grip" aria-hidden="true">' + icon('grip') + '</span>' +
      '<span class="rest-ico">' + icon('coffee') + '</span>' +
      '<span class="rest-body"><b>休息日</b><span>恢复 / 拉伸 / 散步</span></span>' +
      '<span class="rest-badge">拖到某天</span>' +
      '</div>' +
      (d.fitness.routines.length
        ? '<div class="list">' +
          d.fitness.routines
            .map((r) => {
              const exs = r.exercises || [];
              const parts = fitnessParts(exs);
              return (
                '<div class="item routine-item" draggable="true" data-routine-id="' + r.id + '">' +
                '<span class="drag-grip" aria-hidden="true">' + icon('grip') + '</span>' +
                '<div class="item-body"><div class="item-title">' + esc(r.name) +
                (exs.length ? ' <span class="chip gray">' + exs.length + ' 个动作</span>' : '') + '</div>' +
                '<div class="item-meta">' +
                (parts.length ? parts.map((p) => '<span class="chip line">' + esc(p) + '</span>').join('') : '') +
                (r.note ? '<span>' + esc(r.note) + '</span>' : '') +
                '</div></div>' +
                '<div class="item-actions">' +
                '<button class="icon-btn" data-act="editRoutine" data-id="' + r.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="delRoutine" data-id="' + r.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
              );
            })
            .join('') +
          '</div>'
        : emptyState('还没有训练模板', '比如「推日 / 拉日 / 腿日」，建好后拖进上面某一天')) +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>' + esc(fmtDateCN(this.selected, true)) + '</h2>' +
      '<p class="card-sub">' +
      (selectedPlans.length ? '当天安排 ' + selectedPlans.length + ' 个训练' : '这一天还没有安排训练') +
      '</p></div>' +
      '<button class="btn sm" data-act="pickToday">回到今天</button></div>' +
      (selectedPlans.length
        ? selectedPlans
            .map((plan) => {
              const exercises = fitnessPlanExercises(plan);
              if (plan.kind === 'rest') {
                return (
                  '<div class="day-plan is-rest">' +
                  '<div class="day-plan-head"><b>休息日</b>' +
                  '<span class="chip teal">恢复</span>' +
                  '<button class="icon-btn danger" data-act="delPlan" data-id="' + plan.id + '" aria-label="移除">' + icon('trash') + '</button>' +
                  '</div>' +
                  '<div class="rest-detail">不安排力量训练。可以散步、拉伸、泡沫轴放松，早点睡。</div>' +
                  '</div>'
                );
              }
              return (
                '<div class="day-plan">' +
                '<div class="day-plan-head"><b>' + esc(fitnessPlanName(plan)) + '</b>' +
                (fitnessPlanNote(plan) ? '<span class="chip gray">' + esc(fitnessPlanNote(plan)) + '</span>' : '') +
                '<button class="icon-btn danger" data-act="delPlan" data-id="' + plan.id + '" aria-label="移除">' + icon('trash') + '</button>' +
                '</div>' +
                (exercises.length
                  ? '<div class="ex-lines">' +
                    exercises
                      .map(
                        (ex) =>
                          '<div class="ex-line"><span class="ex-ico">' + equipmentArt(ex.equipment) + '</span>' +
                          '<span class="ex-part">' + esc(ex.part || '—') + '</span>' +
                          '<span class="ex-name">' + esc(ex.name) + '</span>' +
                          '<span class="ex-sets">' + esc(ex.sets || '—') + '</span></div>'
                      )
                      .join('') +
                    '</div>'
                  : '<div class="tiny muted">模板里还没有动作，点上面的模板「编辑」补上</div>') +
                '</div>'
              );
            })
            .join('')
        : emptyState('这天还是空的', '从左边（或下面）把训练模板拖进这一天的格子里')) +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>体重趋势</h2>' +
      '<p class="card-sub">' + (latest ? '最新 ' + latest.weight + ' kg · ' + changeText : '每记录一次，就多一点趋势') + '</p></div>' +
      '<button class="btn ghost sm" data-act="addMetric">+ 记录体重</button></div>' +
      (chartPoints.length >= 2
        ? lineChart(chartPoints, { rangeText: '最低 ' + Math.min(...chartPoints.map((p) => p.value)) + ' · 最高 ' + Math.max(...chartPoints.map((p) => p.value)) + ' kg' })
        : emptyState('至少需要两条记录', '记录两次体重后，这里会显示趋势线')) +
      (metrics.length
        ? '<div class="list mt-12">' +
          metrics
            .slice(-4)
            .reverse()
            .map(
              (m) =>
                '<div class="item"><div class="item-body"><div class="item-title">' +
                (m.weight ? Number(m.weight).toFixed(1) + ' kg' : '未记体重') +
                (m.waist ? ' <span class="chip gray">腰 ' + esc(m.waist) + '</span>' : '') +
                (m.chest ? ' <span class="chip gray">胸 ' + esc(m.chest) + '</span>' : '') +
                (m.arm ? ' <span class="chip gray">臂 ' + esc(m.arm) + '</span>' : '') +
                '</div><div class="item-meta">' + esc(fmtDateCN(m.date, true)) + (m.note ? ' · ' + esc(m.note) : '') + '</div></div>' +
                '<div class="item-actions"><button class="icon-btn danger" data-act="delMetric" data-id="' + m.id + '" aria-label="删除">' +
                icon('trash') + '</button></div></div>'
            )
            .join('') +
          '</div>'
        : '') +
      '</section>' +
      '</div>';

    bind(el, {
      prevWeek() {
        Pages.fitness.weekStart = addDays(Pages.fitness.weekStart, -7);
        Pages.fitness.selected = Pages.fitness.weekStart;
        App.refresh();
      },
      nextWeek() {
        Pages.fitness.weekStart = addDays(Pages.fitness.weekStart, 7);
        Pages.fitness.selected = Pages.fitness.weekStart;
        App.refresh();
      },
      thisWeek() {
        Pages.fitness.weekStart = weekStartKey(t);
        Pages.fitness.selected = t;
        App.refresh();
      },
      pickDay(node) {
        Pages.fitness.selected = node.dataset.date;
        App.refresh();
      },
      pickToday() {
        Pages.fitness.weekStart = weekStartKey(t);
        Pages.fitness.selected = t;
        App.refresh();
      },
      delPlan(node) {
        const id = node.dataset.id;
        const plan = findById(Store.data.fitness.plans || [], id);
        if (!plan) return;
        removeById(Store.data.fitness.plans, id);
        Store.save();
        toast('已从这天移除「' + fitnessPlanName(plan) + '」');
        App.refresh();
      },
      addRoutine() {
        openRoutineModal(null);
      },
      editRoutine(node) {
        const routine = findById(Store.data.fitness.routines, node.dataset.id);
        if (routine) openRoutineModal(routine);
      },
      delRoutine(node) {
        const id = node.dataset.id;
        confirmDelete('删除模板不会影响已经排进日历的训练。', () => {
          removeById(Store.data.fitness.routines, id);
          Store.save();
          App.refresh();
        });
      },
      addMetric() {
        openMetricModal(null);
      },
      delMetric(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.body.metrics, id);
          Store.save();
          App.refresh();
        });
      },
    });

    setupFitnessDnD(el);
  },
};

/* ---------------- 拖拽训练模板到某一天 ---------------- */

function setupFitnessDnD(root) {
  const routines = root.querySelectorAll('[data-routine-id]');
  const restCard = root.querySelector('[data-rest-day]');
  const cells = root.querySelectorAll('.week-day[data-date]');

  function clearHover() {
    cells.forEach((cell) => cell.classList.remove('drop-hover'));
  }

  routines.forEach((row) => {
    row.addEventListener('dragstart', (event) => {
      const id = row.dataset.routineId;
      const routine = findById(Store.data.fitness.routines, id);
      if (!routine) return;
      Pages.fitness.dragRoutine = id;
      Pages.fitness.dragRest = false;
      row.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copy';
        try {
          event.dataTransfer.setData('text/plain', 'routine:' + id);
        } catch (err) {
          /* ignore */
        }
      }
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      Pages.fitness.dragRoutine = null;
      clearHover();
    });
  });

  if (restCard) {
    restCard.addEventListener('dragstart', (event) => {
      Pages.fitness.dragRoutine = null;
      Pages.fitness.dragRest = true;
      restCard.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copy';
        try {
          event.dataTransfer.setData('text/plain', 'rest:1');
        } catch (err) {
          /* ignore */
        }
      }
    });
    restCard.addEventListener('dragend', () => {
      restCard.classList.remove('dragging');
      Pages.fitness.dragRest = false;
      clearHover();
    });
  }

  cells.forEach((cell) => {
    cell.addEventListener('dragover', (event) => {
      event.preventDefault();
      cell.classList.add('drop-hover');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-hover'));
    cell.addEventListener('drop', (event) => {
      event.preventDefault();
      cell.classList.remove('drop-hover');
      let isRest = Pages.fitness.dragRest;
      let rawText = '';
      if (event.dataTransfer) {
        try {
          rawText = event.dataTransfer.getData('text/plain') || '';
        } catch (err) {
          rawText = '';
        }
      }
      if (rawText === 'rest:1') isRest = true;
      if (isRest) {
        const date = cell.dataset.date;
        Store.data.fitness.plans = Store.data.fitness.plans || [];
        const dayPlans = Store.data.fitness.plans.filter((p) => p.date === date);
        if (dayPlans.some((p) => p.kind === 'rest')) {
          toast('这天已经安排休息日了');
          return;
        }
        if (dayPlans.length) {
          toast('这天已有训练，休息日不能叠加');
          return;
        }
        Store.data.fitness.plans.push({
          id: uid(),
          date: date,
          kind: 'rest',
          name: '休息日',
          note: '恢复 / 拉伸 / 散步',
          createdAt: Date.now(),
        });
        Pages.fitness.selected = date;
        Store.save();
        toast('已把「休息日」放进 ' + fmtDateCN(date, true));
        App.refresh();
        return;
      }

      let routineId = Pages.fitness.dragRoutine;
      if (!routineId && event.dataTransfer) {
        try {
          const raw = event.dataTransfer.getData('text/plain') || '';
          if (raw.indexOf('routine:') === 0) routineId = raw.slice(8);
        } catch (err) {
          /* ignore */
        }
      }
      const routine = findById(Store.data.fitness.routines, routineId);
      if (!routine) return;
      const date = cell.dataset.date;
      Store.data.fitness.plans = Store.data.fitness.plans || [];
      if (Store.data.fitness.plans.some((p) => p.date === date && p.kind === 'rest')) {
        toast('这天是休息日，先移除休息日再排训练');
        return;
      }
      const exists = Store.data.fitness.plans.some((p) => p.date === date && p.routineId === routine.id);
      if (exists) {
        toast('这天已经安排过「' + routine.name + '」');
        return;
      }
      Store.data.fitness.plans.push({
        id: uid(),
        date: date,
        routineId: routine.id,
        name: routine.name,
        note: routine.note || '',
        exercises: (routine.exercises || []).slice(),
        createdAt: Date.now(),
      });
      Pages.fitness.selected = date;
      Store.save();
      toast('已把「' + routine.name + '」放进 ' + fmtDateCN(date, true));
      App.refresh();
    });
  });
}

/* ---------------- 训练模板弹窗 ---------------- */

function routineExerciseRow(exercise) {
  const ex = exercise || {};
  return (
    '<div class="routine-ex-row" data-rex>' +
    '<select class="input" data-rex-part aria-label="部位">' +
    '<option value="">部位</option>' +
    BODY_PARTS.map((p) => '<option value="' + esc(p) + '"' + (ex.part === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') +
    '</select>' +
    '<select class="input" data-rex-equip aria-label="器械">' +
    '<option value="">器械</option>' +
    EQUIPMENT_OPTIONS.map((item) => '<option value="' + esc(item.value) + '"' + (ex.equipment === item.value ? ' selected' : '') + '>' + esc(item.label) + '</option>').join('') +
    '</select>' +
    '<input class="input" data-rex-name placeholder="动作，如 卧推" maxlength="24" value="' + esc(ex.name || '') + '">' +
    '<input class="input" data-rex-sets placeholder="4×8" maxlength="12" value="' + esc(ex.sets || '') + '">' +
    '<button type="button" class="icon-btn danger" data-del-rex aria-label="删除动作">' + icon('x') + '</button>' +
    '</div>'
  );
}

function openRoutineModal(routine) {
  const editing = !!routine;
  openModal({
    title: editing ? '编辑训练模板' : '新增训练模板',
    subtitle: '模板里的动作会显示在周计划里，拖进某一天即可',
    body:
      fRow(
        fInput('name', '模板名称', { value: editing ? routine.name : '', placeholder: '例如：推日、拉日', required: true, maxlength: 20 }),
        fInput('note', '备注', { value: editing ? routine.note : '', placeholder: '例如：胸 / 肩 / 三头', maxlength: 40 })
      ) +
      '<div class="field"><span class="field-label">动作清单</span>' +
      '<div class="routine-ex-head"><span>部位</span><span>器械</span><span>动作</span><span>组×次</span><span></span></div>' +
      '<div id="routine-ex-list">' +
      ((editing && routine.exercises && routine.exercises.length ? routine.exercises : [null]).map(routineExerciseRow).join('')) +
      '</div>' +
      '<button type="button" class="btn ghost sm mt-8" id="add-routine-ex" style="width:100%">' + icon('plus') + '添加动作</button>' +
      '</div>',
    onMount(form) {
      const list = form.querySelector('#routine-ex-list');
      form.querySelector('#add-routine-ex').addEventListener('click', () => {
        list.insertAdjacentHTML('beforeend', routineExerciseRow(null));
      });
      form.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-del-rex]');
        if (!btn) return;
        e.preventDefault();
        const row = btn.closest('[data-rex]');
        if (row) row.remove();
      });
    },
    onSubmit(data, form) {
      const name = String(data.name || '').trim();
      if (!name) {
        toast('请填写模板名称', 'err');
        return false;
      }
      const exercises = Array.prototype.slice
        .call(form.querySelectorAll('[data-rex]'))
        .map((row) => ({
          part: row.querySelector('[data-rex-part]').value,
          equipment: row.querySelector('[data-rex-equip]').value,
          name: String(row.querySelector('[data-rex-name]').value || '').trim(),
          sets: String(row.querySelector('[data-rex-sets]').value || '').trim(),
        }))
        .filter((ex) => ex.name);
      const payload = {
        name: name,
        note: String(data.note || '').trim(),
        exercises: exercises,
      };
      if (editing) {
        Object.assign(routine, payload);
      } else {
        Store.data.fitness.routines.push(Object.assign({ id: uid() }, payload));
      }
      Store.save();
      toast(editing ? '模板已更新' : '模板已添加');
      App.refresh();
    },
  });
}

/* ---------------- 体重围度 ---------------- */

function openMetricModal(metric) {
  const editing = !!metric;
  openModal({
    title: editing ? '编辑身体数据' : '记录身体数据',
    size: 'small',
    body:
      fDate('date', '日期', editing ? metric.date : todayKey()) +
      fRow(
        fNumber('weight', '体重（kg）', { value: editing ? metric.weight : '', min: 0, step: '0.1', required: true }),
        fNumber('waist', '腰围（cm）', { value: editing ? metric.waist : '', min: 0, step: '0.1' })
      ) +
      fRow(fNumber('chest', '胸围（cm）', { value: editing ? metric.chest : '', min: 0, step: '0.1' }), fNumber('arm', '臂围（cm）', {
        value: editing ? metric.arm : '',
        min: 0,
        step: '0.1',
      })) +
      fInput('note', '备注', { value: editing ? metric.note : '', placeholder: '选填' }),
    onSubmit(data) {
      const weight = Number(data.weight);
      if (!isFinite(weight) || weight <= 0) {
        toast('请填写体重', 'err');
        return false;
      }
      const payload = {
        date: data.date || todayKey(),
        weight: weight,
        waist: data.waist ? Number(data.waist) : '',
        chest: data.chest ? Number(data.chest) : '',
        arm: data.arm ? Number(data.arm) : '',
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(metric, payload);
      } else {
        Store.data.body.metrics.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast('身体数据已记录');
      App.refresh();
    },
  });
}
