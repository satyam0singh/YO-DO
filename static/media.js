/**
 * =========================================================
 * MEDIA MODULE
 * Handles File Uploads, Deletion, and Media DOM
 * =========================================================
 */

// Add Image Trigger
window.triggerAddImage = function(id) {
    const input = document.getElementById('edit-file-input');
    if (input) {
        input.dataset.targetId = id;
        input.click(); // Open system dialog
    }
}

// Global File Input Listener
const fileInput = document.getElementById('edit-file-input');
if(fileInput) {
    fileInput.addEventListener('change', (e) => {
        const id = fileInput.dataset.targetId;
        if(id && e.target.files.length > 0) {
            const formData = new FormData();
            
            // Append all files
            Array.from(e.target.files).forEach(file => {
                 formData.append('file', file);
            });
            
            // Show loading state?
            
            fetch(`/note/${id}/add_media`, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(data => {
                if(data.status === 'success') {
                    // Handle List of Media
                    if(data.media_list) {
                        data.media_list.forEach(item => handleMediaAdded(id, item));
                    } 
                    // Fallback for single (legacy support if needed)
                    else if(data.media) {
                        handleMediaAdded(id, data.media);
                    }
                } else {
                    alert('Upload failed');
                }
            });
        }
    });
}

// Helper: Handle Media Added
function handleMediaAdded(noteId, mediaItem) {
    // 1. Update Grid Card
    const gridCard = document.querySelector(`.item-card[data-id="${noteId}"]`);
    if(gridCard) updateCardDOM(gridCard, mediaItem);

    // 2. Update Modal Card (if open and matches)
    const modalContainer = document.getElementById('modal-card-container');
    if(modalContainer) {
        const modalCard = modalContainer.querySelector('.card');
        // Check if modal is showing THIS note (we don't have ID on clone usually, but let's check content or trust context)
        // Actually, openModal removes ID. But we can check if gridCard was the source.
        // Better: The file input dataset.targetId is the source of truth.
        if (modalCard) {
            // We need to know if the modal card corresponds to noteId. 
            // Since we triggered upload FROM the modal (usually), it's safe to assume.
            updateCardDOM(modalCard, mediaItem, true);
        }
    }
    
    if(window.resizeAllMasonryItems) window.resizeAllMasonryItems();
}

// Helper: Update Card DOM (Grid or Modal)
function updateCardDOM(card, mediaItem, isModal = false) {
    // Check for media container
    let mediaContainer = card.querySelector('.card-media');
    
    // If no media container, create it and handle Layout Switch
    if (!mediaContainer) {
        mediaContainer = document.createElement('div');
        mediaContainer.className = 'card-media';
        
        // Insert at top
        card.prepend(mediaContainer);
        card.classList.add('has-media'); // Add has-media class
        
        // Handle Split Layout for Modal Only (if text exists)
        if (isModal) {
            const hasText = card.querySelector('.item-title')?.innerText.trim() || card.querySelector('.item-body')?.innerText.trim();
            if (hasText) {
                card.classList.add('split-layout');
                
                // Wrap content in Right Column if not already
                let rightCol = card.querySelector('.card-right-column');
                if (!rightCol) {
                    rightCol = document.createElement('div');
                    rightCol.className = 'card-right-column';
                    
                    // Move existing content elements
                    const content = card.querySelector('.card-content');
                    const meta = card.querySelector('.card-meta');
                    const actions = card.querySelector('.card-actions');
                    
                    if(content) rightCol.appendChild(content);
                    if(meta) rightCol.appendChild(meta);
                    if(actions) rightCol.appendChild(actions);
                    
                    card.appendChild(rightCol);
                }
            } else {
                card.classList.add('image-only-layout');
            }
        }
    }

    // Append New Image
    const div = document.createElement('div');
    div.className = 'media-item';
    div.innerHTML = `
        <img src="${mediaItem.url}" loading="lazy">
        <button class="btn-remove-media-edit" data-note-id="${fileInput.dataset.targetId}" data-media-id="${mediaItem.id}">
            <i data-lucide="x"></i>
        </button>
    `;
    mediaContainer.appendChild(div);
    
    // Re-init icons
    if(window.lucide) lucide.createIcons();
}


// Media Removal (Delegated)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-media-edit');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        
        const mediaItemEl = btn.closest('.media-item');
        const noteId = btn.dataset.noteId;
        const mediaId = btn.dataset.mediaId;

        // 1. Network Request
        fetch(`/media/${noteId}/${mediaId}/delete`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
             // 2. Remove from DOM (Grid & Modal)
             removeMediaFromDOM(noteId, mediaId);
        });
    }
});

function removeMediaFromDOM(noteId, mediaId) {
    // Helper to process a card
    const processCard = (card, isModal = false) => {
        if(!card) return;
        const btn = card.querySelector(`.btn-remove-media-edit[data-media-id="${mediaId}"]`);
        if(!btn) return;
        
        const item = btn.closest('.media-item');
        const container = item.parentElement; // .card-media
        
        item.remove();
        
        // Check if empty
        if(container.children.length === 0) {
            container.remove();
            card.classList.remove('has-media');
            
            if(isModal) {
                card.classList.remove('split-layout');
                card.classList.remove('image-only-layout');
                
                // Unwrap Right Column if Split
                const rightCol = card.querySelector('.card-right-column');
                if(rightCol) {
                    while(rightCol.firstChild) {
                        card.appendChild(rightCol.firstChild); // Move back to main card
                    }
                    rightCol.remove();
                }
            }
        }
    };

    // 1. Grid Card
    const gridCard = document.querySelector(`.item-card[data-id="${noteId}"]`);
    processCard(gridCard, false);

    // 2. Modal Card
    const modalContainer = document.getElementById('modal-card-container');
    if(modalContainer) {
        const modalCard = modalContainer.querySelector('.card');
        // Assume active modal is the one (or check context if we could)
        // Removing by media-id is safe enough
        processCard(modalCard, true);
    }
    
    if(window.resizeAllMasonryItems) window.resizeAllMasonryItems();
}
