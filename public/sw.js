const CACHE_NAME = 'akg-maintenance-v8';
const APP_SHELL = [
  './',
  './index.html',
  './view/auth.html',
  './auth/approve-activation.html',
  './view/base-app.html',
  './manifest.json',
  './assets/css/auth.css',
  './assets/css/menu-home.css',
  './assets/css/menu-utama.css',
  './assets/css/menu-download.css',
  './assets/css/menu-account.css',
  './assets/images/akg-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('./view/auth.html') || caches.match('./index.html') || caches.match('./view/base-app.html'))
    );
    return;
  }

  if (!isSameOrigin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.destination === 'script') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          throw new Error(`Script is unavailable: ${url.pathname}`);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => caches.match('./assets/images/akg-icon.png'));
      })
  );
});
