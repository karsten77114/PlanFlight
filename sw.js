const CACHE = 'planflight-v1';

const STATIC = [
  '/',
  '/index.html',
  '/brief.html',
  '/ac.html',
  '/wx.html',
  '/tools.html',
  '/log.html',
  '/style.css',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-First for static assets; Network-First for API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and navigation requests (HTML page loads) — let browser handle directly
  // This avoids Safari's "SW has redirections" error when serve does 301 clean-URL redirect
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') return;

  // API calls → Network-First (fallback to cache if offline)
  if (url.hostname.includes('workers.dev') || url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets (CSS, JS, icons) → Cache-First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      });
    })
  );
});
