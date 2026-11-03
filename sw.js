/* Service worker : l'application fonctionne sans internet après la première ouverture.
 * Pour publier une mise à jour, changer VERSION : le téléphone télécharge la nouvelle version. */
const VERSION = 'gs-v1.0.0';
const APP_FILES = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];
const FONT_CACHE = 'gs-fonts';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(APP_FILES.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Polices Google : gardées en cache pour fonctionner hors ligne.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(request).then(hit => hit || fetch(request).then(res => {
          if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
          return res;
        }).catch(() => hit)),
      ),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Pages : la version en cache s'affiche tout de suite, même sans réseau.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(hit => hit || fetch(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(cache => cache.put(request, copy));
      }
      return res;
    })),
  );
});
