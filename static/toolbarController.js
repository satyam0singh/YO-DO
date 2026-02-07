/**
 * =========================================================
 * TOOLBAR CONTROLLER
 * Handles Floating Toolbar, Rich Text, and Tool Actions
 * =========================================================
 */
class ToolbarController {
    constructor() {
        this.toolbar = document.getElementById('editor-toolbar');
        this.tagPopover = document.getElementById('tag-popover');
        this.activeNoteId = null;
        
        if (!this.toolbar) return;
        
        this.bindEvents();
        this.setupPositioning();
    }

    bindEvents() {
        // Formatting Buttons (Bold, Italic, etc.)
        this.toolbar.querySelectorAll('button[data-cmd]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const cmd = btn.dataset.cmd;
                document.execCommand(cmd, false, null);
                this.updateButtonStates();
            });
        });

        // Checklist Button
        const btnChecklist = document.getElementById('btn-checklist');
        if(btnChecklist) {
            btnChecklist.addEventListener('click', (e) => {
                e.preventDefault();
                this.insertChecklist();
            });
        }

        // Drawing Button
        const btnDraw = document.getElementById('btn-open-drawing');
        if(btnDraw) {
            btnDraw.addEventListener('click', (e) => {
                e.preventDefault();
                if(window.drawingCanvas) window.drawingCanvas.open(this.activeNoteId);
            });
        }

        // Image Button
        const btnImg = document.getElementById('btn-toolbar-image');
        if(btnImg) {
            btnImg.addEventListener('click', (e) => {
                e.preventDefault();
                if(window.triggerAddImage && this.activeNoteId) {
                    window.triggerAddImage(this.activeNoteId);
                }
            });
        }

        // Tag Button
        const btnTag = document.getElementById('btn-show-tags');
        if(btnTag) {
            btnTag.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTagPopover();
            });
        }

        // Initialize Tag Input
        const tagInput = document.getElementById('tag-input');
        if(tagInput) {
            tagInput.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') {
                    e.preventDefault();
                    this.addTag(tagInput.value);
                    tagInput.value = '';
                }
            });
        }

        // Selection Change -> Update Active States
        document.addEventListener('selectionchange', () => this.updateButtonStates());
    }

    setActiveNote(id) {
        this.activeNoteId = id;
        this.toolbar.classList.add('visible');
        if(window.drawingCanvas) window.drawingCanvas.activeNoteId = id; // Sync
    }

    hide() {
        this.toolbar.classList.remove('visible');
        if(this.tagPopover) this.tagPopover.classList.remove('active');
        this.activeNoteId = null;
    }

    setupPositioning() {
        // Just rely on CSS 'sticky' or fixed positioning relative to modal container
        // But user requested "Right Floating".
        // Current CSS puts it flow-based. We will upgrade CSS to make it absolute.
    }

    updateButtonStates() {
        if (!this.activeNoteId) return;
        
        const map = {
            'bold': 'bold',
            'italic': 'italic',
            'underline': 'underline',
            'insertUnorderedList': 'insertUnorderedList'
        };

        for (const [cmd, state] of Object.entries(map)) {
            const btn = this.toolbar.querySelector(`button[data-cmd="${cmd}"]`);
            if (btn) {
                if (document.queryCommandState(cmd)) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        }
    }

    insertChecklist() {
        const html = `<ul class="checklist"><li class="checklist-item">New Task</li></ul>`;
        document.execCommand('insertHTML', false, html);
    }

    toggleTagPopover() {
        if(!this.tagPopover) return;
        this.tagPopover.classList.toggle('active');
        if(this.tagPopover.classList.contains('active')) {
            const input = this.tagPopover.querySelector('input');
            if(input) setTimeout(() => input.focus(), 100);
            this.loadTags();
        }
    }

    loadTags() {
        fetch('/tags')
        .then(r => r.json())
        .then(tags => {
            const container = document.getElementById('tag-suggestions');
            if(container) {
                container.innerHTML = tags.map(t => 
                    `<span class="tag-chip" onclick="toolbar.addTag('${t.name}')">${t.name}</span>`
                ).join('');
            }
        });
    }

    addTag(name) {
        if(!name || !this.activeNoteId) return;
        
        fetch(`/notes/${this.activeNoteId}/tags`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ tag_name: name })
        }).then(() => {
            // Reload tags to show in UI (or optimistically append)
            // For now, simple reload of grid/modal is safest
             if(window.syncContent) window.syncContent(this.activeNoteId, 'tags', 'update'); // Mock sync
             // Actually, just inserting active UI is better for "Native Feel"
             // But existing system renders tags via Jinja. 
             // Let's just reload for now to Ensure consistency.
             window.location.reload(); 
        });
    }
}

// Instantiate
const toolbar = new ToolbarController();
window.toolbar = toolbar;

// Hook into Popup Open
const originalOpenModal = window.openModal;
window.openModal = function(card) {
    if(originalOpenModal) originalOpenModal(card);
    if(window.toolbar) window.toolbar.setActiveNote(card.dataset.id);
    
    // Also init canvas active ID
    if(window.drawingCanvas) window.drawingCanvas.activeNoteId = card.dataset.id;
}

const originalCloseModal = window.closeModal;
window.closeModal = function() {
    if(originalCloseModal) originalCloseModal();
    if(window.toolbar) window.toolbar.hide();
}
