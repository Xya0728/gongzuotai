'use strict';

/* =========================================================
   基础常量
   ========================================================= */

const DB_KEY = 'xya.life.v1';
const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 各页面渲染器：js/pages/*.js 在此注册 */
const Pages = {};

const CURRENCY_SYMBOL = { CNY: '¥', USD: '$', EUR: '€', GBP: '£', JPY: 'JP¥', HKD: 'HK$' };
const CURRENCY_OPTIONS = [
  { value: 'CNY', label: '人民币 CNY' },
  { value: 'USD', label: '美元 USD' },
  { value: 'EUR', label: '欧元 EUR' },
  { value: 'GBP', label: '英镑 GBP' },
  { value: 'JPY', label: '日元 JPY' },
  { value: 'HKD', label: '港币 HKD' },
];

const MODULES = [
  { id: 'home', name: '首页总览', icon: 'home', color: '#334155', soft: '#eceef2', group: '' },
  { id: 'plan', name: '今日计划', icon: 'calendar', color: '#2563eb', soft: '#e8effd', group: '' },
  { id: 'work', name: '跨境工作', icon: 'globe', color: '#0e7490', soft: '#e2f1f5', group: '工作与成长' },
  { id: 'study', name: '学习计划', icon: 'book', color: '#7c3aed', soft: '#f0eafd', group: '工作与成长' },
  { id: 'fitness', name: '健身计划', icon: 'dumbbell', color: '#ea580c', soft: '#fdeee4', group: '身体与娱乐' },
  { id: 'diet', name: '饮食计划', icon: 'bowl', color: '#16a34a', soft: '#e6f5ea', group: '身体与娱乐' },
  { id: 'games', name: '游戏娱乐', icon: 'gamepad', color: '#db2777', soft: '#fce8f0', group: '身体与娱乐' },
  { id: 'money', name: '消费记录', icon: 'wallet', color: '#b45309', soft: '#fbf0dd', group: '记录' },
  { id: 'settings', name: '数据与设置', icon: 'sliders', color: '#475569', soft: '#eceef2', group: '系统' },
];

const ICONS = {
  home: '<path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4.4v-6H9.4v6H5a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.3 4 5.3 4 8.5s-1.4 6.2-4 8.5c-2.6-2.3-4-5.3-4-8.5s1.4-6.2 4-8.5z"/>',
  book: '<path d="M12 6.6C10.5 4.9 8 4 5 4v14c3 0 5.5.9 7 2.6 1.5-1.7 4-2.6 7-2.6V4c-3 0-5.5.9-7 2.6z"/><path d="M12 6.6v14"/>',
  dumbbell: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  bowl: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7.6c0-1.1.7-1.7 1.3-2.1M13.5 7.6c0-1.2.8-1.9 1.5-2.3"/>',
  gamepad: '<rect x="2.5" y="7.5" width="19" height="10" rx="5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="16" cy="11.2" r=".95" fill="currentColor" stroke="none"/><circle cx="18" cy="13.6" r=".95" fill="currentColor" stroke="none"/>',
  wallet: '<path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h12.5A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5H6a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M3.5 9.5h13"/><circle cx="16.6" cy="12.6" r="1"/>',
  sliders: '<path d="M4 7h8M16.5 7H20M4 17h3.5M12 17h8M4 12h13"/><circle cx="14.3" cy="7" r="1.9"/><circle cx="9.6" cy="17" r="1.9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5 9.5 17 19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16M9.5 7V4.8h5V7M6.8 7l.7 12.4h9L17.2 7"/><path d="M10.2 10.8v5.4M13.8 10.8v5.4"/>',
  edit: '<path d="M4 20h4.2L20 8.2 15.8 4 4 15.8z"/><path d="M14.2 5.6 18.4 9.8"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15"/>',
  upload: '<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5M4.5 19.5h15"/>',
  chevronL: '<path d="M14.5 6 8.5 12l6 6"/>',
  chevronR: '<path d="M9.5 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  flame: '<path d="M12 3.2c3.4 3 5 5.7 5 8.6a5 5 0 0 1-10 0c0-1.6.6-3 1.8-4.6.5 1.3 1.2 2.2 2.2 2.7.8-1.6.9-3.7 1-6.7z"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6v1.9M3.5 12.5h17"/>',
  droplet: '<path d="M12 3.5s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z"/>',
};

const PRIORITIES = [
  { value: 'high', label: '高', tone: 'red' },
  { value: 'mid', label: '中', tone: 'amber' },
  { value: 'low', label: '低', tone: 'gray' },
];

