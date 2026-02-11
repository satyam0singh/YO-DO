
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Initialize Premium Fluid Background
    const bgEngine = new FluidSurfaceEngine('bg-canvas');
    bgEngine.start();
});

/**
 * =========================================================
 * 1. UTILITIES: Simple 2D Noise
 * =========================================================
 */
class SimpleNoise {
    constructor() {
        this.perm = new Uint8Array(512);
        this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
                      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
                      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        for (let i=0; i<256; i++) this.perm[i] = i; 
        for (let i=0; i<256; i++) {
            let j = Math.floor(Math.random() * 256);
            let temp = this.perm[i];
            this.perm[i] = this.perm[j];
            this.perm[j] = temp;
        }
        for (let i=0; i<256; i++) this.perm[i + 256] = this.perm[i];
    }

    dot(g, x, y) { return g[0]*x + g[1]*y; }

    noise(xin, yin) {
        let n0, n1, n2; 
        const F2 = 0.5*(Math.sqrt(3.0)-1.0);
        const s = (xin+yin)*F2; 
        const i = Math.floor(xin+s);
        const j = Math.floor(yin+s);
        const G2 = (3.0-Math.sqrt(3.0))/6.0;
        const t = (i+j)*G2;
        const X0 = i-t; 
        const Y0 = j-t;
        const x0 = xin-X0; 
        const y0 = yin-Y0;
        let i1, j1; 
        if(x0>y0) {i1=1; j1=0;} 
        else {i1=0; j1=1;}      
        const x1 = x0 - i1 + G2; 
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2; 
        const y2 = y0 - 1.0 + 2.0 * G2;
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.perm[ii+this.perm[jj]] % 12;
        const gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12;
        const gi2 = this.perm[ii+1+this.perm[jj+1]] % 12;
        let t0 = 0.5 - x0*x0 - y0*y0;
        if(t0<0) n0 = 0.0;
        else { t0 *= t0; n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0); }
        let t1 = 0.5 - x1*x1 - y1*y1;
        if(t1<0) n1 = 0.0;
        else { t1 *= t1; n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1); }
        let t2 = 0.5 - x2*x2 - y2*y2;
        if(t2<0) n2 = 0.0;
        else { t2 *= t2; n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2); }
        return 70.0 * (n0 + n1 + n2);
    }
}

/**
 * =========================================================
 * 2. RIPPLE SYSTEM
 * =========================================================
 */
class Ripple {
    constructor(x, y, strength = 1.0) {
        this.x = x;
        this.y = y;
        this.startTime = Date.now();
        this.strength = strength; 
        this.radius = 0;
        this.speed = 4; 
        this.decay = 0.96; 
        this.active = true;
        this.maxLife = 2000; 
    }

    update() {
        const age = Date.now() - this.startTime;
        this.radius += this.speed;
        this.strength *= this.decay;
        if (age > this.maxLife || this.strength < 0.01) {
            this.active = false;
        }
    }

    getDisplacement(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const distFromWave = dist - this.radius;
        if (Math.abs(distFromWave) < 100) {
            const falloff = 1 - (Math.abs(distFromWave) / 100); 
            const wave = Math.sin(distFromWave * 0.1); 
            return wave * this.strength * falloff * 20; 
        }
        return 0;
    }
}

class RippleSystem {
    constructor() {
        this.ripples = [];
    }
    addRipple(x, y, strength) {
        this.ripples.push(new Ripple(x, y, strength));
        if (this.ripples.length > 10) this.ripples.shift(); 
    }
    update() {
        this.ripples.forEach(r => r.update());
        this.ripples = this.ripples.filter(r => r.active);
    }
    getTotalDisplacement(x, y) {
        let totalDy = 0;
        for (let r of this.ripples) {
            totalDy += r.getDisplacement(x, y);
        }
        return totalDy;
    }
}

/**
 * =========================================================
 * 3. WAVE LAYER
 * =========================================================
 */
class WaveLayer {
    constructor(fillColor, baseY, roughness, speed, noiseRef) {
        this.color = fillColor;
        this.baseY = baseY; 
        this.roughness = roughness; 
        this.speed = speed;
        this.noise = noiseRef;
        this.timeOffset = Math.random() * 1000;
    }

    draw(ctx, width, height, time, rippleSystem) {
        const points = 80; 
        const step = width / points;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, height); 

        for (let i = 0; i <= points; i++) {
            const x = i * step;
            const noiseX = (x * this.roughness) + (time * this.speed * 0.0002);
            const noiseY = this.timeOffset + (time * 0.0001);
            const rawNoise = this.noise.noise(noiseX, noiseY); 
            let y = (this.baseY * height) + (rawNoise * 40); 
            const rippleDy = rippleSystem.getTotalDisplacement(x, y);
            y += rippleDy;

            if (i === 0) ctx.lineTo(0, y);
            else ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height); 
        ctx.closePath();
        ctx.shadowColor = "rgba(0,0,0,0.06)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 15;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
    }
}

