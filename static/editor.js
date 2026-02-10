/**
 * =========================================================
 * EDITOR MODULE
 * Handles Content Sync, Auto-Save, and Text Operations
 * =========================================================
 */

let timeoutId;

// Exported Sync Function
window.syncContent = function(id, field, value) {
    // 1. Instant UI Update (Grid)
    const card = document.querySelector(`.item-card[data-id="${id}"]`);
    if (card) {
        const target = field === 'title' ? card.querySelector('.item-title') : card.querySelector('.item-body');
        if (target) {
             if (field === 'content') target.innerHTML = value;
             else target.innerText = value;
        }
        // Debounce Layout Update to avoid thrashing
        if(window.resizeMaskTimeout) clearTimeout(window.resizeMaskTimeout)
        window.resizeMaskTimeout = setTimeout(() => {
             if(window.resizeAllMasonryItems) window.resizeAllMasonryItems();
        }, 100);
    }

    // 2. Debounced Network Request (Auto-Save)
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        saveData(id, field, value);
    }, 500); // 500ms delay
}

function saveData(id, field, value) {
    fetch(`/update/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
    }).then(r => {
        // Optional: Show "Saved" indicator
       // console.log("Saved", id);
    });
}

// Action Handlers
window.handleAddText = function(btn, id) {
    const card = document.querySelector(`.item-card[data-id="${id}"]`);
    if(card) {
        // Just focus
        const body = card.querySelector('.item-body');
        if(body) body.focus();
    }
}

window.deleteNoteInline = function(form, id) {
    // Immediate remove logic - No Confirm 
    // User requested "No confirm dialogs" in spec? 
    // Wait, spec said "No confirm dialogs" for EDITING behavior. 
    // For DELETION it said "No confirm popup" for MEDIA REMOVE.
    // For Note Deletion, safest is still a confirm, but let's follow spec "Logic: Remove Confirm dialogs (Instant Actions)"
    
    // Removing confirm()
    fetch(form.action, { method: 'POST' })
    .then(r => {
        if(r.ok) {
            const card = document.querySelector(`.item-card[data-id="${id}"]`);
            if(card) {
                card.remove();
                if(window.resizeAllMasonryItems) window.resizeAllMasonryItems();
            }
        } else {
            window.location.reload(); // Fallback
        }
    });
}

// Search Logic
window.setSearch = function(query, e) {
    if(e) e.stopPropagation();
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.value = query;
        filterGrid(query);
    }
}

function filterGrid(query) {
    const term = query.toLowerCase();
    const items = document.querySelectorAll('.item-card');
    items.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? '' : 'none';
    });
    if(window.resizeAllMasonryItems) window.resizeAllMasonryItems();
}

const searchIn = document.getElementById('search-input');
if(searchIn) {
    searchIn.addEventListener('input', (e) => filterGrid(e.target.value));
}

window.togglePin = function(id, status) {
    const btn = document.querySelector(`.item-card[data-id="${id}"] .btn-pin`);
    if(btn) btn.classList.toggle('active');
    
    fetch(`/pin/${id}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pinned: status })
    }).then(() => {
        window.location.reload(); // Re-sort needs reload
    });
}

// Global Checklist Interaction
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('checklist-item')) {
        // Detect click on the pseudo-element (checkbox area)
        // We assume padding-left or similar creates the space. 
        // In existing CSS: li.checklist-item { display: flex; align-items: flex-start; gap: 10px; }
        // The checkbox is ::before.
        // Clicks on ::before are registered on the element itself.
        // We can check if click X coordinate is within the checkbox area (left 20px approx).
        
        // Better approach for Flex + Gap:
        // The ::before element is part of the flex layout but not a real DOM node.
        // However, since it receives clicks, we can try to guess or just allow clicking the whole item?
        // User wants "Seamless", usually clicking the text edits, clicking the box checks.
        
        // Let's look at the bounding rect.
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Assuming checkbox is roughly 20px wide + gap
        if (x < 25) { 
            e.preventDefault();
            e.target.classList.toggle('checked');
            
            // Trigger Save/Sync
            const card = e.target.closest('.card, .modal-content');
            if (card) {
                const id = card.getAttribute('data-id') || document.querySelector('#modal-card-container .card')?.getAttribute('data-id');
                if (id && window.syncContent) {
                    const contentValues = document.querySelector(`.item-card[data-id="${id}"] .item-body`)?.innerHTML || card.querySelector('.item-body')?.innerHTML;
                    if(contentValues) window.syncContent(id, 'content', contentValues);
                }
            }
        }
    }
});

// Handle Enter in Checklist (Reset state)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const node = selection.anchorNode;
        const li = node.nodeType === 1 ? node.closest('li') : node.parentElement.closest('li');
        
        if (li && li.classList.contains('checklist-item')) {
            // Wait for new line creation then clean it
            setTimeout(() => {
                const newSelection = window.getSelection();
                const newNode = newSelection.anchorNode;
                const newLi = newNode.nodeType === 1 ? newNode.closest('li') : newNode.parentElement.closest('li');
                
                if (newLi && newLi !== li && newLi.classList.contains('checked')) {
                    newLi.classList.remove('checked');
                    // Sync
                    const card = newLi.closest('.card');
                    if(card) {
                         const id = card.getAttribute('data-id');
                         if(id) window.syncContent(id, 'content', card.querySelector('.item-body').innerHTML);
                    }
                }
                
                // Ensure new li has the class
                if (newLi && !newLi.classList.contains('checklist-item')) {
                     newLi.classList.add('checklist-item');
                }
            }, 10);
        }
    }
});
