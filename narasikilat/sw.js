const CACHE_NAME = 'narasikilat-v5-live';

// Network-First: Always fetch latest version from internet
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network first so updates and API calls are 100% real-time
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache only if device is completely offline
        return caches.match(event.request);
      })
  );
});
