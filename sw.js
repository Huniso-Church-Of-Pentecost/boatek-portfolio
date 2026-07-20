/* ==========================================================================
   sw.js — service worker: precache core assets, cache-first for static,
   network-first for navigation/API, offline fallback
   ========================================================================== */

const CACHE_VERSION = 'foster-portfolio-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/resume.html',
  '/blog.html',
  '/css/style.css',
  '/css/animations.css',
  '/css/responsive.css',
  '/css/features.css',
  '/js/main.js',
  '/js/animations.js',
  '/js/particles.js',
  '/js/projectBudget.js',
  '/js/features.js',
  '/js/growth.js',
  '/js/blog.js',
  '/data/projectBudgets.json',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/offline.html'
];

/* ---------------------------------------------------------------- */
/* Install — precache core shell                                     */
/* ---------------------------------------------------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

/* ---------------------------------------------------------------- */
/* Activate — clean up old caches                                    */
/* ---------------------------------------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('foster-portfolio-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------------------------------------------------------------- */
/* Fetch strategy                                                     */
/*  - Navigation requests: network-first, fallback to cache/offline  */
/*  - /api/* requests: network only (never cache user data)          */
/*  - Static assets (css/js/img/font): cache-first                   */
/* ---------------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return; // let POST (e.g. contact form) pass through untouched

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ message: 'You appear to be offline. Please try again once reconnected.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
