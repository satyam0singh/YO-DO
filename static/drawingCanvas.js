/**
 * =========================================================
 * DRAWING CANVAS MODULE
 * Handles Full Screen Pen/Eraser Overlay and Upload
 * =========================================================
 */
class DrawingCanvas {
    constructor() {
        this.modal = document.getElementById('drawing-modal');
        this.canvas = document.getElementById('drawing-canvas');
        if(!this.modal || !this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.activeNoteId = null;
        this.mode = 'pen'; // 'pen' or 'eraser'
        
        // Config
        this.penColor = '#1a1a1a';
        this.penWidth = 3;
        this.eraserWidth = 20;
        
        this.bindEvents();
        this.setupTools();
    }

    bindEvents() {
        // Mouse / Touch Events
        const start = (e) => this.startDraw(e);
        const move = (e) => this.draw(e);
        const end = () => this.stopDraw();

        this.canvas.addEventListener('mousedown', start);
        this.canvas.addEventListener('mousemove', move);
        this.canvas.addEventListener('mouseup', end);
        this.canvas.addEventListener('mouseout', end);

        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e.touches[0]); }, {passive: false});
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); move(e.touches[0]); }, {passive: false});
        this.canvas.addEventListener('touchend', end);

        // Save Button Needs to be bound externally or here
        const btnSave = document.getElementById('btn-save-drawing');
        if(btnSave) btnSave.addEventListener('click', () => this.save());
    }

    setupTools() {
        document.getElementById('tool-pen')?.addEventListener('click', () => this.setMode('pen'));
        document.getElementById('tool-eraser')?.addEventListener('click', () => this.setMode('eraser'));
    }

    setMode(mode) {
        this.mode = mode;
        const penBtn = document.getElementById('tool-pen');
        const eraserBtn = document.getElementById('tool-eraser');
        
        if(mode === 'pen') {
            penBtn.classList.add('active');
            eraserBtn.classList.remove('active');
        } else {
            penBtn.classList.remove('active');
            eraserBtn.classList.add('active');
        }
    }

    open(noteId) {
        this.activeNoteId = noteId;
        this.modal.classList.add('active');
        this.resize();
        this.clear(); // Fresh canvas
    }

    close() {
        this.modal.classList.remove('active');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    startDraw(e) {
        this.isDrawing = true;
        this.ctx.beginPath();
        this.ctx.moveTo(e.clientX, e.clientY);
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        this.ctx.lineWidth = this.mode === 'pen' ? this.penWidth : this.eraserWidth;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = this.mode === 'pen' ? this.penColor : '#ffffff';
        this.ctx.globalCompositeOperation = this.mode === 'pen' ? 'source-over' : 'destination-out';

        this.ctx.lineTo(e.clientX, e.clientY);
        this.ctx.stroke();
    }

    stopDraw() {
        this.isDrawing = false;
        this.ctx.closePath();
    }

    save() {
        if(!this.activeNoteId) return;

        this.canvas.toBlob((blob) => {
            const formData = new FormData();
            // Use current timestamp for unique filename
            const filename = `drawing_${Date.now()}.png`;
            formData.append('file', blob, filename);
            
            fetch(`/note/${this.activeNoteId}/add_media`, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(data => {
                if(data.status === 'success') {
                    this.close();
                    window.location.reload(); // Refresh to show image
                }
            });
        });
    }
}

// Global Instance
const drawingCanvas = new DrawingCanvas();
window.drawingCanvas = drawingCanvas;
window.closeDrawingModal = () => drawingCanvas.close();
