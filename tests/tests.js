'use strict';

/* =========================================================
   工作台自动化测试
   在 tests/test.html 中加载，结果写入 #results
   ========================================================= */

const TESTS = [];

function test(name, fn) {
  TESTS.push({ name: name, fn: fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || '断言失败');
}

function eq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message || '') + ' 期望 ' + JSON.stringify(expected) + '，实际 ' + JSON.stringify(actual));
  }
}

function includes(haystack, needle, message) {
  if (String(haystack).indexOf(needle) === -1) {
    throw new Error((message || '') + ' 文本里找不到「' + needle + '」');
  }
}

function tick(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms || 0));
}

function resetData() {
  Store.reset();
  App.route = 'home';
  App.render();
}

function showPage(route) {
  App.route = route;
  App.render();
}

function css(selector, prop) {
  const el = document.querySelector(selector);
  if (!el) throw new Error('找不到元素 ' + selector);
  return getComputedStyle(el)[prop];
}

function mainText() {
  return document.getElementById('main').innerText || '';
}

window.__testErrors = [];
window.addEventListener('error', (e) => {
  window.__testErrors.push(String(e.message || e.error));
});
window.addEventListener('unhandledrejection', (e) => {
  window.__testErrors.push('unhandledrejection: ' + String(e.reason));
});

/* ---------------- 基础 ---------------- */

test('应用初始化完成', async () => {
  assert(typeof App === 'object' && typeof Store === 'object', 'App 或 Store 未初始化');
  assert(typeof Pages === 'object' && Object.keys(Pages).length >= 9, '页面渲染器数量不足');
  eq(document.querySelectorAll('#sidebar .nav-item').length, 9, '导航项数量');
  eq(App.route, 'home', '默认路由');
});

test('首页渲染出今日计划与快速备忘', async () => {
  resetData();
  includes(mainText(), '今日计划', '首页');
  includes(mainText(), '快速备忘', '首页');
  includes(mainText(), '各模块摘要', '首页');
});

test('九个页面都能正常渲染', async () => {
  resetData();
  const routes = ['home', 'plan', 'work', 'study', 'fitness', 'diet', 'games', 'money', 'settings'];
  for (const route of routes) {
    showPage(route);
    assert(mainText().indexOf('页面加载出错') === -1, route + ' 页面报错');
    assert(mainText().length > 40, route + ' 页面内容过少');
  }
});

/* ---------------- P1 液态玻璃 UI ---------------- */

test('P1 卡片使用毛玻璃材质', async () => {
  resetData();
  const blur = css('.card', 'backdropFilter') || css('.card', 'webkitBackdropFilter');
  assert(/blur\(/.test(blur), '卡片缺少 backdrop-filter blur，实际为 ' + blur);
  const bg = css('.card', 'backgroundImage') + ' ' + css('.card', 'backgroundColor');
  assert(/gradient/.test(bg) || /rgba\([^)]*0?\.\d+\)/.test(bg), '卡片背景不是半透明/渐变：' + bg);
  assert(parseFloat(css('.card', 'borderRadius')) >= 18, '卡片圆角不够大');
});

