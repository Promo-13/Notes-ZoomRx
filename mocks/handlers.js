import { http, HttpResponse } from "msw";

export const SERVER_URL = "http://localhost:5070";

let notesId = 1;
let notes = [];
let trashNotes = []; // Add trash array to store deleted notes

export const handlers = [
    http.get(`${SERVER_URL}/notes`, ({ request, params, cookies }) => {
        return HttpResponse.json({ notes });
    }),

    http.get(`${SERVER_URL}/trash`, ({ request, params, cookies }) => {
        return HttpResponse.json({ notes: trashNotes });
    }),

    http.post(`${SERVER_URL}/notes`, async ({ request, params, cookies }) => {
        const requestBody = await request.json();
        if (!requestBody.title && !requestBody.text) {
            return HttpResponse.json({ error: "Title and text are required" }, { status: 400 });
        }
        const newNote = {
            id: notesId++,
            title: requestBody.title,
            text: requestBody.text,
            pinned: false,  // Ensure pinned property exists
            isRichText: requestBody.isRichText || false // Add rich text flag
        };
        notes.push(newNote);
        return HttpResponse.json({ success: true, note: newNote });
    }),

    http.patch(`${SERVER_URL}/notes/:id`, async ({ request, params, cookies }) => {
        const noteId = Number(params.id);
        const note = notes.find((n) => n.id === noteId);
        if (!note) {
            return HttpResponse.json({ error: "Note not found" }, { status: 404 });
        }
        const requestBody = await request.json();

        if (requestBody.title !== undefined) {
            note.title = requestBody.title;
        }
        if (requestBody.text !== undefined) {
            note.text = requestBody.text;
        }
        if (requestBody.pinned !== undefined) {
            note.pinned = requestBody.pinned;
        }
        if (requestBody.isRichText !== undefined) {
            note.isRichText = requestBody.isRichText;
        }

        return HttpResponse.json({ success: true, note });
    }),

    http.delete(`${SERVER_URL}/notes/:id`, async ({ request, params, cookies }) => {
        const noteId = Number(params.id);
        const noteIndex = notes.findIndex((n) => n.id === noteId);
        if (noteIndex === -1) {
            return HttpResponse.json({ error: "Note not found" }, { status: 404 });
        }
        const [removedNote] = notes.splice(noteIndex, 1);
        trashNotes.push(removedNote); // Move to trash instead of deleting
        return HttpResponse.json({ success: true });
    }),

    // Move to trash - Changed from POST to PATCH as requested
    http.patch(`${SERVER_URL}/notes/:id/trash`, async ({ request, params, cookies }) => {
        const noteId = Number(params.id);
        const noteIndex = notes.findIndex((n) => n.id === noteId);
        if (noteIndex === -1) {
            return HttpResponse.json({ error: "Note not found" }, { status: 404 });
        }
        
        // Remove from notes and add to trash
        const [removedNote] = notes.splice(noteIndex, 1);
        // Ensure it's not pinned when in trash
        removedNote.pinned = false;
        trashNotes.push(removedNote);
        
        return HttpResponse.json({ success: true });
    }),

    // Restore from trash
    http.post(`${SERVER_URL}/trash/:id/restore`, async ({ request, params, cookies }) => {
        const noteId = Number(params.id);
        const noteIndex = trashNotes.findIndex((n) => n.id === noteId);
        if (noteIndex === -1) {
            return HttpResponse.json({ error: "Note not found in trash" }, { status: 404 });
        }
        
        // Remove from trash and add back to notes
        const [restoredNote] = trashNotes.splice(noteIndex, 1);
        notes.push(restoredNote);
        
        return HttpResponse.json({ success: true });
    }),

    // Permanently delete from trash
    http.delete(`${SERVER_URL}/trash/:id`, async ({ request, params, cookies }) => {
        const noteId = Number(params.id);
        const noteIndex = trashNotes.findIndex((n) => n.id === noteId);
        if (noteIndex === -1) {
            return HttpResponse.json({ error: "Note not found in trash" }, { status: 404 });
        }
        
        // Permanently remove from trash
        trashNotes.splice(noteIndex, 1);
        
        return HttpResponse.json({ success: true });
    }),

    // Sync notes (for offline mode) - Updated to handle IDs only
    http.post(`${SERVER_URL}/notes/sync`, async ({ request, params, cookies }) => {
        const responseBody = await request.json();
        
        // Handle reordering by IDs only
        if (responseBody.noteIds && Array.isArray(responseBody.noteIds)) {
            // Reorder notes based on the IDs provided
            const orderedNotes = [];
            const noteIds = responseBody.noteIds;
            
            // First, add all pinned notes (maintain their order)
            const pinnedNotes = notes.filter(note => note.pinned);
            orderedNotes.push(...pinnedNotes);
            
            // Then add unpinned notes in the order specified by noteIds
            for (const id of noteIds) {
                const note = notes.find(n => n.id === id && !n.pinned);
                if (note) {
                    orderedNotes.push(note);
                }
            }
            
            // Add any remaining notes not included in noteIds
            const remainingNotes = notes.filter(note => 
                !note.pinned && !noteIds.includes(note.id)
            );
            orderedNotes.push(...remainingNotes);
            
            notes = orderedNotes;
            return HttpResponse.json({ success: true });
        }
        
        // Handle full note sync
        if (responseBody.notes && Array.isArray(responseBody.notes)) {
            notes = responseBody.notes;
            return HttpResponse.json({ success: true });
        }
        
        return HttpResponse.json(
            { error: "Invalid sync data. Either notes or noteIds array must be provided" }, 
            { status: 400 }
        );
    }),
];