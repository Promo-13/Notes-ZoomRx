// index.js - Main application entry point
import { setupWorker } from 'msw/browser';
import { handlers } from '../mocks/handlers.js';
import NotesModel from './models/model.js';
import NotesView from './views/view.js';
import NotesController from './controllers/controller.js';

// Setup Mock Service Worker for API simulation
export const worker = setupWorker(...handlers);

// Initialize the application after MSW is ready
async function initApp() {
    try {
        // Start the mock service worker
        await worker.start({
            onUnhandledRequest: 'bypass', // Ignore unhandled requests
        });
        console.log('Mock API server running');
        
        // Initialize MVC components
        const model = new NotesModel();
        const view = new NotesView();
        const controller = new NotesController(model, view);
        
        // Add some sample notes if none exist
        const notes = await model.loadNotes();
        // if (notes.length === 0) {
        //     await model.addNote('Welcome to Notes App', 'This is your first note. You can edit, delete, or pin it using the buttons below.');
        //     await model.addNote('Features', '• Create and edit notes\n• Pin important notes\n• Delete unwanted notes\n• Restore from trash\n• Works offline\n• Drag and drop to reorder');
        // }
        
        // Display online/offline status
        window.addEventListener('online', () => {
            console.log('App is online');
            document.body.classList.remove('offline-mode');
        });
        
        window.addEventListener('offline', () => {
            console.log('App is offline');
            document.body.classList.add('offline-mode');
        });
        
    } catch (error) {
        console.error('Failed to initialize the app:', error);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp);