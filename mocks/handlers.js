// handlers.js - API mock handlers for testing
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

    // Move to trash
    http.post(`${SERVER_URL}/notes/:id/trash`, async ({ request, params, cookies }) => {
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

    // Sync notes (for offline mode)
    http.post(`${SERVER_URL}/notes/sync`, async ({ request, params, cookies }) => {
        const responseBody = await request.json();
        if (!responseBody.notes || !Array.isArray(responseBody.notes)) {
            return HttpResponse.json({ error: "No notes provided for sync" }, { status: 400 });
        }
        notes = responseBody.notes;
        return HttpResponse.json({ success: true });
    }),
];
