'use strict';

/* =========================================================
   首页总览 · 时钟 / 汕头天气 / 模块摘要
   ========================================================= */

const WEATHER_CACHE_KEY = 'xya.weather.shantou.v1';
const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=23.354&longitude=116.682' +
  '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
  '&timezone=Asia%2FShanghai';

const WMO_TEXT = {
  0: '晴',
  1: '大部晴朗',
  2: '多云',
  3: '阴',
  45: '有雾',
  48: '雾凇',
  51: '毛毛雨',
  53: '小雨',
  55: '细雨',
  56: '冻雨',
  57: '冻雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '阵雨',
  81: '阵雨',
  82: '强阵雨',
  85: '阵雪',
  86: '阵雪',
  95: '雷阵雨',
  96: '雷阵雨',
  99: '雷暴',
};

function homeWeatherText(code) {
  return WMO_TEXT[code] || '多云';
}

function homeWeatherIcon(code) {
  if (code === 0 || code === 1) return 'sun';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) return 'rain';
  return 'cloud';
}

function homeHeroTone(hour) {
  if (hour >= 5 && hour < 9) return { a: '#f59e0b', b: '#ec4899' };
  if (hour >= 9 && hour < 12) return { a: '#0ea5e9', b: '#2563eb' };
  if (hour >= 12 && hour < 17) return { a: '#2563eb', b: '#0d9488' };
  if (hour >= 17 && hour < 20) return { a: '#7c3aed', b: '#db2777' };
  return { a: '#1e3a8a', b: '#4c1d95' };
}

function homeReadWeatherCache() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.temp !== 'number') return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function homeWriteWeatherCache(data) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    /* ignore */
  }
}

function homeMiniCard(modId, main, sub) {
  const m = findById(MODULES, modId);
  if (!m) return '';
  return (
    '<a class="mini" href="#/' + m.id + '">' +
    '<span class="mini-ico" style="background:' + m.soft + ';color:' + m.color + '">' + icon(m.icon) + '</span>' +
    '<span class="mini-body"><span class="mini-title">' + esc(m.name) + '</span>' +
    '<span class="mini-main">' + esc(main) + '</span>' +
    '<span class="mini-sub">' + esc(sub) + '</span></span></a>'
  );
}