test('P1 侧边栏是悬浮玻璃面板', async () => {
  resetData();
  const radius = parseFloat(css('.sidebar', 'borderRadius'));
  assert(radius >= 20, '侧边栏圆角不足：' + radius);
  const margin = parseFloat(css('.sidebar', 'marginLeft'));
  assert(margin >= 8, '侧边栏没有悬浮留白：' + margin);
  const blur = css('.sidebar', 'backdropFilter') || css('.sidebar', 'webkitBackdropFilter');
  assert(/blur\(/.test(blur), '侧边栏缺少毛玻璃');
  assert(css('.sidebar', 'boxShadow') !== 'none', '侧边栏缺少投影');
});

test('P1 页面背景为柔和渐变', async () => {
  resetData();
  const bg = css('body', 'backgroundImage');
  assert(/gradient/.test(bg), '页面背景不是渐变：' + bg);
});

test('P1 标题字号与视觉层级', async () => {
  resetData();
  const size = parseFloat(css('.page-head h1', 'fontSize'));
  assert(size >= 25, '页面标题偏小：' + size);
  const weight = parseInt(css('.page-head h1', 'fontWeight'), 10);
  assert(weight >= 600, '页面标题字重不足：' + weight);
});

test('P1 主按钮有玻璃质感', async () => {
  resetData();
  const bg = css('.btn.primary', 'backgroundImage') + ' ' + css('.btn.primary', 'backgroundColor');
  assert(/gradient/.test(bg) || /rgb/.test(bg), '主按钮缺少填充');
  assert(css('.btn.primary', 'boxShadow') !== 'none', '主按钮缺少投影');
});

test('P1 页面无横向溢出', async () => {
  resetData();
  const doc = document.documentElement;
  assert(doc.scrollWidth <= doc.clientWidth + 1, '出现横向滚动：' + doc.scrollWidth + ' > ' + doc.clientWidth);
});

/* ---------------- P2 日历 ---------------- */

function daysInMonth(mk) {
  const parts = mk.split('-').map(Number);
  return new Date(parts[0], parts[1], 0).getDate();
}

test('P2 健身周视图展示每天的推日/拉日与动作', async () => {
  resetData();
  const t = todayKey();
  Store.data.fitness.plans = [
    { id: 'fp1', date: t, routineId: 'rt-push', name: '推日', note: '胸 / 肩 / 三头', exercises: [] },
  ];
  Store.save();
  Pages.fitness.weekStart = weekStartKey(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  eq(document.querySelectorAll('.week-day[data-date]').length, 7, '一周七天');
  const todayCell = document.querySelector('.week-day[data-date="' + t + '"]');
  assert(todayCell, '找不到今天的格子');
  includes(todayCell.textContent, '推日', '格子里应显示模板名');
  includes(todayCell.textContent, '卧推', '格子里应显示动作');
  assert(todayCell.textContent.indexOf('计划 1') === -1, '不应再显示「计划 1」');
  includes(mainText(), '卧推', '当天详情应显示动作');
  includes(mainText(), '4×8', '详情应显示组次');
  includes(mainText(), '胸', '详情应显示部位');
});

test('P2 健身周视图可以切换上/下一周', async () => {
  resetData();
  const t = todayKey();
  const ws = weekStartKey(t);
  Pages.fitness.weekStart = ws;
  Pages.fitness.selected = t;
  showPage('fitness');
  document.querySelector('[data-act="nextWeek"]').click();
  await tick(150);
  eq(Pages.fitness.weekStart, addDays(ws, 7), '下一周');
  includes(mainText(), fmtShortDate(addDays(ws, 7)), '标题应显示新一周');
  document.querySelector('[data-act="thisWeek"]').click();
  await tick(150);
  eq(Pages.fitness.weekStart, ws, '回到本周');
});

test('P2 饮食日历显示每日三餐与饮水', async () => {
  resetData();
  const t = todayKey();
  Store.data.diet.meals = [
    { id: 'dm1', date: t, type: 'breakfast', name: '鸡蛋', portion: '2 个' },
    { id: 'dm2', date: t, type: 'lunch', name: '米饭', portion: '1 碗' },
  ];
  Store.data.diet.water[t] = 750;
  Store.save();
  Pages.diet.month = monthKeyOf(t);
  Pages.diet.date = t;
  showPage('diet');
  eq(document.querySelectorAll('.cal-cell.diet-cal').length, daysInMonth(monthKeyOf(t)), '日历格子数');
  const cell = document.querySelector('.cal-cell[data-date="' + t + '"]');
  eq(cell.querySelectorAll('.diet-dots i.on').length, 2, '已记录餐数');
  assert(cell.querySelector('.cal-water'), '饮水标记');
  includes(mainText(), '鸡蛋', '当天的食物');
});

test('P2 饮食日历点选其它日期', async () => {
  resetData();
  const t = todayKey();
  Pages.diet.month = monthKeyOf(t);
  Pages.diet.date = t;
  showPage('diet');
  const other = Pages.diet.month + '-15';
  document.querySelector('.cal-cell[data-date="' + other + '"]').click();
  await tick(150);
  eq(Pages.diet.date, other, '选中的日期');
  eq(Pages.diet.month, monthKeyOf(other), '月份同步');
});

/* ---------------- P3 插画 ---------------- */

test('P3 器械与食物插画库可用', async () => {
  EQUIPMENT_OPTIONS.forEach((item) => {
    includes(equipmentArt(item.value), '<svg', '器械插画 ' + item.value);
  });
  eq(foodCategoryOf('牛奶'), '蛋奶', '牛奶分类');
  eq(foodCategoryOf('鸡胸肉'), '肉类', '鸡胸肉分类');
  eq(foodCategoryOf('香蕉'), '水果', '香蕉分类');
  eq(foodCategoryOf('不知道是什么'), '其他', '未知分类');
  includes(foodArt('鸡蛋'), '<svg', '食物插画');
});

test('P3 健身详情显示器械插画', async () => {
  resetData();
  const t = todayKey();
  Store.data.fitness.plans = [
    { id: 'fs-art', date: t, routineId: 'rt-push', name: '推日', note: '胸 / 肩 / 三头', exercises: [] },
  ];
  Store.save();
  Pages.fitness.weekStart = weekStartKey(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  const icons = document.querySelectorAll('.day-plan .ex-line .ex-ico svg');
  eq(icons.length, 3, '每个动作一个器械插画');
  eq(icons[0].getAttribute('aria-label'), '杠铃', '第一个动作器械');
  eq(icons[1].getAttribute('aria-label'), '哑铃', '第二个动作器械');
});

test('P3 饮食显示食物插画与图库卡片', async () => {
  resetData();
  const t = todayKey();
  Store.data.diet.meals = [{ id: 'dm-art', date: t, type: 'breakfast', name: '鸡蛋', portion: '2 个' }];
  Store.save();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  assert(document.querySelector('.food-pill .food-ico svg'), '餐食应显示食物插画');
  const cards = document.querySelectorAll('.food-card');
  eq(cards.length, Store.data.diet.foods.length, '常吃食物卡片数');
  assert(cards[0].querySelector('svg'), '图库卡片应有插画');
});

/* ---------------- P12 仅保留我的设备 ---------------- */

test('P12 游戏娱乐只保留我的设备', async () => {
  resetData();
  Store.data.games.devices = [
    { id: 'd1', type: 'keyboard', brand: 'Keychron', model: 'Q1', spec: '75% 机械键盘', price: 899 },
    { id: 'd2', type: 'mouse', brand: 'Logitech', model: 'GPX', spec: '无线 60g', price: 999 },
    { id: 'd3', type: 'headset', brand: 'Sony', model: 'WH-1000XM5', spec: '无线降噪', price: 2999 },
  ];
  Store.save();
  showPage('games');
  assert(mainText().indexOf('我的游戏') === -1, '不应再有我的游戏');
  eq(document.querySelectorAll('.device-col').length, 3, '三类设备');
  const labels = Array.prototype.map.call(document.querySelectorAll('.device-col h2'), (el) => el.textContent);
  eq(labels.join(','), '键盘,鼠标,耳机', '设备类型顺序');
  eq(document.querySelectorAll('.device-card').length, 3, '设备卡片数');
  includes(mainText(), 'Keychron');
});

test('P12 设备类型只有键盘/鼠标/耳机', async () => {
  eq(DEVICE_TYPES.length, 3, '设备类型数量');
  eq(
    DEVICE_TYPES.map((item) => item.label).join(','),
    '键盘,鼠标,耳机',
    '设备类型'
  );
  resetData();
  eq(Store.data.games.items.length, 0, '默认不再预置游戏');
});

/* ---------------- P6 保存 ---------------- */

test('P6 自动保存后侧栏显示保存时间', async () => {
  resetData();
  Store.data.memos.push({ id: 'save-test', text: '自动保存', done: false, createdAt: Date.now(), date: todayKey() });
  await Store.flush();
  App.render();
  const text = document.getElementById('save-state-text');
  assert(text, '侧栏应有保存状态');
  includes(text.textContent, '已保存');
});

test('P6 手动保存按钮可用', async () => {
  resetData();
  App.render();
  Store.lastSavedAt = new Date(2000, 0, 1, 0, 0);
  const before = Store.lastSavedAt.getTime();
  document.getElementById('save-now').click();
  await tick(120);
  assert(Store.lastSavedAt.getTime() > before, '点击保存后应刷新保存时间');
  includes(document.getElementById('toast-root').textContent, '已保存');
});

test('P6 快捷键 Cmd+S 触发保存', async () => {
  resetData();
  App.render();
  Store.lastSavedAt = new Date(2000, 0, 1, 0, 0);
  const before = Store.lastSavedAt.getTime();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true }));
  await tick(120);
  assert(Store.lastSavedAt.getTime() > before, '快捷键应触发保存');
});

