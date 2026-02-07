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
            formData.append('file', e.target.files[0]);
            
            // Optimistic UI? No, uploads are heavy. Show loading?
            // User requested "Multi Media Stack".
            
            fetch(`/note/${id}/add_media`, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(data => {
                if(data.status === 'success') {
                    // Refresh is safest for complex media DOM
                    window.location.reload(); 
                }
            });
        }
    });
}

// Media Removal (Delegated)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-media-edit');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        
        // 1. INSTANT UI REMOVAL (Spec Requirement)
        const item = btn.closest('.media-item');
        if(item) {
            item.style.opacity = '0';
            setTimeout(() => item.remove(), 200); // Smooth fade out
        }

        // 2. Network Request
        const noteId = btn.dataset.noteId;
        const mediaId = btn.dataset.mediaId;
        
        fetch(`/media/${noteId}/${mediaId}/delete`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
             // Sync Grid if we are in Modal
             const modalC = document.getElementById('modal-card-container');
             if(modalC && modalC.contains(btn)) {
                 // We removed from modal, now remove from grid
                 const gridCard = document.querySelector(`.item-card[data-id="${noteId}"]`);
                 if(gridCard) {
                     const gridMediaBtn = gridCard.querySelector(`.btn-remove-media-edit[data-media-id="${mediaId}"]`);
                     if(gridMediaBtn) gridMediaBtn.closest('.media-item').remove();
                     if(window.resizeAllMasonryItems) window.resizeAllMasonryItems();
                 }
             } else {
                 // We removed from grid, remove from modal (if open/same)
                 // Unlikely case as grid interaction usually opens modal first, 
                 // but good for completeness.
             }
        });
    }
});
