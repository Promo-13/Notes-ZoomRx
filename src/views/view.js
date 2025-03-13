class NotesView {
    constructor() {
        this.notesContainer = document.getElementById("notesContainer");
        this.pinnedNotesContainer = document.getElementById("pinnedNotesContainer");
        this.pinnedNotesTitle = document.getElementById("pinnedNotesTitle");
        this.trashContainer = document.createElement("div");
        this.trashContainer.className = "notes-container";
        this.trashContainer.id = "trashContainer";
        this.contentArea = document.querySelector(".content");
        
        // Modal elements
        this.noteModal = document.getElementById("noteModal");
        this.noteTitle = document.getElementById("noteTitle");
        this.noteText = document.getElementById("noteText");
        this.confirmationModal = document.getElementById("confirmationModal");
        this.fullscreenNote = document.getElementById("fullscreenNote");
        this.fullscreenTitle = document.getElementById("fullscreenTitle");
        this.fullscreenDescription = document.getElementById("fullscreenDescription");

        // Setup drag and drop functionality
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        this.notesContainer.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('note')) {
                e.dataTransfer.setData('text/plain', e.target.dataset.id);
                e.target.classList.add('dragging');
            }
        });

        this.notesContainer.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('note')) {
                e.target.classList.remove('dragging');
            }
        });

        this.notesContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(this.notesContainer, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (draggable && afterElement) {
                this.notesContainer.insertBefore(draggable, afterElement);
            } else if (draggable) {
                this.notesContainer.appendChild(draggable);
            }
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.note:not(.dragging):not(.note--pinned)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    displayNotes(notes) {
        this.notesContainer.innerHTML = '';
        this.pinnedNotesContainer.innerHTML = '';
        
        const pinnedNotes = notes.filter(note => note.pinned);
        const unpinnedNotes = notes.filter(note => !note.pinned);
        
        this.pinnedNotesTitle.style.display = pinnedNotes.length ? 'block' : 'none';
        
        pinnedNotes.forEach(note => {
            this.pinnedNotesContainer.appendChild(this.createNoteElement(note, true));
        });
        
        unpinnedNotes.forEach(note => {
            this.notesContainer.appendChild(this.createNoteElement(note, false));
        });
    }
    
    displayTrash(trashNotes) {
        // Clear main content and add trash container
        this.contentArea.innerHTML = '';
        
        if (trashNotes.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-trash-message';
            emptyMessage.textContent = 'Your trash is empty';
            this.contentArea.appendChild(emptyMessage);
            return;
        }
        
        this.trashContainer.innerHTML = '';
        this.contentArea.appendChild(this.trashContainer);
        
        trashNotes.forEach(note => {
            this.trashContainer.appendChild(this.createTrashNoteElement(note));
        });
    }

    displayNotesSection() {
        this.contentArea.innerHTML = '';
        this.contentArea.innerHTML = `
            <h2 class="section-title" id="pinnedNotesTitle">Pinned Notes</h2>
            <div class="notes-container" id="pinnedNotesContainer"></div>
            <h2 class="section-title" id="myNotesTitle">My Notes</h2>
            <div class="notes-container" id="notesContainer"></div>
        `;
        
        // Reassign elements after recreating them
        this.notesContainer = document.getElementById("notesContainer");
        this.pinnedNotesContainer = document.getElementById("pinnedNotesContainer");
        this.pinnedNotesTitle = document.getElementById("pinnedNotesTitle");
        
        // Reattach drag and drop
        this.setupDragAndDrop();
    }

    createNoteElement(note, isPinned) {
        const noteElement = document.createElement('div');
        noteElement.className = `note ${isPinned ? 'note--pinned' : ''}`;
        noteElement.dataset.id = note.id;
        noteElement.draggable = !isPinned;
        
        noteElement.innerHTML = `
            <div class="note__header">
                <div class="note__title">${this.escapeHTML(note.title)}</div>
            </div>
            <div class="note__text">${this.escapeHTML(note.text)}</div>
            <button class="note__pin-btn ${isPinned ? 'note__pin-btn--pinned' : ''}" data-action="pin">
                <i class="fas ${isPinned ? 'fa-thumbtack' : 'fa-thumbtack'}"></i>
            </button>
            <div class="note__footer">
                <button class="note__fullscreen-btn" data-action="fullscreen">
                    <i class="fas fa-expand"></i>
                </button>
                <button class="note__edit-btn" data-action="edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="note__delete-btn" data-action="delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return noteElement;
    }
    
    createTrashNoteElement(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note note--trash';
        noteElement.dataset.id = note.id;
        
        noteElement.innerHTML = `
            <div class="note__header">
                <div class="note__title">${this.escapeHTML(note.title)}</div>
            </div>
            <div class="note__text">${this.escapeHTML(note.text)}</div>
            <div class="note__footer">
                <button class="note__restore-btn" data-action="restore">
                    <i class="fas fa-trash-restore"></i>
                </button>
                <button class="note__delete-permanently-btn" data-action="delete-permanently">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        return noteElement;
    }

    showModal(isEdit = false, note = null) {
        this.noteModal.querySelector('h2').textContent = isEdit ? 'Edit Note' : 'Add Note';
        this.noteTitle.value = note ? note.title : '';
        this.noteText.value = note ? note.text : '';
        this.noteModal.dataset.id = note ? note.id : '';
        this.noteModal.dataset.isEdit = isEdit;
        this.noteModal.classList.add('modal--open');
    }

    hideModal() {
        this.noteModal.classList.remove('modal--open');
        this.noteTitle.value = '';
        this.noteText.value = '';
        this.noteModal.dataset.id = '';
    }

    showFullscreenNote(note) {
        this.fullscreenTitle.textContent = note.title;
        this.fullscreenDescription.textContent = note.text;
        this.fullscreenNote.classList.add('fullscreen-note--open');
    }

    hideFullscreenNote() {
        this.fullscreenNote.classList.remove('fullscreen-note--open');
    }

    showConfirmationModal(noteId) {
        this.confirmationModal.dataset.id = noteId;
        this.confirmationModal.classList.add('modal--open');
    }

    hideConfirmationModal() {
        this.confirmationModal.classList.remove('modal--open');
        this.confirmationModal.dataset.id = '';
    }

    getUpdatedNotesOrder() {
        const noteElements = this.notesContainer.querySelectorAll('.note');
        const notesOrder = Array.from(noteElements).map(el => parseInt(el.dataset.id));
        return notesOrder;
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag]));
    }
}

export default NotesView;

