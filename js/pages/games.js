'use strict';

/* =========================================================
   游戏娱乐 —— 我的设备（键盘 / 鼠标 / 耳机）
   ========================================================= */

Pages.games = {
  render(el) {
    const devices = Store.data.games.devices || [];
    const countOf = (type) => devices.filter((item) => item.type === type).length;

    el.innerHTML =
      pageHead(
        '游戏娱乐',
        '我的设备：键盘、鼠标、耳机（共 ' + devices.length + ' 件）',
        '<button class="btn primary" data-act="addDevice">' + icon('plus') + '添加设备</button>'
      ) +
      '<div class="grid grid-3">' +
      DEVICE_TYPES.map((type) =>
        statCard({
          label: type.label,
          dot: true,
          value: countOf(type.value) + '<small>件</small>',
          sub: countOf(type.value) ? '在用 / 收藏' : '还没有记录',
        })
      ).join('') +
      '</div>' +
      '<div class="device-grid mt-16">' +
      DEVICE_TYPES.map((type) => {
        const list = devices.filter((item) => item.type === type.value);
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
      '</div>';

    bind(el, {
      addDevice(node) {
        openDeviceModal(null, node.dataset.type || 'keyboard');
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
        fSelect('type', '类型', DEVICE_TYPES, editing ? device.type : presetType || 'keyboard'),
        fInput('brand', '品牌', { value: editing ? device.brand : '', placeholder: '例如：Keychron' })
      ) +
      fRow(
        fInput('model', '型号', { value: editing ? device.model : '', placeholder: '例如：Q1' }),
        fInput('spec', '规格参数', { value: editing ? device.spec : '', placeholder: '75% 机械键盘 / 8000Hz' })
      ) +
      fRow(
        fDate('purchasedAt', '购入日期', editing ? device.purchasedAt : ''),
        fNumber('price', '价格（元）', { value: editing ? device.price : '', min: 0, step: '0.01' })
      ) +
      fTextarea('note', '备注', editing ? device.note : '', { rows: 2, placeholder: '轴体、手感、配件……' }),
    onSubmit(data) {
      const brand = String(data.brand || '').trim();
      const model = String(data.model || '').trim();
      if (!brand && !model) {
        toast('至少填品牌或型号', 'err');
        return false;
      }
      const payload = {
        type: data.type || 'keyboard',
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
