// Service Worker: macht das Spiel nach dem ersten Laden offline spielbar.
// Strategie: zuerst Netz (immer die neueste Version), bei fehlendem Netz der Zwischenspeicher.
// Alles, was einmal geladen wurde (auch Three.js von jsDelivr), landet im Zwischenspeicher.
// FILES wird vorab gespeichert. Ein Test prueft, dass jede Datei aus src/ und assets/ hier steht.
const CACHE = 'webracer-v1';
const THREE_BASE = 'https://cdn.jsdelivr.net/npm/three@0.186.1/';
const FILES = [
  './',
  'index.html',
  'style.css',
  'src/ai.js',
  'src/avatars.js',
  'src/birds.js',
  'src/camera.js',
  'src/input.js',
  'src/kart.js',
  'src/main.js',
  'src/race.js',
  'src/sky.js',
  'src/sound.js',
  'src/track.js',
  'src/ui.js',
  'src/view.js',
  'assets/LICENSE-kenney.txt',
  'assets/audio/engine.ogg',
  'assets/audio/impact.ogg',
  'assets/audio/skid.ogg',
  'assets/models/Textures/colormap.png',
  'assets/models/decoration-empty.glb',
  'assets/models/decoration-forest.glb',
  'assets/models/decoration-tents.glb',
  'assets/models/track-bump.glb',
  'assets/models/track-corner.glb',
  'assets/models/track-finish.glb',
  'assets/models/track-straight.glb',
  'assets/models/vehicle-truck-green.glb',
  'assets/models/vehicle-truck-purple.glb',
  'assets/models/vehicle-truck-red.glb',
  'assets/models/vehicle-truck-yellow.glb',
  'assets/sprites/smoke.png',
  THREE_BASE + 'build/three.module.js',
  THREE_BASE + 'build/three.core.js',
  THREE_BASE + 'examples/jsm/loaders/GLTFLoader.js',
  THREE_BASE + 'examples/jsm/utils/BufferGeometryUtils.js',
  THREE_BASE + 'examples/jsm/utils/SkeletonUtils.js',
  THREE_BASE + 'examples/jsm/objects/Lensflare.js',
];

self.addEventListener('install', (e) => {
  // Einzeln speichern: Fehlt eine Datei, bricht nicht alles ab.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(f).catch(() => null)))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
