'use strict';

/* Xya 的工作台 · PWA 离线外壳
   导航请求优先走网络；静态资源缓存优先并后台更新；
   /api/ 数据接口从不缓存，避免把私人数据写进 Cache Storage。 */

const VERSION = '2026.11.11-4';
const ASSETS_VERSION = '20261111-4';
const CACHE = 'xya-shell-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css?v=' + ASSETS_VERSION,
  './js/core.js?v=' + ASSETS_VERSION,
  './js/art.js?v=' + ASSETS_VERSION,
  './js/pages/home.js?v=' + ASSETS_VERSION,
  './js/pages/plan.js?v=' + ASSETS_VERSION,
  './js/pages/work.js?v=' + ASSETS_VERSION,
  './js/pages/study.js?v=' + ASSETS_VERSION,
  './js/pages/fitness.js?v=' + ASSETS_VERSION,
  './js/pages/diet.js?v=' + ASSETS_VERSION,
  './js/pages/games.js?v=' + ASSETS_VERSION,
  './js/pages/money.js?v=' + ASSETS_VERSION,
  './js/pages/settings.js?v=' + ASSETS_VERSION,
  './js/app.js?v=' + ASSETS_VERSION,
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches.match('./index.html').then((cached) => cached || caches.match('./'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
