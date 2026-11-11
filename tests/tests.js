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

test('首页渲染出时钟、汕头天气与备忘', async () => {
  resetData();
  includes(mainText(), '快速备忘', '首页');
  includes(mainText(), '各模块摘要', '首页');
  includes(mainText(), '汕头', '天气');
  assert(document.querySelector('#home-clock'), '应有简约时钟');
  assert(document.querySelector('#home-weather'), '应有天气卡');
  assert(mainText().indexOf('快捷记录') === -1, '快捷记录应移除');
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
  showPage('plan');
  const size = parseFloat(css('.page-head h1', 'fontSize'));
  assert(size >= 25, '页面标题偏小：' + size);
  const weight = parseInt(css('.page-head h1', 'fontWeight'), 10);
  assert(weight >= 600, '页面标题字重不足：' + weight);
});

test('P1 主按钮有玻璃质感', async () => {
  resetData();
  showPage('plan');
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

test('P7 侧栏显示当前版本号', async () => {
  resetData();
  App.render();
  includes(document.getElementById('sidebar').textContent, 'v' + APP_VERSION);
  includes(document.getElementById('sidebar').textContent, '2026.11.11');
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

test('P12 首页已移除今日计划与快捷记录', async () => {
  resetData();
  App.render();
  eq(document.querySelectorAll('.quick-btn').length, 0, '不应再有快捷记录按钮');
  assert(mainText().indexOf('快捷记录') === -1, '不应出现快捷记录');
  assert(mainText().indexOf('今日计划') === -1, '不应再显示今日计划栏');
  includes(mainText(), '各模块摘要', '模块摘要保留');
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
  includes(mainText(), '学习项目');
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

/* ---------------- P17 学习去掉打卡 ---------------- */

test('P17 学习页不再有打卡与学习时长', async () => {
  resetData();
  const t = todayKey();
  Store.data.study.goals = [
    { id: 'g17-1', title: '钢琴基础', category: '乐器', deadline: addDays(t, 3), note: '' },
    { id: 'g17-2', title: '读完一本书', category: '书籍', deadline: addDays(t, -2), note: '' },
  ];
  Store.data.study.logs = [{ id: 'l17-1', date: t, minutes: 600, goalId: 'g17-1' }];
  Store.save();
  showPage('study');
  assert(mainText().indexOf('打卡') === -1, '不应出现打卡');
  assert(mainText().indexOf('学习时长') === -1, '不应出现学习时长');
  assert(mainText().indexOf('累计学习') === -1, '不应出现累计学习');
  assert(mainText().indexOf('10 小时') === -1, '不应显示历史学习时长');
  eq(document.querySelectorAll('[data-act="addLog"]').length, 0, '不应有打卡入口');
  includes(mainText(), '学习项目', '项目标题');
  includes(mainText(), '钢琴基础', '项目名');
  includes(mainText(), '3 天后截止', '截止提示');
  includes(mainText(), '已过期 2 天', '过期提示');
});

test('P17 新增项目只填分类和截止日', async () => {
  resetData();
  const t = todayKey();
  Pages.study && (Pages.study.logs = []);
  showPage('study');
  document.querySelector('[data-act="addGoal"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  assert(!form.elements.targetHours, '不应再有目标小时数');
  assert(!form.elements.status, '不应再有完成状态');
  form.elements.title.value = '练习水彩';
  form.elements.category.value = '绘画';
  form.elements.deadline.value = addDays(t, 5);
  form.requestSubmit();
  await tick(250);
  const goal = Store.data.study.goals.filter((g) => g.title === '练习水彩')[0];
  assert(goal, '应保存项目');
  eq(goal.category, '绘画', '分类');
  eq(goal.deadline, addDays(t, 5), '截止日');
  assert(!goal.targetHours, '不应写入目标时长');
  includes(mainText(), '5 天后截止', '页面显示截止');
});

/* ---------------- P18 首页时钟与天气 ---------------- */

test('P18 首页顶部有时钟、天气和渐变色调', async () => {
  resetData();
  App.render();
  const hero = document.querySelector('.home-hero');
  assert(hero, '应有顶部 Hero');
  const bg = getComputedStyle(hero).backgroundImage;
  assert(/gradient/.test(bg), 'Hero 应是渐变背景：' + bg);
  const clock = document.querySelector('#home-clock');
  assert(/\d{2}:\d{2}/.test(clock.textContent), '时钟格式：' + clock.textContent);
  const before = clock.textContent;
  await tick(1100);
  assert(clock.textContent !== before, '时钟应每秒更新');
  includes(document.querySelector('#home-weather').textContent, '汕头', '天气城市');
  assert(document.querySelector('#weather-temp'), '应有温度');
});

/* ---------------- P19 今日计划交互 ---------------- */

test('P19 顶部操作栏更紧凑，长按空白时间段加计划', async () => {
  resetData();
  const t = todayKey();
  Pages.plan.date = t;
  Pages.plan.view = 'timeline';
  showPage('plan');
  const actions = document.querySelector('.plan-actions');
  assert(actions, '应有顶部操作栏');
  eq(actions.querySelectorAll('[data-act]').length, 2, '计划偏好 + 添加计划');
  assert(actions.querySelector('[data-act="prefs"]'), '应保留计划偏好入口');
  const headings = Array.prototype.map.call(document.querySelectorAll('.card h2'), (h) => h.textContent);
  assert(headings.indexOf('未排时间') === -1, '不应再有未排时间那一栏');
  assert(mainText().indexOf('智能排程') === -1, '智能排程已移除');
  includes(mainText(), '可拖拽模块', '底部模块面板');

  const bounds = planTimelineBounds(Store.data.plan.items);
  const track = document.querySelector('#plan-timeline');
  const rect = track.getBoundingClientRect();
  const y = rect.top + ((10 * 60 - bounds.start) / (bounds.end - bounds.start)) * rect.height;
  track.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientY: y, clientX: rect.left + 60 })
  );
  await tick(650);
  const form = document.querySelector('#modal-root form');
  assert(form, '长按应弹出添加计划');
  eq(form.elements.start.value, '10:00', '开始时间');
  eq(form.elements.end.value, '11:00', '结束时间');
  closeModal();
});

test('P19 底部模块可以拖进日程，饮食可添加', async () => {
  resetData();
  const t = todayKey();
  Store.data.study.goals = [
    { id: 'g19', title: '钢琴基础', category: '乐器', deadline: addDays(t, 5), note: '' },
  ];
  Store.save();
  Pages.plan.date = t;
  Pages.plan.view = 'timeline';
  Pages.plan.paletteTab = 'study';
  showPage('plan');
  eq(document.querySelectorAll('.palette-tabs .tab').length, 5, '学习/健身/饮食/工作/娱乐');

  const dropAt = async (min) => {
    const bounds = planTimelineBounds(Store.data.plan.items);
    const track = document.querySelector('#plan-timeline');
    const rect = track.getBoundingClientRect();
    const y = rect.top + ((min - bounds.start) / (bounds.end - bounds.start)) * rect.height;
    const card = document.querySelector('.palette-item[draggable="true"]');
    assert(card, '应有可拖拽模块');
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    track.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y }));
    await tick(250);
  };

  await dropAt(15 * 60);
  const study = Store.data.plan.items.filter((i) => i.source === 'module')[0];
  assert(study, '学习模块应生成计划');
  eq(study.title, '学习 · 钢琴基础', '学习计划标题');
  eq(study.start, '15:00', '学习计划时间');

  document.querySelector('[data-tab="fitness"]').click();
  await tick(180);
  await dropAt(16 * 60);
  const fitness = Store.data.plan.items.filter((i) => i.title.indexOf('训练 · ') === 0)[0];
  assert(fitness, '健身模块应生成计划');
  includes(fitness.title, '推日', '拖入的是模板名');

  document.querySelector('[data-tab="diet"]').click();
  await tick(180);
  const addDiet = document.querySelector('[data-act="addDietPlan"]');
  assert(addDiet, '应有添加饮食入口');
  addDiet.click();
  await tick(180);
  const form = document.querySelector('#modal-root form');
  assert(form, '应打开添加搭配');
  includes(document.querySelector('#modal-root .modal-head h3').textContent, '添加搭配');
  closeModal();
});

/* ---------------- P20 热量公式与咖啡 ---------------- */

test('P20 食物热量按分量和做法估算', async () => {
  const skin = estimateFoodCalories('鸡腿', '1 个', '带皮');
  const peeled = estimateFoodCalories('鸡腿', '1 个', '去皮');
  assert(skin > peeled, '带皮应比去皮高：' + skin + ' vs ' + peeled);
  assert(peeled > 100 && peeled < 200, '去皮鸡腿热量大约 165：' + peeled);
  eq(estimateFoodCalories('美式咖啡', '1 杯', ''), 5, '美式咖啡');
  assert(estimateFoodCalories('米饭', '200 g', '') > 200, '200g 米饭 > 200 kcal');
  assert(estimateFoodCalories('奶茶', '1 杯', '无糖') < estimateFoodCalories('奶茶', '1 杯', '全糖'), '糖度影响热量');
});

test('P20 添加饮食留空热量会自动估算，并记录做法', async () => {
  resetData();
  const t = todayKey();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  document.querySelector('[data-act="addFood"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  form.elements.name.value = '鸡腿';
  form.elements.portion.value = '1 个';
  form.elements.detail.value = '去皮';
  form.elements.name.dispatchEvent(new Event('input', { bubbles: true }));
  form.elements.portion.dispatchEvent(new Event('input', { bubbles: true }));
  await tick(80);
  includes(form.querySelector('#kcal-estimate').textContent, '166', '实时估算');
  form.requestSubmit();
  await tick(220);
  const item = Store.data.diet.meals[0];
  assert(item, '应加入搭配');
  eq(item.detail, '去皮', '做法');
  eq(item.calories, 166, '自动估算热量');
  includes(mainText(), '去皮', '页面显示做法');
  includes(mainText(), '166', '页面显示热量');
});

test('P20 饮水旁边有咖啡栏，可以加减杯数', async () => {
  resetData();
  const t = todayKey();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  const coffee = document.querySelector('.coffee-card');
  assert(coffee, '应有咖啡卡片');
  includes(coffee.textContent, '约 80 mg 咖啡因 / 杯');
  coffee.querySelector('[data-act="coffeePlus"]').click();
  await tick(160);
  document.querySelector('.coffee-card [data-act="coffeePlus"]').click();
  await tick(160);
  eq(Store.data.diet.coffee[t], 2, '两杯咖啡');
  includes(document.querySelector('.coffee-card').textContent, '160', '咖啡因');
  document.querySelector('.coffee-card [data-act="coffeeMinus"]').click();
  await tick(160);
  eq(Store.data.diet.coffee[t], 1, '减一杯');
});

/* ---------------- P21 首页简约风格 ---------------- */

test('P21 首页顶部浅色简约，天气有天气背景', async () => {
  resetData();
  App.render();
  const hero = document.querySelector('.home-hero');
  eq(getComputedStyle(hero).color, 'rgb(26, 31, 40)', 'Hero 文字应为深色');
  const weather = document.querySelector('.home-weather');
  const weatherBg = getComputedStyle(weather).backgroundImage;
  assert(/gradient/.test(weatherBg), '天气卡应有天气背景：' + weatherBg);
  assert(/w-/.test(weather.className), '天气卡应带天气状态类：' + weather.className);
  const clockSize = parseFloat(getComputedStyle(document.querySelector('.hero-clock')).fontSize);
  assert(clockSize >= 80, '时钟应更大：' + clockSize);
  const secSize = parseFloat(getComputedStyle(document.querySelector('.hero-clock small')).fontSize);
  assert(secSize >= 22, '秒数应清楚：' + secSize);
  const bg = getComputedStyle(hero).backgroundImage;
  assert(/gradient/.test(bg), '保留轻微渐变层次');
});

/* ---------------- P22 常吃食物热量 ---------------- */

test('P22 常吃食物缺少热量时按公式补算并用于拖拽', async () => {
  resetData();
  const t = todayKey();
  Store.data.diet.foods = [{ id: 'f22', name: '鸡腿', portion: '1 个', category: '肉类' }];
  Store.save();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  const card = document.querySelector('.food-card');
  assert(card, '应有常吃食物卡片');
  includes(card.textContent, '230', '卡片应显示估算热量');
  assert(document.querySelector('[data-act="recalcFoods"]'), '应有补算按钮');

  const meal = document.querySelector('.meal[data-meal="lunch"]');
  const dt = new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  meal.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
  await tick(250);
  const item = Store.data.diet.meals[0];
  assert(item, '应拖入搭配');
  eq(item.calories, 230, '拖拽也要带上计算后的热量');
  includes(document.querySelector('.meal[data-meal="lunch"]').textContent, '230', '餐次显示热量');

  document.querySelector('[data-act="recalcFoods"]').click();
  await tick(200);
  eq(Store.data.diet.foods[0].calories, 230, '补算后写回常吃食物');
  assert(!document.querySelector('[data-act="recalcFoods"]'), '补算后按钮消失');
});

test('P22 新增常吃食物时实时估算热量', async () => {
  resetData();
  Pages.diet.date = todayKey();
  Pages.diet.month = monthKeyOf(todayKey());
  showPage('diet');
  document.querySelector('[data-act="addFav"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  form.elements.name.value = '奶茶';
  form.elements.portion.value = '1 杯';
  form.elements.name.dispatchEvent(new Event('input', { bubbles: true }));
  form.elements.portion.dispatchEvent(new Event('input', { bubbles: true }));
  await tick(80);
  includes(form.querySelector('#fav-kcal-estimate').textContent, '350', '实时估算');
  form.requestSubmit();
  await tick(220);
  const food = Store.data.diet.foods.filter((f) => f.name === '奶茶')[0];
  assert(food, '应保存常吃食物');
  eq(food.calories, 350, '自动填入热量');
  includes(mainText(), '奶茶', '页面显示');
});

/* ---------------- P23 天气背景 ---------------- */

test('P23 天气状态对应不同背景', async () => {
  eq(homeWeatherTone(0, 14), 'clear', '晴天');
  eq(homeWeatherTone(0, 22), 'night-clear', '晴夜');
  eq(homeWeatherTone(61, 14), 'rain', '下雨');
  eq(homeWeatherTone(3, 14), 'cloud', '多云');
  eq(homeWeatherTone(45, 14), 'fog', '雾');
  eq(homeWeatherTone(73, 14), 'snow', '雪');
  eq(homeWeatherText(0), '晴');
  eq(homeWeatherText(61), '小雨');
});

/* ---------------- P24 蛋白质部件 ---------------- */

test('P24 蛋白质按食物和分量估算', async () => {
  eq(estimateFoodProtein('鸡胸肉', '100 g'), 31, '鸡胸肉');
  eq(estimateFoodProtein('鸡蛋', '2 个'), 12, '两个鸡蛋');
  assert(estimateFoodProtein('米饭', '1 碗') >= 4, '米饭蛋白质');
  assert(estimateFoodProtein('牛肉', '150 g') >= 25, '牛肉蛋白质');
});

test('P24 热量与蛋白质并排显示', async () => {
  resetData();
  const t = todayKey();
  Store.data.body.metrics = [{ id: 'bm24', date: t, weight: 70 }];
  Store.data.diet.meals = [
    { id: 'dm24-1', date: t, type: 'breakfast', name: '燕麦', portion: '50 g', calories: 300, protein: 30 },
    { id: 'dm24-2', date: t, type: 'lunch', name: '鸡胸肉', portion: '100 g', calories: 400, protein: 40 },
  ];
  Store.data.settings.calorieGoal = 1500;
  Store.data.settings.proteinGoal = 140;
  Store.save();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  const macros = document.querySelector('.diet-macros');
  assert(macros, '应有并排的宏量营养素区');
  eq(macros.children.length, 2, '热量 + 蛋白质两张卡');
  includes(document.querySelector('.calorie-card').textContent, '700', '热量');
  const protein = document.querySelector('.protein-card');
  includes(protein.textContent, '70', '蛋白质克数');
  includes(protein.textContent, '140', '蛋白质目标');
  includes(protein.textContent, '还差 70 g', '剩余蛋白质');
  assert(document.querySelector('.protein-bar i'), '应有蛋白质进度条');
});

test('P24 蛋白质目标可以保存', async () => {
  resetData();
  const t = todayKey();
  Store.data.body.metrics = [{ id: 'bm24-2', date: t, weight: 70 }];
  Store.save();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  includes(document.querySelector('.protein-card').textContent, '112', '默认按体重 1.6g/kg');
  const form = document.querySelector('#body-form');
  form.elements.proteinGoal.value = '150';
  form.requestSubmit();
  await tick(220);
  eq(Store.data.settings.proteinGoal, 150, '保存目标');
  includes(document.querySelector('.protein-card').textContent, '150', '页面更新');
});

/* ---------------- P25 天气自动刷新 ---------------- */

test('P25 天气会自动刷新，不用手动点', async () => {
  resetData();
  App.render();
  assert(Pages.home._weatherTimer, '首页应启动自动刷新定时器');
  const realFetch = window.fetch;
  let calls = 0;
  window.fetch = () => {
    calls++;
    return Promise.resolve({
      ok: true,
      json: () => ({
        current: { temperature_2m: 20, apparent_temperature: 19, relative_humidity_2m: 50, wind_speed_10m: 5, weather_code: 0 },
        daily: { temperature_2m_max: [24], temperature_2m_min: [16] },
      }),
    });
  };
  try {
    localStorage.removeItem(WEATHER_CACHE_KEY);
    Pages.home.weatherInterval = 40;
    Pages.home.startWeatherAuto(document.querySelector('#main'));
    await tick(160);
    assert(calls >= 2, '定时器应重复刷新天气：' + calls);
    includes(document.querySelector('#weather-temp').textContent, '20', '自动刷新后温度');
  } finally {
    Pages.home.stopWeatherAuto();
    Pages.home.weatherInterval = HOME_WEATHER_REFRESH_MS;
    window.fetch = realFetch;
  }
});

/* ---------------- P26 健身休息日 ---------------- */

test('P26 休息日可以拖进周计划，颜色与训练日不同', async () => {
  resetData();
  const t = todayKey();
  Pages.fitness.weekStart = weekStartKey(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  const rest = document.querySelector('[data-rest-day]');
  const cell = document.querySelector('.week-day[data-date="' + t + '"]');
  assert(rest && cell, '应有休息日模块和周格子');
  const dt = new DataTransfer();
  rest.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  cell.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
  cell.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
  await tick(250);
  eq(Store.data.fitness.plans.length, 1, '应生成一条计划');
  eq(Store.data.fitness.plans[0].kind, 'rest', '计划类型');
  const restCell = document.querySelector('.week-day[data-date="' + t + '"]');
  includes(restCell.textContent, '休息日', '格子里显示休息日');
  const restPlan = restCell.querySelector('.wd-plan.is-rest');
  assert(restPlan, '休息日应有独立样式');
  const restBg = getComputedStyle(restPlan).backgroundColor;

  const next = addDays(t, 1);
  const routine = document.querySelector('.routine-item');
  const nextCell = document.querySelector('.week-day[data-date="' + next + '"]');
  const dt2 = new DataTransfer();
  routine.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt2 }));
  nextCell.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt2 }));
  await tick(250);
  const trainPlan = document.querySelector('.week-day[data-date="' + next + '"] .wd-plan:not(.is-rest)');
  assert(trainPlan, '训练日应有训练卡片');
  assert(getComputedStyle(trainPlan).backgroundColor !== restBg, '休息日颜色应与训练日不同');
});

