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

/* ---------------- 运行 ---------------- */

(async function runAll() {
  await tick(60);
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
