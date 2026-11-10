'use strict';

/* =========================================================
   饮食计划 · 一日搭配 + 热量
   ========================================================= */

const MEAL_SHARE = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

/* 常见食物热量基准（每 100g / 每个），只求大概，够用就行 */
const FOOD_KCAL_TABLE = [
  { keys: ['鸡腿'], per100: 210, unitKcal: 230, gramsPerUnit: 110 },
  { keys: ['鸡胸'], per100: 133, gramsPerUnit: 120 },
  { keys: ['鸡蛋', '蛋'], per100: 144, unitKcal: 70, gramsPerUnit: 50 },
  { keys: ['米饭'], per100: 116, gramsPerUnit: 200 },
  { keys: ['粥'], per100: 46, gramsPerUnit: 300 },
  { keys: ['面条', '面', '粉'], per100: 110, gramsPerUnit: 250 },
  { keys: ['燕麦'], per100: 380, gramsPerUnit: 50 },
  { keys: ['牛奶'], per100: 60, unitKcal: 120, gramsPerUnit: 200 },
  { keys: ['酸奶'], per100: 70, unitKcal: 100, gramsPerUnit: 150 },
  { keys: ['奶茶'], per100: 70, unitKcal: 350, gramsPerUnit: 500 },
  { keys: ['拿铁'], per100: 50, unitKcal: 180, gramsPerUnit: 350 },
  { keys: ['咖啡', '美式'], per100: 2, unitKcal: 5, gramsPerUnit: 250 },
  { keys: ['可乐'], per100: 42, unitKcal: 140, gramsPerUnit: 330 },
  { keys: ['橙汁', '果汁', '汁'], per100: 45, unitKcal: 110, gramsPerUnit: 250 },
  { keys: ['香蕉'], per100: 93, unitKcal: 90, gramsPerUnit: 100 },
  { keys: ['苹果'], per100: 52, unitKcal: 80, gramsPerUnit: 160 },
  { keys: ['西兰花'], per100: 34, gramsPerUnit: 100 },
  { keys: ['沙拉', '蔬菜', '菜'], per100: 30, gramsPerUnit: 150 },
  { keys: ['牛肉'], per100: 125, gramsPerUnit: 150 },
  { keys: ['猪肉'], per100: 143, gramsPerUnit: 150 },
  { keys: ['三文鱼', '鱼'], per100: 140, gramsPerUnit: 150 },
  { keys: ['面包'], per100: 250, unitKcal: 120, gramsPerUnit: 40 },
];

function parseFoodGrams(text) {
  const m = /(\d+(?:\.\d+)?)\s*(?:g|克)/i.exec(String(text || ''));
  return m ? Number(m[1]) : 0;
}

function parseFoodQty(text) {
  const unit = /(\d+(?:\.\d+)?)\s*(?:个|只|根|片|杯|碗|罐|份|块|勺)/.exec(String(text || ''));
  if (unit) return Number(unit[1]);
  const any = /(\d+(?:\.\d+)?)/.exec(String(text || ''));
  return any ? Number(any[1]) : 1;
}

function detailKcalFactor(detail) {
  const d = String(detail || '');
  let f = 1;
  if (d.indexOf('去皮') >= 0) f *= 0.72;
  if (d.indexOf('带皮') >= 0) f *= 1.12;
  if (d.indexOf('无糖') >= 0) f *= 0.6;
  else if (d.indexOf('少糖') >= 0) f *= 0.8;
  else if (d.indexOf('全糖') >= 0) f *= 1.1;
  if (d.indexOf('水煮') >= 0) f *= 0.9;
  else if (d.indexOf('蒸') >= 0) f *= 0.92;
  else if (d.indexOf('煎') >= 0) f *= 1.1;
  else if (d.indexOf('炸') >= 0) f *= 1.3;
  else if (d.indexOf('烤') >= 0) f *= 1.05;
  if (d.indexOf('大份') >= 0) f *= 1.3;
  if (d.indexOf('小份') >= 0) f *= 0.7;
  return f;
}

