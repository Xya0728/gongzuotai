'use strict';

/* =========================================================
   跨境工作（自营店铺）
   ========================================================= */

const WORK_PLATFORMS = ['亚马逊', 'TikTok Shop', '独立站', '速卖通', 'Shopee', 'eBay', '沃尔玛', '其他'];
const AD_CHANNELS = ['亚马逊广告', 'TikTok 广告', 'Meta 广告', '达人合作', '站外推广', '其他'];

Pages.work = {
  tab: 'overview',

  render(el) {
    const tabs = [
      { id: 'overview', label: '概览' },
      { id: 'orders', label: '订单' },
      { id: 'stock', label: '库存' },
      { id: 'products', label: '选品' },
      { id: 'ads', label: '广告' },
      { id: 'shops', label: '店铺' },
    ];
    const quickLabel = {
      overview: '新增订单',
      orders: '新增订单',
      stock: '新增库存',
      products: '新增选品',
      ads: '记录广告',
      shops: '新增店铺',
    }[this.tab] || '新增记录';

    el.innerHTML =
      pageHead(
        '跨境工作',
        '自营店铺的订单、库存、选品和广告开销，金额按设置里的汇率折算',
        '<button class="btn primary" data-act="add">' + icon('plus') + quickLabel + '</button>'
      ) +
      '<div class="tabs">' +
      tabs
        .map(
          (t) =>
            '<button class="tab' + (this.tab === t.id ? ' active' : '') + '" data-act="tab" data-tab="' + t.id + '">' +
            esc(t.label) + '</button>'
        )
        .join('') +
      '</div>' +
      '<div id="work-body"></div>';

    bind(el, {
      tab(node) {
        Pages.work.tab = node.dataset.tab;
        App.refresh();
      },
      add() {
        Pages.work.addCurrent();
      },
    });

    this.renderBody(el.querySelector('#work-body'));
  },

  addCurrent() {
    if (this.tab === 'stock') return openStockModal(null);
    if (this.tab === 'products') return openProductModal(null, 'idea');
    if (this.tab === 'ads') return openAdModal(null);
    if (this.tab === 'shops') return openShopModal(null);
    return openOrderModal(null);
  },

  renderBody(body) {
    if (this.tab === 'orders') {
      body.innerHTML = this.ordersHTML();
      this.bindOrders(body);
    } else if (this.tab === 'stock') {
      body.innerHTML = this.stockHTML();
      this.bindStock(body);
    } else if (this.tab === 'products') {
      body.innerHTML = this.productsHTML();
      this.bindProducts(body);
    } else if (this.tab === 'ads') {
      body.innerHTML = this.adsHTML();
      this.bindAds(body);
    } else if (this.tab === 'shops') {
      body.innerHTML = this.shopsHTML();
      this.bindShops(body);
    } else {
      body.innerHTML = this.overviewHTML();
      this.bindOverview(body);
    }
  },

  /* ---------------- 概览 ---------------- */

  overviewHTML() {
    const d = Store.data;
    const mk = monthKeyOf(todayKey());
    const monthOrders = d.work.orders.filter((o) => o.date.indexOf(mk) === 0);
    const refunds = monthOrders.filter((o) => o.status === 'refund').length;
    const revenue = sumBy(monthOrders.filter((o) => o.status !== 'refund'), (o) => toCNY(o.amount, o.currency));
    const adSpend = sumBy(d.work.ads.filter((a) => a.date.indexOf(mk) === 0), (a) => toCNY(a.spend, a.currency));
    const restock = d.work.stock.filter((s) => Number(s.qty) <= Number(s.safe));
    const low = d.work.stock.filter((s) => Number(s.qty) > Number(s.safe) && Number(s.qty) <= Number(s.safe) * 1.5);
    const live = d.work.products.filter((p) => p.stage === 'live');

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const key = addDays(todayKey(), -i);
      const value = sumBy(
        d.work.orders.filter((o) => o.date === key && o.status !== 'refund'),
        (o) => toCNY(o.amount, o.currency)
      );
      days.push({ label: String(parseDate(key).getDate()), title: fmtDateCN(key), value: value });
    }
    const hasSales = days.some((x) => x.value > 0);

    const recent = d.work.orders.slice().sort(byDateDesc).slice(0, 5);

    return (
      '<div class="grid grid-4">' +
      statCard({
        label: '本月销售额',
        dot: true,
        value: fmtMoney(revenue, 'CNY'),
        sub: monthOrders.length + ' 单' + (refunds ? ' · 退款 ' + refunds + ' 单' : ''),
      }) +
      statCard({
        label: '本月广告花费',
        dot: true,
        value: fmtMoney(adSpend, 'CNY'),
        sub: revenue > 0 ? '占销售额 ' + Math.round((adSpend / revenue) * 100) + '%' : '还没有广告记录',
      }) +
      statCard({
        label: '待补货',
        dot: true,
        value: restock.length + '<small>个 SKU</small>',
        sub: low.length ? '另有 ' + low.length + ' 个库存偏低' : '其余库存正常',
      }) +
      statCard({
        label: '在售选品',
        dot: true,
        value: live.length + '<small>个</small>',
        sub: '选品库共 ' + d.work.products.length + ' 个',
      }) +
      '</div>' +

      '<div class="grid work-cols mt-16">' +
      '<section class="card"><div class="card-head"><div><h2>近 14 天销售额</h2>' +
      '<p class="card-sub">按订单日期折算成人民币</p></div>' +
      (days.some((x) => x.value) ? '<span class="chip teal">合计 ' + fmtMoney(sumBy(days, (x) => x.value), 'CNY') + '</span>' : '') +
      '</div>' +
      (hasSales
        ? barChart(days, { height: 150, format: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)) })
        : emptyState('最近 14 天还没有订单', '在「订单」里记录后，这里会显示每天的销售走势')) +
      '</section>' +

      '<section class="card"><div class="card-head"><div><h2>补货提醒</h2>' +
      '<p class="card-sub">' + (restock.length ? restock.length + ' 个 SKU 低于安全库存' : '库存都还够') + '</p></div>' +
      '<button class="btn ghost sm" data-act="jump" data-tab="stock">管理库存</button></div>' +
      (restock.length
        ? '<div class="list">' +
          restock
            .slice(0, 5)
            .map(
              (s) =>
                '<div class="item"><div class="item-body"><div class="item-title">' + esc(s.name || s.sku) + '</div>' +
                '<div class="item-meta">' + esc(shopName(s.shopId)) + ' · SKU ' + esc(s.sku) + '</div></div>' +
                '<span class="chip red">库存 ' + Number(s.qty) + ' / 安全 ' + Number(s.safe) + '</span></div>'
            )
            .join('') +
          '</div>'
        : emptyState('没有需要补货的 SKU', '设置安全库存后，低于线会自动提醒')) +
      '</section>' +
      '</div>' +

      '<section class="card mt-16"><div class="card-head"><div><h2>最近订单</h2>' +
      '<p class="card-sub">共 ' + d.work.orders.length + ' 条订单记录</p></div>' +
      '<button class="btn ghost sm" data-act="jump" data-tab="orders">全部订单</button></div>' +
      (recent.length
        ? '<div class="list">' + recent.map((o) => orderRow(o)).join('') + '</div>'
        : emptyState('还没有订单', '记录第一单后，销售额和趋势会自动汇总', '<button class="btn sm" data-act="addOrder">+ 新增订单</button>')) +
      '</section>'
    );
  },

  bindOverview(body) {
    bind(body, {
      jump(node) {
        Pages.work.tab = node.dataset.tab;
        App.refresh();
      },
      addOrder() {
        openOrderModal(null);
      },
      editOrder(node) {
        const order = findById(Store.data.work.orders, node.dataset.id);
        if (order) openOrderModal(order);
      },
      delOrder(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.work.orders, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },

  /* ---------------- 订单 ---------------- */

  ordersHTML() {
    const d = Store.data;
    const orders = d.work.orders.slice().sort(byDateDesc);
    const mk = monthKeyOf(todayKey());
    const monthRevenue = sumBy(
      d.work.orders.filter((o) => o.date.indexOf(mk) === 0 && o.status !== 'refund'),
      (o) => toCNY(o.amount, o.currency)
    );

    return (
      '<section class="card"><div class="card-head"><div><h2>订单</h2>' +
      '<p class="card-sub">共 ' + orders.length + ' 条 · 本月销售额 ' + fmtMoney(monthRevenue, 'CNY') + '</p></div>' +
      '</div>' +
      (orders.length
        ? '<div class="list">' + orders.map((o) => orderRow(o)).join('') + '</div>'
        : emptyState('还没有订单记录', '记录订单后，概览里的销售额会自动更新', '<button class="btn sm" data-act="addOrder">+ 新增订单</button>')) +
      '</section>'
    );
  },

  bindOrders(body) {
    bind(body, {
      addOrder() {
        openOrderModal(null);
      },
      editOrder(node) {
        const order = findById(Store.data.work.orders, node.dataset.id);
        if (order) openOrderModal(order);
      },
      delOrder(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.work.orders, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },

  /* ---------------- 库存 ---------------- */

  stockHTML() {
    const d = Store.data;
    const list = d.work.stock.slice().sort((a, b) => {
      const sa = Number(a.qty) <= Number(a.safe) ? 0 : 1;
      const sb = Number(b.qty) <= Number(b.safe) ? 0 : 1;
      return sa - sb || String(a.name || '').localeCompare(String(b.name || ''));
    });
    const restock = list.filter((s) => Number(s.qty) <= Number(s.safe)).length;

    return (
      '<section class="card"><div class="card-head"><div><h2>库存</h2>' +
      '<p class="card-sub">共 ' + list.length + ' 个 SKU' + (restock ? ' · ' + restock + ' 个待补货' : '') + '</p></div>' +
      '</div>' +
      (list.length
        ? '<div class="list">' +
          list
            .map((s) => {
              const qty = Number(s.qty) || 0;
              const safe = Number(s.safe) || 0;
              const tone = qty <= safe ? 'red' : qty <= safe * 1.5 ? 'amber' : 'green';
              const text = qty <= safe ? '待补货' : qty <= safe * 1.5 ? '偏低' : '充足';
              return (
                '<div class="item">' +
                '<div class="item-body"><div class="item-title">' + esc(s.name || s.sku) + '</div>' +
                '<div class="item-meta"><span class="chip gray">' + esc(shopName(s.shopId)) + '</span>' +
                '<span>SKU ' + esc(s.sku) + '</span><span>安全库存 ' + safe + '</span>' +
                (s.updatedAt ? '<span>更新于 ' + esc(fmtDateCN(s.updatedAt)) + '</span>' : '') + '</div></div>' +
                '<span class="chip ' + tone + '">' + text + '</span>' +
                '<div class="qty-ctl"><button data-act="dec" data-id="' + s.id + '" aria-label="减一">−</button>' +
                '<span>' + qty + '</span>' +
                '<button data-act="inc" data-id="' + s.id + '" aria-label="加一">+</button></div>' +
                '<div class="item-actions">' +
                '<button class="icon-btn" data-act="editStock" data-id="' + s.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="delStock" data-id="' + s.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
              );
            })
            .join('') +
          '</div>'
        : emptyState('还没有库存记录', '添加 SKU 和数量，低于安全库存时会提醒你补货', '<button class="btn sm" data-act="addStock">+ 新增库存</button>')) +
      '</section>'
    );
  },

  bindStock(body) {
    const saveAndRefresh = () => {
      Store.save();
      App.refresh();
    };
    bind(body, {
      addStock() {
        openStockModal(null);
      },
      inc(node) {
        const s = findById(Store.data.work.stock, node.dataset.id);
        if (!s) return;
        s.qty = (Number(s.qty) || 0) + 1;
        s.updatedAt = todayKey();
        saveAndRefresh();
      },
      dec(node) {
        const s = findById(Store.data.work.stock, node.dataset.id);
        if (!s) return;
        s.qty = Math.max(0, (Number(s.qty) || 0) - 1);
        s.updatedAt = todayKey();
        saveAndRefresh();
      },
      editStock(node) {
        const s = findById(Store.data.work.stock, node.dataset.id);
        if (s) openStockModal(s);
      },
      delStock(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.work.stock, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },

  /* ---------------- 选品 ---------------- */

  productsHTML() {
    const items = Store.data.work.products;
    return (
      '<p class="muted tiny" style="margin-bottom:12px">按阶段管理选品：想法 → 调研 → 测试 → 在售，点卡片可以修改。</p>' +
      '<div class="kanban kanban-5">' +
      WORK_STAGES.map((stage) => {
        const list = items.filter((p) => p.stage === stage.value);
        return (
          '<div class="kanban-col"><div class="kanban-head"><span>' + esc(stage.label) + '</span>' +
          '<span class="count">' + list.length + '</span></div>' +
          '<div class="kanban-cards">' +
          (list.length
            ? list
                .map(
                  (p) =>
                    '<div class="kcard" data-act="editProduct" data-id="' + p.id + '">' +
                    '<button class="icon-btn danger kcard-del" data-act="delProduct" data-id="' + p.id + '" aria-label="删除">' +
                    icon('trash') + '</button>' +
                    '<div class="kcard-title">' + esc(p.name) + '</div>' +
                    (p.cost || p.margin
                      ? '<div class="kcard-meta">' +
                        (p.cost ? '<span>成本 ' + esc(p.cost) + '</span>' : '') +
                        (p.margin ? '<span>毛利 ' + esc(p.margin) + '</span>' : '') +
                        '</div>'
                      : '') +
                    (p.note ? '<div class="kcard-meta">' + esc(p.note) + '</div>' : '') +
                    '</div>'
                )
                .join('')
            : '<div class="kanban-empty">暂无</div>') +
          '</div>' +
          '<button class="btn ghost sm mt-8" style="width:100%" data-act="addProduct" data-stage="' + stage.value + '">+ 添加</button>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  },

  bindProducts(body) {
    bind(body, {
      addProduct(node) {
        openProductModal(null, node.dataset.stage || 'idea');
      },
      editProduct(node) {
        const p = findById(Store.data.work.products, node.dataset.id);
        if (p) openProductModal(p);
      },
      delProduct(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.work.products, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },

  /* ---------------- 广告 ---------------- */

  adsHTML() {
    const d = Store.data;
    const mk = monthKeyOf(todayKey());
    const list = d.work.ads.slice().sort(byDateDesc);
    const monthSpend = sumBy(d.work.ads.filter((a) => a.date.indexOf(mk) === 0), (a) => toCNY(a.spend, a.currency));

    return (
      '<section class="card"><div class="card-head"><div><h2>广告开销</h2>' +
      '<p class="card-sub">本月 ' + fmtMoney(monthSpend, 'CNY') + ' · 共 ' + list.length + ' 条</p></div>' +
      '</div>' +
      (list.length
        ? '<div class="list">' +
          list
            .map(
              (a) =>
                '<div class="item"><div class="item-body"><div class="item-title">' + esc(a.channel) + ' ' +
                '<span class="chip gray">' + esc(shopName(a.shopId)) + '</span></div>' +
                '<div class="item-meta">' + esc(fmtDateCN(a.date, true)) + (a.note ? ' · ' + esc(a.note) : '') + '</div></div>' +
                '<div class="item-amount">' + fmtMoney(a.spend, a.currency) + '</div>' +
                '<div class="item-actions">' +
                '<button class="icon-btn" data-act="editAd" data-id="' + a.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="delAd" data-id="' + a.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
            )
            .join('') +
          '</div>'
        : emptyState('还没有广告记录', '记录每次投放的花费，方便算广告占比', '<button class="btn sm" data-act="addAd">+ 记录广告</button>')) +
      '</section>'
    );
  },

  bindAds(body) {
    bind(body, {
      addAd() {
        openAdModal(null);
      },
      editAd(node) {
        const ad = findById(Store.data.work.ads, node.dataset.id);
        if (ad) openAdModal(ad);
      },
      delAd(node) {
        const id = node.dataset.id;
        confirmDelete('删除后无法恢复。', () => {
          removeById(Store.data.work.ads, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },

  /* ---------------- 店铺 ---------------- */

  shopsHTML() {
    const d = Store.data;
    const shops = d.work.shops;
    return (
      '<section class="card"><div class="card-head"><div><h2>店铺</h2>' +
      '<p class="card-sub">' + (shops.length ? '共 ' + shops.length + ' 个店铺' : '先添加一个店铺，订单和库存可以归到店铺下') +
      '</p></div></div>' +
      (shops.length
        ? '<div class="list">' +
          shops
            .map((s) => {
              const orderCount = d.work.orders.filter((o) => o.shopId === s.id).length;
              const skuCount = d.work.stock.filter((x) => x.shopId === s.id).length;
              return (
                '<div class="item"><div class="item-body"><div class="item-title">' + esc(s.name) + '</div>' +
                '<div class="item-meta"><span class="chip teal">' + esc(s.platform || '未填平台') + '</span>' +
                (s.site ? '<span>' + esc(s.site) + '</span>' : '') +
                '<span>' + esc(s.currency || 'CNY') + '</span>' +
                '<span>订单 ' + orderCount + ' · SKU ' + skuCount + '</span></div>' +
                (s.note ? '<div class="item-meta">' + esc(s.note) + '</div>' : '') +
                '</div>' +
                '<div class="item-actions" style="opacity:1">' +
                '<button class="icon-btn" data-act="editShop" data-id="' + s.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
                '<button class="icon-btn danger" data-act="delShop" data-id="' + s.id + '" aria-label="删除">' + icon('trash') + '</button>' +
                '</div></div>'
              );
            })
            .join('') +
          '</div>'
        : emptyState('还没有店铺', '店铺只用来归类，不影响其他记录', '<button class="btn sm" data-act="addShop">+ 新增店铺</button>')) +
      '</section>'
    );
  },

  bindShops(body) {
    bind(body, {
      addShop() {
        openShopModal(null);
      },
      editShop(node) {
        const s = findById(Store.data.work.shops, node.dataset.id);
        if (s) openShopModal(s);
      },
      delShop(node) {
        const id = node.dataset.id;
        const used =
          Store.data.work.orders.some((o) => o.shopId === id) || Store.data.work.stock.some((s) => s.shopId === id);
        confirmDelete(used ? '这个店铺下还有订单或库存，删除后这些记录会变成「未指定店铺」。' : '删除后无法恢复。', () => {
          removeById(Store.data.work.shops, id);
          Store.save();
          App.refresh();
        });
      },
    });
  },
};

/* =========================================================
   行与弹窗
   ========================================================= */

function orderRow(o) {
  return (
    '<div class="item"><div class="item-body">' +
    '<div class="item-title">' + esc(o.no || '未填单号') + ' ' +
    '<span class="chip gray">' + esc(shopName(o.shopId)) + '</span> ' +
    (o.status ? chipsFor(ORDER_STATUS, o.status) : '') + '</div>' +
    '<div class="item-meta">' + esc(fmtDateCN(o.date, true)) + (o.note ? ' · ' + esc(o.note) : '') + '</div>' +
    '</div>' +
    '<div class="item-amount">' + fmtMoney(o.amount, o.currency) + '</div>' +
    '<div class="item-actions">' +
    '<button class="icon-btn" data-act="editOrder" data-id="' + o.id + '" aria-label="编辑">' + icon('edit') + '</button>' +
    '<button class="icon-btn danger" data-act="delOrder" data-id="' + o.id + '" aria-label="删除">' + icon('trash') + '</button>' +
    '</div></div>'
  );
}

function shopOptions(includeEmpty) {
  const list = Store.data.work.shops.map((s) => ({ value: s.id, label: s.name + (s.site ? ' · ' + s.site : '') }));
  return includeEmpty ? [{ value: '', label: '未指定店铺' }].concat(list) : list;
}

function firstShopCurrency() {
  const shop = Store.data.work.shops[0];
  return shop && shop.currency ? shop.currency : 'CNY';
}

function openShopModal(shop) {
  const editing = !!shop;
  openModal({
    title: editing ? '编辑店铺' : '新增店铺',
    size: 'small',
    body:
      fInput('name', '店铺名称', { value: editing ? shop.name : '', placeholder: '例如：Home 主店', required: true }) +
      fRow(
        fSelect('platform', '平台', WORK_PLATFORMS, editing ? shop.platform : '亚马逊'),
        fInput('site', '站点', { value: editing ? shop.site : '', placeholder: '例如：美国站' })
      ) +
      fSelect('currency', '结算币种', CURRENCY_OPTIONS, editing ? shop.currency : 'USD') +
      fTextarea('note', '备注', editing ? shop.note : '', { rows: 2, placeholder: '店铺定位、账号等，可不填' }),
    onSubmit(data) {
      const name = String(data.name || '').trim();
      if (!name) {
        toast('请填写店铺名称', 'err');
        return false;
      }
      const payload = {
        name: name,
        platform: data.platform || '',
        site: String(data.site || '').trim(),
        currency: data.currency || 'CNY',
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(shop, payload);
      } else {
        Store.data.work.shops.push(Object.assign({ id: uid() }, payload));
      }
      Store.save();
      toast(editing ? '店铺已更新' : '店铺已添加');
      App.refresh();
    },
  });
}

function openOrderModal(order) {
  const editing = !!order;
  const shops = shopOptions(true);
  const shopId = editing ? order.shopId || '' : shops.length > 1 ? shops[1].value : '';
  openModal({
    title: editing ? '编辑订单' : '新增订单',
    subtitle: '金额按订单币种填写，概览会自动折算',
    body:
      fRow(fDate('date', '订单日期', editing ? order.date : todayKey()), fSelect('shopId', '店铺', shops, shopId)) +
      fRow(
        fInput('no', '订单号', { value: editing ? order.no : '', placeholder: '选填' }),
        fSelect('status', '状态', ORDER_STATUS, editing ? order.status : 'pending')
      ) +
      fRow(
        fNumber('amount', '金额', { value: editing ? order.amount : '', min: 0, step: '0.01', required: true }),
        fSelect('currency', '币种', CURRENCY_OPTIONS, editing ? order.currency : firstShopCurrency())
      ) +
      fTextarea('note', '备注', editing ? order.note : '', { rows: 2, placeholder: '客户、SKU、特殊情况等，可不填' }),
    onMount(form) {
      const shopSel = form.elements.shopId;
      const curSel = form.elements.currency;
      if (!shopSel || !curSel) return;
      shopSel.addEventListener('change', () => {
        const s = shopOf(shopSel.value);
        if (s && s.currency) curSel.value = s.currency;
      });
    },
    onSubmit(data) {
      const amount = Number(data.amount);
      if (!isFinite(amount) || amount < 0) {
        toast('请填写正确的金额', 'err');
        return false;
      }
      const payload = {
        date: data.date || todayKey(),
        shopId: data.shopId || '',
        no: String(data.no || '').trim(),
        amount: amount,
        currency: data.currency || 'CNY',
        status: data.status || 'pending',
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(order, payload);
      } else {
        Store.data.work.orders.push(Object.assign({ id: uid(), createdAt: Date.now() }, payload));
      }
      Store.save();
      toast(editing ? '订单已更新' : '订单已记录');
      App.refresh();
    },
  });
}

function openStockModal(stock) {
  const editing = !!stock;
  const shops = shopOptions(true);
  openModal({
    title: editing ? '编辑库存' : '新增库存',
    size: 'small',
    body:
      fSelect('shopId', '店铺', shops, editing ? stock.shopId || '' : shops.length > 1 ? shops[1].value : '') +
      fRow(
        fInput('sku', 'SKU', { value: editing ? stock.sku : '', placeholder: '例如：HM-001', required: true }),
        fInput('name', '品名', { value: editing ? stock.name : '', placeholder: '选填' })
      ) +
      fRow(
        fNumber('qty', '当前库存', { value: editing ? stock.qty : 0, min: 0, required: true }),
        fNumber('safe', '安全库存', { value: editing ? stock.safe : 10, min: 0, required: true })
      ) +
      field('提示', '<p class="tiny muted">当前库存低于或等于安全库存时，概览里会提示补货。</p>'),
    onSubmit(data) {
      const sku = String(data.sku || '').trim();
      if (!sku) {
        toast('请填写 SKU', 'err');
        return false;
      }
      const payload = {
        shopId: data.shopId || '',
        sku: sku,
        name: String(data.name || '').trim(),
        qty: Number(data.qty) || 0,
        safe: Number(data.safe) || 0,
        updatedAt: todayKey(),
      };
      if (editing) {
        Object.assign(stock, payload);
      } else {
        Store.data.work.stock.push(Object.assign({ id: uid() }, payload));
      }
      Store.save();
      toast(editing ? '库存已更新' : '库存已添加');
      App.refresh();
    },
  });
}

function openProductModal(product, stage) {
  const editing = !!product;
  openModal({
    title: editing ? '编辑选品' : '新增选品',
    size: 'small',
    body:
      fInput('name', '选品名称', { value: editing ? product.name : '', placeholder: '例如：便携榨汁杯', required: true }) +
      fRow(
        fSelect('stage', '阶段', WORK_STAGES, editing ? product.stage : stage || 'idea'),
        fInput('cost', '预估成本', { value: editing ? product.cost : '', placeholder: '例如：$6.5' })
      ) +
      fInput('margin', '预估毛利', { value: editing ? product.margin : '', placeholder: '例如：$4' }) +
      fTextarea('note', '调研结论 / 备注', editing ? product.note : '', {
        rows: 3,
        placeholder: '竞品情况、供应商、风险点……',
      }),
    onSubmit(data) {
      const name = String(data.name || '').trim();
      if (!name) {
        toast('请填写选品名称', 'err');
        return false;
      }
      const payload = {
        name: name,
        stage: data.stage || 'idea',
        cost: String(data.cost || '').trim(),
        margin: String(data.margin || '').trim(),
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(product, payload);
      } else {
        Store.data.work.products.push(Object.assign({ id: uid() }, payload));
      }
      Store.save();
      toast(editing ? '选品已更新' : '选品已添加');
      App.refresh();
    },
  });
}

function openAdModal(ad) {
  const editing = !!ad;
  const shops = shopOptions(true);
  openModal({
    title: editing ? '编辑广告记录' : '记录广告花费',
    size: 'small',
    body:
      fRow(fDate('date', '日期', editing ? ad.date : todayKey()), fSelect('shopId', '店铺', shops, editing ? ad.shopId || '' : '')) +
      fSelect('channel', '渠道', AD_CHANNELS, editing ? ad.channel : '亚马逊广告') +
      fRow(
        fNumber('spend', '花费', { value: editing ? ad.spend : '', min: 0, step: '0.01', required: true }),
        fSelect('currency', '币种', CURRENCY_OPTIONS, editing ? ad.currency : firstShopCurrency())
      ) +
      fTextarea('note', '备注', editing ? ad.note : '', { rows: 2, placeholder: '投放目标、活动名称等，可不填' }),
    onSubmit(data) {
      const spend = Number(data.spend);
      if (!isFinite(spend) || spend < 0) {
        toast('请填写正确的花费金额', 'err');
        return false;
      }
      const payload = {
        date: data.date || todayKey(),
        shopId: data.shopId || '',
        channel: data.channel || '其他',
        spend: spend,
        currency: data.currency || 'CNY',
        note: String(data.note || '').trim(),
      };
      if (editing) {
        Object.assign(ad, payload);
      } else {
        Store.data.work.ads.push(Object.assign({ id: uid() }, payload));
      }
      Store.save();
      toast(editing ? '广告记录已更新' : '广告花费已记录');
      App.refresh();
    },
  });
}
