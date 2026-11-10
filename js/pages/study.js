'use strict';

/* =========================================================
   学习计划 · 项目与截止日期
   ========================================================= */

function ensureStudyCategory(name) {
  const data = Store.data.study;
  if (!Array.isArray(data.categories)) data.categories = ['书籍', '乐器', '课程'];
  const value = String(name || '').trim();
  if (value && data.categories.indexOf(value) === -1) data.categories.push(value);
  return value;
}

function studyCover(goal) {
  if (goal.image) {
    return (
      '<button class="goal-cover" data-act="viewImage" data-id="' + goal.id + '" aria-label="查看图片">' +
      '<img src="' + esc(goal.image) + '" alt="' + esc(goal.title) + '"></button>'
    );
  }
  const text = String(goal.category || goal.subject || '学').slice(0, 1);
  return '<span class="goal-cover placeholder">' + esc(text) + '</span>';
}

function studyDeadlineChip(goal, today) {
  if (!goal.deadline) return '<span class="chip gray">未设截止</span>';
  const days = diffDays(today, goal.deadline);
  if (days < 0) return '<span class="chip red">已过期 ' + -days + ' 天</span>';
  if (days === 0) return '<span class="chip red">今天截止</span>';
  if (days <= 7) return '<span class="chip amber">' + days + ' 天后截止</span>';
  return '<span class="chip gray">截止 ' + esc(fmtShortDate(goal.deadline)) + '</span>';
}

