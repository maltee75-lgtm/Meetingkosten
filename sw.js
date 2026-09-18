/**
 * Service Worker: macht die App offline nutzbar und erlaubt die Installation
 * als eigenständige App mit Icon (Homescreen, Startmenü, Dock).
 *
 * Strategie: "stale while revalidate" - Anfragen werden aus dem Cache
 * beantwortet und im Hintergrund erneuert. Die App startet damit auch ohne
 * Netz sofort; eine neue Version greift beim nächsten Start.
 */
const CACHE_NAME = 'meetingkosten-v1';

/** App-Shell: alles, was die App zum Starten braucht. */
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/costEngine.js',
  './js/exporter.js',
  './js/format.js',
  './js/pwa.js',
  './js/storage.js',
  './js/ticker.js',
  './js/ui.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Einzeln ablegen: eine fehlende Datei soll die Installation nicht scheitern lassen.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });

      const fromNetwork = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);

      return cached || fromNetwork;
    })()
  );
});
