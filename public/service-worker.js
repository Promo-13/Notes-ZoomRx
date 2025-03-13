const CACHE_NAME = 'notes-app-v1.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/index.css',
  '/src/index.js',
  '/src/models/model.js',
  '/src/views/view.js',
  '/src/controllers/controller.js',
  '/src/services/api-service.js',
  '/src/services/utils-service.js',
  '/mocks/handlers.js',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.quilljs.com/1.3.6/quill.snow.css',
  'https://cdn.quilljs.com/1.3.6/quill.min.js'
];

// Dynamic content that should be cached but refreshed when possible
const DYNAMIC_CONTENT = [
  '/api/notes',
  '/api/trash'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Pre-caching failed:', error);
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
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated and controlling page');
      return self.clients.claim();
    })
  );
});

// Helper to determine if a request is an API request
function isApiRequest(url) {
  return url.includes('/api/') || 
         url.includes('/notes') || 
         url.includes('/trash');
}

// Fetch event - serve from cache or network with different strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // API requests - Network first, then cache, with timeout fallback
  if (isApiRequest(url.pathname)) {
    event.respondWith(networkFirstWithTimeout(event.request, 3000));
    return;
  }
  
  // Static assets - Cache first, then network
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  
  // Everything else - Network first with cache fallback
  event.respondWith(networkFirst(event.request));
});

// Cache-first strategy for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If not in cache, fetch from network and cache
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first fetch failed:', error);
    return new Response('Network error occurred', { 
      status: 408, 
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
}

// Network-first strategy for dynamic content
async function networkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, return a simple offline response
    return new Response('You are offline and this content is not cached', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
}

// Network first with timeout for API requests
async function networkFirstWithTimeout(request, timeout) {
  return new Promise(async (resolve) => {
    // Create timeout controller
    let timeoutId;
    
    // Try to get from network with timeout
    const networkPromise = fetch(request.clone())
      .then(response => {
        clearTimeout(timeoutId);
        
        // Cache successful API responses
        if (response.ok || response.status === 304) {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
        }
        
        return response;
      })
      .catch(error => {
        console.error('Network error in fetch:', error);
        return null;
      });
    
    // Set timeout
    const timeoutPromise = new Promise(timeoutResolve => {
      timeoutId = setTimeout(() => {
        timeoutResolve(null);
      }, timeout);
    });
    
    // Race network and timeout
    const networkResult = await Promise.race([networkPromise, timeoutPromise]);
    
    // If network succeeded, return the result
    if (networkResult) {
      resolve(networkResult);
      return;
    }
    
    // Clear timeout if it hasn't triggered yet
    clearTimeout(timeoutId);
    
    // If network failed or timed out, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      resolve(cachedResponse);
      return;
    }
    
    // Neither network nor cache had a response
    // Return a custom offline message with an appropriate status code
    resolve(new Response(JSON.stringify({
      error: 'You are offline and this API resource is not cached',
      offline: true
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  });
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification',
      icon: '/images/note-icon.png',
      badge: '/images/badge.png',
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Notes App', options)
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});