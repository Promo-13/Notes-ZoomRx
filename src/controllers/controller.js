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
    }
    
    bindEvents() {
        // Add note button
        const addNoteBtn = document.getElementById('addNoteBtn');
        addNoteBtn.addEventListener('click', () => this.view.showModal());
        
        // Save and cancel buttons
        const saveNoteBtn = document.getElementById('saveNoteBtn');
        const cancelNoteBtn = document.getElementById('cancelNoteBtn');
        saveNoteBtn.addEventListener('click', () => this.handleSaveNote());
        cancelNoteBtn.addEventListener('click', () => this.view.hideModal());
        
        // Close fullscreen button
        const closeFullscreenBtn = document.getElementById('closeFullscreenNote');
        closeFullscreenBtn.addEventListener('click', () => this.view.hideFullscreenNote());
        
        // Confirmation modal buttons
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        confirmDeleteBtn.addEventListener('click', () => this.handleConfirmDelete());
        cancelDeleteBtn.addEventListener('click', () => this.view.hideConfirmationModal());
        
        // Search input
        const searchInput = document.querySelector('.header__search');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        
        // Sidebar navigation
        const sidebarItems = document.querySelectorAll('.sidebar__item');
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => this.changeSection(item.dataset.section));
        });
        
        // Note actions delegation (edit, delete, pin, fullscreen)
        document.addEventListener('click', (e) => {
            const noteElement = e.target.closest('.note');
            if (!noteElement) return;
            
            const actionButton = e.target.closest('[data-action]');
            if (!actionButton) return;
            
            const action = actionButton.dataset.action;
            const noteId = parseInt(noteElement.dataset.id);
            
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
        });
        
        // Handle drag end to update order
        document.addEventListener('dragend', () => {
            const notesOrder = this.view.getUpdatedNotesOrder();
            // Reorder notes based on DOM order
            if (notesOrder.length) {
                const reorderedNotes = this.getReorderedNotes(notesOrder);
                this.model.updateNoteOrder(reorderedNotes);
            }
        });
    }
    
    getReorderedNotes(notesOrder) {
        // Get all notes and reorder based on DOM
        const allNotes = [...this.model.notes];
        const pinnedNotes = allNotes.filter(note => note.pinned);
        const unpinnedNotes = [];
        
        // Reorder unpinned notes based on DOM order
        notesOrder.forEach(id => {
            const note = allNotes.find(note => note.id === id);
            if (note && !note.pinned) {
                unpinnedNotes.push(note);
            }
        });
        
        // Combine pinned and unpinned notes
        return [...pinnedNotes, ...unpinnedNotes];
    }
    
    async loadNotes() {
        const notes = await this.model.loadNotes();
        this.view.displayNotes(notes);
    }
    
    async loadTrash() {
        const trashNotes = await this.model.loadTrash();
        this.view.displayTrash(trashNotes);
    }
    
    async handleSaveNote() {
        const title = this.view.noteTitle.value.trim();
        const text = this.view.noteText.value.trim();
        const isEdit = this.view.noteModal.dataset.isEdit === 'true';
        const noteId = parseInt(this.view.noteModal.dataset.id);
        
        if (!title && !text) {
            alert('Please enter a title or text for your note');
            return;
        }
        
        if (isEdit) {
            await this.model.updateNote(noteId, { title, text });
        } else {
            await this.model.addNote(title, text);
        }
        
        this.view.hideModal();
        this.loadNotes();
    }
    
    async handleEditNote(noteId) {
        const note = this.model.notes.find(note => note.id === noteId);
        if (note) {
            this.view.showModal(true, note);
        }
    }
    
    async handleDeleteNote(noteId) {
        await this.model.moveToTrash(noteId);
        this.loadNotes();
    }
    
    async handleRestoreNote(noteId) {
        await this.model.restoreFromTrash(noteId);
        this.loadTrash();
        if (this.currentSection === 'notes') {
            this.loadNotes();
        }
    }
    
    async handleConfirmDelete() {
        const noteId = parseInt(this.view.confirmationModal.dataset.id);
        await this.model.deletePermanently(noteId);
        this.view.hideConfirmationModal();
        this.loadTrash();
    }
    
    async handleTogglePin(noteId) {
        await this.model.togglePin(noteId);
        this.loadNotes();
    }
    
    handleFullscreen(noteId) {
        let note;
        if (this.currentSection === 'notes') {
            note = this.model.notes.find(note => note.id === noteId);
        } else {
            note = this.model.trashNotes.find(note => note.id === noteId);
        }
        
        if (note) {
            this.view.showFullscreenNote(note);
        }
    }
    
    handleSearch(query) {
        if (this.currentSection === 'notes') {
            const filteredNotes = this.model.searchNotes(query);
            this.view.displayNotes(filteredNotes);
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('sidebar--open');
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
        addNoteBtn.style.display = show ? 'block' : 'none';
    }
}

export default NotesController;