/* 粗略估算：食物基准 × 分量 × 做法系数 */
function estimateFoodCalories(name, portion, detail) {
  const text = String(name || '');
  let entry = null;
  for (const row of FOOD_KCAL_TABLE) {
    if (row.keys.some((k) => text.indexOf(k) >= 0)) {
      entry = row;
      break;
    }
  }
  if (!entry) entry = { per100: 80, gramsPerUnit: 150 };
  const grams = parseFoodGrams(portion);
  let kcal;
  if (grams) {
    kcal = (entry.per100 * grams) / 100;
  } else {
    const qty = parseFoodQty(portion);
    if (entry.unitKcal) kcal = entry.unitKcal * qty;
    else kcal = (entry.per100 * (entry.gramsPerUnit || 100) * qty) / 100;
  }
  return Math.max(0, Math.round(kcal * detailKcalFactor(detail)));
}

function dietFoodKcal(food) {
  if (food.calories !== undefined && food.calories !== null && food.calories !== '') {
    return Math.max(0, Number(food.calories) || 0);
  }
  return estimateFoodCalories(food.name, food.portion, food.detail);
}

function dietItemKcal(item) {
  if (item.calories !== undefined && item.calories !== null && item.calories !== '') return Number(item.calories) || 0;
  const food = (Store.data.diet.foods || []).filter((f) => f.name === item.name)[0];
  if (food) return dietFoodKcal(food);
  return estimateFoodCalories(item.name, item.portion, item.detail);
}

function dietMealKcal(items) {
  return sumBy(items, (m) => dietItemKcal(m));
}

function dietTotalKcal(meals) {
  return dietMealKcal(meals);
}

function dietBmi(weight, height) {
  if (!weight || !height) return 0;
  return weight / Math.pow(height / 100, 2);
}

function dietBmiTone(bmi) {
  if (!bmi) return { label: '未设置', tone: 'gray' };
  if (bmi < 18.5) return { label: '偏瘦', tone: 'amber' };
  if (bmi < 24) return { label: '正常', tone: 'green' };
  if (bmi < 28) return { label: '偏高', tone: 'amber' };
  return { label: '偏高较多', tone: 'red' };
}

function dietCalendarBlock(mk, meals, water, selected, today) {
  const cells = monthGrid(mk);
  const week = ['一', '二', '三', '四', '五', '六', '日'];
  return (
    '<section class="card cal-compact"><div class="card-head"><div><h2>饮食日历</h2>' +
    '<p class="card-sub">点某一天，查看当天的搭配和饮水</p></div></div>' +
    '<div class="cal-week">' + week.map((w) => '<span>' + w + '</span>').join('') + '</div>' +
    '<div class="cal-grid cal-grid-diet">' +
    cells
      .map((date) => {
        if (!date) return '<span class="cal-cell empty"></span>';
        const dayMeals = meals.filter((m) => m.date === date);
        const dots = ['breakfast', 'lunch', 'dinner']
          .map((type) => '<i class="' + (dayMeals.some((m) => m.type === type) ? 'on' : '') + '"></i>')
          .join('');
        const waterMl = Number(water[date]) || 0;
        return (
          '<button class="cal-cell diet-cal' + (dayMeals.length ? ' has' : '') +
          (date === today ? ' today' : '') + (date === selected ? ' selected' : '') +
          '" data-act="pickDay" data-date="' + date + '">' +
          '<span class="cal-day">' + parseDate(date).getDate() + '</span>' +
          '<span class="diet-dots">' + dots + '</span>' +
          (waterMl ? '<span class="cal-water" title="饮水 ' + waterMl + ' ml"></span>' : '') +
          (dayMeals.length ? '<span class="diet-kcal">' + dietMealKcal(dayMeals) + '</span>' : '') +
          '</button>'
        );
      })
      .join('') +
    '</div></section>'
  );
}

