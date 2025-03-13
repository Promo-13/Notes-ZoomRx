if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if we're in development mode (using MSW)
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    if (!isDevelopment) {
      // Only register the caching service worker in production
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered successfully:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    } else {
      // In development, unregister any existing service workers to prevent conflicts
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
          console.log('Service worker unregistered for development mode');
        }
      });
    }
  });
}