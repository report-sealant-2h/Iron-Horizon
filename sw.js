/* Iron Horizon — Service Worker
   Caches the game and Three.js CDN so it works fully offline after install.
   Cache is versioned — bump CACHE_NAME when shipping an update so players
   automatically get the new version on their next online visit. */

const CACHE_NAME = 'iron-horizon-v1';

const PRECACHE = [
  './iron-horizon-v4.html',
  './manifest.json',
  './icon-512.svg',
  './icon-192.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

/* ---- Install: precache everything ---- */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ---- Activate: clear old caches ---- */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---- Fetch: cache-first for assets, network-first for the HTML ---- */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHtml = e.request.destination === 'document' || url.pathname.endsWith('.html');

  if (isHtml) {
    /* Network-first for HTML so updates are picked up automatically */
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    /* Cache-first for everything else (Three.js, icons, manifest) */
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        }))
    );
  }
});