/**
 * =========================================================
 * 4. FLUID SURFACE ENGINE (Controller)
 * =========================================================
 */
class FluidSurfaceEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.noise = new SimpleNoise();
        this.rippleSystem = new RippleSystem();
        this.layers = [];
        this.initLayers();
        this.bindEvents();
    }

    initLayers() {
        this.layers = [
            new WaveLayer('#f1f5f9', 0.85, 0.003, 1.0, this.noise), 
            new WaveLayer('#f8fafc', 0.70, 0.004, 1.2, this.noise),
            new WaveLayer('#ffffff', 0.55, 0.005, 1.5, this.noise)
        ];
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => {
            if (Math.random() > 0.92) this.rippleSystem.addRipple(e.clientX, e.clientY, 0.5);
        });
        document.addEventListener('click', (e) => {
            this.rippleSystem.addRipple(e.clientX, e.clientY, 2.0);
        });
        this.resize();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    start() {
        const animate = (time) => {
            if(this.ctx) {
                this.ctx.clearRect(0, 0, this.width, this.height);
                this.rippleSystem.update();
                this.layers.forEach(layer => {
                    layer.draw(this.ctx, this.width, this.height, time, this.rippleSystem);
                });
            }
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }
}

/**
 * =========================================================
 * 5. LABEL CONTROLLER
 * =========================================================
 */
class LabelController {
    constructor() {
        this.activeTags = new Set();
        this.bar = document.getElementById('label-bar');
        this.clearBtn = document.getElementById('btn-clear-filters');
    }

    toggleFilter(tagId, btn) {
        if (this.activeTags.has(tagId)) {
            this.activeTags.delete(tagId);
            btn.classList.remove('active');
        } else {
            this.activeTags.add(tagId);
            btn.classList.add('active');
        }
        
        this.updateClearButton();
        this.applyFilters();
    }

    updateClearButton() {
        if (this.activeTags.size > 0) {
            this.clearBtn.classList.add('visible');
        } else {
            this.clearBtn.classList.remove('visible');
        }
    }

    clearFilters() {
        this.activeTags.clear();
        document.querySelectorAll('.filter-chip.active').forEach(btn => btn.classList.remove('active'));
        this.updateClearButton();
        this.applyFilters();
    }

    applyFilters() {
        // Trigger generic grid filter
        const searchInput = document.getElementById('search-input');
        const query = searchInput ? searchInput.value : '';
        
        // We define a global filter function that combines text + tags
        if(window.filterGrid) window.filterGrid(query);
    }

    promptCreate() {
        const name = prompt("Enter new label name:");
        if (name) {
            this.createLabel(name);
        }
        // In a real premium app, we would use a nice modal or inline input
        // For now, prompt is functional as per "quick add" requirement
    }

    createLabel(name) {
        fetch('/tags', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: name })
        })
        .then(r => r.json())
        .then(tag => {
            if(tag.id) {
                // Add to UI
                this.renderChip(tag);
            }
        });
    }

    renderChip(tag) {
        // Insert before the "+" button
        const btn = document.createElement('button');
        btn.className = 'filter-chip';
        btn.dataset.id = tag.id;
        btn.innerText = tag.name;
        btn.onclick = () => this.toggleFilter(tag.id, btn);
        
        // Find "+" button index
        const addBtn = this.bar.querySelector('.btn-add-label');
        this.bar.insertBefore(btn, addBtn);
        
        // Scroll to show
        btn.scrollIntoView({ behavior: 'smooth', inline: 'end' });
    }
}

window.labelController = new LabelController();

// Update Filter Grid to support Tags
window.filterGrid = function(query) {
    const term = query.toLowerCase();
    const items = document.querySelectorAll('.item-card');
    
    // Get Active Tags
    const activeTags = window.labelController ? window.labelController.activeTags : new Set();
    
    items.forEach(card => {
        const text = card.innerText.toLowerCase();
        const textMatch = text.includes(term);
        
        let tagMatch = true;
        if (activeTags.size > 0) {
            // Check if card has AT LEAST ONE of the active tags?
            // User requested "Checkbox like style to select notes in that label"
            // Usually implies filtering by that label.
            // If multiple checked, usually OR logic (Show work OR personal).
            
            // We need to know which tags a card has.
            // We can look at the DOM: .tag-chip elements inside card
            const cardTags = Array.from(card.querySelectorAll('.tag-chip')).map(c => parseInt(c.dataset.id));
            
            // Check intersection
            const hasTag = cardTags.some(id => activeTags.has(id));
            tagMatch = hasTag;
        }
        
        card.style.display = (textMatch && tagMatch) ? '' : 'none';
    });
    
    if(window.resizeAllMasonryItems) window.resizeAllMasonryItems();
}
