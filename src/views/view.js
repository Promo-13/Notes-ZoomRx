import { notificationService } from '../services/utils-service.js';

class NotesView {
    constructor() {
        // Root containers
        this.contentArea = document.querySelector(".content");
        
        // Use DocumentFragment for DOM manipulations
        this.fragment = document.createDocumentFragment();
        
        // Initialize UI containers
        this.initializeContainers();
        
        // Modal elements
        this.noteModal = document.getElementById("noteModal");
        this.noteTitle = document.getElementById("noteTitle");
        this.noteText = document.getElementById("noteText");
        this.quillEditor = null; // Will hold the Quill editor instance
        this.editorContainer = document.getElementById("editorContainer");
        this.confirmationModal = document.getElementById("confirmationModal");
        this.fullscreenNote = document.getElementById("fullscreenNote");
        this.fullscreenTitle = document.getElementById("fullscreenTitle");
        this.fullscreenDescription = document.getElementById("fullscreenDescription");
        
        // Drag and drop tracking
        // this.currentDraggedNote = null;
        // this.draggedNoteOriginalPosition = null;
        this.draggedNoteId = null;
        
        // Initialize Quill editor if elements exist
        this.initQuillEditor();
    }
    
    initializeContainers() {
        // Create containers only once
        this.notesContainer = document.getElementById("notesContainer") || 
            this.createContainer("notesContainer", "notes-container");
        
        this.pinnedNotesContainer = document.getElementById("pinnedNotesContainer") || 
            this.createContainer("pinnedNotesContainer", "notes-container");
        
        this.pinnedNotesTitle = document.getElementById("pinnedNotesTitle") || 
            this.createHeading("pinnedNotesTitle", "section-title", "Pinned Notes");
        
        this.trashContainer = document.getElementById("trashContainer") || 
            this.createContainer("trashContainer", "notes-container");
    }
    
    createContainer(id, className) {
        const container = document.createElement("div");
        container.id = id;
        container.className = className;
        return container;
    }
    
    createHeading(id, className, text) {
        const heading = document.createElement("h2");
        heading.id = id;
        heading.className = className;
        heading.textContent = text;
        return heading;
    }