/* ---------------- P7 品牌名 ---------------- */

test('P7 品牌名是「Xya的工作台」', async () => {
  resetData();
  App.render();
  includes(document.querySelector('.brand-text strong').textContent, 'Xya的工作台');
  includes(document.getElementById('sidebar').textContent, 'Xya的工作台');
  includes(document.title, 'Xya的工作台');
  assert(document.title.indexOf('我的生活工作台') === -1, '不应再出现旧名字');
});

/* ---------------- P8 数据文件（仅 http 模式） ---------------- */

if (location.protocol === 'http:') {
  test('P8 服务端模式使用独立数据文件', async () => {
    eq(Store.mode, 'server', '运行模式');
    includes(Store.serverPath, '工作台数据.json', '数据文件路径');
    showPage('settings');
    includes(mainText(), '立即保存', '设置页应有保存入口');
    includes(mainText(), '工作台数据.json', '设置页应显示文件路径');
  });

  test('P8 自动保存写入数据文件', async () => {
    resetData();
    Store.data.memos.push({ id: 'srv-auto', text: '文件自动保存', done: false, createdAt: Date.now(), date: todayKey() });
    Store.save();
    await tick(900);
    const payload = await (await fetch('/api/state', { cache: 'no-store' })).json();
    const list = (payload.data && payload.data.memos) || [];
    assert(list.some((m) => m.text === '文件自动保存'), '数据文件里应有新记录');
    includes(document.getElementById('save-state-text').textContent, '已保存到文件', '侧栏应显示保存到文件');
  });

  test('P8 手动保存立即写入数据文件', async () => {
    resetData();
    Store.data.memos.push({ id: 'srv-manual', text: '手动保存', done: false, createdAt: Date.now(), date: todayKey() });
    const ok = await Store.flush();
    assert(ok, '手动保存应成功');
    const payload = await (await fetch('/api/state', { cache: 'no-store' })).json();
    const list = (payload.data && payload.data.memos) || [];
    assert(list.some((m) => m.text === '手动保存'), '数据文件里应有手动保存的记录');
  });
}

/* ---------------- P9 学习分类与图片 ---------------- */

test('P9 学习目标支持分类和封面图片', async () => {
  resetData();
  const img =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  Store.data.study.goals = [
    { id: 'sg1', title: '钢琴基础', category: '乐器', image: img, subject: '音乐', targetHours: 20, deadline: '', status: 'active', note: '' },
  ];
  Store.save();
  showPage('study');
  includes(mainText(), '乐器', '分类标签');
  const cover = document.querySelector('.goal-cover img');
  assert(cover, '应显示封面图片');
  assert(cover.getAttribute('src').indexOf('data:image') === 0, '封面应为图片数据');
});

test('P9 学习分类可以在新增目标时扩展', async () => {
  resetData();
  showPage('study');
  document.querySelector('[data-act="addGoal"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  assert(form.querySelector('#goal-image-file'), '应有图片选择入口');
  assert(form.querySelector('#study-cat-list'), '应有分类候选');
  form.elements.title.value = '练习水彩';
  form.elements.category.value = '绘画';
  form.requestSubmit();
  await tick(250);
  const goal = Store.data.study.goals.filter((g) => g.title === '练习水彩')[0];
  assert(goal, '应保存新目标');
  eq(goal.category, '绘画', '新分类');
  assert(Store.data.study.categories.indexOf('绘画') >= 0, '分类列表应记住新分类');
  includes(mainText(), '绘画', '页面应显示新分类');
});

/* ---------------- P10 拖拽训练计划 ---------------- */

test('P10 训练模板可以拖进周计划，显示推日而不是计划1', async () => {
  resetData();
  const t = todayKey();
  Pages.fitness.weekStart = weekStartKey(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  const routine = document.querySelector('.routine-item');
  const cell = document.querySelector('.week-day[data-date="' + t + '"]');
  assert(routine, '应有训练模板');
  assert(cell, '应有周计划格子');
  const dt = new DataTransfer();
  routine.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
  cell.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
  cell.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  await tick(250);
  const plans = Store.data.fitness.plans || [];
  eq(plans.length, 1, '应生成一条训练计划');
  eq(plans[0].date, t, '计划日期');
  eq(plans[0].name, '推日', '计划名称');
  includes(document.querySelector('.week-day[data-date="' + t + '"]').textContent, '推日', '格子里应显示推日');
  assert(mainText().indexOf('计划 1') === -1, '不应出现计划 1');
  assert(document.querySelector('.day-plan'), '当天详情应显示训练内容');
});

test('P10 同一天不会重复安排同一模板', async () => {
  resetData();
  const t = todayKey();
  Pages.fitness.weekStart = weekStartKey(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  const routine = document.querySelector('.routine-item');
  const cell = document.querySelector('.week-day[data-date="' + t + '"]');
  for (let i = 0; i < 2; i++) {
    const dt = new DataTransfer();
    routine.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    cell.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    await tick(200);
  }
  eq((Store.data.fitness.plans || []).length, 1, '不应重复');
});

test('P10 新建训练模板可以添加动作', async () => {
  resetData();
  Pages.fitness.weekStart = weekStartKey(todayKey());
  Pages.fitness.selected = todayKey();
  showPage('fitness');
  document.querySelector('[data-act="addRoutine"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  form.elements.name.value = '连背+三头';
  document.querySelector('#add-routine-ex').click();
  const rows = form.querySelectorAll('[data-rex]');
  const row = rows[rows.length - 1];
  row.querySelector('[data-rex-part]').value = '背';
  row.querySelector('[data-rex-name]').value = '高位下拉';
  row.querySelector('[data-rex-sets]').value = '4×10';
  form.requestSubmit();
  await tick(250);
  const routine = Store.data.fitness.routines.filter((r) => r.name === '连背+三头')[0];
  assert(routine, '应保存新模板');
  eq(routine.exercises.length, 1, '动作数量');
  eq(routine.exercises[0].name, '高位下拉', '动作名称');
  eq(routine.exercises[0].sets, '4×10', '组次');
  includes(mainText(), '连背+三头', '模板列表应显示新模板');
});

/* ---------------- P11 拖拽食物加餐 ---------------- */

test('P11 食物可以拖进早餐', async () => {
  resetData();
  const t = todayKey();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  const card = document.querySelector('.food-card');
  const meal = document.querySelector('.meal[data-meal="breakfast"]');
  assert(card, '应有常吃食物卡片');
  assert(meal, '应有早餐区域');
  const food = findById(Store.data.diet.foods, card.dataset.foodId);
  const dt = new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
  meal.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
  meal.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  await tick(250);
  const meals = Store.data.diet.meals;
  eq(meals.length, 1, '应新增一条饮食记录');
  eq(meals[0].type, 'breakfast', '餐次');
  eq(meals[0].name, food.name, '食物名称');
  eq(meals[0].date, t, '日期');
  includes(mainText(), food.name, '页面应显示食物');
});

test('P11 食物可以拖进晚餐', async () => {
  resetData();
  const t = todayKey();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  const card = document.querySelectorAll('.food-card')[1];
  const meal = document.querySelector('.meal[data-meal="dinner"]');
  const food = findById(Store.data.diet.foods, card.dataset.foodId);
  const dt = new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
  meal.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  await tick(250);
  eq(Store.data.diet.meals.length, 1, '晚餐记录');
  eq(Store.data.diet.meals[0].type, 'dinner');
  eq(Store.data.diet.meals[0].name, food.name);
});

test('P12 首页快捷记录入口都能打开表单或页面', async () => {
  resetData();
  App.render();
  const actions = ['qPlan', 'qTxn', 'qStudy', 'qTrain', 'qDiet', 'qDevice'];
  for (const act of actions) {
    const btn = document.querySelector('.quick-btn[data-act="' + act + '"]');
    assert(btn, '缺少快捷入口 ' + act);
    btn.click();
    await tick(150);
    const opened = document.querySelector('#modal-root .overlay') || App.route !== 'home';
    assert(opened, '入口没有反应：' + act);
    closeModal();
    if (App.route !== 'home') {
      App.go('home');
      App.render();
      await tick(80);
    }
  }
});

/* ---------------- P13 智能排程 ---------------- */

function seedScheduleData() {
  const t = todayKey();
  Store.data.study.goals = [
    {
      id: 'sg-sch',
      title: '钢琴基础',
      category: '乐器',
      subject: '音乐',
      targetHours: 20,
      deadline: addDays(t, 5),
      status: 'active',
      note: '',
    },
  ];
  Store.data.study.logs = [{ id: 'sl-sch', date: addDays(t, -2), minutes: 120, goalId: 'sg-sch', note: '' }];
  Store.data.work.orders = [
    { id: 'o-sch', date: t, shopId: 's1', product: '贴纸', amount: 120, currency: 'CNY', status: 'pending' },
  ];
  Store.data.work.stock = [{ id: 'st-sch', name: '包装盒', qty: 2, safe: 10 }];
  Store.data.work.products = [{ id: 'p-sch', name: '露营灯', stage: 'research' }];
  Store.data.games.devices = [
    { id: 'd-sch', type: 'keyboard', brand: 'Keychron', model: 'Q1', spec: '75%', price: 899 },
  ];
  Store.save();
  return t;
}

test('P13 今日计划自动准备参考日程草稿', async () => {
  resetData();
  const t = seedScheduleData();
  Pages.plan.date = t;
  showPage('plan');
  const draft = Store.data.plan.drafts[t];
  assert(draft, '应自动生成草稿');
  assert(draft.items.length >= 4, '建议数量不足：' + draft.items.length);
  includes(mainText(), '今日参考日程', '页面应显示横幅');
  includes(mainText(), '待发货订单', '应参考待发货订单');

  const bounds = scheduleBounds(Store.data.settings.schedule);
  const fixed = scheduleFixedBlocks(t, Store.data.settings.schedule);
  draft.items.forEach((i) => {
    const s = timeToMin(i.start);
    const e = timeToMin(i.end);
    assert(s !== null && e !== null && e > s, '建议时间不完整：' + i.title);
    assert(s >= bounds.start && e <= bounds.end, '建议超出作息范围：' + i.title);
    assert(!!i.reason, '建议应带理由：' + i.title);
    fixed.forEach((b) => assert(!(s < b.endMin && e > b.startMin), '建议和「' + b.label + '」重叠：' + i.title));
  });
  assert(document.querySelector('.tl-block.is-draft'), '时间轴应显示建议色块');
  assert(document.querySelector('.tl-block.is-fixed'), '时间轴应显示用餐等固定安排');
});

test('P13 草稿每天只自动生成一次', async () => {
  resetData();
  const t = seedScheduleData();
  Pages.plan.date = t;
  showPage('plan');
  const draft = Store.data.plan.drafts[t];
  const batchId = draft.batchId;
  const count = draft.items.length;
  draft.items[0].title = '手动改过的建议';
  Store.save();
  App.refresh();
  eq(Store.data.plan.drafts[t].batchId, batchId, '刷新不应覆盖草稿');
  eq(Store.data.plan.drafts[t].items.length, count, '建议数量不应变化');
  eq(Store.data.plan.drafts[t].items[0].title, '手动改过的建议', '手动修改应保留');
});

test('P13 采用全部写入计划，也可以整批撤销', async () => {
  resetData();
  const t = seedScheduleData();
  Pages.plan.date = t;
  showPage('plan');
  const total = Store.data.plan.drafts[t].items.length;
  document.querySelector('[data-act="adoptAll"]').click();
  await tick(200);
  const auto = Store.data.plan.items.filter((i) => i.source === 'auto');
  assert(auto.length >= 3, '应写入了多条计划：' + auto.length);
  eq(auto.length, total, '除冲突外都应写入');
  assert(auto[0].batchId, '计划应记录批次');
  includes(mainText(), '已采用', '横幅应显示已采用');
  assert(document.querySelector('.tl-block.kind-plan'), '采用后时间轴应出现计划块');

  document.querySelector('[data-act="undoAll"]').click();
  await tick(200);
  eq(Store.data.plan.items.filter((i) => i.source === 'auto').length, 0, '撤销后应移除自动计划');
  eq(Store.data.plan.drafts[t].status, 'ready', '撤销后建议应回到待定');
});

test('P13 时间轴可以拖动计划改时间', async () => {
  resetData();
  const t = todayKey();
  Store.data.plan.items = [
    { id: 'p-drag', date: t, title: '写周报', start: '09:00', end: '10:00', priority: 'mid', done: false, createdAt: Date.now() },
    { id: 'p-early', date: t, title: '晨跑', start: '06:00', end: '06:30', priority: 'low', done: false, createdAt: Date.now() },
  ];
  Store.save();
  Pages.plan.date = t;
  Pages.plan.view = 'timeline';
  showPage('plan');
  const block = document.querySelector('.tl-block.kind-plan[data-id="p-drag"]');
  const early = document.querySelector('.tl-block.kind-plan[data-id="p-early"]');
  const track = document.querySelector('#plan-timeline');
  assert(block && early && track, '应渲染时间轴计划块');
  assert(parseFloat(early.style.top) >= 0, '作息外的计划不应被裁掉');
  const bounds = planDayBounds(
    Store.data.plan.items,
    Store.data.plan.drafts[t],
    scheduleBounds(Store.data.settings.schedule)
  );
  const rect = track.getBoundingClientRect();
  const y = rect.top + ((14 * 60 - bounds.start) / (bounds.end - bounds.start)) * rect.height;
  const dt = new DataTransfer();
  block.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  track.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
  await tick(200);
  const item = findById(Store.data.plan.items, 'p-drag');
  eq(item.start, '14:00', '拖动后的开始时间');
  eq(item.end, '15:00', '时长保持一小时');
});

test('P13 建议可以单独调整和忽略', async () => {
  resetData();
  const t = todayKey();
  Pages.plan.date = t;
  showPage('plan');
  const draft = Store.data.plan.drafts[t];
  assert(draft && draft.items.length, '默认数据也应给出训练建议');
  document.querySelector('[data-act="editDraft"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  form.elements.title.value = '训练 · 改过的名字';
  form.elements.mode.value = 'update';
  form.requestSubmit();
  await tick(200);
  assert(draft.items.some((i) => i.title === '训练 · 改过的名字'), '调整应更新建议');
  eq(Store.data.plan.items.length, 0, '只更新建议时不应写入计划');

  document.querySelector('[data-act="ignoreOne"]').click();
  await tick(200);
  eq(Store.data.plan.drafts[t].status, 'discarded', '全部忽略后不再显示');
  assert(mainText().indexOf('今日参考日程') === -1, '丢弃后横幅应隐藏');
});

test('P13 偏好齿轮保存后，生成会避开固定安排', async () => {
  resetData();
  const t = seedScheduleData();
  Pages.plan.date = t;
  showPage('plan');
  document.querySelector('[data-act="prefs"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  form.elements.wake.value = '08:00';
  form.elements.sleep.value = '22:00';
  form.elements.focusMin.value = '45';
  document.querySelector('[data-add-fixed]').click();
  const rows = form.querySelectorAll('[data-fixed-row]');
  const row = rows[rows.length - 1];
  row.querySelector('[name="fixedStart"]').value = '09:00';
  row.querySelector('[name="fixedEnd"]').value = '11:00';
  row.querySelector('[name="fixedLabel"]').value = '开会';
  form.requestSubmit();
  await tick(250);

  const prefs = Store.data.settings.schedule;
  eq(prefs.wake, '08:00', '起床时间');
  eq(prefs.sleep, '22:00', '睡觉时间');
  eq(prefs.focusMin, 45, '专注时长');
  eq(prefs.fixed.length, 1, '固定安排');
  eq(prefs.fixed[0].label, '开会');

  Scheduler.regenerate(t);
  const draft = Store.data.plan.drafts[t];
  assert(draft.items.length, '重新生成应有建议');
  draft.items.forEach((i) => {
    const s = timeToMin(i.start);
    const e = timeToMin(i.end);
    assert(!(s < 11 * 60 && e > 9 * 60), '不应排进开会时段：' + i.title);
    assert(s >= 8 * 60 && e <= 22 * 60, '应在新作息内：' + i.title);
  });

  App.refresh();
  document.querySelector('[data-act="discard"]').click();
  await tick(200);
  eq(Store.data.plan.drafts[t].status, 'discarded', '丢弃状态');
  App.render();
  eq(Store.data.plan.drafts[t].status, 'discarded', '丢弃后刷新不应自动重生成');
  assert(mainText().indexOf('今日参考日程') === -1, '丢弃后横幅应隐藏');
});

/* ---------------- P14 去掉打卡 ---------------- */

test('P14 今日计划不再有完成打卡', async () => {
  resetData();
  const t = todayKey();
  Store.data.plan.items = [
    { id: 'p14-1', date: t, title: '写方案', start: '09:00', end: '10:00', priority: 'mid', createdAt: Date.now(), done: true },
    { id: 'p14-2', date: t, title: '买咖啡豆', start: '', end: '', priority: 'low', createdAt: Date.now(), done: false },
  ];
  Store.save();
  Pages.plan.date = t;
  Pages.plan.view = 'timeline';
  showPage('plan');
  eq(document.querySelectorAll('.tick').length, 0, '不应有完成勾选');
  eq(document.querySelectorAll('[data-act="toggle"]').length, 0, '不应有完成按钮');
  assert(mainText().indexOf('已完成') === -1, '不应出现已完成');
  assert(mainText().indexOf('完成度') === -1, '不应出现完成度');
  includes(mainText(), '已排时间');
  includes(mainText(), '最早从 09:00 开始');

  Pages.plan.view = 'list';
  App.render();
  eq(document.querySelectorAll('.tick').length, 0, '清单也不应有勾选');
  includes(mainText(), '写方案');
  includes(mainText(), '买咖啡豆');
});

test('P14 首页与设置不再展示打卡统计', async () => {
  resetData();
  const t = todayKey();
  Store.data.plan.items = [
    { id: 'h14-1', date: t, title: '整理订单', start: '10:00', end: '11:00', priority: 'mid', createdAt: Date.now(), done: true },
  ];
  Store.data.memos = [{ id: 'm14-1', text: '记得回消息', done: true, createdAt: Date.now(), date: t }];
  Store.data.study.logs = [{ id: 'l14-1', date: t, minutes: 90, goalId: '' }];
  Store.save();
  showPage('home');
  assert(mainText().indexOf('打卡') === -1, '首页不应出现打卡');
  assert(mainText().indexOf('已完成') === -1, '首页不应出现已完成');
  assert(mainText().indexOf('连续') === -1, '首页不应出现连续天数');
  eq(document.querySelectorAll('.tick').length, 0, '首页不应有勾选');
  includes(mainText(), '学习目标');
  includes(mainText(), '本周训练');

  showPage('settings');
  assert(mainText().indexOf('学习打卡') === -1, '设置里不应有学习打卡');
  includes(mainText(), '学习目标');
});

/* ---------------- P15 饮食搭配与热量 ---------------- */

test('P15 饮食热量由搭配计划累计', async () => {
  resetData();
  const t = todayKey();
  Store.data.diet.meals = [
    { id: 'dm1', date: t, type: 'breakfast', name: '燕麦', portion: '50 g', calories: 190 },
    { id: 'dm2', date: t, type: 'lunch', name: '米饭', portion: '1 碗' },
    { id: 'dm3', date: t, type: 'lunch', name: '鸡胸肉', portion: '100 g', calories: 165 },
  ];
  Store.data.settings.calorieGoal = 1000;
  Store.save();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  includes(document.querySelector('.calorie-value').textContent, '555', '总热量');
  includes(mainText(), '还剩 445', '剩余热量');
  const bar = document.querySelector('.meal[data-meal="lunch"] .meal-bar i');
  assert(bar && parseFloat(bar.style.width) > 0, '午餐应有热量进度条');
  assert(mainText().indexOf('打卡') === -1, '不应出现打卡');
  assert(mainText().indexOf('已记录') === -1, '不应出现已记录');
});

test('P15 身高体重保存后会算 BMI', async () => {
  resetData();
  const t = todayKey();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  const form = document.querySelector('#body-form');
  assert(form, '应有身高体重表单');
  form.elements.height.value = '175';
  form.elements.weight.value = '70';
  form.elements.calorieGoal.value = '2200';
  form.requestSubmit();
  await tick(220);
  eq(Store.data.settings.height, 175, '身高');
  eq(Store.data.settings.calorieGoal, 2200, '热量目标');
  const metric = Store.data.body.metrics.filter((m) => m.date === t)[0];
  assert(metric, '应写入体重记录');
  eq(Number(metric.weight), 70, '体重');
  includes(mainText(), '22.9', 'BMI');
  includes(mainText(), '正常', 'BMI 区间');
});

test('P15 默认饮品带热量，拖进加餐会累计', async () => {
  resetData();
  const names = Store.data.diet.foods.map((f) => f.name);
  ['美式咖啡', '拿铁', '奶茶', '可乐', '橙汁'].forEach((n) => assert(names.indexOf(n) >= 0, '缺少饮品 ' + n));
  const t = todayKey();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  const card = Array.prototype.find.call(document.querySelectorAll('.food-card'), (el) => el.textContent.indexOf('奶茶') >= 0);
  const meal = document.querySelector('.meal[data-meal="snack"]');
  assert(card && meal, '应有奶茶卡片和加餐区域');
  const dt = new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  meal.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
  await tick(250);
  const item = Store.data.diet.meals[0];
  assert(item, '应加入搭配');
  eq(item.name, '奶茶', '食物名称');
  eq(item.calories, 350, '热量');
  eq(item.type, 'snack', '餐次');
  includes(mainText(), '350', '页面应显示热量');
});

/* ---------------- P16 消费记录改版 ---------------- */

test('P16 消费页显示账单、预算圆环与收支', async () => {
  resetData();
  const t = todayKey();
  const mk = monthKeyOf(t);
  Store.data.money.txns = [
    { id: 'mx1', date: t, type: 'expense', category: '餐饮', amount: 2000, note: '' },
    { id: 'mx2', date: t, type: 'income', category: '工资', amount: 8000, note: '' },
  ];
  Store.data.money.budgets[mk] = 5000;
  Store.save();
  Pages.money.month = mk;
  Pages.money.range = 'month';
  showPage('money');
  includes(mainText(), '账单', '账单标题');
  includes(mainText(), '¥8,000', '收入');
  includes(mainText(), '¥2,000', '支出');
  eq(document.querySelector('.budget-ring').style.getPropertyValue('--p'), '60', '剩余预算百分比');
  includes(mainText(), '60%', '圆环百分比');
  includes(mainText(), '剩余预算', '预算明细');
});

test('P16 资产管家可以添加资产并算净资产', async () => {
  resetData();
  Store.data.money.assets = [
    { id: 'as1', name: '存款', type: 'asset', amount: 10000 },
    { id: 'as2', name: '信用卡', type: 'liability', amount: 3000 },
  ];
  Store.save();
  Pages.money.month = monthKeyOf(todayKey());
  showPage('money');
  includes(mainText(), '净资产', '资产管家');
  includes(mainText(), '¥7,000', '净资产金额');
  includes(mainText(), '存款', '资产条目');

  document.querySelector('[data-act="addAsset"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  form.elements.name.value = '基金';
  form.elements.type.value = 'asset';
  form.elements.amount.value = '5000';
  form.requestSubmit();
  await tick(220);
  eq(Store.data.money.assets.length, 3, '资产条目数量');
  includes(mainText(), '基金', '新增资产');
  includes(mainText(), '¥12,000', '净资产更新');
});

test('P16 支出分析支持周/月/年切换', async () => {
  resetData();
  const t = todayKey();
  const year = t.slice(0, 4);
  Store.data.money.txns = [
    { id: 'mr1', date: t, type: 'expense', category: '餐饮', amount: 100, note: '' },
    { id: 'mr2', date: year + '-01-15', type: 'expense', category: '购物', amount: 500, note: '' },
  ];
  Store.save();
  Pages.money.month = monthKeyOf(t);
  Pages.money.range = 'month';
  showPage('money');
  assert(document.querySelector('[data-act="setRange"]'), '应有周/月/年切换');
  document.querySelector('[data-range="year"]').click();
  await tick(180);
  eq(Pages.money.range, 'year', '切换到年');
  includes(mainText(), year + ' 年', '年份标签');
  includes(mainText(), '¥600', '全年支出');
  document.querySelector('[data-range="week"]').click();
  await tick(180);
  eq(Pages.money.range, 'week', '切换到周');
  includes(mainText(), '本周（', '本周标签');
  includes(mainText(), '平均每天', '周平均值');
});

test('P16 记一笔仍然可用', async () => {
  resetData();
  Pages.money.month = monthKeyOf(todayKey());
  showPage('money');
  document.querySelector('[data-act="add"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  form.elements.amount.value = '66';
  form.elements.category.value = '餐饮';
  form.requestSubmit();
  await tick(220);
  eq(Store.data.money.txns.length, 1, '应记下一笔');
  eq(Number(Store.data.money.txns[0].amount), 66, '金额');
  includes(mainText(), '餐饮', '明细里应出现');
});

/* ---------------- 运行 ---------------- */

(async function runAll() {
  for (let i = 0; i < 120 && !window.__APP_READY; i++) await tick(50);
  await tick(80);
  const lines = [];
  let passed = 0;
  for (const item of TESTS) {
    try {
      await item.fn();
      passed++;
      lines.push('PASS ' + item.name);
    } catch (err) {
      lines.push('FAIL ' + item.name + ' :: ' + (err && err.message ? err.message : String(err)));
    }
  }
  if (window.__testErrors.length) {
    lines.push('FAIL 运行时无报错 :: ' + window.__testErrors.join(' | '));
  } else {
    lines.push('PASS 运行时无报错');
    passed++;
  }
  const total = TESTS.length + 1;
  lines.push('SUMMARY ' + passed + '/' + total + ' passed');
  const pre = document.getElementById('results');
  pre.textContent = lines.join('\n');
  document.title = 'TEST ' + passed + '/' + total;
})();
