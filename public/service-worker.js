const CACHE_NAME = 'notes-app-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles/index.css',
  '/src/index.js',
  '/src/model.js',
  '/src/view.js',
  '/src/controller.js',
  '/src/handlers.js',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Exclude API requests from caching
  if (event.request.url.includes('/notes') || 
      event.request.url.includes('/trash')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request to use it twice
        const fetchRequest = event.request.clone();
        
        // Try to fetch and cache the new resource
        return fetch(fetchRequest)
          .then((response) => {
            // Check if response is valid to cache
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response to cache it
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Fallback for non-cached assets when offline
            return new Response('You are offline and this resource is not cached.');
          });
      })
  );
});
