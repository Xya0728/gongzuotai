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

test('P2 健身日历显示部位、动作与次数', async () => {
  resetData();
  const t = todayKey();
  Store.data.fitness.sessions = [
    {
      id: 'ts1',
      date: t,
      name: '推日',
      exercises: [
        { part: '胸', name: '卧推', sets: [{ w: 60, r: 8 }, { w: 60, r: 8 }, { w: 55, r: 10 }] },
        { part: '手臂', name: '绳索下压', sets: [{ w: 20, r: 12 }] },
      ],
    },
  ];
  Store.save();
  Pages.fitness.month = monthKeyOf(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  eq(document.querySelectorAll('.cal-cell[data-date]').length, daysInMonth(monthKeyOf(t)), '日历格子数');
  const todayCell = document.querySelector('.cal-cell[data-date="' + t + '"]');
  assert(todayCell, '找不到今天的格子');
  includes(todayCell.textContent, '胸', '今日格子应显示部位');
  includes(todayCell.textContent, '手臂', '今日格子应显示部位');
  includes(mainText(), '卧推', '详情应显示动作');
  includes(mainText(), '60kg×8', '详情应显示重量和次数');
  includes(mainText(), '绳索下压', '详情应显示全部动作');
});

test('P2 健身日历可以切换日期', async () => {
  resetData();
  const t = todayKey();
  Pages.fitness.month = monthKeyOf(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  const other = Pages.fitness.month + '-28';
  document.querySelector('.cal-cell[data-date="' + other + '"]').click();
  await tick(150);
  eq(Pages.fitness.selected, other, '选中的日期');
  includes(mainText(), '这一天还没有训练记录', '空日期提示');
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
  Store.data.fitness.sessions = [
    {
      id: 'fs-art',
      date: t,
      name: '推日',
      exercises: [
        { part: '胸', equipment: 'barbell', name: '卧推', sets: [{ w: 60, r: 8 }] },
        { part: '肩', equipment: 'dumbbell', name: '哑铃肩推', sets: [{ w: 16, r: 10 }] },
      ],
    },
  ];
  Store.save();
  Pages.fitness.month = monthKeyOf(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  const icons = document.querySelectorAll('.ex-line .ex-ico svg');
  eq(icons.length, 2, '每个动作一个器械插画');
  eq(icons[0].getAttribute('aria-label'), '杠铃', '第一个动作器械');
  eq(icons[1].getAttribute('aria-label'), '哑铃', '第二个动作器械');
  includes(mainText(), '杠铃', '本月器械使用应显示杠铃');
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

/* ---------------- P4 我的设备 / 我的游戏 ---------------- */

test('P4 游戏娱乐分为我的游戏与我的设备', async () => {
  resetData();
  Pages.games.tab = 'games';
  showPage('games');
  const tabs = document.querySelectorAll('.tabs .tab');
  eq(tabs.length, 2, '标签数量');
  includes(tabs[0].textContent, '我的游戏');
  includes(tabs[1].textContent, '我的设备');
  document.querySelector('[data-act="tab"][data-tab="devices"]').click();
  await tick(160);
  eq(Pages.games.tab, 'devices', '切换后的标签');
  eq(document.querySelectorAll('.device-col').length, 4, '四类设备');
});

test('P4 我的设备展示显示器/键盘/鼠标/耳机', async () => {
  resetData();
  Store.data.games.devices = [
    { id: 'dv1', type: 'monitor', brand: 'LG', model: '27GP950', spec: '27 英寸 4K 144Hz', purchasedAt: todayKey(), price: 4999, note: '' },
    { id: 'dv2', type: 'keyboard', brand: 'Keychron', model: 'Q1', spec: '75% 机械键盘', price: 899 },
    { id: 'dv3', type: 'mouse', brand: 'Logitech', model: 'GPX', spec: '无线 60g', price: 999 },
    { id: 'dv4', type: 'headset', brand: 'Sony', model: 'WH-1000XM5', spec: '降噪', price: 2999 },
  ];
  Store.save();
  Pages.games.tab = 'devices';
  showPage('games');
  eq(document.querySelectorAll('.device-card').length, 4, '设备卡片数');
  const text = mainText();
  includes(text, 'LG');
  includes(text, 'Keychron');
  includes(text, 'GPX');
  includes(text, 'WH-1000XM5');
  includes(text, '27 英寸 4K 144Hz');
  assert(document.querySelector('.device-ico svg'), '设备插画');
});

/* ---------------- P5 预置游戏 ---------------- */

test('P5 默认游戏是「无畏契约」和「王者荣耀」', async () => {
  resetData();
  const titles = Store.data.games.items.map((g) => g.title);
  eq(titles.length, 2, '默认游戏数量');
  includes(titles.join(','), '无畏契约');
  includes(titles.join(','), '王者荣耀');
  Pages.games.tab = 'games';
  showPage('games');
  includes(mainText(), '无畏契约');
  includes(mainText(), '王者荣耀');
});

test('P5 预置游戏只种一次，不会重复', async () => {
  Store.data.games.items = [];
  Store.data.settings.seededGames = false;
  Store.save();
  Store.load();
  eq(Store.data.games.items.length, 2, '重新载入后补齐预置游戏');

  Store.data.games.items = [];
  Store.data.settings.seededGames = true;
  Store.save();
  Store.load();
  eq(Store.data.games.items.length, 0, '用户删光后不应强行加回来');
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

test('P10 训练模板可以拖进日历', async () => {
  resetData();
  const t = todayKey();
  Pages.fitness.month = monthKeyOf(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  const routine = document.querySelector('.routine-item');
  const cell = document.querySelector('.cal-cell[data-date="' + t + '"]');
  assert(routine, '应有训练模板');
  assert(cell, '应有日历格子');
  const dt = new DataTransfer();
  routine.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
  cell.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
  cell.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  await tick(250);
  const plans = Store.data.fitness.plans || [];
  eq(plans.length, 1, '应生成一条训练计划');
  eq(plans[0].date, t, '计划日期');
  assert(document.querySelector('.plan-row'), '日历详情应显示计划');
  includes(document.querySelector('.cal-cell[data-date="' + t + '"]').textContent, '计划', '日历格子应有计划标记');
});

test('P10 同一天不会重复安排同一模板', async () => {
  resetData();
  const t = todayKey();
  Pages.fitness.month = monthKeyOf(t);
  Pages.fitness.selected = t;
  showPage('fitness');
  const routine = document.querySelector('.routine-item');
  const cell = document.querySelector('.cal-cell[data-date="' + t + '"]');
  for (let i = 0; i < 2; i++) {
    const dt = new DataTransfer();
    routine.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    cell.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    await tick(200);
  }
  eq((Store.data.fitness.plans || []).length, 1, '不应重复');
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
