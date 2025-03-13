import { notificationService, networkService } from '../services/utils-service.js';

class NotesController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.currentSection = 'notes';
        
        // Initialize app
        this.init();
        
        // Bind event listeners
        this.bindEvents();
    }
    
    async init() {
        await this.loadNotes();
        this.toggleAddButton(true);
        
        // Update UI based on network status
        this.updateNetworkStatusUI(navigator.onLine);
        networkService.addStatusListener(this.updateNetworkStatusUI.bind(this));
    }


    updateNetworkStatusUI(isOnline) {
        const offlineIndicator = document.getElementById('offlineIndicator') || this.createOfflineIndicator();
        
        // Track previous state to detect changes
        const wasOffline = offlineIndicator.classList.contains('hidden') === false;
        
        if (isOnline) {
            offlineIndicator.classList.add('hidden');
            document.body.classList.remove('offline-mode');
            
            // Only show notification if we're coming back online from offline state
            if (wasOffline) {
                notificationService.success('You are back online. Changes will be synced.');
            }
        } else {
            offlineIndicator.classList.remove('hidden');
            document.body.classList.add('offline-mode');
            notificationService.warning('You are offline. Changes will be saved locally.');
        }
    }
    
    createOfflineIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'offlineIndicator';
        indicator.className = 'offline-indicator hidden';
        indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
        document.body.appendChild(indicator);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .offline-indicator {
                position: fixed;
                bottom: 10px;
                left: 10px;
                background: #ff9800;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                z-index: 1000;
                font-weight: 500;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .offline-indicator i {
                margin-right: 5px;
            }
            .hidden {
                display: none;
            }
            .offline-mode .header {
                background: #666;
            }
        `;
        document.head.appendChild(style);
        
        return indicator;
    }
    
    bindEvents() {
        // Use delegation for dynamic elements
        this.bindStaticEvents();
        this.bindDynamicEvents();
    }
    
    bindStaticEvents() {
        // Add note button
        const addNoteBtn = document.getElementById('addNoteBtn');
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', () => this.view.showModal());
        }
        
        // Save and cancel buttons
        const saveNoteBtn = document.getElementById('saveNoteBtn');
        const cancelNoteBtn = document.getElementById('cancelNoteBtn');
        
        if (saveNoteBtn) {
            saveNoteBtn.addEventListener('click', () => this.handleSaveNote());
        }
        
        if (cancelNoteBtn) {
            cancelNoteBtn.addEventListener('click', () => this.view.hideModal());
        }
        
        // Close fullscreen button
        const closeFullscreenBtn = document.getElementById('closeFullscreenNote');
        if (closeFullscreenBtn) {
            closeFullscreenBtn.addEventListener('click', () => this.view.hideFullscreenNote());
        }
        
        // Confirmation modal buttons
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.handleConfirmDelete());
        }
        
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => this.view.hideConfirmationModal());
        }
        
        // Search input
        const searchInput = document.querySelector('.header__search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Sidebar navigation
        const sidebarItems = document.querySelectorAll('.sidebar__item');
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => this.changeSection(item.dataset.section));
        });
        
        // Listen for the note-reordered custom event
        document.addEventListener('note-reordered', (e) => {
            this.handleNoteReordered(e.detail.noteId, e.detail.newPosition);
        });
    }
    
    bindDynamicEvents() {
        // Note actions delegation (edit, delete, pin, fullscreen)
        document.addEventListener('click', (e) => {
            const noteElement = e.target.closest('.note');
            if (!noteElement) return;
            
            const actionButton = e.target.closest('[data-action]');
            if (!actionButton) return;
            
            const action = actionButton.dataset.action;
            const noteId = parseInt(noteElement.dataset.id);
            
            this.handleNoteAction(action, noteId);
        });
    }
    
    handleNoteAction(action, noteId) {
        switch (action) {
            case 'edit':
                this.handleEditNote(noteId);
                break;
            case 'delete':
                this.handleDeleteNote(noteId);
                break;
            case 'pin':
                this.handleTogglePin(noteId);
                break;
            case 'fullscreen':
                this.handleFullscreen(noteId);
                break;
            case 'restore':
                this.handleRestoreNote(noteId);
                break;
            case 'delete-permanently':
                this.view.showConfirmationModal(noteId);
                break;
        }
    }
    
    // async handleNoteReordered(noteId, newPosition) {
    //     // Get all notes
    //     const allNotes = [...this.model.notes];
        
    //     // Find the dragged note
    //     const draggedNote = allNotes.find(note => note.id === noteId);
    //     if (!draggedNote) return;
        
    //     // Remove the dragged note from its current position
    //     const noteIndex = allNotes.findIndex(note => note.id === noteId);
    //     if (noteIndex !== -1) {
    //         allNotes.splice(noteIndex, 1);
    //     }
        
    //     // Split into pinned and unpinned
    //     const pinnedNotes = allNotes.filter(note => note.pinned);
    //     const unpinnedNotes = allNotes.filter(note => !note.pinned);
        
    //     // Insert the dragged note at its new position in unpinned notes
    //     unpinnedNotes.splice(newPosition, 0, draggedNote);
        
    //     // Combine pinned and unpinned notes
    //     const updatedNotes = [...pinnedNotes, ...unpinnedNotes];
        
    //     // Update the model
    //     await this.model.updateNoteOrder(updatedNotes);
    // }

    async handleNoteReordered(noteId, newPosition) {
        // Get all notes - we need this to maintain the correct order
        const allNotes = [...this.model.notes];
        
        // Find the dragged note
        const draggedNote = allNotes.find(note => note.id === noteId);
        if (!draggedNote) return;
        
        // Optimize: We only need to split pinned/unpinned, remove the dragged note, and insert it at the new position
        
        // Split into pinned and unpinned
        const pinnedNotes = allNotes.filter(note => note.pinned);
        
        // Get unpinned notes without the dragged note
        const unpinnedNotes = allNotes.filter(note => !note.pinned && note.id !== noteId);
        
        // Insert the dragged note at its new position in unpinned notes
        unpinnedNotes.splice(newPosition, 0, draggedNote);
        
        // Combine pinned and unpinned notes
        const updatedNotes = [...pinnedNotes, ...unpinnedNotes];
        
        // Update the model with the new order
        await this.model.updateNoteOrder(updatedNotes);
    }
    
    
    async loadNotes() {
        try {
            const notes = await this.model.loadNotes();
            this.view.displayNotes(notes);
        } catch (error) {
            notificationService.error('Failed to load notes');
            console.error('Error in loadNotes:', error);
        }
    }
    
    async loadTrash() {
        try {
            const trashNotes = await this.model.loadTrash();
            this.view.displayTrash(trashNotes);
        } catch (error) {
            notificationService.error('Failed to load trash');
            console.error('Error in loadTrash:', error);
        }
    }

    async handleSaveNote() {
        try {
            // Get values and trim them
            const title = this.view.noteTitle.value.trim();
            const editorContent = this.view.getEditorContent();
            let text = '';
            let hasValidTextContent = false;
            
            // Make sure we have valid content before trying to access it
            if (editorContent && editorContent.content) {
                if (typeof editorContent.content === 'string') {
                    text = editorContent.content.trim();
                    
                    // For rich text, check if there's actual content, not just HTML tags
                    if (editorContent.isRichText && text !== '') {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = text;
                        const textContent = tempDiv.textContent || tempDiv.innerText || '';
                        hasValidTextContent = textContent.trim() !== '';
                    } else {
                        hasValidTextContent = text !== '';
                    }
                }
            }
            
            const isRichText = editorContent ? editorContent.isRichText : false;
            const isEdit = this.view.noteModal.dataset.isEdit === 'true';
            const noteId = parseInt(this.view.noteModal.dataset.id);
            
            // Check if at least one field has content (title OR text)
            if (title === '' && !hasValidTextContent) {
                notificationService.warning('Please enter at least a title or text for your note');
                return;
            }
            
            if (isEdit) {
                await this.model.updateNote(noteId, { title, text, isRichText });
                notificationService.success('Note updated successfully');
            } else {
                await this.model.addNote(title, text, isRichText);
                notificationService.success('Note created successfully');
            }
            
            this.view.hideModal();
            this.loadNotes();
        } catch (error) {
            notificationService.error('Failed to save note');
            console.error('Error saving note:', error);
        }
    }
    
    async handleEditNote(noteId) {
        try {
            const note = this.model.notes.find(note => note.id === noteId);
            if (note) {
                this.view.showModal(true, note);
            } else {
                notificationService.error('Note not found');
            }
        } catch (error) {
            notificationService.error('Failed to edit note');
            console.error('Error editing note:', error);
        }
    }
    
    async handleDeleteNote(noteId) {
        try {
            const result = await this.model.moveToTrash(noteId);
            if (result) {
                notificationService.info('Note moved to trash');
                this.loadNotes();
            } else {
                notificationService.error('Failed to delete note');
            }
        } catch (error) {
            notificationService.error('Failed to delete note');
            console.error('Error deleting note:', error);
        }
    }
    
    async handleRestoreNote(noteId) {
        try {
            const result = await this.model.restoreFromTrash(noteId);
            if (result) {
                notificationService.success('Note restored successfully');
                this.loadTrash();
                
                if (this.currentSection === 'notes') {
                    this.loadNotes();
                }
            } else {
                notificationService.error('Failed to restore note');
            }
        } catch (error) {
            notificationService.error('Failed to restore note');
            console.error('Error restoring note:', error);
        }
    }
    
    async handleConfirmDelete() {
        try {
            const noteId = parseInt(this.view.confirmationModal.dataset.id);
            const result = await this.model.deletePermanently(noteId);
            
            if (result) {
                notificationService.info('Note permanently deleted');
                this.view.hideConfirmationModal();
                this.loadTrash();
            } else {
                notificationService.error('Failed to delete note');
            }
        } catch (error) {
            notificationService.error('Failed to delete note');
            console.error('Error permanently deleting note:', error);
        }
    }
    
    async handleTogglePin(noteId) {
        try {
            await this.model.togglePin(noteId);
            this.loadNotes();
        } catch (error) {
            notificationService.error('Failed to pin/unpin note');
            console.error('Error toggling pin:', error);
        }
    }
    
    handleFullscreen(noteId) {
        try {
            let note;
            if (this.currentSection === 'notes') {
                note = this.model.notes.find(note => note.id === noteId);
            } else {
                note = this.model.trashNotes.find(note => note.id === noteId);
            }
            
            if (note) {
                this.view.showFullscreenNote(note);
            } else {
                notificationService.error('Note not found');
            }
        } catch (error) {
            notificationService.error('Failed to display note');
            console.error('Error showing fullscreen note:', error);
        }
    }
    
    handleSearch(query) {
        try {
            if (this.currentSection === 'notes') {
                const filteredNotes = this.model.searchNotes(query);
                this.view.displayNotes(filteredNotes);
            }
        } catch (error) {
            notificationService.error('Search failed');
            console.error('Error in search:', error);
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('sidebar--open');
        }
    }
    
    changeSection(section) {
        this.currentSection = section;
        
        // Update active sidebar item
        const sidebarItems = document.querySelectorAll('.sidebar__item');
        sidebarItems.forEach(item => {
            item.classList.toggle('sidebar__item--active', item.dataset.section === section);
        });
        
        // Show appropriate content
        if (section === 'notes') {
            this.view.displayNotesSection();
            this.loadNotes();
            this.toggleAddButton(true);
        } else if (section === 'trash') {
            this.loadTrash();
            this.toggleAddButton(false);
        }
    }
    
    toggleAddButton(show) {
        const addNoteBtn = document.getElementById('addNoteBtn');
        if (addNoteBtn) {
            addNoteBtn.style.display = show ? 'block' : 'none';
        }
    }
}
export default NotesController;
