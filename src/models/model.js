import { apiService } from '../services/api-service.js';
import { networkService } from '../services/utils-service.js';

class NotesModel {
    constructor() {
        this.notes = [];
        this.trashNotes = [];
        this.isOnline = navigator.onLine;
        this.setupOnlineListener();
    }

    setupOnlineListener() {
        networkService.addStatusListener((isOnline) => {
            const wasOffline = !this.isOnline && isOnline;
            this.isOnline = isOnline;
            
            // Only sync when coming back online from offline state
            if (wasOffline) {
                this.syncWithServer();
            }
        });
    }

    async loadNotes() {
        try {
            // Return existing notes from memory when offline
            if (!this.isOnline) {
                // Only load from localStorage if memory is empty
                if (this.notes.length === 0) {
                    const storedNotes = localStorage.getItem('notes');
                    if (storedNotes) this.notes = JSON.parse(storedNotes);
                }
                return this.notes;
            }
            
            // Fetch from API when online
            const notes = await apiService.getNotes();
            this.notes = notes;
            localStorage.setItem('notes', JSON.stringify(this.notes));
            return this.notes;
        } catch (error) {
            console.error('Error loading notes:', error);
            // If API fails, use in-memory notes or fall back to localStorage
            if (this.notes.length === 0) {
                const storedNotes = localStorage.getItem('notes');
                if (storedNotes) this.notes = JSON.parse(storedNotes);
            }
            return this.notes;
        }
    }

    async loadTrash() {
        try {
            // Return existing trash from memory when offline
            if (!this.isOnline) {
                // Only load from localStorage if memory is empty
                if (this.trashNotes.length === 0) {
                    const storedTrash = localStorage.getItem('trashNotes');
                    if (storedTrash) this.trashNotes = JSON.parse(storedTrash);
                }
                return this.trashNotes;
            }
            
            // Fetch from API when online
            const trashNotes = await apiService.getTrashNotes();
            this.trashNotes = trashNotes;
            localStorage.setItem('trashNotes', JSON.stringify(this.trashNotes));
            return this.trashNotes;
        } catch (error) {
            console.error('Error loading trash:', error);
            // If API fails, use in-memory trash or fall back to localStorage
            if (this.trashNotes.length === 0) {
                const storedTrash = localStorage.getItem('trashNotes');
                if (storedTrash) this.trashNotes = JSON.parse(storedTrash);
            }
            return this.trashNotes;
        }
    }

    async addNote(title, text, isRichText = false) {
        const newNote = {
            id: Date.now(),
            title,
            text,
            pinned: false,
            isRichText: isRichText
        };

        this.notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(this.notes));

        if (this.isOnline) {
            try {
                const createdNote = await apiService.createNote({ title, text, isRichText });
                if (createdNote) {
                    // Replace the temporary note with the one from the server
                    const index = this.notes.findIndex(note => note.id === newNote.id);
                    if (index !== -1) {
                        this.notes[index] = createdNote;
                        localStorage.setItem('notes', JSON.stringify(this.notes));
                    }
                    return createdNote;
                }
            } catch (error) {
                console.error('Error saving note to server:', error);
            }
        }
        
        return newNote;
    }

    async updateNote(id, updates) {
        const note = this.notes.find(note => note.id === id);
        if (!note) return null;

        Object.assign(note, updates);
        localStorage.setItem('notes', JSON.stringify(this.notes));

        if (this.isOnline) {
            try {
                await apiService.updateNote(id, updates);
            } catch (error) {
                console.error('Error updating note on server:', error);
            }
        }

        return note;
    }

    async togglePin(id) {
        const note = this.notes.find(note => note.id === id);
        if (!note) return null;

        note.pinned = !note.pinned;
        localStorage.setItem('notes', JSON.stringify(this.notes));

        if (this.isOnline) {
            try {
                await apiService.updateNote(id, { pinned: note.pinned });
            } catch (error) {
                console.error('Error updating pin status on server:', error);
            }
        }

        return note;
    }

    async moveToTrash(id) {
        const noteIndex = this.notes.findIndex(note => note.id === id);
        if (noteIndex === -1) return false;

        const noteToTrash = this.notes.splice(noteIndex, 1)[0];
        noteToTrash.pinned = false; // Unpin when moved to trash
        this.trashNotes.push(noteToTrash);
        
        localStorage.setItem('notes', JSON.stringify(this.notes));
        localStorage.setItem('trashNotes', JSON.stringify(this.trashNotes));

        if (this.isOnline) {
            try {
                await apiService.moveToTrash(id);
            } catch (error) {
                console.error('Error moving note to trash on server:', error);
            }
        }

        return true;
    }

    async restoreFromTrash(id) {
        const noteIndex = this.trashNotes.findIndex(note => note.id === id);
        if (noteIndex === -1) return false;

        const noteToRestore = this.trashNotes.splice(noteIndex, 1)[0];
        this.notes.push(noteToRestore);
        
        localStorage.setItem('notes', JSON.stringify(this.notes));
        localStorage.setItem('trashNotes', JSON.stringify(this.trashNotes));

        if (this.isOnline) {
            try {
                await apiService.restoreFromTrash(id);
            } catch (error) {
                console.error('Error restoring note from trash on server:', error);
            }
        }

        return true;
    }

    async deletePermanently(id) {
        const noteIndex = this.trashNotes.findIndex(note => note.id === id);
        if (noteIndex === -1) return false;

        this.trashNotes.splice(noteIndex, 1);
        localStorage.setItem('trashNotes', JSON.stringify(this.trashNotes));

        if (this.isOnline) {
            try {
                await apiService.deletePermanently(id);
            } catch (error) {
                console.error('Error permanently deleting note on server:', error);
            }
        }

        return true;
    }

    async updateNoteOrder(notesArray) {
        // Extract just the IDs from the full notes for storage optimization
        const noteIds = notesArray.map(note => note.id);
        
        // Update in-memory notes array
        this.notes = notesArray;
        localStorage.setItem('notes', JSON.stringify(this.notes));

        if (this.isOnline) {
            try {
                // Just send the IDs array instead of the full notes
                await apiService.updateNoteOrder(noteIds);
            } catch (error) {
                console.error('Error syncing note order with server:', error);
            }
        }
    }

    async syncWithServer() {
        if (!this.isOnline) return;
        
        try {
            // Sync notes from local storage to server
            await apiService.syncNotes(this.notes);
            
            // Re-fetch the latest data
            await this.loadNotes();
            await this.loadTrash();
        } catch (error) {
            console.error('Error syncing with server:', error);
        }
    }

    searchNotes(query) {
        if (!query) return this.notes;
        
        const lowerQuery = query.toLowerCase();
        return this.notes.filter(note => {
            // For rich text notes, create a temporary div to strip HTML tags for search
            if (note.isRichText) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = note.text;
                const textContent = tempDiv.textContent || tempDiv.innerText || '';
                
                return note.title.toLowerCase().includes(lowerQuery) || 
                       textContent.toLowerCase().includes(lowerQuery);
            } else {
                return note.title.toLowerCase().includes(lowerQuery) || 
                       note.text.toLowerCase().includes(lowerQuery);
            }
        });
    }
}
export default NotesModel;
