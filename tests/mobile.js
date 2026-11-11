'use strict';

/* 手机布局测试：在 390×844 的窗口里运行 */

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

function mainText() {
  return document.getElementById('main').innerText || '';
}

function noOverflow(label) {
  const doc = document.documentElement;
  assert(doc.scrollWidth <= doc.clientWidth + 1, label + ' 出现横向滚动：' + doc.scrollWidth + ' > ' + doc.clientWidth);
}

window.__testErrors = [];
window.addEventListener('error', (e) => window.__testErrors.push(String(e.message || e.error)));
window.addEventListener('unhandledrejection', (e) => window.__testErrors.push('unhandledrejection: ' + String(e.reason)));

test('手机显示底部导航，桌面侧栏隐藏', async () => {
  resetData();
  const nav = document.getElementById('mobile-nav');
  assert(nav, '应有手机导航');
  eq(nav.querySelectorAll('.mnav-item').length, 5, '五个标签');
  const labels = Array.prototype.map.call(nav.querySelectorAll('.mnav-item span'), (el) => el.textContent);
  eq(labels.join(','), '首页,计划,健身,饮食,更多', '标签顺序');
  eq(getComputedStyle(document.querySelector('.sidebar')).display, 'none', '侧栏应隐藏');
  assert(getComputedStyle(nav).display !== 'none', '底部导航应显示');
  noOverflow('首页');
});

test('底部标签可以切换计划 / 健身 / 饮食', async () => {
  resetData();
  document.querySelector('[data-route="plan"]').click();
  await tick(220);
  eq(App.route, 'plan', '计划路由');
  includes(mainText(), '今日计划', '计划页');
  noOverflow('今日计划');

  document.querySelector('[data-route="fitness"]').click();
  await tick(220);
  eq(App.route, 'fitness', '健身路由');
  includes(mainText(), '本周训练', '健身页');

  document.querySelector('[data-route="diet"]').click();
  await tick(220);
  eq(App.route, 'diet', '饮食路由');
  includes(mainText(), '今日热量', '饮食页');
});

test('更多弹层列出其余模块并能跳转', async () => {
  resetData();
  document.querySelector('[data-more]').click();
  await tick(120);
  const sheet = document.querySelector('#sheet-root .sheet');
  assert(sheet, '应打开更多弹层');
  const items = sheet.querySelectorAll('.sheet-item');
  assert(items.length >= 5, '应列出其余模块：' + items.length);
  const work = Array.prototype.find.call(items, (a) => a.textContent.indexOf('跨境工作') >= 0);
  assert(work, '应包含跨境工作');
  work.click();
  await tick(250);
  eq(App.route, 'work', '跳转到跨境工作');
  assert(!document.querySelector('#sheet-root .sheet'), '跳转后弹层关闭');
  noOverflow('跨境工作');
});

test('手机各页面没有横向溢出', async () => {
  resetData();
  const routes = ['home', 'plan', 'fitness', 'diet', 'work', 'study', 'games', 'money', 'settings'];
  for (const route of routes) {
    App.route = route;
    App.render();
    await tick(30);
    noOverflow(route);
  }
});

test('手机计划页保留时间轴和可拖拽模块', async () => {
  resetData();
  Pages.plan.paletteTab = 'fitness';
  App.route = 'plan';
  App.render();
  assert(document.querySelector('#plan-timeline'), '应有时间轴');
  assert(document.querySelector('.palette-item[draggable="true"]'), '应有可拖拽模块');
  assert(document.querySelector('[data-act="prefs"]'), '应有计划偏好');
});

(async function runAll() {
  for (let i = 0; i < 120 && !window.__APP_READY; i++) await tick(50);
  await tick(100);
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
  const text = lines.join('\n');
  pre.textContent = text;
  document.title = 'MOBILE ' + passed + '/' + total;
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'xya-mobile-results', text: text }, '*');
  }
})();
