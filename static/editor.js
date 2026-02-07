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
