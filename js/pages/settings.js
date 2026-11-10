'use strict';

/* =========================================================
   数据与设置
   ========================================================= */

Pages.settings = {
  render(el) {
    const d = Store.data;
    const s = d.settings;

    const counts = [
      { label: '计划', value: d.plan.items.length },
      { label: '备忘', value: d.memos.length },
      { label: '订单', value: d.work.orders.length },
      { label: '库存 SKU', value: d.work.stock.length },
      { label: '选品', value: d.work.products.length },
      { label: '学习打卡', value: d.study.logs.length },
      { label: '训练记录', value: d.fitness.sessions.length },
      { label: '饮食记录', value: d.diet.meals.length },
      { label: '游戏', value: d.games.items.length },
      { label: '消费', value: d.money.txns.length },
    ];

    const rateKeys = ['USD', 'EUR', 'GBP', 'JPY', 'HKD'];

    el.innerHTML =
      pageHead('数据与设置', '备份数据、调整换算和显示偏好', '') +

      '<div class="grid grid-2" style="align-items:start">' +

      /* ---- 数据 ---- */
      '<section class="card"><div class="card-head"><div><h2>数据备份</h2>' +
      '<p class="card-sub">' +
      (Store.mode === 'server' ? '数据保存在本机 data 目录的文件里，建议定期导出' : '数据只保存在这台电脑的浏览器里，建议定期导出') +
      '</p></div></div>' +
      '<div class="setting-row"><div><div class="s-title">导出备份</div>' +
      '<div class="s-desc">生成一个 JSON 文件，保存到电脑上</div></div>' +
      '<div class="s-ctl"><button class="btn sm" data-act="export">' + icon('download') + '导出</button></div></div>' +
      '<div class="setting-row"><div><div class="s-title">从备份恢复</div>' +
      '<div class="s-desc">选择之前导出的文件，会覆盖当前数据</div></div>' +
      '<div class="s-ctl"><button class="btn sm" data-act="import">' + icon('upload') + '选择文件</button></div></div>' +
      '<div class="setting-row"><div><div class="s-title">数据文件</div>' +
      '<div class="s-desc">' +
      (Store.mode === 'server'
        ? esc(Store.serverPath || 'data/工作台数据.json')
        : '当前是直接打开页面，数据只存在浏览器里；双击「启动Xya的工作台.command」可用独立数据文件') +
      '</div></div>' +
      '<div class="s-ctl"><button class="btn sm" data-act="saveNow">立即保存</button></div></div>' +
      '<div class="setting-row"><div><div class="s-title">清空所有数据</div>' +
      '<div class="s-desc">删除这台电脑上的全部记录，无法恢复</div></div>' +
      '<div class="s-ctl"><button class="btn sm" data-act="reset" style="color:#b91c1c;border-color:#f1c4c4">清空</button></div></div>' +
      '<div class="hint-bar mt-12">当前占用 ' + esc(Store.sizeText()) + ' · 浏览器清理「网站数据」会删掉这些记录</div>' +
      '<input type="file" id="import-file" accept="application/json,.json" style="display:none">' +
      '<div class="mt-16"><div class="tiny muted" style="margin-bottom:8px">当前数据量</div>' +
      '<div class="food-chips">' +
      counts.map((c) => '<span class="chip gray">' + esc(c.label) + ' ' + c.value + '</span>').join('') +
      '</div></div>' +
      '</section>' +

      /* ---- 偏好 ---- */
      '<section class="card"><div class="card-head"><div><h2>日常偏好</h2>' +
      '<p class="card-sub">影响各模块里的目标和提醒</p></div></div>' +
      '<form id="pref-form">' +
      '<div class="setting-row"><div><div class="s-title">每日饮水目标</div>' +
      '<div class="s-desc">饮食模块的饮水进度，单位：毫升</div></div>' +
      '<div class="s-ctl"><input class="input" type="number" name="waterGoal" min="0" step="50" value="' + esc(s.waterGoal) + '"></div></div>' +
      '<div class="setting-row"><div><div class="s-title">一杯水</div>' +
      '<div class="s-desc">点一次「+」加多少毫升</div></div>' +
      '<div class="s-ctl"><input class="input" type="number" name="waterCup" min="50" step="10" value="' + esc(s.waterCup) + '"></div></div>' +
      '<div class="flex-between mt-12"><span class="tiny muted">保存后立即生效</span>' +
      '<button class="btn sm primary" type="submit">保存偏好</button></div>' +
      '</form></section>' +

      /* ---- 汇率 ---- */
      '<section class="card"><div class="card-head"><div><h2>汇率</h2>' +
      '<p class="card-sub">跨境工作的销售额和广告花费会按这里折算成人民币</p></div></div>' +
      '<form id="rate-form">' +
      '<div class="rate-grid">' +
      rateKeys
        .map(
          (key) =>
            '<label class="rate-cell"><span>1 ' + esc(key) + ' = ? CNY</span>' +
            '<input class="input" type="number" step="0.0001" min="0" name="rate_' + key + '" value="' + esc(s.rates[key]) + '"></label>'
        )
        .join('') +
      '</div>' +
      '<div class="flex-between mt-12"><span class="tiny muted">按你实际结算的汇率手动填</span>' +
      '<button class="btn sm primary" type="submit">保存汇率</button></div>' +
      '</form></section>' +

      /* ---- 模块显示 ---- */
      '<section class="card"><div class="card-head"><div><h2>模块显示</h2>' +
      '<p class="card-sub">隐藏后左侧导航不再显示，数据仍然保留</p></div></div>' +
      MODULES.filter((m) => m.id !== 'home' && m.id !== 'settings')
        .map(
          (m) =>
            '<div class="setting-row"><div><div class="s-title">' + esc(m.name) + '</div></div>' +
            '<div class="s-ctl"><label class="switch"><input type="checkbox" data-module="' + m.id + '"' +
            (s.hidden.indexOf(m.id) === -1 ? ' checked' : '') + '><i></i></label></div></div>'
        )
        .join('') +
      '</section>' +

      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>关于这个 App</h2></div></div>' +
      '<div class="tiny muted" style="line-height:1.9">' +
      '这是一个只给你自己用的本地网页 App：不登录、不联网、数据不上传。<br>' +
      '所有记录保存在当前浏览器的本地存储里，刷新、关闭浏览器、重启电脑都不会丢；但如果在浏览器里清理「网站数据」，记录会被删除。<br>' +
      '建议每隔一段时间点一次「导出备份」，把 JSON 文件存到电脑上的其他位置。换电脑或换浏览器时，用「从备份恢复」把数据带过去。<br>' +
      (Store.ok ? '' : '<span style="color:#b91c1c">警告：当前浏览器禁止了本地存储，数据无法保存。</span>') +
      '</div></section>';

    /* ---- 事件 ---- */
    bind(el, {
      export() {
        exportData();
      },
      saveNow() {
        manualSave();
      },
      import() {
        const input = el.querySelector('#import-file');
        if (input) input.click();
      },
      reset() {
        confirmAction({
          title: '清空所有数据？',
          message: '计划、备忘、订单、打卡、消费等全部记录都会被删除，且无法恢复。建议先导出备份。',
          okText: '全部清空',
          danger: true,
          onOk() {
            Store.reset();
            toast('数据已清空');
            App.go('home');
          },
        });
      },
    });

    const fileInput = el.querySelector('#import-file');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      confirmAction({
        title: '从备份恢复？',
        message: '当前数据会被备份文件覆盖，操作前建议先导出一份现在的数据。',
        okText: '覆盖并恢复',
        danger: true,
        onOk() {
          importData(file, () => App.refresh());
        },
      });
      fileInput.value = '';
    });

    el.querySelector('#pref-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const goal = Number(data.get('waterGoal'));
      const cup = Number(data.get('waterCup'));
      if (!isFinite(goal) || goal < 0 || !isFinite(cup) || cup < 50) {
        toast('请填写有效的数值', 'err');
        return;
      }
      s.waterGoal = goal;
      s.waterCup = cup;
      Store.save();
      toast('偏好已保存');
      App.refresh();
    });

    el.querySelector('#rate-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      let changed = 0;
      rateKeys.forEach((key) => {
        const value = Number(data.get('rate_' + key));
        if (isFinite(value) && value > 0) {
          s.rates[key] = value;
          changed++;
        }
      });
      s.rates.CNY = 1;
      Store.save();
      toast('汇率已保存');
      App.refresh();
    });

    el.querySelectorAll('[data-module]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const id = checkbox.dataset.module;
        const index = s.hidden.indexOf(id);
        if (checkbox.checked && index >= 0) s.hidden.splice(index, 1);
        if (!checkbox.checked && index === -1) s.hidden.push(id);
        Store.save();
        App.render();
        toast(checkbox.checked ? '已显示模块' : '已隐藏模块');
      });
    });
  },
};
