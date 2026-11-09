'use strict';

/* =========================================================
   游戏娱乐：我的游戏 / 我的设备
   ========================================================= */

const GAME_PLATFORMS = ['PC', 'Steam', 'PS5', 'Switch', 'Xbox', '手机', '其他'];

Pages.games = {
  tab: 'games',

  render(el) {
    const isDevices = this.tab === 'devices';
    const actions = isDevices
      ? '<button class="btn primary" data-act="addDevice">' + icon('plus') + '添加设备</button>'
      : '<button class="btn" data-act="addSession">' + icon('clock') + '记时长</button>' +
        '<button class="btn primary" data-act="addGame">' + icon('plus') + '添加游戏</button>';

    el.innerHTML =
      pageHead(
        '游戏娱乐',
        isDevices ? '我的设备：显示器、键盘、鼠标、耳机' : '想玩、在玩、已通关分开管，顺手记录每周的娱乐时长',
        actions
      ) +
      '<div class="tabs">' +
      [
        { id: 'games', label: '我的游戏' },
        { id: 'devices', label: '我的设备' },
      ]
        .map(
          (tab) =>
            '<button class="tab' + (this.tab === tab.id ? ' active' : '') + '" data-act="tab" data-tab="' + tab.id + '">' +
            esc(tab.label) + '</button>'
        )
        .join('') +
      '</div>' +
      '<div id="games-body"></div>';

    bind(el, {
      tab(node) {
        Pages.games.tab = node.dataset.tab;
        App.refresh();
      },
      addDevice() {
        openDeviceModal(null);
      },
      addGame() {
        openGameModal(null, 'want');
      },
      addSession() {
        openGameSessionModal();
      },
    });

    const body = el.querySelector('#games-body');
    if (isDevices) {
      body.innerHTML = this.devicesHTML();
      this.bindDevices(body);
    } else {
      body.innerHTML = this.gamesHTML();
      this.bindGames(body);
    }
  },

  /* ---------------- 我的游戏 ---------------- */

  gamesHTML() {
    const d = Store.data;
    const t = todayKey();
    const weekStart = weekStartKey(t);
    const weekMinutes = sumBy(d.games.sessions.filter((s) => s.date >= weekStart && s.date <= t), (s) => s.minutes);
    const weekHours = weekMinutes / 60;
    const limit = Number(d.settings.weeklyGameLimit) || 0;
    const over = limit > 0 && weekHours > limit;
    const byStatus = (status) => d.games.items.filter((g) => g.status === status);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const key = addDays(t, -i);
      days.push({
        label: WEEK_CN[parseDate(key).getDay()].replace('周', ''),
        title: fmtDateCN(key, true),
        value: sumBy(d.games.sessions.filter((s) => s.date === key), (s) => s.minutes),
      });
    }
    const hasPlay = days.some((x) => x.value > 0);
    const recent = d.games.sessions.slice().sort(byDateDesc).slice(0, 10);

    return (
      '<div class="grid grid-4">' +
      statCard({
        label: '本周娱乐时长',
        dot: true,
        value: hoursText(weekMinutes),
        sub: limit
          ? over
            ? '已超过上限 ' + limit + ' 小时，收一收'
            : '每周上限 ' + limit + ' 小时，还剩 ' + hoursText(Math.max(0, limit * 60 - weekMinutes))
          : '还没有设置每周上限',
      }) +
      statCard({ label: '在玩', dot: true, value: byStatus('playing').length + '<small>款</small>', sub: '正在进行的游戏' }) +
      statCard({ label: '想玩', dot: true, value: byStatus('want').length + '<small>款</small>', sub: '待玩清单' }) +
      statCard({ label: '已通关', dot: true, value: byStatus('done').length + '<small>款</small>', sub: '共 ' + d.games.items.length + ' 款游戏' }) +
      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>游戏清单</h2>' +
      '<p class="card-sub">点卡片可以改状态和评分</p></div></div>' +
      '<div class="kanban">' +
      GAME_STATUS.map((status) => {
        const list = byStatus(status.value);
        return (
          '<div class="kanban-col"><div class="kanban-head"><span>' + esc(status.label) + '</span>' +
          '<span class="count">' + list.length + '</span></div>' +
          '<div class="kanban-cards">' +
          (list.length
            ? list
                .map(
                  (g) =>
                    '<div class="kcard" data-act="editGame" data-id="' + g.id + '">' +
                    '<button class="icon-btn danger kcard-del" data-act="delGame" data-id="' + g.id + '" aria-label="删除">' +
                    icon('trash') + '</button>' +
                    '<div class="kcard-title">' + esc(g.title) + '</div>' +
                    '<div class="kcard-meta">' +
                    (g.platform ? '<span class="chip gray">' + esc(g.platform) + '</span>' : '') +
                    (g.rating ? '<span style="color:#d97706">' + starText(g.rating) + '</span>' : '') +
                    '</div>' +
                    (g.note ? '<div class="kcard-meta">' + esc(g.note) + '</div>' : '') +
                    '</div>'
                )
                .join('')
            : '<div class="kanban-empty">暂无</div>') +
          '</div>' +
          '<button class="btn ghost sm mt-8" style="width:100%" data-act="addGame" data-status="' + status.value + '">+ 添加</button>' +
          '</div>'
        );
      }).join('') +
      '</div></section>' +

      '<div class="grid grid-2 mt-16" style="align-items:start">' +
      '<section class="card"><div class="card-head"><div><h2>最近 7 天时长</h2>' +
      '<p class="card-sub">每天玩了多久</p></div></div>' +
      (hasPlay
        ? barChart(days, { height: 140, format: (v) => (v ? Math.round(v) + '分' : '') })
        : emptyState('最近一周还没有记录', '玩完顺手点「记时长」，就能看到节奏')) +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>时长记录</h2>' +
      '<p class="card-sub">共 ' + d.games.sessions.length + ' 次</p></div></div>' +
      (recent.length
        ? '<div class="list">' +
          recent
            .map((s) => {
              const game = findById(d.games.items, s.gameId);
              return (
                '<div class="item"><div class="item-body"><div class="item-title">' +
                esc(game ? game.title : '未指定游戏') + ' <span class="chip violet">' + minutesText(s.minutes) + '</span></div>' +
                '<div class="item-meta">' + esc(fmtDateCN(s.date, true)) + (s.note ? ' · ' + esc(s.note) : '') + '</div></div>' +
                '<div class="item-actions"><button class="icon-btn danger" data-act="delSession" data-id="' + s.id + '" aria-label="删除">' +
                icon('trash') + '</button></div></div>'
              );
            })
            .join('') +
          '</div>'
        : emptyState('还没有时长记录', '记录后，本周娱乐时长会自动汇总')) +
      '</section>' +
      '</div>'
    );
  },

  bindGames(body) {
    bind(body, {
      addGame(node) {
        openGameModal(null, node.dataset.status || 'want');
      },
      editGame(node) {
        const game = findById(Store.data.games.items, node.dataset.id);
        if (game) openGameModal(game);
      },
      delGame(node) {
        const id = node.dataset.id;
        confirmDelete('删除游戏后，它的时长记录会变成「未指定游戏」。', () => {
          removeById(Store.data.games.items, id);
          Store.data.games.sessions.forEach((s) => {
            if (s.gameId === id) s.gameId = '';
          });
          Store.save();
          App.refresh();
        });
      },
      addSession() {
        openGameSessionModal();
      },
      delSession(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.games.sessions, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },

  /* ---------------- 我的设备 ---------------- */

  devicesHTML() {
    const devices = Store.data.games.devices || [];
    return (
      '<div class="grid grid-4">' +
      DEVICE_TYPES.map((type) => {
        const count = devices.filter((x) => x.type === type.value).length;
        return statCard({
          label: type.label,
          dot: true,
          value: count + '<small>件</small>',
          sub: count ? '在用 / 收藏' : '还没有记录',
        });
      }).join('') +
      '</div>' +

      '<div class="device-grid mt-16">' +
      DEVICE_TYPES.map((type) => {
        const list = devices.filter((x) => x.type === type.value);
        return (
          '<section class="card device-col"><div class="card-head"><div><h2>' + esc(type.label) + '</h2>' +
          '<p class="card-sub">' + (list.length ? list.length + ' 件' : '还没有记录') + '</p></div>' +
          '<button class="btn ghost sm" data-act="addDevice" data-type="' + type.value + '">+ 添加</button></div>' +
          '<div class="device-list">' +
          (list.length
            ? list.map((device) => deviceCard(device)).join('')
            : '<div class="kanban-empty">暂无设备</div>') +
          '</div></section>'
        );
      }).join('') +
      '</div>'
    );
  },

  bindDevices(body) {
    bind(body, {
      addDevice(node) {
        openDeviceModal(null, node.dataset.type || 'monitor');
      },
      editDevice(node) {
        const device = findById(Store.data.games.devices || [], node.dataset.id);
        if (device) openDeviceModal(device);
      },
      delDevice(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.games.devices, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },
};

/* ---------------- 设备卡片与弹窗 ---------------- */

function deviceCard(device) {
  const type = DEVICE_TYPES.find((item) => item.value === device.type);
  const title = [device.brand, device.model].filter(Boolean).join(' ') || (type ? type.label : '设备');
  return (
    '<div class="device-card" data-act="editDevice" data-id="' + device.id + '">' +
    '<div class="device-top"><span class="device-ico">' + deviceArt(device.type) + '</span>' +
    '<span class="device-name"><b>' + esc(title) + '</b>' +
    '<span>' + esc(type ? type.label : '') + (device.purchasedAt ? ' · ' + esc(fmtDateCN(device.purchasedAt)) : '') + '</span></span>' +
    '<button class="icon-btn danger" data-act="delDevice" data-id="' + device.id + '" aria-label="删除">' + icon('trash') + '</button></div>' +
    (device.spec ? '<div class="device-spec">' + esc(device.spec) + '</div>' : '') +
    '<div class="device-meta">' +
    (device.price ? fmtMoney(device.price, 'CNY') : '未记价格') +
    (device.note ? ' · ' + esc(device.note) : '') +
    '</div></div>'
  );
}

function openDeviceModal(device, presetType) {
  const editing = !!device;
  openModal({
    title: editing ? '编辑设备' : '添加设备',
    size: 'small',
    body:
      fRow(
        fSelect('type', '类型', DEVICE_TYPES, editing ? device.type : presetType || 'monitor'),
        fInput('brand', '品牌', { value: editing ? device.brand : '', placeholder: '例如：LG' })
      ) +
      fRow(
        fInput('model', '型号', { value: editing ? device.model : '', placeholder: '例如：27GP950' }),
        fInput('spec', '规格参数', { value: editing ? device.spec : '', placeholder: '27 英寸 4K 144Hz' })
      ) +
      fRow(
        fDate('purchasedAt', '购入日期', editing ? device.purchasedAt : ''),
        fNumber('price', '价格（元）', { value: editing ? device.price : '', min: 0, step: '0.01' })
      ) +
      fTextarea('note', '备注', editing ? device.note : '', { rows: 2, placeholder: '使用感受、配件……' }),
    onSubmit(data) {
      const brand = String(data.brand || '').trim();
      const model = String(data.model || '').trim();
      if (!brand && !model) {
        toast('至少填品牌或型号', 'err');
        return false;
      }
      const payload = {
        type: data.type || 'monitor',
        brand: brand,
        model: model,
        spec: String(data.spec || '').trim(),
        purchasedAt: data.purchasedAt || '',
        price: Number(data.price) || 0,
        note: String(data.note || '').trim(),
      };
      Store.data.games.devices = Store.data.games.devices || [];
      if (editing) {
        Object.assign(device, payload);
      } else {
        Store.data.games.devices.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast(editing ? '设备已更新' : '设备已添加');
      App.refresh();
    },
  });
}

/* ---------------- 游戏弹窗 ---------------- */

function openGameModal(game, presetStatus) {
  const editing = !!game;
  const ratings = [0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: n ? '★'.repeat(n) + '（' + n + ' 分）' : '未评分' }));
  openModal({
    title: editing ? '编辑游戏' : '添加游戏',
    size: 'small',
    body:
      fInput('title', '游戏名称', { value: editing ? game.title : '', placeholder: '例如：无畏契约', required: true }) +
      fRow(
        fSelect('platform', '平台', GAME_PLATFORMS, editing ? game.platform : 'PC'),
        fSelect('status', '状态', GAME_STATUS, editing ? game.status : presetStatus || 'want')
      ) +
      fSelect('rating', '评分', ratings, editing ? game.rating || 0 : 0) +
      fTextarea('note', '备注', editing ? game.note : '', { rows: 2, placeholder: '想玩的原因、进度……' }),
    onSubmit(data) {
      const title = String(data.title || '').trim();
      if (!title) {
        toast('请填写游戏名称', 'err');
        return false;
      }
      const payload = {
        title: title,
        platform: data.platform || '其他',
        status: data.status || 'want',
        rating: Number(data.rating) || 0,
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(game, payload);
      } else {
        Store.data.games.items.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast(editing ? '游戏已更新' : '已加入清单');
      App.refresh();
    },
  });
}

function openGameSessionModal() {
  const games = Store.data.games.items;
  const options = [{ value: '', label: '未指定游戏' }].concat(games.map((g) => ({ value: g.id, label: g.title })));
  openModal({
    title: '记录娱乐时长',
    size: 'small',
    body:
      fRow(fDate('date', '日期', todayKey()), fSelect('gameId', '游戏', options, '')) +
      fNumber('minutes', '时长（分钟）', { min: 1, required: true, placeholder: '例如：60' }) +
      fInput('note', '备注', { placeholder: '玩到哪了、和谁玩，可不填' }),
    onSubmit(data) {
      const minutes = Number(data.minutes);
      if (!isFinite(minutes) || minutes <= 0) {
        toast('请填写时长', 'err');
        return false;
      }
      Store.data.games.sessions.push({
        id: uid(),
        date: data.date || todayKey(),
        gameId: data.gameId || '',
        minutes: Math.round(minutes),
        note: String(data.note || '').trim(),
        createdAt: Date.now(),
      });
      Store.save();
      toast('已记录 ' + minutesText(minutes));
      App.refresh();
    },
  });
}