const ORDER_STATUS = [
  { value: 'pending', label: '待发货', tone: 'amber' },
  { value: 'shipped', label: '已发货', tone: 'blue' },
  { value: 'done', label: '已签收', tone: 'green' },
  { value: 'refund', label: '已退款', tone: 'red' },
];

const WORK_STAGES = [
  { value: 'idea', label: '想法' },
  { value: 'research', label: '调研' },
  { value: 'testing', label: '测试' },
  { value: 'live', label: '在售' },
  { value: 'dropped', label: '放弃' },
];

const GOAL_STATUS = [
  { value: 'active', label: '进行中', tone: 'blue' },
  { value: 'done', label: '已完成', tone: 'green' },
  { value: 'paused', label: '暂停', tone: 'gray' },
];

const MEALS = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '加餐' },
];

const GAME_STATUS = [
  { value: 'want', label: '想玩', tone: 'violet' },
  { value: 'playing', label: '在玩', tone: 'blue' },
  { value: 'done', label: '已通关', tone: 'green' },
];

const BODY_PARTS = ['胸', '背', '肩', '腿', '臀', '手臂', '核心', '有氧', '全身'];

/* =========================================================
   工具函数
   ========================================================= */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function esc(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dateKey(d = new Date()) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function todayKey() {
  return dateKey(new Date());
}

function parseDate(key) {
  const parts = String(key || todayKey()).split('-').map(Number);
  return new Date(parts[0] || 1970, (parts[1] || 1) - 1, parts[2] || 1);
}

function addDays(key, n) {
  const d = parseDate(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

function diffDays(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000);
}

function weekStartKey(key = todayKey()) {
  const d = parseDate(key);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return dateKey(d);
}

function monthKeyOf(key = todayKey()) {
  return String(key).slice(0, 7);
}

function addMonths(mk, n) {
  const parts = String(mk).split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1 + n, 1);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
}

function monthLabel(mk) {
  const parts = String(mk).split('-');
  return Number(parts[0]) + '年' + Number(parts[1]) + '月';
}

function weekdayCN(key) {
  return WEEK_CN[parseDate(key).getDay()];
}

function fmtDateCN(key, withWeek = false) {
  const d = parseDate(key);
  return (d.getMonth() + 1) + '月' + d.getDate() + '日' + (withWeek ? ' ' + WEEK_CN[d.getDay()] : '');
}

function fmtShortDate(key) {
  const d = parseDate(key);
  return (d.getMonth() + 1) + '/' + d.getDate();
}

function minutesText(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return h + ' 小时' + (rest ? ' ' + rest + ' 分' : '');
}

function hoursText(min) {
  const h = (Number(min) || 0) / 60;
  return (Math.round(h * 10) / 10) + ' 小时';
}

function fmtNum(v, digits = 0) {
  return (Number(v) || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtMoney(amount, cur = 'CNY') {
  const v = Number(amount) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  const digits = cur === 'JPY' ? 0 : abs >= 1000 ? 0 : 2;
  return sign + (CURRENCY_SYMBOL[cur] || '') + fmtNum(abs, digits);
}

function rateOf(cur) {
  const rates = Store.data && Store.data.settings ? Store.data.settings.rates : {};
  const r = Number(rates && rates[cur]);
  return r > 0 ? r : 1;
}

function toCNY(amount, cur) {
  if (!cur || cur === 'CNY') return Number(amount) || 0;
  return (Number(amount) || 0) * rateOf(cur);
}

function fmtBase(amount, cur) {
  return '≈' + fmtMoney(toCNY(amount, cur), 'CNY');
}

function monthGrid(mk) {
  const parts = String(mk).split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= total; day++) cells.push(mk + '-' + pad2(day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function sumBy(list, fn) {
  return (list || []).reduce((acc, item) => acc + (Number(fn(item)) || 0), 0);
}

function byDateDesc(a, b) {
  return (
    String(b.date || '').localeCompare(String(a.date || '')) ||
    (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0) ||
    String(b.id || '').localeCompare(String(a.id || ''))
  );
}

function byDateAsc(a, b) {
  return String(a.date || '').localeCompare(String(b.date || ''));
}

function optionLabel(list, value) {
  const found = (list || []).find((o) => o.value === value);
  return found ? found.label : value || '';
}

function optionTone(list, value) {
  const found = (list || []).find((o) => o.value === value);
  return found ? found.tone || 'gray' : 'gray';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function shopOf(id) {
  return Store.data.work.shops.find((s) => s.id === id);
}

function shopName(id) {
  const s = shopOf(id);
  return s ? s.name : '未指定店铺';
}

/** 连续打卡天数：今天没打卡时从昨天往前数 */
function studyStreak(logs) {
  const days = {};
  (logs || []).forEach((l) => {
    if (l.date) days[l.date] = true;
  });
  let cursor = todayKey();
  if (!days[cursor]) cursor = addDays(cursor, -1);
  let count = 0;
  while (days[cursor]) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/* =========================================================
   数据层
   ========================================================= */

function defaultData() {
  return {
    version: 1,
    createdAt: todayKey(),
    settings: {
      rates: { CNY: 1, USD: 7.2, EUR: 7.85, GBP: 9.15, JPY: 0.048, HKD: 0.92 },
      weeklyGameLimit: 10,
      waterGoal: 2000,
      waterCup: 250,
      hidden: [],
    },
    memos: [],
    plan: { items: [] },
    work: { shops: [], orders: [], stock: [], products: [], ads: [] },
    study: { goals: [], logs: [] },
    fitness: {
      routines: [
        { id: 'rt-push', name: '推日', note: '胸 / 肩 / 三头' },
        { id: 'rt-pull', name: '拉日', note: '背 / 二头' },
        { id: 'rt-legs', name: '腿日', note: '股四 / 臀 / 腘绳' },
      ],
      sessions: [],
    },
    diet: {
      meals: [],
      foods: [
        { id: 'fd-egg', name: '鸡蛋', portion: '1 个', category: '蛋奶' },
        { id: 'fd-milk', name: '牛奶', portion: '1 杯', category: '蛋奶' },
        { id: 'fd-rice', name: '米饭', portion: '1 碗', category: '主食' },
        { id: 'fd-chicken', name: '鸡胸肉', portion: '100 g', category: '肉类' },
        { id: 'fd-broccoli', name: '西兰花', portion: '100 g', category: '蔬菜' },
        { id: 'fd-banana', name: '香蕉', portion: '1 根', category: '水果' },
        { id: 'fd-oat', name: '燕麦', portion: '50 g', category: '主食' },
        { id: 'fd-coffee', name: '咖啡', portion: '1 杯', category: '饮品' },
      ],
      water: {},
    },
    games: { items: [], sessions: [], devices: [] },
    money: {
      txns: [],
      budgets: {},
      categories: {
        expense: ['餐饮', '交通', '购物', '居住', '通讯', '娱乐', '日用', '医疗', '其他'],
        income: ['工资', '副业', '其他'],
      },
    },
    body: { metrics: [] },
  };
}

function mergeDeep(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : base;
  if (base && typeof base === 'object') {
    const out = Object.assign({}, base);
    if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
      Object.keys(patch).forEach((key) => {
        out[key] = key in base ? mergeDeep(base[key], patch[key]) : patch[key];
      });
    }
    return out;
  }
  return patch === undefined ? base : patch;
}

const Store = {
  data: null,
  ok: true,
  loadedAt: null,

  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(DB_KEY);
    } catch (err) {
      this.ok = false;
    }
    let saved = null;
    if (raw) {
      try {
        saved = JSON.parse(raw);
      } catch (err) {
        saved = null;
      }
    }
    this.data = mergeDeep(defaultData(), saved && typeof saved === 'object' ? saved : {});
    if (!this.ok) return;
    if (!raw) this.save();
    this.loadedAt = new Date();
  },

  save() {
    if (!this.ok) return false;
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
      return true;
    } catch (err) {
      this.ok = false;
      toast('保存失败：浏览器本地存储不可用', 'err');
      return false;
    }
  },

  sizeText() {
    try {
      const bytes = new Blob([JSON.stringify(this.data)]).size;
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    } catch (err) {
      return '未知';
    }
  },

  reset() {
    this.data = defaultData();
    this.save();
  },
};

function exportData() {
  const json = JSON.stringify(Store.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '生活工作台备份-' + todayKey() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('备份文件已生成');
}

function importData(file, done) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || typeof parsed !== 'object') throw new Error('格式不对');
      Store.data = mergeDeep(defaultData(), parsed);
      Store.save();
      toast('数据已恢复');
      if (done) done();
    } catch (err) {
      toast('导入失败：文件不是有效的备份', 'err');
    }
  };
  reader.onerror = () => toast('读取文件失败', 'err');
  reader.readAsText(file);
}

