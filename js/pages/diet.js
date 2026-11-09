'use strict';

/* =========================================================
   饮食计划
   ========================================================= */

Pages.diet = {
  date: todayKey(),

  render(el) {
    const d = Store.data;
    const date = this.date;
    const isToday = date === todayKey();
    const meals = d.diet.meals.filter((m) => m.date === date);
    const mainMeals = ['breakfast', 'lunch', 'dinner'];
    const recorded = mainMeals.filter((type) => meals.some((m) => m.type === type)).length;

    const water = Number(d.diet.water[date]) || 0;
    const goal = Number(d.settings.waterGoal) || 2000;
    const cupMl = Number(d.settings.waterCup) || 250;
    const cups = Math.max(1, Math.ceil(goal / cupMl));
    const filledCups = Math.min(cups, Math.floor(water / cupMl));

    const weekStart = weekStartKey(todayKey());
    const weekDays = {};
    d.diet.meals.forEach((m) => {
      if (m.date >= weekStart && m.date <= todayKey()) weekDays[m.date] = true;
    });

    const metrics = d.body.metrics.slice().sort(byDateAsc);
    const latest = metrics[metrics.length - 1];
    const chartPoints = metrics.slice(-14).map((m) => ({ label: fmtShortDate(m.date), value: Number(m.weight) || 0 }));

    el.innerHTML =
      pageHead(
        '饮食计划',
        fmtDateCN(date, true) + ' · 已记录 ' + recorded + '/3 餐',
        '<div class="month-nav">' +
          '<button class="icon-btn" data-act="prev" aria-label="前一天">' + icon('chevronL') + '</button>' +
          '<input class="input" type="date" id="diet-date" value="' + esc(date) + '" style="width:140px;height:34px">' +
          '<button class="icon-btn" data-act="next" aria-label="后一天">' + icon('chevronR') + '</button>' +
          (isToday ? '' : '<button class="btn sm" data-act="today">今天</button>') +
          '</div>' +
          '<button class="btn primary" data-act="addFood">' + icon('plus') + '添加饮食</button>'
      ) +

      '<div class="grid grid-4">' +
      statCard({ label: '当日餐数', dot: true, value: recorded + '<small>/ 3 餐</small>', sub: meals.length ? '共 ' + meals.length + ' 项食物' : '还没有记录饮食' }) +
      statCard({ label: '当日饮水', dot: true, value: water + '<small>ml</small>', sub: '目标 ' + goal + ' ml · ' + filledCups + '/' + cups + ' 杯' }) +
      statCard({ label: '本周记录', dot: true, value: Object.keys(weekDays).length + '<small>天</small>', sub: '有饮食记录的天数' }) +
      statCard({
        label: '最新体重',
        dot: true,
        value: latest ? latest.weight + '<small>kg</small>' : '—',
        sub: latest ? fmtDateCN(latest.date) : '到健身或下方记录',
      }) +
      '</div>' +

      '<div class="grid diet-cols mt-16">' +
      '<section class="card"><div class="card-head"><div><h2>' + (isToday ? '今日饮食' : fmtDateCN(date, true) + ' 的饮食') + '</h2>' +
      '<p class="card-sub">按餐次记录，随时补充</p></div></div>' +
      MEALS.map((meal) => {
        const items = meals.filter((m) => m.type === meal.value);
        return (
          '<div class="meal"><div class="meal-head"><span class="meal-name">' + esc(meal.label) +
          (items.length ? ' <span class="chip gray">' + items.length + ' 项</span>' : '') + '</span>' +
          '<button class="btn ghost sm" data-act="addFood" data-type="' + meal.value + '">+ 添加</button></div>' +
          '<div class="meal-items">' +
          (items.length
            ? items
                .map(
                  (item) =>
                    '<span class="food-pill">' + esc(item.name) + (item.portion ? ' · ' + esc(item.portion) : '') +
                    '<button data-act="delFood" data-id="' + item.id + '" aria-label="删除">' + icon('x') + '</button></span>'
                )
                .join('')
            : '<span class="tiny muted">还没有记录</span>') +
          '</div></div>'
        );
      }).join('') +
      '</section>' +

      '<div class="stack">' +
      '<section class="card"><div class="card-head"><div><h2>饮水</h2>' +
      '<p class="card-sub">' + water + ' / ' + goal + ' ml</p></div>' +
      '<span class="chip teal">' + filledCups + ' / ' + cups + ' 杯</span></div>' +
      '<div class="progress-row"><div class="progress"><div class="progress-fill" style="width:' + pct(water, goal) + '%"></div></div>' +
      '<span class="progress-pct">' + pct(water, goal) + '%</span></div>' +
      '<div class="water-cups mt-12">' +
      Array.from({ length: cups })
        .map((_, i) => '<span class="cup' + (i < filledCups ? ' on' : '') + '"></span>')
        .join('') +
      '</div>' +
      '<div class="flex gap-8 mt-12">' +
      '<button class="btn sm" data-act="waterMinus" style="flex:1">− ' + cupMl + ' ml</button>' +
      '<button class="btn primary sm" data-act="waterPlus" style="flex:1">+ ' + cupMl + ' ml</button>' +
      '</div>' +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>体重趋势</h2>' +
      '<p class="card-sub">和健身模块共用</p></div>' +
      '<button class="btn ghost sm" data-act="addWeight">+ 记录</button></div>' +
      (chartPoints.length >= 2
        ? lineChart(chartPoints, { height: 120, rangeText: '最低 ' + Math.min(...chartPoints.map((p) => p.value)) + ' · 最高 ' + Math.max(...chartPoints.map((p) => p.value)) + ' kg' })
        : emptyState('还没有足够的体重记录', '记录两次以上就能看到趋势')) +
      '</section>' +
      '</div>' +
      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>常吃食物</h2>' +
      '<p class="card-sub">添加饮食时可以一键带入</p></div>' +
      '<button class="btn ghost sm" data-act="addFav">+ 新增</button></div>' +
      (d.diet.foods.length
        ? '<div class="food-chips">' +
          d.diet.foods
            .map(
              (f) =>
                '<span class="food-pill">' + esc(f.name) + (f.portion ? ' · ' + esc(f.portion) : '') +
                '<button data-act="delFav" data-id="' + f.id + '" aria-label="删除">' + icon('x') + '</button></span>'
            )
            .join('') +
          '</div>'
        : emptyState('还没有常吃食物', '把每天都会吃的东西存起来，记录会快很多')) +
      '</section>';

    bind(el, {
      prev() {
        Pages.diet.date = addDays(Pages.diet.date, -1);
        App.refresh();
      },
      next() {
        Pages.diet.date = addDays(Pages.diet.date, 1);
        App.refresh();
      },
      today() {
        Pages.diet.date = todayKey();
        App.refresh();
      },
      addFood(node) {
        openFoodModal(Pages.diet.date, node.dataset.type || 'breakfast');
      },
      delFood(node) {
        removeById(Store.data.diet.meals, node.dataset.id);
        Store.save();
        App.refresh();
      },
      waterPlus() {
        const day = Pages.diet.date;
        Store.data.diet.water[day] = Math.min(goal, (Number(Store.data.diet.water[day]) || 0) + cupMl);
        Store.save();
        App.refresh();
      },
      waterMinus() {
        const day = Pages.diet.date;
        Store.data.diet.water[day] = Math.max(0, (Number(Store.data.diet.water[day]) || 0) - cupMl);
        Store.save();
        App.refresh();
      },
      addWeight() {
        openMetricModal(null);
      },
      addFav() {
        openFavFoodModal();
      },
      delFav(node) {
        removeById(Store.data.diet.foods, node.dataset.id);
        Store.save();
        App.refresh();
      },
    });

    const dateInput = el.querySelector('#diet-date');
    dateInput.addEventListener('change', () => {
      if (!dateInput.value) return;
      Pages.diet.date = dateInput.value;
      App.refresh();
    });
  },
};

