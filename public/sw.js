// Service Worker untuk PWA
const CACHE_NAME = 'ipa-exam-room-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache resources dengan error handling
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return null; // Continue even if one fails
            })
          )
        );
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Skip localhost and development URLs - let Vite handle them
  if (event.request.url.includes('localhost') || 
      event.request.url.includes('127.0.0.1') ||
      event.request.url.includes('/@') || // Vite internal paths
      event.request.url.includes('?') || // Skip URLs with query params (like HMR)
      event.request.url.includes('.vite') || // Vite internal files
      event.request.url.includes('node_modules')) {
    return; // Let the request go through normally
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((err) => {
                console.warn('Failed to cache response:', err);
              });

            return response;
          })
          .catch((error) => {
            console.warn('Fetch failed:', error);
            // Return a fallback response if available
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            return new Response('Network error', { status: 408 });
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim()) // Take control of all pages
  );
});