Pages.study = {
  render(el) {
    const d = Store.data;
    const t = todayKey();
    const mk = monthKeyOf(t);
    const goals = d.study.goals.slice();
    const timed = goals
      .filter((g) => g.deadline)
      .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
    const overdue = timed.filter((g) => g.deadline < t);
    const coming = timed.filter((g) => g.deadline >= t);
    const next = coming[0] || null;
    const monthDue = timed.filter((g) => g.deadline.indexOf(mk) === 0);
    const categories = Array.isArray(d.study.categories) ? d.study.categories : [];

    const sorted = goals.slice().sort((a, b) => {
      if (a.deadline && b.deadline) return String(a.deadline).localeCompare(String(b.deadline));
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    el.innerHTML =
      pageHead(
        '学习计划',
        '把想学的书、乐器、课程列成项目，定好截止日，按节奏推进就好',
        '<button class="btn primary" data-act="addGoal">' + icon('plus') + '新增项目</button>'
      ) +

      '<div class="grid grid-4">' +
      statCard({ label: '学习项目', dot: true, value: goals.length + '<small>个</small>', sub: '分在 ' + categories.length + ' 个分类里' }) +
      statCard({
        label: '最近截止',
        dot: true,
        value: next ? '<small>剩</small>' + diffDays(t, next.deadline) + '<small>天</small>' : '—',
        sub: next ? esc(next.title) + ' · ' + fmtDateCN(next.deadline) : '还没有设截止日期',
      }) +
      statCard({ label: '本月截止', dot: true, value: monthDue.length + '<small>个</small>', sub: monthDue.length ? '本月要推进的项目' : '本月没有截止的项目' }) +
      statCard({
        label: '已过期',
        dot: true,
        value: overdue.length + '<small>个</small>',
        sub: overdue.length ? '排个时间收尾，或改个截止日' : '没有过期的项目',
      }) +
      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>学习项目</h2>' +
      '<p class="card-sub">' +
      (sorted.length ? '按截止日期排序，点项目可以改封面、分类和日期' : '先加一个想学的东西') +
      '</p></div></div>' +
      (sorted.length
        ? '<div class="list">' +
          sorted
            .map(
              (g) =>
                '<div class="item" style="align-items:flex-start">' +
                studyCover(g) +
                '<div class="item-body"><div class="item-title">' + esc(g.title) + '</div>' +
                '<div class="item-meta">' +
                (g.category ? '<span class="chip violet">' + esc(g.category) + '</span>' : '') +
                (g.subject ? '<span class="chip gray">' + esc(g.subject) + '</span>' : '') +
                studyDeadlineChip(g, t) +
                '</div>' +
                (g.note ? '<div class="tiny muted mt-8">' + esc(g.note) + '</div>' : '') +
                '</div>' +
                '<div class="item-actions" style="opacity:1">' +
                '<button class="icon-btn" data-act="editGoal" data-id="' + g.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="delGoal" data-id="' + g.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
            )
            .join('') +
          '</div>'
        : emptyState('还没有学习项目', '比如：三个月读完一本英文原版书', '<button class="btn sm" data-act="addGoal">+ 新增项目</button>')) +
      '</section>';

    bind(el, {
      addGoal() {
        openGoalModal(null);
      },
      viewImage(node) {
        const goal = findById(Store.data.study.goals, node.dataset.id);
        if (!goal || !goal.image) return;
        openModal({
          title: goal.title,
          size: 'small',
          footer: false,
          body: '<img class="goal-image-full" src="' + esc(goal.image) + '" alt="' + esc(goal.title) + '">',
        });
      },
      editGoal(node) {
        const goal = findById(Store.data.study.goals, node.dataset.id);
        if (goal) openGoalModal(goal);
      },
      delGoal(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.study.goals, id);
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
    title: editing ? '编辑学习项目' : '新增学习项目',
    subtitle: '分类可以选书籍 / 乐器 / 课程，也可以自己输入',
    size: 'small',
    body:
      fInput('title', '项目', { value: editing ? goal.title : '', placeholder: '例如：学完《经济学原理》', required: true, maxlength: 60 }) +
      fInput('category', '分类', {
        value: editing ? goal.category || '' : '',
        placeholder: '书籍 / 乐器 / 课程，也可以直接输入新分类',
        list: 'study-cat-list',
      }) +
      '<datalist id="study-cat-list">' +
      (Store.data.study.categories || [])
        .map((c) => '<option value="' + esc(c) + '"></option>')
        .join('') +
      '</datalist>' +
      '<div class="field"><span class="field-label">封面图片（可不加）</span>' +
      '<div class="img-pick">' +
      '<div class="img-preview" id="goal-image-preview">' +
      (editing && goal.image ? '<img src="' + esc(goal.image) + '" alt="">' : '<span class="tiny muted">未选择</span>') +
      '</div>' +
      '<div class="img-pick-actions"><label class="btn sm">选择图片' +
      '<input type="file" accept="image/*" id="goal-image-file" hidden></label>' +
      '<button type="button" class="btn ghost sm" id="goal-image-clear">移除</button></div>' +
      '</div>' +
      '<input type="hidden" name="image" id="goal-image-data" value="' + (editing ? esc(goal.image || '') : '') + '">' +
      '</div>' +
      fRow(
        fInput('subject', '主题 / 科目', { value: editing ? goal.subject : '', placeholder: '例如：英语、编程', maxlength: 30 }),
        fDate('deadline', '截止日期', editing ? goal.deadline : '')
      ) +
      fTextarea('note', '备注', editing ? goal.note : '', { rows: 2, placeholder: '为什么想学、怎么学，可不填' }),
    onMount(form) {
      const fileInput = form.querySelector('#goal-image-file');
      const hidden = form.querySelector('#goal-image-data');
      const preview = form.querySelector('#goal-image-preview');
      if (fileInput) {
        fileInput.addEventListener('change', () => {
          const file = fileInput.files && fileInput.files[0];
          if (!file) return;
          readImageFile(file, 640, 0.82, (dataUrl) => {
            if (!dataUrl) {
              toast('图片读取失败', 'err');
              return;
            }
            hidden.value = dataUrl;
            preview.innerHTML = '<img src="' + esc(dataUrl) + '" alt="">';
          });
        });
      }
      const clear = form.querySelector('#goal-image-clear');
      if (clear) {
        clear.addEventListener('click', () => {
          hidden.value = '';
          preview.innerHTML = '<span class="tiny muted">未选择</span>';
        });
      }
    },
    onSubmit(data) {
      const title = String(data.title || '').trim();
      if (!title) {
        toast('请填写项目', 'err');
        return false;
      }
      const category = ensureStudyCategory(data.category);
      const payload = {
        title: title,
        category: category,
        image: String(data.image || ''),
        subject: String(data.subject || '').trim(),
        deadline: data.deadline || '',
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(goal, payload);
        delete goal.targetHours;
        delete goal.status;
      } else {
        Store.data.study.goals.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast(editing ? '项目已更新' : '项目已添加');
      App.refresh();
    },
  });
}
