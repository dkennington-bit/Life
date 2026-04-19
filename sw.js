const CACHE = 'primordial-e7b2249'; // auto-stamped by pre-commit hook
const ASSETS = [
  '/Life/', '/Life/index.html', '/Life/manifest.json', '/Life/sw.js',
  '/Life/js/config.js', '/Life/js/grid.js', '/Life/js/particles.js',
  '/Life/js/organism.js', '/Life/js/world.js', '/Life/js/ui.js', '/Life/js/main.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