Pages.diet = {
  date: todayKey(),

  render(el) {
    const d = Store.data;
    const date = this.date;
    const isToday = date === todayKey();
    const mk = this.month || (this.month = monthKeyOf(date));
    if (monthKeyOf(date) !== mk) this.month = monthKeyOf(date);

    const monthMeals = d.diet.meals.filter((m) => m.date.indexOf(this.month) === 0);
    const meals = d.diet.meals.filter((m) => m.date === date);
    const totalKcal = dietTotalKcal(meals);
    const target = Number(d.settings.calorieGoal) || 0;
    const remainder = target - totalKcal;
    const ratio = target ? Math.min(100, Math.round((totalKcal / target) * 100)) : 0;

    const water = Number(d.diet.water[date]) || 0;
    const missingKcal = d.diet.foods.filter(
      (f) => f.calories === undefined || f.calories === null || f.calories === ''
    ).length;
    const coffeeCups = Number((d.diet.coffee || {})[date]) || 0;
    const caffeine = coffeeCups * 80;
    const goal = Number(d.settings.waterGoal) || 2000;
    const cupMl = Number(d.settings.waterCup) || 250;
    const cups = Math.max(1, Math.ceil(goal / cupMl));
    const filledCups = Math.min(cups, Math.floor(water / cupMl));

    const metrics = d.body.metrics.slice().sort(byDateAsc);
    const latest = metrics[metrics.length - 1];
    const weight = latest ? Number(latest.weight) || 0 : 0;
    const height = Number(d.settings.height) || 0;
    const bmi = dietBmi(weight, height);
    const bmiInfo = dietBmiTone(bmi);

    el.innerHTML =
      pageHead(
        '饮食计划',
        fmtDateCN(date, true) + ' · 今日搭配 ' + totalKcal + ' kcal' + (target ? ' / ' + target : ''),
        '<div class="month-nav">' +
          '<button class="icon-btn" data-act="prev" aria-label="前一天">' + icon('chevronL') + '</button>' +
          '<input class="input" type="date" id="diet-date" value="' + esc(date) + '" style="width:140px;height:34px">' +
          '<button class="icon-btn" data-act="next" aria-label="后一天">' + icon('chevronR') + '</button>' +
          (isToday ? '' : '<button class="btn sm" data-act="today">今天</button>') +
          '</div>' +
          '<button class="btn primary" data-act="addFood">' + icon('plus') + '添加搭配</button>'
      ) +

      '<section class="card calorie-card">' +
      '<div class="calorie-row">' +
      '<div><div class="calorie-label">今日搭配热量</div>' +
      '<div class="calorie-value">' + totalKcal + '<small> kcal</small></div></div>' +
      '<div class="calorie-side">' +
      (target
        ? '<span class="chip ' + (remainder >= 0 ? 'green' : 'red') + '">' +
          (remainder >= 0 ? '还剩 ' + remainder + ' kcal' : '超出 ' + -remainder + ' kcal') + '</span>' +
          '<span class="tiny muted">目标 ' + target + ' kcal · ' + ratio + '%</span>'
        : '<span class="chip amber">还没有设热量目标</span><span class="tiny muted">在「身高体重」里设置</span>') +
      '</div></div>' +
      '<div class="calorie-bar"><i class="' + (remainder < 0 ? 'over' : '') + '" style="width:' + ratio + '%"></i></div>' +
      '<div class="calorie-meals">' +
      MEALS.map((m) => {
        const kcal = dietMealKcal(meals.filter((x) => x.type === m.value));
        return '<span><b>' + esc(m.label) + '</b> ' + kcal + ' kcal</span>';
      }).join('') +
      '</div></section>' +

      '<div class="grid grid-4 mt-16">' +
      statCard({ label: '今日热量', dot: true, value: totalKcal + '<small>kcal</small>', sub: target ? '目标 ' + target + ' · 剩 ' + Math.max(0, remainder) : '还没有设目标' }) +
      statCard({ label: '饮水', dot: true, value: water + '<small>ml</small>', sub: '目标 ' + goal + ' ml · ' + filledCups + '/' + cups + ' 杯' }) +
      statCard({ label: '身高', dot: true, value: height ? height + '<small>cm</small>' : '—', sub: height ? '在下方可以修改' : '填身高后可以算 BMI' }) +
      statCard({
        label: '体重',
        dot: true,
        value: weight ? weight + '<small>kg</small>' : '—',
        sub: bmi ? 'BMI ' + bmi.toFixed(1) + ' · ' + bmiInfo.label : latest ? fmtDateCN(latest.date) : '在下方记录',
      }) +
      '</div>' +

      '<div class="grid diet-cols mt-16">' +
      '<div class="stack">' +
      '<section class="card"><div class="card-head"><div><h2>' + (isToday ? '今日搭配' : fmtDateCN(date, true) + ' 的搭配') + '</h2>' +
      '<p class="card-sub">按餐次排好吃什么；也可以把常吃食物拖进某一餐</p></div>' +
      '<button class="btn ghost sm" data-act="addFood">+ 添加</button></div>' +
      MEALS.map((meal) => {
        const items = meals.filter((m) => m.type === meal.value);
        const kcal = dietMealKcal(items);
        const share = target ? Math.round(target * MEAL_SHARE[meal.value]) : 0;
        const fill = share ? Math.min(100, Math.round((kcal / share) * 100)) : 0;
        return (
          '<div class="meal" data-meal="' + meal.value + '">' +
          '<div class="meal-head"><span class="meal-name">' + esc(meal.label) +
          '<span class="meal-kcal">' + kcal + ' kcal' + (share ? ' / ' + share : '') + '</span></span>' +
          '<button class="btn ghost sm" data-act="addFood" data-type="' + meal.value + '">+ 添加</button></div>' +
          (share ? '<div class="meal-bar"><i class="' + (kcal > share ? 'over' : '') + '" style="width:' + fill + '%"></i></div>' : '') +
          '<div class="meal-items">' +
          (items.length
            ? items
                .map(
                  (item) =>
                    '<span class="food-pill"><span class="food-ico">' + foodArt(item.name) + '</span>' +
                    esc(item.name) + (item.portion ? ' · ' + esc(item.portion) : '') +
                    (item.detail ? ' · ' + esc(item.detail) : '') +
                    (dietItemKcal(item) ? ' <b class="pill-kcal">' + dietItemKcal(item) + ' kcal</b>' : '') +
                    '<button data-act="delFood" data-id="' + item.id + '" aria-label="删除">' + icon('x') + '</button></span>'
                )
                .join('')
            : '<span class="tiny muted">还没安排</span>') +
          '</div></div>'
        );
      }).join('') +
      '</section>' +
      '<section class="card"><div class="card-head"><div><h2>常吃食物</h2>' +
      '<p class="card-sub">每份热量按食物和分量计算，拖进某一餐就会自动累计</p></div>' +
      (missingKcal ? '<button class="btn ghost sm" data-act="recalcFoods">补算热量</button>' : '') +
      '<button class="btn ghost sm" data-act="addFav">+ 新增</button></div>' +
      (d.diet.foods.length
        ? '<div class="food-grid">' +
          d.diet.foods
            .map(
              (f) => {
                const estimated = f.calories === undefined || f.calories === null || f.calories === '';
                return (
                '<div class="food-card" draggable="true" data-food-id="' + f.id + '" title="拖到早餐/午餐/晚餐/加餐里">' +
                '<span class="food-thumb">' + foodArt(f.name, f.category) + '</span>' +
                '<span class="food-meta"><b>' + esc(f.name) + '</b><span>' + esc(f.portion || '') +
                ' · ' + (estimated ? '≈' : '') + dietFoodKcal(f) + ' kcal</span></span>' +
                '<button class="icon-btn danger" data-act="delFav" data-id="' + f.id + '" aria-label="删除">' + icon('trash') + '</button></div>'
                );
              }
            )
            .join('') +
          '</div>'
        : emptyState('还没有常吃食物', '把每天都会吃的东西存起来，排搭配会快很多')) +
      '</section>' +
      '</div>' +

      '<div class="stack">' +
      dietCalendarBlock(this.month, monthMeals, d.diet.water, date, todayKey()) +
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

      '<section class="card coffee-card"><div class="card-head"><div><h2>咖啡</h2>' +
      '<p class="card-sub">约 80 mg 咖啡因 / 杯</p></div>' +
      '<span class="chip amber">' + coffeeCups + ' 杯</span></div>' +
      '<div class="coffee-body">' +
      '<div class="coffee-big"><span class="coffee-ico">' + icon('coffee') + '</span>' +
      '<b>' + coffeeCups + '<small>杯</small></b></div>' +
      '<div class="coffee-meta">今天约 <b>' + caffeine + '</b> mg 咖啡因' +
      '<br><span class="tiny muted">建议不超过 2 杯</span></div>' +
      '</div>' +
      '<div class="flex gap-8 mt-12">' +
      '<button class="btn sm" data-act="coffeeMinus" style="flex:1">− 1 杯</button>' +
      '<button class="btn primary sm" data-act="coffeePlus" style="flex:1">+ 1 杯</button>' +
      '</div>' +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>身高体重</h2>' +
      '<p class="card-sub">用来算 BMI；体重会和健身模块共用一份数据</p></div></div>' +
      '<form id="body-form">' +
      fRow3(
        fNumber('height', '身高（cm）', { value: height || '', min: 0, max: 250, step: 1, placeholder: '例如 175' }),
        fNumber('weight', '体重（kg）', { value: weight || '', min: 0, max: 300, step: '0.1', placeholder: '例如 70' }),
        fNumber('calorieGoal', '每日热量目标（kcal）', { value: target, min: 0, max: 6000, step: 50 })
      ) +
      '<div class="bmi-row">' +
      '<span class="tiny muted">BMI</span> <b class="bmi-value">' + (bmi ? bmi.toFixed(1) : '—') + '</b>' +
      '<span class="chip ' + bmiInfo.tone + '">' + bmiInfo.label + '</span>' +
      (latest ? '<span class="tiny muted">体重记录于 ' + fmtDateCN(latest.date) + '</span>' : '') +
      '</div>' +
      '<div class="flex-between mt-12"><span class="tiny muted">填 0 或留空表示不设目标</span>' +
      '<button class="btn sm primary" type="submit">保存</button></div>' +
      '</form></section>' +
      '</div>' +
      '</div>';

    bind(el, {
      prev() {
        Pages.diet.date = addDays(Pages.diet.date, -1);
        Pages.diet.month = monthKeyOf(Pages.diet.date);
        App.refresh();
      },
      next() {
        Pages.diet.date = addDays(Pages.diet.date, 1);
        Pages.diet.month = monthKeyOf(Pages.diet.date);
        App.refresh();
      },
      pickDay(node) {
        Pages.diet.date = node.dataset.date;
        Pages.diet.month = monthKeyOf(node.dataset.date);
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
      coffeePlus() {
        const day = Pages.diet.date;
        Store.data.diet.coffee = Store.data.diet.coffee || {};
        Store.data.diet.coffee[day] = Math.min(6, (Number(Store.data.diet.coffee[day]) || 0) + 1);
        Store.save();
        App.refresh();
      },
      coffeeMinus() {
        const day = Pages.diet.date;
        Store.data.diet.coffee = Store.data.diet.coffee || {};
        Store.data.diet.coffee[day] = Math.max(0, (Number(Store.data.diet.coffee[day]) || 0) - 1);
        Store.save();
        App.refresh();
      },
      recalcFoods() {
        let n = 0;
        Store.data.diet.foods.forEach((f) => {
          if (f.calories === undefined || f.calories === null || f.calories === '') {
            f.calories = dietFoodKcal(f);
            n++;
          }
        });
        Store.save();
        toast('已补算 ' + n + ' 项常吃食物的热量');
        App.refresh();
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

    setupDietDnD(el);

    const dateInput = el.querySelector('#diet-date');
    dateInput.addEventListener('change', () => {
      if (!dateInput.value) return;
      Pages.diet.date = dateInput.value;
      Pages.diet.month = monthKeyOf(dateInput.value);
      App.refresh();
    });

    const bodyForm = el.querySelector('#body-form');
    bodyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {};
      new FormData(bodyForm).forEach((value, key) => {
        data[key] = value;
      });
      const nextHeight = Number(data.height) || 0;
      const nextWeight = Number(data.weight) || 0;
      const nextGoal = Number(data.calorieGoal) || 0;
      if (nextHeight < 0 || nextHeight > 250) {
        toast('身高请填 0–250 cm', 'err');
        return;
      }
      if (nextWeight < 0 || nextWeight > 300) {
        toast('体重请填 0–300 kg', 'err');
        return;
      }
      if (nextGoal < 0 || nextGoal > 6000) {
        toast('热量目标请填 0–6000 kcal', 'err');
        return;
      }
      Store.data.settings.height = nextHeight;
      Store.data.settings.calorieGoal = nextGoal;
      if (nextWeight > 0) {
        const day = todayKey();
        const existing = Store.data.body.metrics.filter((m) => m.date === day)[0];
        if (existing) {
          existing.weight = nextWeight;
        } else {
          Store.data.body.metrics.push({ id: uid(), date: day, weight: nextWeight, createdAt: Date.now() });
        }
      }
      Store.save();
      toast('身高体重已保存');
      App.refresh();
    });
  },
};

/* ---------------- 拖拽食物进餐次 ---------------- */

function setupDietDnD(root) {
  let dragFoodId = null;
  const cards = root.querySelectorAll('[data-food-id]');
  const meals = root.querySelectorAll('.meal[data-meal]');

  function clearHover() {
    meals.forEach((meal) => meal.classList.remove('drop-hover'));
  }

  cards.forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      dragFoodId = card.dataset.foodId;
      card.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copy';
        try {
          event.dataTransfer.setData('text/plain', 'food:' + dragFoodId);
        } catch (err) {
          /* ignore */
        }
      }
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragFoodId = null;
      clearHover();
    });
  });

  meals.forEach((meal) => {
    meal.addEventListener('dragover', (event) => {
      event.preventDefault();
      meal.classList.add('drop-hover');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    meal.addEventListener('dragleave', () => meal.classList.remove('drop-hover'));
    meal.addEventListener('drop', (event) => {
      event.preventDefault();
      meal.classList.remove('drop-hover');
      let foodId = dragFoodId;
      if (!foodId && event.dataTransfer) {
        try {
          const raw = event.dataTransfer.getData('text/plain') || '';
          if (raw.indexOf('food:') === 0) foodId = raw.slice(5);
        } catch (err) {
          /* ignore */
        }
      }
      const food = findById(Store.data.diet.foods, foodId);
      const type = meal.dataset.meal;
      if (!food || !type) return;
      Store.data.diet.meals.push({
        id: uid(),
        date: Pages.diet.date,
        type: type,
        name: food.name,
        portion: food.portion || '',
        calories: dietFoodKcal(food),
        createdAt: Date.now(),
      });
      Store.save();
      const mealLabel = optionLabel(MEALS, type);
      toast('已把「' + food.name + '」排进' + mealLabel);
      App.refresh();
    });
  });
}

/* ---------------- 弹窗 ---------------- */

function openFoodModal(date, presetType) {
  const d = Store.data;
  const foods = d.diet.foods;
  openModal({
    title: '添加搭配',
    size: 'small',
    body:
      fRow(fDate('date', '日期', date), fSelect('type', '餐次', MEALS, presetType || 'breakfast')) +
      fInput('name', '吃什么', { placeholder: '例如：鸡蛋', required: true, maxlength: 40 }) +
      fRow(
        fInput('portion', '分量', { placeholder: '例如：1 个 / 200 g', maxlength: 30 }),
        fNumber('calories', '热量（kcal）', { value: '', min: 0, step: 1, placeholder: '留空自动估算' })
      ) +
      fSelect(
        'detail',
        '小细节（可选）',
        [
          { value: '', label: '不用' },
          { value: '去皮', label: '去皮' },
          { value: '带皮', label: '带皮' },
          { value: '少糖', label: '少糖' },
          { value: '无糖', label: '无糖' },
          { value: '全糖', label: '全糖' },
          { value: '水煮', label: '水煮' },
          { value: '蒸', label: '蒸' },
          { value: '煎', label: '煎' },
          { value: '炸', label: '炸' },
          { value: '烤', label: '烤' },
          { value: '大份', label: '大份' },
          { value: '小份', label: '小份' },
        ],
        ''
      ) +
      '<div class="kcal-hint tiny muted" id="kcal-estimate">热量留空时，会按常见食物和分量估算</div>' +
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
      const nameEl = form.elements.name;
      const portionEl = form.elements.portion;
      const detailEl = form.elements.detail;
      const hint = form.querySelector('#kcal-estimate');
      const updateHint = () => {
        if (!hint) return;
        const est = estimateFoodCalories(nameEl.value, portionEl.value, detailEl ? detailEl.value : '');
        hint.textContent = nameEl.value
          ? '按常见食物估算约 ' + est + ' kcal（热量留空会自动填这个数）'
          : '热量留空时，会按常见食物和分量估算';
      };
      if (nameEl) nameEl.addEventListener('input', updateHint);
      if (portionEl) portionEl.addEventListener('input', updateHint);
      if (detailEl) detailEl.addEventListener('change', updateHint);

      form.querySelectorAll('[data-food]').forEach((chip) => {
        chip.addEventListener('click', () => {
          const food = findById(foods, chip.dataset.food);
          if (!food) return;
          nameEl.value = food.name;
          portionEl.value = food.portion || '';
          form.elements.calories.value = Number(food.calories) || '';
          nameEl.focus();
          updateHint();
        });
      });
    },
    onSubmit(data) {
      const name = String(data.name || '').trim();
      if (!name) {
        toast('请填写吃什么', 'err');
        return false;
      }
      const portion = String(data.portion || '').trim();
      const detail = String(data.detail || '').trim();
      const rawKcal = String(data.calories || '').trim();
      const calories = rawKcal !== '' ? Math.max(0, Number(rawKcal) || 0) : estimateFoodCalories(name, portion, detail);
      Store.data.diet.meals.push({
        id: uid(),
        date: data.date || todayKey(),
        type: data.type || 'breakfast',
        name: name,
        portion: portion,
        detail: detail,
        calories: calories,
        createdAt: Date.now(),
      });
      Store.save();
      toast('已加入搭配');
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
      fRow(
        fInput('portion', '常用分量', { placeholder: '例如：100 g', maxlength: 30 }),
        fNumber('calories', '热量（kcal）', { value: '', min: 0, step: 1, placeholder: '例如：165' })
      ) +
      fSelect('category', '分类', FOOD_CATEGORIES, '其他') +
      '<div class="kcal-hint tiny muted" id="fav-kcal-estimate">热量留空时，会按食物和分量自动估算</div>',
    onMount(form) {
      const nameEl = form.elements.name;
      const portionEl = form.elements.portion;
      const hint = form.querySelector('#fav-kcal-estimate');
      const updateHint = () => {
        if (!hint) return;
        const est = estimateFoodCalories(nameEl.value, portionEl.value, '');
        hint.textContent = nameEl.value
          ? '按常见食物估算约 ' + est + ' kcal（热量留空会自动填）'
          : '热量留空时，会按食物和分量自动估算';
      };
      if (nameEl) nameEl.addEventListener('input', updateHint);
      if (portionEl) portionEl.addEventListener('input', updateHint);
    },
    onSubmit(data) {
      const name = String(data.name || '').trim();
      if (!name) {
        toast('请填写食物名称', 'err');
        return false;
      }
      const portion = String(data.portion || '').trim();
      const rawKcal = String(data.calories || '').trim();
      Store.data.diet.foods.push({
        id: uid(),
        name: name,
        portion: portion,
        calories: rawKcal !== '' ? Math.max(0, Number(rawKcal) || 0) : estimateFoodCalories(name, portion, ''),
        category: data.category || foodCategoryOf(name),
      });
      Store.save();
      toast('已加入常吃食物');
      App.refresh();
    },
  });
}