Pages.home = {
  _timer: null,
  _weatherLoading: false,

  render(el) {
    const d = Store.data;
    const t = todayKey();
    const mk = monthKeyOf(t);
    const weekStart = weekStartKey(t);
    const now = new Date();
    const tone = homeHeroTone(now.getHours());

    const planItems = d.plan.items.filter((i) => i.date === t);
    const memos = d.memos.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const goals = d.study.goals || [];
    const upcomingGoal = goals
      .filter((g) => g.deadline && g.deadline >= t)
      .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))[0];

    const weekPlans = (d.fitness.plans || []).filter((p) => p.date >= weekStart && p.date <= addDays(weekStart, 6));
    const routineNames = (d.fitness.routines || []).map((r) => r.name).filter(Boolean);

    const todayMeals = d.diet.meals.filter((m) => m.date === t);
    const dietKcal = sumBy(todayMeals, (m) => Number(m.calories) || 0);
    const water = Number(d.diet.water[t]) || 0;
    const waterGoal = Number(d.settings.waterGoal) || 2000;

    const spend = sumBy(
      d.money.txns.filter((x) => x.type === 'expense' && x.date.indexOf(mk) === 0),
      (x) => x.amount
    );
    const budget = Number(d.money.budgets[mk]) || 0;

    const visible = App.visibleModules().map((m) => m.id);
    const has = (id) => visible.indexOf(id) >= 0;

    const cards = [];
    if (has('work')) {
      const monthOrders = d.work.orders.filter((o) => o.date.indexOf(mk) === 0 && o.status !== 'refund');
      const sales = sumBy(monthOrders, (o) => toCNY(o.amount, o.currency));
      const restock = d.work.stock.filter((s) => Number(s.qty) <= Number(s.safe)).length;
      cards.push(homeMiniCard('work', fmtMoney(sales, 'CNY'), '本月 ' + monthOrders.length + ' 单 · 待补货 ' + restock + ' 个'));
    }
    if (has('study')) {
      cards.push(
        homeMiniCard(
          'study',
          goals.length ? '项目 ' + goals.length + ' 个' : '还没有项目',
          upcomingGoal ? '最近截止 ' + fmtDateCN(upcomingGoal.deadline) : '去加一个学习项目'
        )
      );
    }
    if (has('fitness')) {
      cards.push(
        homeMiniCard(
          'fitness',
          weekPlans.length ? '本周 ' + weekPlans.length + ' 次安排' : '本周还没排训练',
          routineNames.length ? routineNames.join(' / ') : '先建推日 / 拉日模板'
        )
      );
    }
    if (has('diet')) {
      cards.push(
        homeMiniCard(
          'diet',
          dietKcal ? '今日搭配 ' + dietKcal + ' kcal' : '今日还没排搭配',
          '饮水 ' + water + ' / ' + waterGoal + ' ml'
        )
      );
    }
    if (has('games')) {
      const devices = d.games.devices || [];
      const countType = (type) => devices.filter((item) => item.type === type).length;
      cards.push(
        homeMiniCard(
          'games',
          devices.length ? '共 ' + devices.length + ' 件设备' : '还没有设备',
          '键盘 ' + countType('keyboard') + ' · 鼠标 ' + countType('mouse') + ' · 耳机 ' + countType('headset')
        )
      );
    }
    if (has('money')) {
      cards.push(
        homeMiniCard(
          'money',
          '本月支出 ' + fmtMoney(spend, 'CNY'),
          budget ? '预算剩余 ' + fmtMoney(Math.max(0, budget - spend), 'CNY') : '还没有设置预算'
        )
      );
    }

    el.innerHTML =
      '<section class="home-hero" style="--hero-a:' + tone.a + ';--hero-b:' + tone.b + '">' +
      '<div class="home-hero-main">' +
      '<div class="hero-eyebrow">' + esc(fmtDateCN(t, true)) + ' · ' + esc(greeting()) + '</div>' +
      '<div class="hero-clock" id="home-clock">--:--<small>:--</small></div>' +
      '<div class="hero-sub">' +
      '<span>' + (planItems.length ? '今天有 ' + planItems.length + ' 项安排' : '今天还没有安排') + '</span>' +
      '<span>本周训练 ' + weekPlans.length + ' 次</span>' +
      (dietKcal ? '<span>今日搭配 ' + dietKcal + ' kcal</span>' : '') +
      '</div>' +
      '</div>' +
      '<div class="home-weather" id="home-weather">' +
      '<div class="weather-top">' +
      '<span class="weather-ico" id="weather-ico">' + icon('cloud') + '</span>' +
      '<div class="weather-main"><b id="weather-temp">--°</b>' +
      '<span id="weather-desc">汕头 · 载入中</span></div>' +
      '</div>' +
      '<div class="weather-meta" id="weather-meta">正在获取天气…</div>' +
      '<button type="button" class="weather-refresh" data-act="refreshWeather">' + icon('clock') + '刷新</button>' +
      '</div>' +
      '</section>' +

      '<div class="grid grid-4 mt-16">' +
      statCard({
        label: '学习项目',
        dot: true,
        value: goals.length + '<small>个</small>',
        sub: upcomingGoal ? '最近截止 ' + fmtDateCN(upcomingGoal.deadline) : '还没有设截止日期',
      }) +
      statCard({
        label: '本周训练',
        dot: true,
        value: weekPlans.length + '<small>次</small>',
        sub: weekPlans.length
          ? weekPlans
              .slice()
              .sort(byDateAsc)
              .map((p) => weekdayCN(p.date) + ' ' + p.name)
              .slice(0, 3)
              .join(' · ')
          : '去健身页安排本周训练',
      }) +
      statCard({
        label: '今日热量',
        dot: true,
        value: dietKcal + '<small>kcal</small>',
        sub: water + ' / ' + waterGoal + ' ml 饮水',
      }) +
      statCard({
        label: '本月支出',
        dot: true,
        value: fmtMoney(spend, 'CNY'),
        sub: budget ? '预算 ' + fmtMoney(budget, 'CNY') + ' · 剩余 ' + fmtMoney(Math.max(0, budget - spend), 'CNY') : '还没有设置预算',
      }) +
      '</div>' +

      '<div class="grid home-cols mt-16">' +
      '<section class="card"><div class="card-head"><div><h2>各模块摘要</h2>' +
      '<p class="card-sub">点开任意模块继续</p></div></div>' +
      '<div class="mini-grid">' + cards.join('') + '</div></section>' +

      '<section class="card"><div class="card-head"><div><h2>快速备忘</h2><p class="card-sub">' +
      (memos.length ? memos.length + ' 条备忘' : '随手记，不怕忘') + '</p></div></div>' +
      '<form class="memo-add" id="memo-add"><input class="input" name="text" maxlength="120" placeholder="记一句…">' +
      '<button class="btn sm" type="submit">记下</button></form>' +
      '<div class="list">' +
      (memos.length
        ? memos
            .slice(0, 10)
            .map(
              (m) =>
                '<div class="item"><div class="item-body"><div class="item-title" style="white-space:normal">' + esc(m.text) + '</div>' +
                '<div class="item-meta">' + esc(fmtDateCN(m.date || dateKey(new Date(m.createdAt || Date.now())))) + '</div></div>' +
                '<div class="item-actions"><button class="icon-btn danger" data-act="delMemo" data-id="' + m.id + '" aria-label="删除">' +
                icon('trash') + '</button></div></div>'
            )
            .join('')
        : '<div class="mt-8">' + emptyState('还没有备忘', '临时想法、要买的东西都可以先放这里') + '</div>') +
      '</div>' +
      (memos.length > 10 ? '<div class="tiny muted mt-8">还有 ' + (memos.length - 10) + ' 条未显示</div>' : '') +
      '</section>' +
      '</div>';

    bind(el, {
      refreshWeather() {
        Pages.home.loadWeather(el, true);
      },
      delMemo(node) {
        removeById(d.memos, node.dataset.id);
        Store.save();
        App.refresh();
      },
    });

    this.startClock(el);
    this.loadWeather(el);

    const memoForm = el.querySelector('#memo-add');
    memoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = String(new FormData(memoForm).get('text') || '').trim();
      if (!text) return;
      d.memos.push({ id: uid(), text: text, createdAt: Date.now(), date: t });
      Store.save();
      App.refresh();
    });
  },

  startClock(el) {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    const node = el.querySelector('#home-clock');
    if (!node) return;
    const tick = () => {
      if (!document.body.contains(node)) {
        clearInterval(Pages.home._timer);
        Pages.home._timer = null;
        return;
      }
      const d = new Date();
      node.innerHTML = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + '<small>:' + pad2(d.getSeconds()) + '</small>';
    };
    tick();
    this._timer = setInterval(tick, 1000);
  },

  loadWeather(el, force) {
    const box = el.querySelector('#home-weather');
    if (!box) return;
    const cached = homeReadWeatherCache();
    const fresh = cached && Date.now() - (cached.at || 0) < 15 * 60 * 1000;
    if (cached) this.paintWeather(el, cached, !fresh ? 'offline' : '');
    if (fresh && !force) return;
    if (this._weatherLoading) return;
    this._weatherLoading = true;

    const done = (data, note) => {
      this._weatherLoading = false;
      if (!document.body.contains(box)) return;
      this.paintWeather(el, data, note);
    };

    const fail = () => {
      this._weatherLoading = false;
      if (!document.body.contains(box)) return;
      if (cached) this.paintWeather(el, cached, 'offline');
      else this.paintWeather(el, null, 'fail');
    };

    try {
      if (typeof fetch !== 'function') {
        fail();
        return;
      }
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => {
        if (ctrl) ctrl.abort();
      }, 6000);
      fetch(WEATHER_URL, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then((res) => {
          if (!res.ok) throw new Error('weather http ' + res.status);
          return res.json();
        })
        .then((json) => {
          clearTimeout(timer);
          const cur = json && json.current;
          if (!cur || typeof cur.temperature_2m !== 'number') throw new Error('weather payload');
          const data = {
            at: Date.now(),
            temp: Math.round(cur.temperature_2m),
            feels: Math.round(cur.apparent_temperature),
            humidity: Math.round(cur.relative_humidity_2m),
            wind: Math.round(cur.wind_speed_10m),
            code: Number(cur.weather_code) || 0,
          };
          homeWriteWeatherCache(data);
          done(data, '');
        })
        .catch(() => {
          clearTimeout(timer);
          fail();
        });
    } catch (err) {
      fail();
    }
  },

  paintWeather(el, data, note) {
    const box = el.querySelector('#home-weather');
    if (!box) return;
    const iconBox = box.querySelector('#weather-ico');
    const temp = box.querySelector('#weather-temp');
    const desc = box.querySelector('#weather-desc');
    const meta = box.querySelector('#weather-meta');
    if (!data) {
      iconBox.innerHTML = icon('cloud');
      temp.textContent = '—';
      desc.textContent = '汕头 · 天气暂不可用';
      meta.textContent = '需要联网获取，检查网络后点刷新';
      return;
    }
    const text = homeWeatherText(data.code);
    iconBox.innerHTML = icon(homeWeatherIcon(data.code));
    temp.textContent = data.temp + '°';
    desc.textContent = '汕头 · ' + text + (note === 'offline' ? ' · 离线' : '');
    meta.textContent =
      '体感 ' + data.feels + '° · 湿度 ' + data.humidity + '% · 风 ' + data.wind + ' km/h' +
      (note === 'offline' ? ' · 上次更新 ' + saveClock(new Date(data.at)) : '');
  },
};
