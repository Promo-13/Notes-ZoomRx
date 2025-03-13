import { SERVER_URL } from "../../mocks/handlers.js";
class NotesModel {
    constructor() {
        this.SERVER_URL = SERVER_URL;
        this.notes = [];
        this.trashNotes = [];
        this.isOnline = navigator.onLine;
        this.setupOnlineListener();
    }

    setupOnlineListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncWithServer();
        });
        window.addEventListener('offline', () => this.isOnline = false);
    }

    async loadNotes() {
        try {
            if (this.isOnline) {
                const response = await fetch(`${this.SERVER_URL}/notes`);
                const data = await response.json();
                this.notes = data.notes;
                localStorage.setItem('notes', JSON.stringify(this.notes));
            } else {
                const storedNotes = localStorage.getItem('notes');
                if (storedNotes) this.notes = JSON.parse(storedNotes);
            }
            return this.notes;
        } catch (error) {
            console.error('Error loading notes:', error);
            const storedNotes = localStorage.getItem('notes');
            if (storedNotes) this.notes = JSON.parse(storedNotes);
            return this.notes;
        }
    }

    async loadTrash() {
        try {
            if (this.isOnline) {
                const response = await fetch(`${this.SERVER_URL}/trash`);
                const data = await response.json();
                this.trashNotes = data.notes;
                localStorage.setItem('trashNotes', JSON.stringify(this.trashNotes));
            } else {
                const storedTrash = localStorage.getItem('trashNotes');
                if (storedTrash) this.trashNotes = JSON.parse(storedTrash);
            }
            return this.trashNotes;
        } catch (error) {
            console.error('Error loading trash:', error);
            const storedTrash = localStorage.getItem('trashNotes');
            if (storedTrash) this.trashNotes = JSON.parse(storedTrash);
            return this.trashNotes;
        }
    }

    async addNote(title, text) {
        const newNote = {
            id: Date.now(),
            title,
            text,
            pinned: false
        };

        this.notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(this.notes));

        if (this.isOnline) {
            try {
                await fetch(`${this.SERVER_URL}/notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, text })
                });
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
                await fetch(`${this.SERVER_URL}/notes/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
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
                await fetch(`${this.SERVER_URL}/notes/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pinned: note.pinned })
                });
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
                await fetch(`${this.SERVER_URL}/notes/${id}/trash`, {
                    method: 'POST'
                });
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
                await fetch(`${this.SERVER_URL}/trash/${id}/restore`, {
                    method: 'POST'
                });
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
                await fetch(`${this.SERVER_URL}/trash/${id}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                console.error('Error permanently deleting note on server:', error);
            }
        }

        return true;
    }

    async updateNoteOrder(notesArray) {
        this.notes = notesArray;
        localStorage.setItem('notes', JSON.stringify(this.notes));

        if (this.isOnline) {
            try {
                await fetch(`${this.SERVER_URL}/notes/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notes: this.notes })
                });
            } catch (error) {
                console.error('Error syncing note order with server:', error);
            }
        }
    }

    async syncWithServer() {
        if (!this.isOnline) return;
        
        try {
            // Sync notes from local storage to server
            await fetch(`${this.SERVER_URL}/notes/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: this.notes })
            });
            
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
        return this.notes.filter(note => 
            note.title.toLowerCase().includes(lowerQuery) || 
            note.text.toLowerCase().includes(lowerQuery)
        );
    }
}

export default NotesModel;





