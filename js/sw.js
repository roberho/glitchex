/**
 * Glitchex Service Worker
 * Enables offline support, caching strategy, and PWA functionality
 */

const CACHE_VERSION = 'glitchex-v2';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_IMAGE = `${CACHE_VERSION}-images`;

// Resources to cache on install
const STATIC_ASSETS = [
  '/glitchex/',
  '/glitchex/index.html',
  '/glitchex/css/styles.css',
  '/glitchex/js/prismatjs.js',
  '/glitchex/js/worker.js',
  '/glitchex/js/app.js',
  '/glitchex/favicon.svg',
  '/glitchex/manifest.json',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Skip waiting - activates immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old versions
          if (!cacheName.startsWith(`glitchex-v`)) {
            return;
          }
          if (
            cacheName !== CACHE_STATIC &&
            cacheName !== CACHE_DYNAMIC &&
            cacheName !== CACHE_IMAGE
          ) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Claim all clients immediately
  return self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-HTTPS and localhost for now
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    return;
  }

  // Image files - cache with network fallback
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  ) {
    event.respondWith(
      caches.open(CACHE_IMAGE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }

          return fetch(request).then((fetchResponse) => {
            // Cache successful responses
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone()).catch(() => {});
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // HTML, CSS, JS files - cache first strategy
  if (
    request.destination === 'document' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(
      caches.open(CACHE_STATIC).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }

          return fetch(request).then((fetchResponse) => {
            // Update cache in background
            if (fetchResponse && fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone()).catch(() => {});
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Other requests - network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const cache = request.destination === 'image' ? CACHE_IMAGE : CACHE_DYNAMIC;
          const responseForCache = response.clone();
          caches
            .open(cache)
            .then((c) => c.put(request, responseForCache))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }

          // Return offline page if available
          return caches.match('/glitchex/index.html');
        });
      })
  );
});

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(cacheNames.map((name) => caches.delete(name)));
    });
  }
});

/**
 * Background sync event - for future offline form submissions
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event.tag);

  if (event.tag === 'sync-images') {
    event.waitUntil(handleOfflineSyncImages());
  }
});

/**
 * Handle offline sync for images (future feature)
 */
async function handleOfflineSyncImages() {
  // Future implementation for syncing processed images
  console.log('[Service Worker] Syncing images...');
  return Promise.resolve();
}
