import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import sinon from 'sinon';
import NotesController from '../../src/controllers/controller.js';

describe('NotesController', () => {
    let controller;
    let mockModel;
    let mockView;
    let dom;

    beforeEach(() => {
        // Create a DOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div id="notes-container"></div>
                    <div id="modal"></div>
                    <div id="search"></div>
                </body>
            </html>
        `);

        global.window = dom.window;
        global.document = dom.window.document;

        // Create mock model with essential methods
        mockModel = {
            notes: [],
            trashNotes: [],
            loadNotes: sinon.stub().resolves([]),
            loadTrash: sinon.stub().resolves([]),
            addNote: sinon.stub().resolves(true),
            updateNote: sinon.stub().resolves(true),
            moveToTrash: sinon.stub().resolves(true),
            restoreFromTrash: sinon.stub().resolves(true),
            deletePermanently: sinon.stub().resolves(true),
            togglePin: sinon.stub().resolves(true),
            searchNotes: sinon.stub().returns([]),
            updateNoteOrder: sinon.stub().resolves(true)
        };

        // Create mock view with essential methods
        mockView = {
            displayNotes: sinon.stub(),
            showModal: sinon.stub(),
            hideModal: sinon.stub(),
            noteTitle: { value: '' },
            noteText: { value: '' },
            noteModal: { dataset: { isEdit: 'false', id: '' } },
            confirmationModal: { dataset: { id: '1' } },
            getEditorContent: sinon.stub().returns({ content: '', isRichText: false })
        };

        controller = new NotesController(mockModel, mockView);
    });

    afterEach(() => {
        sinon.restore();
    });

    // Basic Controller Test
    describe('initialization', () => {
        it('should initialize and load notes', async () => {
            expect(mockModel.loadNotes.calledOnce).to.be.true;
        });
    });

    // Core Note Operations
    describe('Note Operations', () => {
        // Add Note
        it('should add a new note', async () => {
            mockView.noteTitle.value = 'Test Note';
            mockView.getEditorContent.returns({ content: 'Test Content', isRichText: false });
            
            await controller.handleSaveNote();
            
            expect(mockModel.addNote.calledWith('Test Note', 'Test Content', false)).to.be.true;
            expect(mockView.hideModal.called).to.be.true;
        });

        // Edit Note
        it('should edit existing note', async () => {
            mockView.noteTitle.value = 'Updated Note';
            mockView.getEditorContent.returns({ content: 'Updated Content', isRichText: false });
            mockView.noteModal.dataset.isEdit = 'true';
            mockView.noteModal.dataset.id = '1';

            await controller.handleSaveNote();

            expect(mockModel.updateNote.calledWith(1, {
                title: 'Updated Note',
                text: 'Updated Content',
                isRichText: false
            })).to.be.true;
        });

        // Delete (Move to Trash)
        it('should move note to trash', async () => {
            await controller.handleDeleteNote(1);
            expect(mockModel.moveToTrash.calledWith(1)).to.be.true;
        });

        // Restore from Trash
        it('should restore note from trash', async () => {
            await controller.handleRestoreNote(1);
            expect(mockModel.restoreFromTrash.calledWith(1)).to.be.true;
        });

        // Permanent Delete
        it('should permanently delete note', async () => {
            await controller.handleConfirmDelete();
            expect(mockModel.deletePermanently.calledWith(1)).to.be.true;
        });

        // Pin Note
        it('should toggle pin status', async () => {
            await controller.handleTogglePin(1);
            expect(mockModel.togglePin.calledWith(1)).to.be.true;
        });

        // Search Notes
        it('should search notes', () => {
            const searchQuery = 'test';
            const mockResults = [{ id: 1, title: 'Test Note' }];
            mockModel.searchNotes.returns(mockResults);

            controller.handleSearch(searchQuery);

            expect(mockModel.searchNotes.calledWith(searchQuery)).to.be.true;
            expect(mockView.displayNotes.calledWith(mockResults)).to.be.true;
        });

        // Drag and Drop
        it('should update note order after drag and drop', async () => {
            const noteId = 1;
            const newPosition = 2;
            mockModel.notes = [
                { id: 1, title: 'Note 1', pinned: false },
                { id: 2, title: 'Note 2', pinned: false },
                { id: 3, title: 'Note 3', pinned: false }
            ];
            
            await controller.handleNoteReordered(noteId, newPosition);
            
            expect(mockModel.updateNoteOrder.called).to.be.true;
        });
    });
}); 