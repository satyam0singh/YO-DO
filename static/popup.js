/**
 * =========================================================
 * POPUP MODULE
 * Handles Modal, Layout, and Masonry Grid
 * =========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Modal Listeners
    const closeBtn = document.querySelector('.btn-close-modal');
    const modalOverlay = document.getElementById('note-modal-overlay');
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Initialize Masonry
    window.addEventListener('load', resizeAllMasonryItems);
    window.addEventListener('resize', resizeAllMasonryItems);

    // Initialize Card Click Listeners
    document.querySelectorAll('.item-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.card-actions')) return;
            openModal(card);
        });
    });
});

const modalOverlay = document.getElementById('note-modal-overlay');
const container = document.getElementById('modal-card-container');

function openModal(card) {
    if (!modalOverlay || !container) return;
    
    const clone = card.cloneNode(true);
    clone.style.gridRowEnd = 'auto';
    clone.classList.remove('item-card');
    clone.classList.add('card');
    
    // Safety: Remove IDs from cloned elements to avoid duplicates
    clone.removeAttribute('id'); 
    
    // --- 3. EDITOR INTEGRATION HOOKS ---
    const isDeleted = card.classList.contains('deleted-card') || card.dataset.deleted === 'true';

    const title = clone.querySelector('.item-title');
    const body = clone.querySelector('.item-body');

    if (!isDeleted) {
        if(title) {
            title.contentEditable = true;
            title.addEventListener('input', () => window.syncContent && window.syncContent(card.dataset.id, 'title', title.innerText));
        }
        if(body) {
            body.contentEditable = true;
            body.addEventListener('input', () => window.syncContent && window.syncContent(card.dataset.id, 'content', body.innerHTML));
        }
    } else {
        // Strict Read-Only
        if(title) title.removeAttribute('contenteditable');
        if(body) body.removeAttribute('contenteditable');
        // Hide Actions? logic handling elsewhere
    }

    container.innerHTML = '';
    
    // --- 2. LAYOUT LOGIC ---
    const hasMedia = clone.querySelector('.card-media');
    const titleText = clone.querySelector('.item-title')?.innerText.trim();
    const bodyText = clone.querySelector('.item-body')?.innerText.trim();
    const hasText = titleText || bodyText;

    if (hasMedia) {
        clone.classList.add('has-media'); 

        if (hasText) {
            // A) SPLIT VIEW (50/50 Desktop)
            clone.classList.add('split-layout');
            
            const rightCol = document.createElement('div');
            rightCol.className = 'card-right-column';
            
            const content = clone.querySelector('.card-content');
            const meta = clone.querySelector('.card-meta');
            const actions = clone.querySelector('.card-actions');
            
            if(content) rightCol.appendChild(content);
            if(meta) rightCol.appendChild(meta);
            // Hide actions if deleted?
            if(actions && !isDeleted) rightCol.appendChild(actions);
            
            clone.appendChild(rightCol);
        } else {
            // B) IMAGE ONLY
            clone.classList.add('image-only-layout');
        }
    } else {
        // C) TEXT ONLY (Standard)
         if(isDeleted) {
             const actions = clone.querySelector('.card-actions');
             if(actions) actions.style.display = 'none';
         }
    }

    container.appendChild(clone);
    
    modalOverlay.classList.add('active');
    document.body.classList.add('modal-open'); // Scroll Lock
}

function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.classList.remove('modal-open'); 
    resizeAllMasonryItems();
}

// --- Masonry Logic ---
function resizeMasonryItem(item) {
    const grid = document.querySelector('.notes-grid');
    if (!grid) return;
    
    const styles = window.getComputedStyle(grid);
    const rowHeight = parseInt(styles.getPropertyValue('grid-auto-rows')) || 10;
    const rowGap = parseInt(styles.getPropertyValue('gap')) || 20;
    
    item.style.gridRowEnd = 'auto';
    
    const contentHeight = item.querySelector('.card-content')?.getBoundingClientRect().height || 0;
    const mediaHeight = item.querySelector('.card-media')?.getBoundingClientRect().height || 0;
    const actionsHeight = item.querySelector('.card-actions')?.getBoundingClientRect().height || 0;
    const metaHeight = item.querySelector('.card-meta')?.getBoundingClientRect().height || 0;
    
    const totalHeight = contentHeight + mediaHeight + actionsHeight + metaHeight + 40;
    const rowSpan = Math.ceil((totalHeight + rowGap) / (rowHeight + rowGap));
    item.style.gridRowEnd = 'span ' + rowSpan;
}

/* 
   MASONRY DISABLED 
   Moved to CSS-only masonry via column-count for performance (LCP/CLS improvement).
   Keeping function stub to prevent errors in other files calling it.
*/
function resizeAllMasonryItems() {
    // No-op
}

// Export for other modules if needed (via window)
window.resizeAllMasonryItems = resizeAllMasonryItems;
