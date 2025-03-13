import { setupWorker } from 'msw/browser';
import { handlers } from '../mocks/handlers.js';
import NotesModel from './models/model.js';
import NotesView from './views/view.js';
import NotesController from './controllers/controller.js';
import { notificationService, networkService } from './services/utils-service.js';

// Setup Mock Service Worker for API simulation
export const worker = setupWorker(...handlers);

// Initialize the application after MSW is ready
async function initApp() {
    try {
        // Start the mock service worker with optimized settings
        await worker.start({
            onUnhandledRequest: 'bypass',
            // Reduce worker verbosity
            quiet: true,
            // Don't show warnings
            serviceWorker: {
                url: '/mockServiceWorker.js',
                options: {
                    // Immediate control
                    scope: '/',
                    // Disable debugging in production
                    debug: false
                }
            }
        });
        console.log('Mock API server running');
        
        // Initialize MVC components
        const model = new NotesModel();
        const view = new NotesView();
        
        // Defer non-essential operations to improve initial load performance
        requestAnimationFrame(() => {
            const controller = new NotesController(model, view);
            
            // Add performance mark for debugging
            if (performance && performance.mark) {
                performance.mark('app-initialized');
            }
            
            // Show welcome message
            notificationService.info('Welcome to Notes App!');
        });
    } catch (error) {
        console.error('Failed to initialize the app:', error);
        notificationService.error('Failed to initialize the application. Please refresh the page.');
    }
}

// Check for Service Worker support before registering it
function registerServiceWorker() {
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
                        if (!registration.scope.includes('mockServiceWorker')) {
                            registration.unregister();
                            console.log('Service worker unregistered for development mode');
                        }
                    }
                });
            }
        });
    }
}

// Start the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize service worker
    registerServiceWorker();
    
    // Initialize the application
    initApp();
    
    // Setup performance monitoring
    if (window.performance && window.performance.getEntriesByType) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfEntries = performance.getEntriesByType('navigation');
                if (perfEntries && perfEntries.length > 0) {
                    const loadTime = perfEntries[0].loadEventEnd - perfEntries[0].startTime;
                    console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
                }
            }, 0);
        });
    }
});