/* =========================================================
   通用 UI
   ========================================================= */

const $ = (sel, root) => (root || document).querySelector(sel);

function icon(name, cls) {
  return (
    '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ICONS[name] || '') +
    '</svg>'
  );
}

function bind(root, handlers) {
  root.querySelectorAll('[data-act]').forEach((node) => {
    const fn = handlers[node.dataset.act];
    if (!fn) return;
    node.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn(node, e);
    });
  });
}

function pageHead(title, desc, actions) {
  return (
    '<div class="page-head"><div><h1>' + esc(title) + '</h1>' +
    (desc ? '<p class="page-desc">' + esc(desc) + '</p>' : '') +
    '</div>' +
    (actions ? '<div class="head-actions">' + actions + '</div>' : '') +
    '</div>'
  );
}

function statCard(opts) {
  const value = opts.value === undefined || opts.value === null ? '—' : opts.value;
  return (
    '<div class="stat">' +
    '<div class="stat-label">' + (opts.dot ? '<span class="dot"></span>' : '') + esc(opts.label) + '</div>' +
    '<div class="stat-value">' + value + '</div>' +
    (opts.sub ? '<div class="stat-sub">' + esc(opts.sub) + '</div>' : '') +
    '</div>'
  );
}

function progressBar(value, max) {
  const p = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return '<div class="progress"><div class="progress-fill" style="width:' + p + '%"></div></div>';
}

