'use strict';

/* =========================================================
   应用入口：导航、路由、渲染
   ========================================================= */

const NAV_GROUPS = ['', '工作与成长', '身体与娱乐', '记录', '系统'];

const App = {
  route: 'home',

  init() {
    Store.load();

    if ('serviceWorker' in navigator) {
      const secure =
        location.protocol === 'https:' ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1';
      if (secure) {
        navigator.serviceWorker.register('./sw.js').catch(() => {
          /* 离线外壳不可用时不影响正常使用 */
        });
      }
    }

    if (!location.hash) {
      location.replace('#/home');
    }
    window.addEventListener('hashchange', () => this.handleHash());
    const reconnect = () => {
      if (Store.serverChecked && Store.mode === 'local') Store.connectServer();
    };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reconnect();
    });
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') {
        event.preventDefault();
        manualSave();
      }
    });
    this.handleHash();
    Store.connectServer();

    if (!Store.ok) {
      toast('浏览器禁用了本地存储，数据可能无法保存', 'err');
    }
  },

  handleHash() {
    this.closeMoreSheet();
    const raw = (location.hash || '#/home').replace(/^#\/?/, '') || 'home';
    const visible = this.visibleModules();
    const target = Pages[raw] && visible.some((m) => m.id === raw) ? raw : 'home';
    this.route = target;
    this.render();
  },

  visibleModules() {
    const hidden = (Store.data.settings.hidden || []);
    return MODULES.filter((m) => m.id === 'home' || m.id === 'settings' || hidden.indexOf(m.id) === -1);
  },

  go(id) {
    location.hash = '#/' + id;
  },

  refresh() {
    this.render();
  },

  render() {
    const mod = findById(MODULES, this.route) || MODULES[0];
    document.documentElement.style.setProperty('--accent', mod.color);
    document.documentElement.style.setProperty('--accent-soft', mod.soft);

    const main = document.getElementById('main');
    const scrollY = main.scrollTop;

    try {
      main.innerHTML = '';
      Pages[this.route].render(main);
    } catch (err) {
      console.error(err);
      main.innerHTML =
        '<div class="card"><h2>页面加载出错了</h2>' +
        '<p class="muted mt-8">' + esc(err && err.message ? err.message : String(err)) + '</p>' +
        '<p class="muted tiny mt-8">可以先到「数据与设置」导出备份，再刷新页面。</p></div>';
    }

    main.scrollTop = scrollY;
    this.renderSidebar();
    this.renderMobileNav();
    document.title = mod.name + ' · Xya的工作台';

    if (!Store.ok) {
      main.insertAdjacentHTML(
        'afterbegin',
        '<div class="hint-bar" style="background:#fdeaea;border-color:#f3c2c2;color:#b91c1c;margin-bottom:16px">' +
          '这个浏览器禁止了本地存储，数据无法保存。请改用 Chrome 或 Edge 打开 index.html。</div>'
      );
    } else if (
      Store.serverChecked &&
      Store.mode === 'local' &&
      (location.protocol === 'https:' || location.protocol === 'http:')
    ) {
      main.insertAdjacentHTML(
        'afterbegin',
        '<div class="hint-bar" style="background:#fff7ed;border-color:#fed7aa;color:#9a3412;margin-bottom:16px">' +
          '离线模式：现在连不上 Mac。修改会先保存在这台设备，连上 Mac 后按时间自动同步。</div>'
      );
    }
  },

  renderSidebar() {
    const visible = this.visibleModules();
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const groups = NAV_GROUPS.map((groupName) => {
      const items = visible.filter((m) => m.group === groupName);
      if (!items.length) return '';
      return (
        '<div class="nav-group">' +
        (groupName ? '<div class="nav-label">' + esc(groupName) + '</div>' : '') +
        items
          .map(
            (m) =>
              '<a class="nav-item' + (m.id === this.route ? ' active' : '') + '" href="#/' + m.id + '">' +
              icon(m.icon) + '<span>' + esc(m.name) + '</span></a>'
          )
          .join('') +
        '</div>'
      );
    }).join('');

    sidebar.innerHTML =
      '<div class="brand"><div class="logo">X</div>' +
      '<div class="brand-text"><strong>Xya的工作台</strong><span>只在本机运行</span></div></div>' +
      '<nav class="nav">' + groups + '</nav>' +
      '<div class="sidebar-foot"><div class="today-mini">' + esc(fmtDateCN(todayKey(), true)) + '</div>' +
      '<div class="save-row"><span class="save-dot"></span>' +
      '<span class="save-state" id="save-state-text">' +
      saveStateText() + '</span>' +
      '<button class="btn sm" id="save-now">保存</button></div>' +
      '<div class="muted tiny mt-8">' +
      (Store.mode === 'server' ? '自动保存 · ⌘S 保存' : '自动保存已开启 · ⌘S 保存') +
      ' · v' + APP_VERSION + '</div></div>';

    const saveBtn = sidebar.querySelector('#save-now');
    if (saveBtn) saveBtn.addEventListener('click', manualSave);
  },

  mobileTabs() {
    return [
      { route: 'home', label: '首页', icon: 'home' },
      { route: 'plan', label: '计划', icon: 'calendar' },
      { route: 'fitness', label: '健身', icon: 'dumbbell' },
      { route: 'diet', label: '饮食', icon: 'bowl' },
    ];
  },

  renderMobileNav() {
    const nav = document.getElementById('mobile-nav');
    if (!nav) return;
    const tabs = this.mobileTabs();
    const ids = tabs.map((t) => t.route);
    const moreOn = ids.indexOf(this.route) === -1;
    nav.innerHTML =
      tabs
        .map(
          (t) =>
            '<button type="button" class="mnav-item' + (this.route === t.route ? ' on' : '') + '" data-route="' + t.route + '">' +
            icon(t.icon) + '<span>' + esc(t.label) + '</span></button>'
        )
        .join('') +
      '<button type="button" class="mnav-item' + (moreOn ? ' on' : '') + '" data-more="1">' +
      icon('dots') + '<span>更多</span></button>';

    nav.querySelectorAll('[data-route]').forEach((btn) => {
      btn.addEventListener('click', () => this.go(btn.dataset.route));
    });
    const more = nav.querySelector('[data-more]');
    if (more) more.addEventListener('click', () => this.openMoreSheet());
  },

  openMoreSheet() {
    const root = document.getElementById('sheet-root');
    if (!root) return;
    const skip = ['home', 'plan', 'fitness', 'diet'];
    const items = this.visibleModules().filter((m) => skip.indexOf(m.id) === -1);
    root.innerHTML =
      '<div class="sheet-overlay" data-close-sheet></div>' +
      '<div class="sheet" role="dialog" aria-modal="true" aria-label="更多模块">' +
      '<div class="sheet-grab"></div>' +
      '<div class="sheet-head"><h3>更多模块</h3>' +
      '<button type="button" class="icon-btn" data-close-sheet aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="sheet-grid">' +
      items
        .map(
          (m) =>
            '<a class="sheet-item" href="#/' + m.id + '">' +
            '<span class="mini-ico" style="background:' + m.soft + ';color:' + m.color + '">' + icon(m.icon) + '</span>' +
            '<span>' + esc(m.name) + '</span></a>'
        )
        .join('') +
      '</div>' +
      '<div class="sheet-foot tiny muted">Xya 的工作台 · v' + APP_VERSION + '</div>' +
      '</div>';
    root.querySelectorAll('[data-close-sheet]').forEach((el) => {
      el.addEventListener('click', () => this.closeMoreSheet());
    });
    document.body.classList.add('sheet-open');
  },

  closeMoreSheet() {
    const root = document.getElementById('sheet-root');
    if (root) root.innerHTML = '';
    document.body.classList.remove('sheet-open');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