test('P26 休息日和训练不能互相叠加', async () => {
  resetData();
  const t = todayKey();
  Pages.fitness.weekStart = weekStartKey(t);
  Pages.fitness.selected = t;
  Store.data.fitness.plans = [
    { id: 'train1', date: t, routineId: 'rt-push', name: '推日', note: '', exercises: [] },
  ];
  Store.save();
  showPage('fitness');
  const rest = document.querySelector('[data-rest-day]');
  const cell = document.querySelector('.week-day[data-date="' + t + '"]');
  const dt = new DataTransfer();
  rest.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  cell.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
  await tick(220);
  eq(Store.data.fitness.plans.length, 1, '有训练时不能加休息日');

  Store.data.fitness.plans = [{ id: 'rest1', date: t, kind: 'rest', name: '休息日', note: '' }];
  Store.save();
  App.render();
  const routine = document.querySelector('.routine-item');
  const cell2 = document.querySelector('.week-day[data-date="' + t + '"]');
  const dt2 = new DataTransfer();
  routine.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt2 }));
  cell2.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt2 }));
  await tick(220);
  eq(Store.data.fitness.plans.length, 1, '休息日不能叠加训练');
  includes(mainText(), '休息日', '详情显示休息日');
});

/* ---------------- P27 常吃食物小细节 ---------------- */

