import { expect } from 'chai';
import sinon from 'sinon';
import NotesModel from '../../src/models/model.js';
import { SERVER_URL } from '../../mocks/handlers.js';
import { apiService } from '../../src/services/api-service.js';

describe('NotesModel', () => {
    let model;
    let fetchStub;
    let localStorageStub;

    beforeEach(() => {
        // Create stubs for fetch and localStorage
        fetchStub = sinon.stub(global, 'fetch');
        localStorageStub = {
            getItem: sinon.stub(),
            setItem: sinon.stub(),
            removeItem: sinon.stub()
        };
        global.localStorage = localStorageStub;

        // Create a new model instance for each test
        model = new NotesModel();

        // Reset online status for each test
        model.isOnline = true;
    });

    afterEach(() => {
        // Restore all stubs
        sinon.restore();
    });

    describe('loadNotes', () => {
        it('should load notes from server when online', async () => {
            const mockNotes = [
                { id: 1, title: 'Test Note', text: 'Content', pinned: false }
            ];
            
            // Set up the model's initial state
            model.notes = [];
            model.isOnline = true;

            // Mock the server response
            fetchStub.resolves({
                ok: true,
                json: async () => ({ notes: mockNotes })
            });

            // Mock the apiService.getNotes method
            sinon.stub(apiService, 'getNotes').resolves(mockNotes);

            // Call loadNotes and verify the response
            const result = await model.loadNotes();
            expect(result).to.deep.equal(mockNotes);
            expect(model.notes).to.deep.equal(mockNotes);

            // Verify localStorage was updated
            expect(localStorageStub.setItem.calledWith('notes', JSON.stringify(mockNotes))).to.be.true;
        });

        it('should load notes from localStorage when offline', async () => {
            model.isOnline = false;
            const mockNotes = [
                { id: 1, title: 'Note 1', text: 'Content 1', pinned: false }
            ];
            localStorageStub.getItem.withArgs('notes').returns(JSON.stringify(mockNotes));

            const notes = await model.loadNotes();
            expect(notes).to.deep.equal(mockNotes);
        });

        it('should handle server errors gracefully', async () => {
            fetchStub.resolves({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            const result = await model.loadNotes();
            expect(result).to.deep.equal([]);
            expect(model.notes).to.deep.equal([]);
        });
    });

    describe('addNote', () => {
        it('should add a new note and return it', async () => {
            const mockNote = {
                id: Date.now(),
                title: 'New Note',
                text: 'Content',
                pinned: false,
                isRichText: false
            };
            
            fetchStub.resolves({
                ok: true,
                json: async () => mockNote
            });

            const result = await model.addNote('New Note', 'Content');
            expect(result).to.have.property('id');
            expect(result).to.include({
                title: 'New Note',
                text: 'Content',
                pinned: false,
                isRichText: false
            });
            expect(model.notes).to.deep.equal([result]);
        });

        it('should add note locally when offline', async () => {
            model.isOnline = false;
            const title = 'Offline Note';
            const text = 'Offline Content';

            const newNote = await model.addNote(title, text);
            expect(newNote).to.have.property('id');
            expect(newNote.title).to.equal(title);
            expect(newNote.text).to.equal(text);
        });
    });

    describe('updateNote', () => {
        beforeEach(() => {
            model.notes = [{ id: 1, title: 'Original Note', text: 'Original Content', pinned: false }];
        });

        it('should update note and sync with server when online', async () => {
            const updates = { title: 'Updated Note', text: 'Updated Content' };
            const mockNote = { id: 1, ...updates, pinned: false };
            
            // Mock the apiService response
            sinon.stub(apiService, 'updateNote').resolves(mockNote);

            const result = await model.updateNote(1, updates);
            expect(result).to.deep.equal(mockNote);
            expect(model.notes[0]).to.deep.equal(mockNote);
            expect(localStorageStub.setItem.calledWith('notes', JSON.stringify([mockNote]))).to.be.true;
        });

        it('should update note locally when offline', async () => {
            model.isOnline = false;
            const updates = { title: 'Offline Update', text: 'Offline Content' };
            
            const result = await model.updateNote(1, updates);
            expect(result).to.deep.include(updates);
            expect(model.notes[0]).to.deep.include(updates);
            expect(localStorageStub.setItem.called).to.be.true;
        });

        it('should return null when updating non-existent note', async () => {
            const result = await model.updateNote(999, { title: 'Not Found' });
            expect(result).to.be.null;
        });
    });

    describe('togglePin', () => {
        beforeEach(() => {
            model.notes = [{ id: 1, title: 'Test Note', text: 'Content', pinned: false }];
        });

        it('should toggle pin status and sync with server when online', async () => {
            const mockNote = { id: 1, title: 'Test Note', text: 'Content', pinned: true };
            
            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({ success: true, note: mockNote })
            });

            const updatedNote = await model.togglePin(1);
            expect(updatedNote).to.deep.equal(mockNote);
        });
    });

    describe('moveToTrash', () => {
        beforeEach(() => {
            model.notes = [
                { id: 1, title: 'Note 1', text: 'Content 1', pinned: false },
                { id: 2, title: 'Note 2', text: 'Content 2', pinned: true }
            ];
            model.trashNotes = [];
        });

        it('should move note to trash and sync with server when online', async () => {
            // Mock the apiService response
            sinon.stub(apiService, 'moveToTrash').resolves(true);

            const result = await model.moveToTrash(1);
            expect(result).to.be.true;
            expect(model.notes.length).to.equal(1);
            expect(model.notes[0].id).to.equal(2);
            expect(model.trashNotes.length).to.equal(1);
            expect(model.trashNotes[0].id).to.equal(1);
            expect(localStorageStub.setItem.calledWith('notes', JSON.stringify(model.notes))).to.be.true;
            expect(localStorageStub.setItem.calledWith('trashNotes', JSON.stringify(model.trashNotes))).to.be.true;
        });

        it('should move note to trash locally when offline', async () => {
            model.isOnline = false;
            
            const result = await model.moveToTrash(1);
            expect(result).to.be.true;
            expect(model.notes.length).to.equal(1);
            expect(model.notes[0].id).to.equal(2);
            expect(model.trashNotes.length).to.equal(1);
            expect(model.trashNotes[0].id).to.equal(1);
            expect(localStorageStub.setItem.called).to.be.true;
        });

        it('should return false when moving non-existent note to trash', async () => {
            const result = await model.moveToTrash(999);
            expect(result).to.be.false;
            expect(model.notes.length).to.equal(2);
            expect(model.trashNotes.length).to.equal(0);
        });
    });

    describe('restoreFromTrash', () => {
        beforeEach(() => {
            model.trashNotes = [{ id: 1, title: 'Test Note', text: 'Content' }];
        });

        it('should restore note from trash and sync with server when online', async () => {
            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await model.restoreFromTrash(1);
            expect(result).to.be.true;
            expect(model.trashNotes.length).to.equal(0);
        });
    });

    describe('deletePermanently', () => {
        beforeEach(() => {
            model.trashNotes = [{ id: 1, title: 'Test Note', text: 'Content' }];
        });

        it('should permanently delete note and sync with server when online', async () => {
            fetchStub.resolves({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            const result = await model.deletePermanently(1);
            expect(result).to.be.true;
            expect(model.trashNotes.length).to.equal(0);
        });
    });

    describe('updateNoteOrder', () => {
        it('should update note order and sync with server when online', async () => {
            const mockNotes = [
                { id: 2, title: 'Note 2', text: 'Content 2' },
                { id: 1, title: 'Note 1', text: 'Content 1' }
            ];
            model.notes = [...mockNotes];
            model.isOnline = true;
            
            // Mock the server response
            fetchStub.resolves({
                ok: true,
                json: async () => ({ success: true })
            });

            // Mock the apiService.updateNoteOrder method
            sinon.stub(apiService, 'updateNoteOrder').resolves(true);

            // Call updateNoteOrder and verify the response
            await model.updateNoteOrder(mockNotes);

            // Verify that the notes array was updated
            expect(model.notes).to.deep.equal(mockNotes);

            // Verify localStorage was updated
            expect(localStorageStub.setItem.calledWith('notes', JSON.stringify(mockNotes))).to.be.true;
        });
    });

    describe('searchNotes', () => {
        beforeEach(() => {
            model.notes = [
                { id: 1, title: 'Meeting Notes', text: 'Discuss project timeline', pinned: false },
                { id: 2, title: 'Shopping List', text: 'Buy groceries', pinned: false },
                { id: 3, title: 'Ideas', text: 'Project meeting discussion', pinned: true }
            ];
        });

        it('should return all notes when search query is empty', () => {
            const result = model.searchNotes('');
            expect(result).to.deep.equal(model.notes);
        });

        it('should find notes matching title', () => {
            const result = model.searchNotes('meeting');
            expect(result).to.have.lengthOf(2);
            expect(result[0].title).to.equal('Meeting Notes');
            expect(result[1].text).to.include('meeting');
        });

        it('should find notes matching text content', () => {
            const result = model.searchNotes('project');
            expect(result).to.have.lengthOf(2);
            expect(result.some(note => note.text.includes('project'))).to.be.true;
        });

        it('should be case insensitive', () => {
            const result = model.searchNotes('MEETING');
            expect(result).to.have.lengthOf(2);
        });

        it('should handle rich text content', () => {
            model.notes.push({
                id: 4,
                title: 'Rich Text Note',
                text: '<p>Important <strong>meeting</strong> notes</p>',
                isRichText: true
            });

            const result = model.searchNotes('important');
            expect(result).to.have.lengthOf(1);
            expect(result[0].title).to.equal('Rich Text Note');
        });
    });
}); 