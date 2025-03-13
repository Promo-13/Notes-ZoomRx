import { JSDOM } from 'jsdom';
import { expect } from 'chai';
import sinon from 'sinon';

describe('NotesView', () => {
    let view;
    let dom;
    let NotesView;

    before(async () => {
        // Import NotesView class
        const viewModule = await import('../../src/views/view.js');
        NotesView = viewModule.default;
    });

    beforeEach(() => {
        // Set up a fresh DOM for each test
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <div class="content">
                        <div id="notesContainer"></div>
                        <div id="pinnedNotesContainer"></div>
                        <h2 id="pinnedNotesTitle">Pinned Notes</h2>
                        
                        <!-- Modal for adding/editing notes -->
                        <div id="noteModal" class="modal">
                            <h2>Add Note</h2>
                            <input type="text" id="noteTitle" placeholder="Title">
                            <textarea id="noteText" placeholder="Take a note..."></textarea>
                            <div id="editorContainer"></div>
                        </div>

                        <!-- Fullscreen note view -->
                        <div id="fullscreenNote" class="fullscreen-note">
                            <h2 id="fullscreenTitle"></h2>
                            <p id="fullscreenDescription"></p>
                        </div>

                        <!-- Confirmation modal -->
                        <div id="confirmationModal" class="modal">
                            <h2>Delete Permanently?</h2>
                        </div>

                        <!-- Trash container -->
                        <div id="trashContainer"></div>
                    </div>
                </body>
            </html>
        `);

        // Set up the global window and document
        global.window = dom.window;
        global.document = dom.window.document;

        // Create a new view instance
        view = new NotesView();
    });

    afterEach(() => {
        // Clean up
        sinon.restore();
    });

    describe('displayNotes', () => {
        it('should display both pinned and unpinned notes correctly', () => {
            const notes = [
                { id: 1, title: 'Pinned Note', text: 'Important content', pinned: true },
                { id: 2, title: 'Regular Note', text: 'Normal content', pinned: false }
            ];

            view.displayNotes(notes);

            const pinnedNote = view.pinnedNotesContainer.querySelector('.note');
            const unpinnedNote = view.notesContainer.querySelector('.note');

            expect(pinnedNote.classList.contains('note--pinned')).to.be.true;
            expect(unpinnedNote.classList.contains('note--pinned')).to.be.false;
            expect(pinnedNote.querySelector('.note__title').textContent).to.equal('Pinned Note');
            expect(unpinnedNote.querySelector('.note__title').textContent).to.equal('Regular Note');
        });

        it('should hide pinned notes section when no pinned notes exist', () => {
            const notes = [
                { id: 1, title: 'Regular Note', text: 'Content', pinned: false }
            ];

            // Display notes
            view.displayNotes(notes);

            // Check visibility
            const pinnedSection = document.getElementById('pinnedNotesTitle');
            const pinnedContainer = document.getElementById('pinnedNotesContainer');
            
            expect(pinnedSection.classList.contains('hidden')).to.be.true;
            expect(pinnedContainer.children.length).to.equal(0);
            expect(view.notesContainer.children.length).to.equal(1);
        });

        it('should escape HTML in note content', () => {
            const notes = [{
                id: 1,
                title: '<script>alert("xss")</script>',
                text: '<img src="x" onerror="alert(1)">',
                pinned: false
            }];

            view.displayNotes(notes);

            const noteElement = view.notesContainer.querySelector('.note');
            expect(noteElement.querySelector('.note__title').innerHTML).to.not.include('<script>');
            expect(noteElement.querySelector('.note__text').innerHTML).to.not.include('<img');
        });
    });

    describe('displayTrash', () => {
        it('should display trash notes correctly', () => {
            const trashNotes = [
                { id: 1, title: 'Deleted Note', text: 'Deleted content' }
            ];

            view.displayTrash(trashNotes);

            const trashNote = view.trashContainer.querySelector('.note--trash');
            expect(trashNote).to.exist;
            expect(trashNote.querySelector('.note__title').textContent).to.equal('Deleted Note');
            expect(trashNote.querySelector('.note__text').textContent).to.equal('Deleted content');
        });

        it('should show empty message when trash is empty', () => {
            view.displayTrash([]);

            const emptyMessage = view.contentArea.querySelector('.empty-trash-message');
            expect(emptyMessage).to.exist;
            expect(emptyMessage.textContent).to.equal('Your trash is empty');
        });
    });

    describe('Modal Operations', () => {
        it('should show modal correctly for new note', () => {
            view.showModal();

            expect(view.noteModal.classList.contains('modal--open')).to.be.true;
            expect(view.noteModal.querySelector('h2').textContent).to.equal('Add Note');
            expect(view.noteTitle.value).to.equal('');
            expect(view.noteText.value).to.equal('');
            expect(view.noteModal.dataset.isEdit).to.equal('false');
        });

        it('should show modal correctly for editing', () => {
            const note = { id: 1, title: 'Test Note', text: 'Test Content' };
            view.showModal(true, note);

            expect(view.noteModal.classList.contains('modal--open')).to.be.true;
            expect(view.noteModal.querySelector('h2').textContent).to.equal('Edit Note');
            expect(view.noteTitle.value).to.equal('Test Note');
            expect(view.noteText.value).to.equal('Test Content');
            expect(view.noteModal.dataset.isEdit).to.equal('true');
            expect(view.noteModal.dataset.id).to.equal('1');
        });

        it('should hide modal and clear its content', () => {
            view.noteModal.classList.add('modal--open');
            view.noteTitle.value = 'Test';
            view.noteText.value = 'Content';
            view.noteModal.dataset.id = '1';

            view.hideModal();

            expect(view.noteModal.classList.contains('modal--open')).to.be.false;
            expect(view.noteTitle.value).to.equal('');
            expect(view.noteText.value).to.equal('');
            expect(view.noteModal.dataset.id).to.equal('');
        });
    });

    describe('Fullscreen Operations', () => {
        it('should show note in fullscreen mode', () => {
            const note = { title: 'Test Note', text: 'Test Content' };
            view.showFullscreenNote(note);

            expect(view.fullscreenNote.classList.contains('fullscreen-note--open')).to.be.true;
            expect(view.fullscreenTitle.textContent).to.equal('Test Note');
            expect(view.fullscreenDescription.textContent).to.equal('Test Content');
        });

        it('should hide fullscreen note', () => {
            view.fullscreenNote.classList.add('fullscreen-note--open');
            view.hideFullscreenNote();

            expect(view.fullscreenNote.classList.contains('fullscreen-note--open')).to.be.false;
        });
    });

    describe('Drag and Drop', () => {
        it('should setup drag and drop listeners', () => {
            const dragStartSpy = sinon.spy(view.notesContainer, 'addEventListener');
            
            view.setupDragAndDrop();
            
            expect(dragStartSpy.calledWith('dragstart')).to.be.true;
            expect(dragStartSpy.calledWith('dragend')).to.be.true;
            expect(dragStartSpy.calledWith('dragover')).to.be.true;
        });

        it('should get correct drag after element', () => {
            // Create some note elements
            const notes = [
                { id: 1, title: 'Note 1', text: 'Content 1', pinned: false },
                { id: 2, title: 'Note 2', text: 'Content 2', pinned: false }
            ];
            view.displayNotes(notes);

            // Mock getBoundingClientRect for the second note
            const noteElement = view.notesContainer.children[1];
            const mockRect = { top: 100, height: 50 };
            sinon.stub(noteElement, 'getBoundingClientRect').returns(mockRect);

            // Test with Y position above the middle of the second note
            const result = view.getDragAfterElement(view.notesContainer, 120);
            expect(result).to.equal(noteElement);
        });
    });

    describe('Note Order Management', () => {
        it('should get correct order of notes', () => {
            const notes = [
                { id: 1, title: 'Note 1', text: 'Content 1', pinned: false },
                { id: 2, title: 'Note 2', text: 'Content 2', pinned: false }
            ];
            view.displayNotes(notes);

            const order = view.getUpdatedNotesOrder();
            expect(order).to.deep.equal([1, 2]);
        });
    });

    describe('HTML Escaping', () => {
        it('should escape special characters correctly', () => {
            const testCases = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '<script>alert("xss")</script>': '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
            };

            Object.entries(testCases).forEach(([input, expected]) => {
                expect(view.escapeHTML(input)).to.equal(expected);
            });
        });
    });
}); 