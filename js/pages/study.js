'use strict';

/* =========================================================
   学习计划
   ========================================================= */

Pages.study = {
  render(el) {
    const d = Store.data;
    const t = todayKey();
    const weekStart = weekStartKey(t);

    const todayMinutes = sumBy(d.study.logs.filter((l) => l.date === t), (l) => l.minutes);
    const weekMinutes = sumBy(d.study.logs.filter((l) => l.date >= weekStart && l.date <= t), (l) => l.minutes);
    const streak = studyStreak(d.study.logs);
    const activeGoals = d.study.goals.filter((g) => g.status === 'active');
    const totalMinutes = sumBy(d.study.logs, (l) => l.minutes);

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const key = addDays(t, -i);
      days.push({
        label: String(parseDate(key).getDate()),
        title: fmtDateCN(key, true),
        value: sumBy(d.study.logs.filter((l) => l.date === key), (l) => l.minutes),
      });
    }
    const hasStudy = days.some((x) => x.value > 0);

    const goalProgress = {};
    d.study.logs.forEach((l) => {
      if (!l.goalId) return;
      goalProgress[l.goalId] = (goalProgress[l.goalId] || 0) + (Number(l.minutes) || 0);
    });

    const recentLogs = d.study.logs.slice().sort(byDateDesc).slice(0, 10);

    el.innerHTML =
      pageHead(
        '学习计划',
        '设定目标、每天打卡，看得到累积的时长和连续天数',
        '<button class="btn" data-act="addGoal">' + icon('target') + '新增目标</button>' +
          '<button class="btn primary" data-act="addLog">' + icon('plus') + '学习打卡</button>'
      ) +

      '<div class="grid grid-4">' +
      statCard({ label: '今日学习', dot: true, value: todayMinutes ? minutesText(todayMinutes) : '0 <small>分钟</small>', sub: '本周 ' + hoursText(weekMinutes) }) +
      statCard({ label: '连续打卡', dot: true, value: streak + '<small>天</small>', sub: streak ? '保持住，别断' : '今天打个卡开始' }) +
      statCard({ label: '累计学习', dot: true, value: hoursText(totalMinutes), sub: '共 ' + d.study.logs.length + ' 次打卡' }) +
      statCard({ label: '进行中目标', dot: true, value: activeGoals.length + '<small>个</small>', sub: '目标共 ' + d.study.goals.length + ' 个' }) +
      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>学习目标</h2>' +
      '<p class="card-sub">' + (d.study.goals.length ? '按目标累计学习时长' : '先设一个目标，打卡会更有方向') + '</p></div></div>' +
      (d.study.goals.length
        ? '<div class="list">' +
          d.study.goals
            .map((g) => {
              const learned = goalProgress[g.id] || 0;
              const targetMin = (Number(g.targetHours) || 0) * 60;
              const p = targetMin ? pct(learned, targetMin) : 0;
              const overdue = g.deadline && g.deadline < t && g.status === 'active';
              return (
                '<div class="item" style="align-items:flex-start">' +
                '<div class="item-body"><div class="item-title">' + esc(g.title) + ' ' +
                chipsFor(GOAL_STATUS, g.status) +
                (g.subject ? ' <span class="chip gray">' + esc(g.subject) + '</span>' : '') + '</div>' +
                '<div class="item-meta">已学 ' + hoursText(learned) +
                (targetMin ? ' / 目标 ' + g.targetHours + ' 小时' : '') +
                (g.deadline ? ' · 截止 ' + esc(fmtDateCN(g.deadline)) + (overdue ? '（已过期）' : '') : '') +
                '</div>' +
                (targetMin
                  ? '<div class="progress-row mt-8"><div class="progress"><div class="progress-fill" style="width:' + p + '%"></div></div>' +
                    '<span class="progress-pct">' + p + '%</span></div>'
                  : '') +
                (g.note ? '<div class="tiny muted mt-8">' + esc(g.note) + '</div>' : '') +
                '</div>' +
                '<button class="btn sm" data-act="log" data-id="' + g.id + '">打卡</button>' +
                '<div class="item-actions" style="opacity:1">' +
                '<button class="icon-btn" data-act="editGoal" data-id="' + g.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="delGoal" data-id="' + g.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
              );
            })
            .join('') +
          '</div>'
        : emptyState('还没有学习目标', '比如：三个月读完一本英文原版书', '<button class="btn sm" data-act="addGoal">+ 新增目标</button>')) +
      '</section>' +

      '<div class="grid grid-2 mt-16" style="align-items:start">' +
      '<section class="card"><div class="card-head"><div><h2>近 14 天学习时长</h2>' +
      '<p class="card-sub">每天累计分钟数</p></div></div>' +
      (hasStudy
        ? barChart(days, { height: 140, format: (v) => (v ? Math.round(v) : '') })
        : emptyState('最近两周还没有打卡', '记录一次学习，这里就会出现柱状图')) +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>最近打卡</h2>' +
      '<p class="card-sub">共 ' + d.study.logs.length + ' 次记录</p></div></div>' +
      (recentLogs.length
        ? '<div class="list">' +
          recentLogs
            .map((l) => {
              const goal = findById(d.study.goals, l.goalId);
              return (
                '<div class="item"><div class="item-body"><div class="item-title">' +
                esc(goal ? goal.title : '未归类学习') + ' <span class="chip violet">' + minutesText(l.minutes) + '</span></div>' +
                '<div class="item-meta">' + esc(fmtDateCN(l.date, true)) + (l.content ? ' · ' + esc(l.content) : '') + '</div>' +
                '</div>' +
                '<div class="item-actions"><button class="icon-btn danger" data-act="delLog" data-id="' + l.id + '" aria-label="删除">' +
                icon('trash') + '</button></div></div>'
              );
            })
            .join('') +
          '</div>'
        : emptyState('还没有打卡记录', '每天学完记一笔，连续天数会累积')) +
      '</section>' +
      '</div>';

    bind(el, {
      addGoal() {
        openGoalModal(null);
      },
      addLog() {
        openStudyLogModal(null, '', todayKey());
      },
      log(node) {
        openStudyLogModal(null, node.dataset.id, todayKey());
      },
      editGoal(node) {
        const goal = findById(Store.data.study.goals, node.dataset.id);
        if (goal) openGoalModal(goal);
      },
      delGoal(node) {
        const id = node.dataset.id;
        const count = Store.data.study.logs.filter((l) => l.goalId === id).length;
        confirmDelete(count ? '这个目标下有 ' + count + ' 条打卡记录，删除后记录会保留但变成「未归类」。' : '删除后无法恢复。', () => {
          removeById(Store.data.study.goals, id);
          Store.data.study.logs.forEach((l) => {
            if (l.goalId === id) l.goalId = '';
          });
          Store.save();
          App.refresh();
        });
      },
      delLog(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.study.logs, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },
};

/* ---------------- 弹窗 ---------------- */

function openGoalModal(goal) {
  const editing = !!goal;
  openModal({
    title: editing ? '编辑学习目标' : '新增学习目标',
    size: 'small',
    body:
      fInput('title', '目标', { value: editing ? goal.title : '', placeholder: '例如：学完《经济学原理》', required: true }) +
      fRow(
        fInput('subject', '主题 / 科目', { value: editing ? goal.subject : '', placeholder: '例如：英语、编程' }),
        fNumber('targetHours', '目标小时数', { value: editing ? goal.targetHours : '', min: 0, step: '0.5', placeholder: '选填' })
      ) +
      fRow(
        fDate('deadline', '截止日期', editing ? goal.deadline : ''),
        fSelect('status', '状态', GOAL_STATUS, editing ? goal.status : 'active')
      ) +
      fTextarea('note', '备注', editing ? goal.note : '', { rows: 2, placeholder: '为什么想学、怎么学，可不填' }),
    onSubmit(data) {
      const title = String(data.title || '').trim();
      if (!title) {
        toast('请填写目标', 'err');
        return false;
      }
      const payload = {
        title: title,
        subject: String(data.subject || '').trim(),
        targetHours: Number(data.targetHours) || 0,
        deadline: data.deadline || '',
        status: data.status || 'active',
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(goal, payload);
      } else {
        Store.data.study.goals.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast(editing ? '目标已更新' : '目标已添加');
      App.refresh();
    },
  });
}

function openStudyLogModal(log, presetGoalId, presetDate) {
  const editing = !!log;
  const goals = Store.data.study.goals;
  const goalOptions = [{ value: '', label: '未归类' }].concat(goals.map((g) => ({ value: g.id, label: g.title })));
  const goalId = editing ? log.goalId || '' : presetGoalId || '';

  openModal({
    title: editing ? '编辑打卡' : '学习打卡',
    size: 'small',
    body:
      fRow(fDate('date', '日期', editing ? log.date : presetDate || todayKey()), fNumber('minutes', '学习时长（分钟）', {
        value: editing ? log.minutes : '',
        min: 1,
        required: true,
        placeholder: '例如：45',
      })) +
      fSelect('goalId', '对应目标', goalOptions, goalId) +
      fTextarea('content', '学了什么', editing ? log.content : '', {
        rows: 3,
        placeholder: '学了哪一章、做了什么练习……',
      }),
    onSubmit(data) {
      const minutes = Number(data.minutes);
      if (!isFinite(minutes) || minutes <= 0) {
        toast('请填写学习时长', 'err');
        return false;
      }
      const payload = {
        date: data.date || todayKey(),
        minutes: Math.round(minutes),
        goalId: data.goalId || '',
        content: String(data.content || '').trim(),
      };
      if (editing) {
        Object.assign(log, payload);
      } else {
        Store.data.study.logs.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast('已记下 ' + minutesText(minutes));
      App.refresh();
    },
  });
}
