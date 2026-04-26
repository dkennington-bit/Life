const CACHE = 'primordial-v0.014';
const ASSETS = [
  '/Life/', '/Life/index.html', '/Life/manifest.json', '/Life/sw.js',
  '/Life/version.js',
  '/Life/js/config.js', '/Life/js/grid.js', '/Life/js/particles.js',
  '/Life/js/organism.js', '/Life/js/world.js', '/Life/js/ui.js', '/Life/js/main.js',
  '/Life/js/menu.js', '/Life/js/gamestate.js', '/Life/js/cards.js',
  '/Life/js/behaviors/PeacefulBehavior.js',
  '/Life/js/behaviors/PredatorBehavior.js',
  '/Life/js/behaviors/VenomBehavior.js',
  '/Life/js/behaviors/ParasiteBehavior.js',
  '/Life/js/species/index.js',
  '/Life/js/species/Photosynthesizer.js',
  '/Life/js/species/Hunter.js',
  '/Life/js/species/Swimmer.js',
  '/Life/js/species/Archaea.js',
  '/Life/js/species/Bloomer.js',
  '/Life/js/species/Parasite.js',
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
