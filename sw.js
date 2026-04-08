/**
 * CalRemind — Service Worker
 * v1.0.0
 * Caches app shell + last-known events for offline resilience.
 */

const CACHE_NAME   = 'calremind-v1';
const EVENTS_CACHE = 'calremind-events-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/constants.js',
  '/app.js',
];

// ── Install: cache app shell ─────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ───────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== EVENTS_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: stale-while-revalidate for app shell, network-first for API ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Google Calendar API calls — network-first, cache fallback
  if (url.hostname === 'www.googleapis.com') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(EVENTS_CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell — cache-first
  if (APP_SHELL.some(path => url.pathname === path || url.pathname.endsWith(path))) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