test('P27 新增常吃食物可以选小细节并影响热量', async () => {
  resetData();
  const t = todayKey();
  Pages.diet.date = t;
  Pages.diet.month = monthKeyOf(t);
  showPage('diet');
  document.querySelector('[data-act="addFav"]').click();
  await tick(150);
  const form = document.querySelector('#modal-root form');
  form.elements.name.value = '鸡腿';
  form.elements.portion.value = '1 个';
  form.elements.detail.value = '去皮';
  form.elements.name.dispatchEvent(new Event('input', { bubbles: true }));
  form.elements.portion.dispatchEvent(new Event('input', { bubbles: true }));
  form.elements.detail.dispatchEvent(new Event('change', { bubbles: true }));
  await tick(80);
  includes(form.querySelector('#fav-kcal-estimate').textContent, '166', '去皮后的估算');
  form.requestSubmit();
  await tick(250);

  const food = Store.data.diet.foods.filter((f) => f.name === '鸡腿')[0];
  assert(food, '应保存常吃食物');
  eq(food.detail, '去皮', '保存小细节');
  eq(food.calories, 166, '按去皮计算热量');
  includes(mainText(), '去皮', '卡片显示小细节');

  const card = Array.prototype.find.call(document.querySelectorAll('.food-card'), (el) => el.textContent.indexOf('鸡腿') >= 0);
  const meal = document.querySelector('.meal[data-meal="lunch"]');
  const dt = new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  meal.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }));
  await tick(250);
  const item = Store.data.diet.meals[0];
  assert(item, '应拖入搭配');
  eq(item.detail, '去皮', '拖拽带上小细节');
  eq(item.calories, 166, '拖拽带上热量');
  includes(document.querySelector('.meal[data-meal="lunch"]').textContent, '去皮', '餐次显示小细节');
});

