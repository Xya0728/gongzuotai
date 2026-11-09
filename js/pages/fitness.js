'use strict';

/* =========================================================
   健身计划
   ========================================================= */

function sessionVolume(session) {
  return sumBy(session.exercises || [], (ex) => sumBy(ex.sets || [], (s) => (Number(s.w) || 0) * (Number(s.r) || 0)));
}

function sessionSets(session) {
  return sumBy(session.exercises || [], (ex) => (ex.sets || []).length);
}

Pages.fitness = {
  render(el) {
    const d = Store.data;
    const t = todayKey();
    const weekStart = weekStartKey(t);
    const weekSessions = d.fitness.sessions.filter((s) => s.date >= weekStart && s.date <= t);
    const weekVolume = sumBy(weekSessions, (s) => sessionVolume(s));

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

    const sessions = d.fitness.sessions.slice().sort(byDateDesc);

    el.innerHTML =
      pageHead(
        '健身计划',
        '按训练日记录动作、重量和组数，体重围度一起看趋势',
        '<button class="btn primary" data-act="addSession">' + icon('plus') + '记录训练</button>'
      ) +

      '<div class="grid grid-4">' +
      statCard({ label: '本周训练', dot: true, value: weekSessions.length + '<small>次</small>', sub: '累计 ' + d.fitness.sessions.length + ' 次' }) +
      statCard({ label: '本周容量', dot: true, value: fmtNum(Math.round(weekVolume)) + '<small>kg</small>', sub: '重量 × 次数 相加' }) +
      statCard({
        label: '最新体重',
        dot: true,
        value: latest ? latest.weight + '<small>kg</small>' : '—',
        sub: latest ? fmtDateCN(latest.date) + ' · ' + changeText : '还没有体重记录',
      }) +
      statCard({
        label: '当前训练安排',
        dot: true,
        value: d.fitness.routines.length + '<small>个</small>',
        sub: d.fitness.routines.length ? d.fitness.routines.map((r) => r.name).join(' / ') : '还没有训练模板',
      }) +
      '</div>' +

      '<div class="grid grid-2 mt-16" style="align-items:start">' +

      '<section class="card"><div class="card-head"><div><h2>训练安排</h2>' +
      '<p class="card-sub">常用的训练模板，点「开始」直接带入</p></div>' +
      '<button class="btn ghost sm" data-act="addRoutine">+ 新增模板</button></div>' +
      (d.fitness.routines.length
        ? '<div class="list">' +
          d.fitness.routines
            .map(
              (r) =>
                '<div class="item"><div class="item-body"><div class="item-title">' + esc(r.name) + '</div>' +
                '<div class="item-meta">' + esc(r.note || '没有备注') + '</div></div>' +
                '<button class="btn sm" data-act="startRoutine" data-name="' + esc(r.name) + '">开始</button>' +
                '<div class="item-actions">' +
                '<button class="icon-btn" data-act="editRoutine" data-id="' + r.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="delRoutine" data-id="' + r.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
            )
            .join('') +
          '</div>'
        : emptyState('还没有训练模板', '比如「推日 / 拉日 / 腿日」，记录时可以一键带入')) +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>体重趋势</h2>' +
      '<p class="card-sub">' + (latest ? '最新 ' + latest.weight + ' kg · ' + changeText : '每记录一次，就多一点趋势') + '</p></div>' +
      '<button class="btn ghost sm" data-act="addMetric">+ 记录体重</button></div>' +
      (chartPoints.length >= 2
        ? lineChart(chartPoints, { rangeText: '最低 ' + Math.min(...chartPoints.map((p) => p.value)) + ' · 最高 ' + Math.max(...chartPoints.map((p) => p.value)) + ' kg' })
        : emptyState('至少需要两条记录', '连续记录两次体重后，这里会显示趋势线')) +
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
      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>训练记录</h2>' +
      '<p class="card-sub">' + (sessions.length ? '共 ' + sessions.length + ' 次训练' : '还没有训练记录') + '</p></div></div>' +
      (sessions.length
        ? '<div class="list">' +
          sessions
            .slice(0, 12)
            .map((s) => {
              const names = (s.exercises || []).map((e) => e.name).filter(Boolean);
              const setCount = sessionSets(s);
              return (
                '<div class="item" style="align-items:flex-start"><div class="item-body">' +
                '<div class="item-title">' + esc(s.name || '训练') +
                ' <span class="chip orange">' + esc(fmtDateCN(s.date, true)) + '</span></div>' +
                '<div class="item-meta">' + setCount + ' 组 · 容量 ' + fmtNum(Math.round(sessionVolume(s))) + ' kg · ' +
                (names.length ? esc(names.slice(0, 5).join(' / ')) + (names.length > 5 ? ' 等' : '') : '未记录动作') +
                '</div>' +
                ((s.exercises || []).length
                  ? '<div class="tiny muted mt-8">' +
                    s.exercises
                      .map((ex) => {
                        const detail = (ex.sets || []).map((x) => (x.w ? x.w + 'kg×' : '') + x.r).join('，');
                        return esc(ex.name) + '：' + esc(detail || '—');
                      })
                      .join('　')
                    + '</div>'
                  : '') +
                (s.note ? '<div class="tiny muted mt-8">' + esc(s.note) + '</div>' : '') +
                '</div>' +
                '<div class="item-actions" style="opacity:1">' +
                '<button class="icon-btn" data-act="editSession" data-id="' + s.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="delSession" data-id="' + s.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
              );
            })
            .join('') +
          '</div>'
        : emptyState('还没有训练记录', '记录今天练了什么，方便下次对比重量', '<button class="btn sm" data-act="addSession">+ 记录训练</button>')) +
      '</section>';

    bind(el, {
      addSession() {
        openSessionModal(null, '');
      },
      startRoutine(node) {
        openSessionModal(null, node.dataset.name || '');
      },
      editSession(node) {
        const session = findById(Store.data.fitness.sessions, node.dataset.id);
        if (session) openSessionModal(session);
      },
      delSession(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.fitness.sessions, id);
          Store.save();
          App.refresh();
        });
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
        confirmDelete('删除模板不会影响已经记录的训练。', () => {
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
  },
};

/* ---------------- 弹窗 ---------------- */

function openRoutineModal(routine) {
  const editing = !!routine;
  openModal({
    title: editing ? '编辑训练模板' : '新增训练模板',
    size: 'small',
    body:
      fInput('name', '模板名称', { value: editing ? routine.name : '', placeholder: '例如：推日、腿日', required: true }) +
      fInput('note', '练什么', { value: editing ? routine.note : '', placeholder: '例如：胸 / 肩 / 三头' }),
    onSubmit(data) {
      const name = String(data.name || '').trim();
      if (!name) {
        toast('请填写模板名称', 'err');
        return false;
      }
      const payload = { name: name, note: String(data.note || '').trim() };
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

function openSessionModal(session, presetName) {
  const editing = !!session;
  const form = openModal({
    title: editing ? '编辑训练记录' : '记录训练',
    subtitle: '重量可以留空（徒手动作只填次数）',
    size: 'wide',
    body:
      fRow(
        fDate('date', '日期', editing ? session.date : todayKey()),
        fInput('name', '训练名称', {
          value: editing ? session.name : presetName || '',
          placeholder: '例如：推日',
          required: true,
        })
      ) +
      '<div class="field"><span class="field-label">动作与组数</span>' +
      '<div id="ex-list"></div>' +
      '<button type="button" class="btn ghost sm" id="add-ex" style="width:100%">' + icon('plus') + '添加动作</button></div>' +
      fTextarea('note', '备注', editing ? session.note : '', { rows: 2, placeholder: '状态、感受，可不填' }),
    onMount(mountForm) {
      const list = mountForm.querySelector('#ex-list');

      function renumber(container) {
        Array.prototype.forEach.call(container.querySelectorAll('.set-row'), (row, index) => {
          const idx = row.querySelector('.set-idx');
          if (idx) idx.textContent = index + 1;
        });
      }

      function addSet(container, set) {
        const row = document.createElement('div');
        row.className = 'set-row';
        row.innerHTML =
          '<span class="set-idx"></span>' +
          '<input class="input" type="number" data-w min="0" step="0.5" placeholder="kg" value="' +
          (set && set.w ? esc(set.w) : '') + '">' +
          '<span class="x">×</span>' +
          '<input class="input" type="number" data-r min="0" step="1" placeholder="次数" value="' +
          (set && set.r ? esc(set.r) : '') + '">' +
          '<button type="button" class="set-del" data-del-set aria-label="删除这组">' + icon('x') + '</button>';
        container.appendChild(row);
        row.querySelector('[data-del-set]').addEventListener('click', () => {
          row.remove();
          renumber(container);
        });
        renumber(container);
      }

      function addExercise(exercise) {
        const block = document.createElement('div');
        block.className = 'ex-block';
        block.innerHTML =
          '<div class="ex-head">' +
          '<input class="input" data-ex-name placeholder="动作名称，如 卧推" value="' + (exercise ? esc(exercise.name) : '') + '">' +
          '<button type="button" class="icon-btn danger" data-del-ex aria-label="删除动作">' + icon('x') + '</button>' +
          '</div>' +
          '<div class="sets"></div>' +
          '<div class="ex-foot"><span class="tiny muted">重量 kg × 次数</span>' +
          '<button type="button" class="btn ghost sm" data-add-set>+ 加一组</button></div>';
        list.appendChild(block);

        const sets = block.querySelector('.sets');
        const preset = exercise && exercise.sets && exercise.sets.length ? exercise.sets : [{ w: '', r: '' }, { w: '', r: '' }, { w: '', r: '' }];
        preset.forEach((s) => addSet(sets, s));

        block.querySelector('[data-del-ex]').addEventListener('click', () => block.remove());
        block.querySelector('[data-add-set]').addEventListener('click', () => addSet(sets));
      }

      if (editing && (session.exercises || []).length) {
        session.exercises.forEach((ex) => addExercise(ex));
      } else {
        addExercise(null);
      }

      mountForm.querySelector('#add-ex').addEventListener('click', () => addExercise(null));
    },
    onSubmit(data, submitForm) {
      const exercises = Array.prototype.map
        .call(submitForm.querySelectorAll('.ex-block'), (block) => ({
          name: String(block.querySelector('[data-ex-name]').value || '').trim(),
          sets: Array.prototype.map
            .call(block.querySelectorAll('.set-row'), (row) => ({
              w: Number(row.querySelector('[data-w]').value) || 0,
              r: Number(row.querySelector('[data-r]').value) || 0,
            }))
            .filter((s) => s.r > 0),
        }))
        .filter((ex) => ex.name && ex.sets.length);

      if (!exercises.length) {
        toast('至少记一个动作和一组次数', 'err');
        return false;
      }
      const payload = {
        date: data.date || todayKey(),
        name: String(data.name || '').trim() || '训练',
        exercises: exercises,
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(session, payload);
      } else {
        Store.data.fitness.sessions.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast(editing ? '训练记录已更新' : '训练已记录，容量 ' + fmtNum(Math.round(sessionVolume(payload))) + ' kg');
      App.refresh();
    },
  });
  return form;
}