function emptyState(title, sub, action) {
  return (
    '<div class="empty"><div class="empty-title">' + esc(title) + '</div>' +
    (sub ? '<div>' + esc(sub) + '</div>' : '') +
    (action || '') +
    '</div>'
  );
}

function barChart(data, opts) {
  const options = opts || {};
  const height = options.height || 120;
  const format = options.format || ((v) => v);
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  return (
    '<div class="barchart" style="--h:' + height + 'px">' +
    data
      .map((d) => {
        const v = Number(d.value) || 0;
        const h = v > 0 ? Math.max(6, Math.round((v / max) * 100)) : 0;
        return (
          '<div class="bar-col" title="' + esc((d.title || d.label) + '：' + format(v)) + '">' +
          '<div class="bar-val">' + (v ? esc(String(format(v))) : '') + '</div>' +
          '<div class="bar' + (v ? '' : ' zero') + '" style="height:' + h + '%"></div>' +
          '<div class="bar-label">' + esc(d.label) + '</div>' +
          '</div>'
        );
      })
      .join('') +
    '</div>'
  );
}

function lineChart(points, opts) {
  if (!points || !points.length) return '';
  const options = opts || {};
  const H = options.height || 150;
  const W = 600;
  const P = 10;
  const vals = points.map((p) => Number(p.value) || 0);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min = min - 1;
    max = max + 1;
  }
  const span = max - min;
  const stepX = points.length > 1 ? (W - P * 2) / (points.length - 1) : 0;
  const coords = vals.map((v, i) => [P + i * stepX, H - P - ((v - min) / span) * (H - P * 2)]);
  const line = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
  const area =
    line + ' L' + coords[coords.length - 1][0].toFixed(1) + ' ' + (H - P) + ' L' + P + ' ' + (H - P) + ' Z';
  return (
    '<div class="linechart">' +
    '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<path class="area" d="' + area + '"></path>' +
    '<path class="line" d="' + line + '"></path>' +
    '</svg>' +
    '<div class="line-legend"><span>' + esc(points[0].label) + '</span>' +
    '<span>' + esc(options.rangeText || '最低 ' + min + ' · 最高 ' + max) + '</span>' +
    '<span>' + esc(points[points.length - 1].label) + '</span></div>' +
    '</div>'
  );
}

/* ---------- 表单控件 ---------- */

function field(label, control, hint) {
  return (
    '<label class="field"><span class="field-label">' + esc(label) + '</span>' + control +
    (hint ? '<span class="field-hint">' + esc(hint) + '</span>' : '') +
    '</label>'
  );
}

function fInput(name, label, opts) {
  const o = opts || {};
  const type = o.type || 'text';
  let attrs = 'class="input" name="' + esc(name) + '" type="' + type + '"';
  if (o.value !== undefined && o.value !== null) attrs += ' value="' + esc(o.value) + '"';
  if (o.placeholder) attrs += ' placeholder="' + esc(o.placeholder) + '"';
  if (o.required) attrs += ' required';
  if (o.min !== undefined) attrs += ' min="' + esc(o.min) + '"';
  if (o.max !== undefined) attrs += ' max="' + esc(o.max) + '"';
  if (o.step !== undefined) attrs += ' step="' + esc(o.step) + '"';
  if (o.maxlength) attrs += ' maxlength="' + esc(o.maxlength) + '"';
  return field(label, '<input ' + attrs + '>', o.hint);
}