/* ---------------- P28 计划偏好 ---------------- */

test('P28 今日计划保留计划偏好设置', async () => {
  resetData();
  const t = todayKey();
  Pages.plan.date = t;
  Pages.plan.view = 'timeline';
  showPage('plan');
  const gear = document.querySelector('[data-act="prefs"]');
  assert(gear, '应有计划偏好入口');
  gear.click();
  await tick(180);
  includes(document.querySelector('#modal-root .modal-head h3').textContent, '计划偏好');
  const form = document.querySelector('#modal-root form');
  form.elements.wake.value = '08:00';
  form.elements.sleep.value = '22:00';
  form.elements.focusMin.value = '80';
  document.querySelector('[data-add-fixed]').click();
  const rows = form.querySelectorAll('[data-fixed-row]');
  const row = rows[rows.length - 1];
  row.querySelector('[name="fixedStart"]').value = '09:00';
  row.querySelector('[name="fixedEnd"]').value = '11:00';
  row.querySelector('[name="fixedLabel"]').value = '开会';
  form.requestSubmit();
  await tick(250);

  const prefs = Store.data.settings.planPrefs;
  assert(prefs, '应保存计划偏好');
  eq(prefs.wake, '08:00', '起床时间');
  eq(prefs.sleep, '22:00', '睡觉时间');
  eq(prefs.focusMin, 80, '专注时长');
  eq(prefs.fixed.length, 1, '固定安排数量');
  eq(prefs.fixed[0].label, '开会', '固定安排名称');
  eq(document.querySelector('.tl-hour span').textContent, '08:00', '时间轴从起床时间开始');
  const fixedText = Array.prototype.map
    .call(document.querySelectorAll('.tl-block.is-fixed'), (el) => el.textContent)
    .join('|');
  includes(fixedText, '开会', '时间轴显示固定安排');

  Store.data.study.goals = [{ id: 'g28', title: '读书', category: '书籍' }];
  Store.save();
  Pages.plan.paletteTab = 'study';
  App.refresh();
  const card = document.querySelector('.palette-item[draggable="true"]');
  const payload = JSON.parse(card.dataset.payload);
  eq(payload.duration, 80, '学习模块默认时长跟随专注时长');
});

test('P28 旧排程偏好会迁移到计划偏好', async () => {
  resetData();
  delete Store.data.settings.planPrefs;
  Store.data.settings.schedule = {
    wake: '06:30',
    sleep: '22:30',
    focusMin: 60,
    fixed: [{ start: '09:00', end: '10:00', label: '早会' }],
  };
  const p = planPrefs();
  eq(p.wake, '06:30', '沿用旧起床时间');
  eq(p.sleep, '22:30', '沿用旧睡觉时间');
  eq(p.focusMin, 60, '沿用旧专注时长');
  eq(p.fixed.length, 1, '沿用旧固定安排');
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