    initQuillEditor() {
        // Make sure the DOM is loaded and editor container exists
        if (this.editorContainer && typeof Quill !== 'undefined') {
            // Initialize Quill with Snow theme
            this.quillEditor = new Quill('#editorContainer', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'header': 1 }, { 'header': 2 }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['link'],
                        ['clean']
                    ]
                },
                placeholder: 'Write your note here...'
            });
        }
    }

    setupDragAndDrop() {
        // Remove previous listeners to avoid duplicates
        this.removeDragListeners();
        
        // Set up new listeners
        this.addDragListeners();
    }
    
    removeDragListeners() {
        if (this.notesContainer) {
            this.notesContainer.removeEventListener('dragstart', this.handleDragStart);
            this.notesContainer.removeEventListener('dragend', this.handleDragEnd);
            this.notesContainer.removeEventListener('dragover', this.handleDragOver);
        }
    }
    
    addDragListeners() {
        if (!this.notesContainer) return;
        
        // Use bound methods to maintain this context
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        
        this.notesContainer.addEventListener('dragstart', this.handleDragStart);
        this.notesContainer.addEventListener('dragend', this.handleDragEnd);
        this.notesContainer.addEventListener('dragover', this.handleDragOver);
    }
    
    // handleDragStart(e) {
    //     if (e.target.classList.contains('note')) {
    //         this.currentDraggedNote = e.target;
    //         e.dataTransfer.setData('text/plain', e.target.dataset.id);
    //         e.target.classList.add('dragging');
            
    //         // Store the original position of the note
    //         const noteElements = Array.from(this.notesContainer.querySelectorAll('.note:not(.note--pinned)'));
    //         this.draggedNoteOriginalPosition = noteElements.indexOf(e.target);
    //     }
    // }
    
    // handleDragEnd(e) {
    //     if (e.target.classList.contains('note')) {
    //         e.target.classList.remove('dragging');
            
    //         // Get the new position
    //         const noteElements = Array.from(this.notesContainer.querySelectorAll('.note:not(.note--pinned)'));
    //         const newPosition = noteElements.indexOf(e.target);
            
    //         // Only update if position changed
    //         if (this.draggedNoteOriginalPosition !== newPosition) {
    //             // Create a custom event with the dragged note id and its new position
    //             const dragEndEvent = new CustomEvent('note-reordered', {
    //                 detail: {
    //                     noteId: parseInt(e.target.dataset.id),
    //                     newPosition: newPosition
    //                 }
    //             });
                
    //             // Dispatch the event
    //             document.dispatchEvent(dragEndEvent);
    //         }
            
    //         this.currentDraggedNote = null;
    //         this.draggedNoteOriginalPosition = null;
    //     }
    // }
    
    handleDragStart(e) {
        if (e.target.classList.contains('note')) {
            this.currentDraggedNote = e.target;
            e.dataTransfer.setData('text/plain', e.target.dataset.id);
            e.target.classList.add('dragging');
            
            // Store the original position of the note
            const noteElements = Array.from(this.notesContainer.querySelectorAll('.note:not(.note--pinned)'));
            this.draggedNoteOriginalPosition = noteElements.indexOf(e.target);
            
            // Store the ID for easier reference
            this.draggedNoteId = parseInt(e.target.dataset.id);
        }
    }
    
    // 2. Replace the handleDragEnd method
    handleDragEnd(e) {
        if (e.target.classList.contains('note')) {
            e.target.classList.remove('dragging');
            
            // Optimize: Only find position of the current dragged note
            const noteElements = Array.from(this.notesContainer.querySelectorAll('.note:not(.note--pinned)'));
            const newPosition = noteElements.indexOf(e.target);
            
            // Only update if position changed
            if (this.draggedNoteOriginalPosition !== newPosition && this.draggedNoteId) {
                // Create a custom event with just the dragged note id and its new position
                const dragEndEvent = new CustomEvent('note-reordered', {
                    detail: {
                        noteId: this.draggedNoteId,
                        newPosition: newPosition
                    }
                });
                
                // Dispatch the event
                document.dispatchEvent(dragEndEvent);
            }
            
            // Reset tracking variables
            this.currentDraggedNote = null;
            this.draggedNoteOriginalPosition = null;
            this.draggedNoteId = null;
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.currentDraggedNote) return;
        
        const afterElement = this.getDragAfterElement(this.notesContainer, e.clientY);
        
        if (afterElement) {
            this.notesContainer.insertBefore(this.currentDraggedNote, afterElement);
        } else {
            this.notesContainer.appendChild(this.currentDraggedNote);
        }
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
        // Use DocumentFragment for better performance
        const pinnedFragment = document.createDocumentFragment();
        const unpinnedFragment = document.createDocumentFragment();
        
        // Clear existing content
        this.notesContainer.innerHTML = '';
        this.pinnedNotesContainer.innerHTML = '';
        
        const pinnedNotes = notes.filter(note => note.pinned);
        const unpinnedNotes = notes.filter(note => !note.pinned);
        
        // Toggle pinned notes title visibility with a class instead of style
        if (pinnedNotes.length) {
            this.pinnedNotesTitle.classList.remove('hidden');
        } else {
            this.pinnedNotesTitle.classList.add('hidden');
        }
        
        // Append pinned notes
        pinnedNotes.forEach(note => {
            pinnedFragment.appendChild(this.createNoteElement(note, true));
        });
        this.pinnedNotesContainer.appendChild(pinnedFragment);
        
        // Append unpinned notes
        unpinnedNotes.forEach(note => {
            unpinnedFragment.appendChild(this.createNoteElement(note, false));
        });
        this.notesContainer.appendChild(unpinnedFragment);
        
        // Setup drag and drop after rendering notes
        this.setupDragAndDrop();
    }
    
    displayTrash(trashNotes) {
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Clear and reset content area
        this.contentArea.innerHTML = '';
        
        if (trashNotes.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-trash-message';
            emptyMessage.textContent = 'Your trash is empty';
            this.contentArea.appendChild(emptyMessage);
            return;
        }
        
        // Clear trash container
        this.trashContainer.innerHTML = '';
        
        // Create trash heading
        const trashHeading = document.createElement('h2');
        trashHeading.className = 'section-title';
        trashHeading.textContent = 'Trash';
        fragment.appendChild(trashHeading);
        
        // Add trash container to fragment
        fragment.appendChild(this.trashContainer);
        
        // Add notes to trash container
        trashNotes.forEach(note => {
            this.trashContainer.appendChild(this.createTrashNoteElement(note));
        });
        
        // Append fragment to content area
        this.contentArea.appendChild(fragment);
    }

    displayNotesSection() {
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Clear content area
        this.contentArea.innerHTML = '';
        
        // Create and append elements using the fragment
        // Instead of using innerHTML, create actual elements
        
        // Create pinned notes title
        this.pinnedNotesTitle = this.createHeading("pinnedNotesTitle", "section-title", "Pinned Notes");
        fragment.appendChild(this.pinnedNotesTitle);
        
        // Create pinned notes container
        this.pinnedNotesContainer = this.createContainer("pinnedNotesContainer", "notes-container");
        fragment.appendChild(this.pinnedNotesContainer);
        
        // Create regular notes title
        const myNotesTitle = this.createHeading("myNotesTitle", "section-title", "My Notes");
        fragment.appendChild(myNotesTitle);
        
        // Create notes container
        this.notesContainer = this.createContainer("notesContainer", "notes-container");
        fragment.appendChild(this.notesContainer);
        
        // Append all at once for better performance
        this.contentArea.appendChild(fragment);
        
        // Reattach drag and drop
        this.setupDragAndDrop();
    }

    createNoteElement(note, isPinned) {
        const noteElement = document.createElement('div');
        noteElement.className = `note ${isPinned ? 'note--pinned' : ''}`;
        noteElement.dataset.id = note.id;
        noteElement.draggable = !isPinned;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'note__header';
        
        const title = document.createElement('div');
        title.className = 'note__title';
        title.textContent = note.title;
        header.appendChild(title);
        
        noteElement.appendChild(header);
        
        // Create text area
        const textDiv = document.createElement('div');
        textDiv.className = 'note__text';
        
        if (note.isRichText) {
            textDiv.innerHTML = note.text;
        } else {
            textDiv.textContent = note.text;
        }
        
        noteElement.appendChild(textDiv);
        
        // Create pin button
        const pinBtn = document.createElement('button');
        pinBtn.className = `note__pin-btn ${isPinned ? 'note__pin-btn--pinned' : ''}`;
        pinBtn.dataset.action = 'pin';
        
        const pinIcon = document.createElement('i');
        pinIcon.className = 'fas fa-thumbtack';
        pinBtn.appendChild(pinIcon);
        
        noteElement.appendChild(pinBtn);
        
        // Create footer with action buttons
        const footer = document.createElement('div');
        footer.className = 'note__footer';
        
        // Create fullscreen button
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'note__fullscreen-btn';
        fullscreenBtn.dataset.action = 'fullscreen';
        
        const fullscreenIcon = document.createElement('i');
        fullscreenIcon.className = 'fas fa-expand';
        fullscreenBtn.appendChild(fullscreenIcon);
        
        footer.appendChild(fullscreenBtn);
        
        // Create edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'note__edit-btn';
        editBtn.dataset.action = 'edit';
        
        const editIcon = document.createElement('i');
        editIcon.className = 'fas fa-edit';
        editBtn.appendChild(editIcon);
        
        footer.appendChild(editBtn);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note__delete-btn';
        deleteBtn.dataset.action = 'delete';
        
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash';
        deleteBtn.appendChild(deleteIcon);
        
        footer.appendChild(deleteBtn);
        
        noteElement.appendChild(footer);
        
        return noteElement;
    }
    
    createTrashNoteElement(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note note--trash';
        noteElement.dataset.id = note.id;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'note__header';
        
        const title = document.createElement('div');
        title.className = 'note__title';
        title.textContent = note.title;
        header.appendChild(title);
        
        noteElement.appendChild(header);
        
        // Create text area
        const textDiv = document.createElement('div');
        textDiv.className = 'note__text';
        
        if (note.isRichText) {
            textDiv.innerHTML = note.text;
        } else {
            textDiv.textContent = note.text;
        }
        
        noteElement.appendChild(textDiv);
        
        // Create footer with action buttons
        const footer = document.createElement('div');
        footer.className = 'note__footer';
        
        // Create restore button
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'note__restore-btn';
        restoreBtn.dataset.action = 'restore';
        
        const restoreIcon = document.createElement('i');
        restoreIcon.className = 'fas fa-trash-restore';
        restoreBtn.appendChild(restoreIcon);
        
        footer.appendChild(restoreBtn);
        
        // Create delete permanently button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note__delete-permanently-btn';
        deleteBtn.dataset.action = 'delete-permanently';
        
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash-alt';
        deleteBtn.appendChild(deleteIcon);
        
        footer.appendChild(deleteBtn);
        
        noteElement.appendChild(footer);
        
        return noteElement;
    }

    showModal(isEdit = false, note = null) {
        // Update modal title via DOM manipulation instead of textContent
        const modalTitle = this.noteModal.querySelector('h2');
        modalTitle.textContent = isEdit ? 'Edit Note' : 'Add Note';
        
        this.noteTitle.value = note ? note.title : '';
        
        // If we have the Quill editor initialized
        if (this.quillEditor) {
            // Clean previous content
            this.quillEditor.root.innerHTML = '';
            
            // Set content based on whether it's rich text or not
            if (note) {
                if (note.isRichText) {
                    this.quillEditor.root.innerHTML = note.text;
                } else {
                    this.quillEditor.setText(note.text || '');
                }
            }
        } else {
            // Fallback to the regular textarea if Quill is not available
            this.noteText.value = note ? note.text : '';
        }
        
        // Use dataset for storing id and edit state
        this.noteModal.dataset.id = note ? note.id : '';
        this.noteModal.dataset.isEdit = isEdit;
        
        // Use classList to toggle classes instead of adding/removing
        this.noteModal.classList.add('modal--open');
    }

    hideModal() {
        // Use classList to toggle classes
        this.noteModal.classList.remove('modal--open');
        
        // Clear form fields
        this.noteTitle.value = '';
        
        // Clear Quill editor content if available
        if (this.quillEditor) {
            this.quillEditor.root.innerHTML = '';
        } else {
            this.noteText.value = '';
        }
        
        // Reset dataset
        this.noteModal.dataset.id = '';
    }

    getEditorContent() {
        if (this.quillEditor) {
            // Get the HTML content from Quill
            return {
                content: this.quillEditor.root.innerHTML,
                isRichText: true
            };
        } else {
            // Fallback to regular textarea
            return {
                content: this.noteText.value,
                isRichText: false
            };
        }
    }

    showFullscreenNote(note) {
        // Update content through DOM manipulation
        this.fullscreenTitle.textContent = note.title;
        
        // Display either rich text or plain text
        if (note.isRichText) {
            this.fullscreenDescription.innerHTML = note.text;
        } else {
            this.fullscreenDescription.textContent = note.text;
        }
        
        // Use classList to toggle classes
        this.fullscreenNote.classList.add('fullscreen-note--open');
    }

    hideFullscreenNote() {
        // Use classList to toggle classes
        this.fullscreenNote.classList.remove('fullscreen-note--open');
    }

    showConfirmationModal(noteId) {
        // Use dataset to store the ID
        this.confirmationModal.dataset.id = noteId;
        
        // Use classList to toggle classes
        this.confirmationModal.classList.add('modal--open');
    }

    hideConfirmationModal() {
        // Use classList to toggle classes
        this.confirmationModal.classList.remove('modal--open');
        
        // Reset dataset
        this.confirmationModal.dataset.id = '';
    }

    // getUpdatedNotesOrder() {
    //     // Optimized: Only get non-pinned notes
    //     const noteElements = this.notesContainer.querySelectorAll('.note:not(.note--pinned)');
    //     return Array.from(noteElements).map(el => parseInt(el.dataset.id));
    // }

    // // Get position of dragged note
    // getDraggedNoteNewPosition(noteId) {
    //     const noteElements = this.notesContainer.querySelectorAll('.note:not(.note--pinned)');
    //     const noteElement = this.notesContainer.querySelector(`.note[data-id="${noteId}"]`);
        
    //     if (!noteElement) return -1;
        
    //     // Find position in unpinned notes
    //     return Array.from(noteElements).indexOf(noteElement);
    // }

    getDraggedNoteNewPosition(noteId) {
        // This finds a specific note by ID and returns its position
        const noteElement = this.notesContainer.querySelector(`.note[data-id="${noteId}"]`);
        
        if (!noteElement) return -1;
        
        // Find position only among unpinned notes
        const noteElements = Array.from(this.notesContainer.querySelectorAll('.note:not(.note--pinned)'));
        return noteElements.indexOf(noteElement);
    }
    
    // 4. Replace the getUpdatedNotesOrder method
    getUpdatedNotesOrder() {
        const noteElements = this.notesContainer.querySelectorAll('.note:not(.note--pinned)');
        return Array.from(noteElements).map(el => parseInt(el.dataset.id));
    }
    
    escapeHTML(str) {
        if (!str) return '';
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