function fNumber(name, label, opts) {
  return fInput(name, label, Object.assign({ type: 'number', step: '1' }, opts || {}));
}

function fDate(name, label, value) {
  return fInput(name, label, { type: 'date', value: value === undefined ? todayKey() : value });
}

function fTime(name, label, value) {
  return fInput(name, label, { type: 'time', value: value || '' });
}

function fTextarea(name, label, value, opts) {
  const o = opts || {};
  return field(
    label,
    '<textarea class="input" name="' + esc(name) + '" rows="' + (o.rows || 3) + '"' +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '>' + esc(value || '') + '</textarea>',
    o.hint
  );
}

function fSelect(name, label, options, value, opts) {
  const o = opts || {};
  return field(
    label,
    '<select class="input" name="' + esc(name) + '"' + (o.required ? ' required' : '') + '>' +
      options
        .map((opt) => {
          const v = typeof opt === 'object' ? opt.value : opt;
          const l = typeof opt === 'object' ? opt.label : opt;
          return '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(l) + '</option>';
        })
        .join('') +
      '</select>',
    o.hint
  );
}

function fRow(a, b) {
  return '<div class="field-row">' + a + b + '</div>';
}

function fRow3(a, b, c) {
  return '<div class="field-row-3">' + a + b + c + '</div>';
}

/* ---------- 弹窗 ---------- */

function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = '';
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', handleModalEsc);
}

function handleModalEsc(e) {
  if (e.key === 'Escape') closeModal();
}

function openModal(opts) {
  const o = opts || {};
  const root = document.getElementById('modal-root');
  root.innerHTML =
    '<div class="overlay"><form class="modal ' + (o.size || '') + '" autocomplete="off">' +
    '<div class="modal-head"><div><h3>' + esc(o.title || '') + '</h3>' +
    (o.subtitle ? '<p class="modal-sub">' + esc(o.subtitle) + '</p>' : '') +
    '</div><button type="button" class="icon-btn" data-close aria-label="关闭">' + icon('x') + '</button></div>' +
    '<div class="modal-body">' + (o.body || '') + '</div>' +
    (o.footer === false
      ? ''
      : '<div class="modal-foot"><button type="button" class="btn ghost" data-close>取消</button>' +
        '<button type="submit" class="btn primary">' + esc(o.submitText || '保存') + '</button></div>') +
    '</form></div>';

  const form = root.querySelector('form');
  const overlay = root.querySelector('.overlay');
  document.body.classList.add('modal-open');

  root.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', closeModal));
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', handleModalEsc);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });
    if (o.onSubmit && o.onSubmit(data, form) === false) return;
    closeModal();
  });

  if (o.onMount) o.onMount(form);
  const first = form.querySelector('input:not([type=hidden]), textarea, select');
  if (first) setTimeout(() => first.focus(), 50);
  return form;
}

function confirmAction(opts) {
  const o = opts || {};
  openModal({
    title: o.title || '确认操作',
    body: '<p class="confirm-text">' + esc(o.message || '') + '</p>',
    submitText: o.okText || '确认',
    onSubmit: () => {
      if (o.onOk) o.onOk();
    },
  });
  if (o.danger) {
    const btn = document.querySelector('#modal-root .modal-foot .btn.primary');
    if (btn) {
      btn.classList.remove('primary');
      btn.classList.add('danger');
    }
  }
}

function confirmDelete(message, onOk) {
  confirmAction({ title: '确认删除？', message: message, okText: '删除', danger: true, onOk: onOk });
}

let toastTimer = null;
function toast(message, type) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : '');
  el.textContent = message;
  root.appendChild(el);
  clearTimeout(toastTimer);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, 2000);
}

/* ---------- 小工具 ---------- */

function findById(list, id) {
  return (list || []).find((x) => x.id === id);
}

function removeById(list, id) {
  const index = (list || []).findIndex((x) => x.id === id);
  if (index >= 0) list.splice(index, 1);
  return index >= 0;
}

function chipsFor(list, value) {
  return '<span class="chip ' + optionTone(list, value) + '">' + esc(optionLabel(list, value)) + '</span>';
}

function starText(rating) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}