/* ---------------- 弹窗 ---------------- */

function openFoodModal(date, presetType) {
  const d = Store.data;
  const foods = d.diet.foods;
  openModal({
    title: '添加饮食',
    size: 'small',
    body:
      fRow(fDate('date', '日期', date), fSelect('type', '餐次', MEALS, presetType || 'breakfast')) +
      fInput('name', '吃什么', { placeholder: '例如：鸡蛋', required: true, maxlength: 40 }) +
      fInput('portion', '分量', { placeholder: '例如：1 个 / 200 g', maxlength: 30 }) +
      (foods.length
        ? '<div class="field"><span class="field-label">常吃食物（点一下填入）</span><div class="food-chips">' +
          foods
            .map(
              (f) =>
                '<button type="button" class="food-chip" data-food="' + f.id + '">' + esc(f.name) + '</button>'
            )
            .join('') +
          '</div></div>'
        : ''),
    onMount(form) {
      form.querySelectorAll('[data-food]').forEach((chip) => {
        chip.addEventListener('click', () => {
          const food = findById(foods, chip.dataset.food);
          if (!food) return;
          form.elements.name.value = food.name;
          form.elements.portion.value = food.portion || '';
          form.elements.name.focus();
        });
      });
    },
    onSubmit(data) {
      const name = String(data.name || '').trim();
      if (!name) {
        toast('请填写吃了什么', 'err');
        return false;
      }
      Store.data.diet.meals.push({
        id: uid(),
        date: data.date || todayKey(),
        type: data.type || 'breakfast',
        name: name,
        portion: String(data.portion || '').trim(),
        createdAt: Date.now(),
      });
      Store.save();
      toast('已记录 ' + name);
      App.refresh();
    },
  });
}

function openFavFoodModal() {
  openModal({
    title: '新增常吃食物',
    size: 'small',
    body:
      fInput('name', '食物名称', { placeholder: '例如：鸡胸肉', required: true, maxlength: 30 }) +
      fInput('portion', '常用分量', { placeholder: '例如：100 g', maxlength: 30 }),
    onSubmit(data) {
      const name = String(data.name || '').trim();
      if (!name) {
        toast('请填写食物名称', 'err');
        return false;
      }
      Store.data.diet.foods.push({ id: uid(), name: name, portion: String(data.portion || '').trim() });
      Store.save();
      toast('已加入常吃食物');
      App.refresh();
    },
  });
}
