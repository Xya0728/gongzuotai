'use strict';

/* =========================================================
   应用入口：导航、路由、渲染
   ========================================================= */

const NAV_GROUPS = ['', '工作与成长', '身体与娱乐', '记录', '系统'];

const App = {
  route: 'home',

  init() {
    Store.load();

    if (!location.hash) {
      location.replace('#/home');
    }
    window.addEventListener('hashchange', () => this.handleHash());
    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === 's') {
        event.preventDefault();
        manualSave();
      }
    });
    this.handleHash();

    if (!Store.ok) {
      toast('浏览器禁用了本地存储，数据可能无法保存', 'err');
    }
  },

  handleHash() {
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
    document.title = mod.name + ' · 我的生活工作台';

    if (!Store.ok) {
      main.insertAdjacentHTML(
        'afterbegin',
        '<div class="hint-bar" style="background:#fdeaea;border-color:#f3c2c2;color:#b91c1c;margin-bottom:16px">' +
          '这个浏览器禁止了本地存储，数据无法保存。请改用 Chrome 或 Edge 打开 index.html。</div>'
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
      '<div class="brand-text"><strong>我的生活工作台</strong><span>只在本机运行</span></div></div>' +
      '<nav class="nav">' + groups + '</nav>' +
      '<div class="sidebar-foot"><div class="today-mini">' + esc(fmtDateCN(todayKey(), true)) + '</div>' +
      '<div class="save-row"><span class="save-dot"></span>' +
      '<span class="save-state" id="save-state-text">' +
      (Store.lastSavedAt ? '已保存 ' + saveClock(Store.lastSavedAt) : '等待保存') + '</span>' +
      '<button class="btn sm" id="save-now">保存</button></div>' +
      '<div class="muted tiny mt-8">自动保存已开启 · ⌘S 手动保存</div></div>';

    const saveBtn = sidebar.querySelector('#save-now');
    if (saveBtn) saveBtn.addEventListener('click', manualSave);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
