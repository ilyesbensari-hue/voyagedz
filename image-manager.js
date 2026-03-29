// ==========================================
// IMAGE MANAGER - Host Image Management
// ==========================================
// Drag & drop image upload and reordering for listings
// ==========================================

const ImageManager = {
    listingId: null,
    images: [],
    container: null,
    sortable: null,

    // ==========================================
    // Initialize Image Manager
    // ==========================================
    async init(containerId, listingId, existingImages = []) {
        this.listingId = listingId;
        this.container = document.getElementById(containerId);
        this.images = existingImages;

        if (!this.container) {
            console.error('ImageManager: Container not found:', containerId);
            return;
        }

        // Load images if not provided
        if (this.images.length === 0 && listingId) {
            await this.loadImages();
        }

        this.render();
    },

    // ==========================================
    // Load Images from API
    // ==========================================
    async loadImages() {
        try {
            const res = await fetch(`/api/listings/${this.listingId}/images`);
            if (res.ok) {
                this.images = await res.json();
            }
        } catch (error) {
            console.error('ImageManager: Error loading images:', error);
        }
    },

    // ==========================================
    // Render Image Manager UI
    // ==========================================
    render() {
        this.container.innerHTML = `
            <div class="image-manager">
                <div class="im-header">
                    <h3>📸 Photos de l'annonce</h3>
                    <span class="image-count">${this.images.length} photo(s)</span>
                </div>

                <!-- Dropzone -->
                <div class="image-dropzone" id="image-dropzone">
                    <div class="dropzone-content">
                        <span class="dropzone-icon">📷</span>
                        <p class="dropzone-text">Glissez vos photos ici</p>
                        <p class="dropzone-subtext">ou cliquez pour sélectionner</p>
                        <input type="file" id="image-input" multiple accept="image/*" style="display:none;">
                        <button class="btn btn-outline" onclick="document.getElementById('image-input').click()">
                            Parcourir...
                        </button>
                    </div>
                    <div class="dropzone-progress" id="upload-progress" style="display:none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <span class="progress-text" id="progress-text">Upload en cours...</span>
                    </div>
                </div>

                <!-- Image Grid -->
                <div class="image-grid" id="image-grid">
                    ${this.images.length > 0 ? this.renderImageGrid() : '<p class="empty-state">Aucune photo. Ajoutez votre première photo !</p>'}
                </div>

                <!-- Info -->
                <div class="im-info">
                    <p>💡 Faites glisser les images pour les réorganiser. La première image sera la photo principale.</p>
                    <p>📐 Format recommandé : 16:9, minimum 1200x800 pixels</p>
                </div>
            </div>
        `;

        this.bindEvents();
        this.initSortable();
    },

    // ==========================================
    // Render Image Grid
    // ==========================================
    renderImageGrid() {
        return this.images.map((img, index) => `
            <div class="image-item ${index === 0 ? 'primary' : ''}" data-id="${img.id}" data-url="${img.url}">
                <img src="${img.url}" alt="Photo ${index + 1}" loading="lazy">
                <div class="image-overlay">
                    <div class="image-number">${index + 1}</div>
                    ${index === 0 ? '<span class="primary-badge">Photo principale</span>' : ''}
                    <div class="image-actions">
                        <button class="btn-icon" onclick="ImageManager.viewImage('${img.url}')" title="Voir">👁️</button>
                        <button class="btn-icon danger" onclick="ImageManager.deleteImage(${img.id})" title="Supprimer">🗑️</button>
                    </div>
                </div>
                <div class="drag-handle" title="Déplacer">⋮⋮</div>
            </div>
        `).join('');
    },

    // ==========================================
    // Event Bindings
    // ==========================================
    bindEvents() {
        const dropzone = document.getElementById('image-dropzone');
        const input = document.getElementById('image-input');

        // File input change
        input.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag & Drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });
    },

    // ==========================================
    // Initialize Sortable (drag to reorder)
    // ==========================================
    initSortable() {
        const grid = document.getElementById('image-grid');
        if (!grid || this.images.length === 0) return;

        // Simple drag-and-drop reordering
        let draggedItem = null;

        grid.querySelectorAll('.image-item').forEach(item => {
            item.draggable = true;

            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedItem = null;
                this.handleReorder();
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedItem && draggedItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midX = rect.left + rect.width / 2;
                    if (e.clientX < midX) {
                        grid.insertBefore(draggedItem, item);
                    } else {
                        grid.insertBefore(draggedItem, item.nextSibling);
                    }
                }
            });
        });
    },

    // ==========================================
    // Handle File Upload
    // ==========================================
    async handleFiles(files) {
        if (!files || files.length === 0) return;

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Vous devez être connecté');
            return;
        }

        // Filter valid images
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            alert('Veuillez sélectionner des images valides');
            return;
        }

        // Show progress
        const progressDiv = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        progressDiv.style.display = 'block';

        // Create FormData
        const formData = new FormData();
        validFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            progressText.textContent = `Upload de ${validFiles.length} image(s)...`;
            progressFill.style.width = '30%';

            const res = await fetch(`/api/listings/${this.listingId}/images`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            progressFill.style.width = '90%';

            if (res.ok) {
                const newImages = await res.json();
                this.images.push(...newImages);
                progressFill.style.width = '100%';
                progressText.textContent = 'Upload terminé !';

                setTimeout(() => {
                    progressDiv.style.display = 'none';
                    this.render();
                }, 1000);
            } else {
                const err = await res.json();
                alert(err.error || 'Erreur lors de l\'upload');
                progressDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Erreur réseau lors de l\'upload');
            progressDiv.style.display = 'none';
        }
    },

    // ==========================================
    // Handle Reorder
    // ==========================================
    async handleReorder() {
        const grid = document.getElementById('image-grid');
        const newOrder = Array.from(grid.querySelectorAll('.image-item')).map(el => parseInt(el.dataset.id));

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`/api/listings/${this.listingId}/images/reorder`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ imageIds: newOrder })
            });

            if (res.ok) {
                // Update local order
                this.images.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));

                // Update UI to show new primary
                grid.querySelectorAll('.image-item').forEach((item, index) => {
                    item.classList.toggle('primary', index === 0);
                    item.querySelector('.image-number').textContent = index + 1;

                    // Update primary badge
                    const existingBadge = item.querySelector('.primary-badge');
                    if (index === 0 && !existingBadge) {
                        item.querySelector('.image-overlay').insertAdjacentHTML('afterbegin', '<span class="primary-badge">Photo principale</span>');
                    } else if (index !== 0 && existingBadge) {
                        existingBadge.remove();
                    }
                });

                console.log('✅ Image order saved');
            }
        } catch (error) {
            console.error('Reorder error:', error);
        }
    },

    // ==========================================
    // Delete Image
    // ==========================================
    async deleteImage(imageId) {
        if (!confirm('Supprimer cette image ?')) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`/api/listings/${this.listingId}/images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                this.images = this.images.filter(img => img.id !== imageId);
                this.render();
            } else {
                const err = await res.json();
                alert(err.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    },

    // ==========================================
    // View Image (Lightbox)
    // ==========================================
    viewImage(url) {
        // Create lightbox overlay
        const lightbox = document.createElement('div');
        lightbox.className = 'image-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="lightbox-content">
                <img src="${url}" alt="Image">
                <button class="lightbox-close" onclick="this.closest('.image-lightbox').remove()">&times;</button>
                <div class="lightbox-nav">
                    <button class="nav-prev" onclick="ImageManager.navigateLightbox(-1)">‹</button>
                    <button class="nav-next" onclick="ImageManager.navigateLightbox(1)">›</button>
                </div>
            </div>
        `;
        document.body.appendChild(lightbox);

        // Store current index
        this.currentLightboxIndex = this.images.findIndex(img => img.url === url);

        // Keyboard navigation
        const handleKeydown = (e) => {
            if (e.key === 'Escape') lightbox.remove();
            if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
            if (e.key === 'ArrowRight') this.navigateLightbox(1);
        };
        document.addEventListener('keydown', handleKeydown);
        lightbox.addEventListener('remove', () => document.removeEventListener('keydown', handleKeydown));
    },

    navigateLightbox(direction) {
        this.currentLightboxIndex += direction;
        if (this.currentLightboxIndex < 0) this.currentLightboxIndex = this.images.length - 1;
        if (this.currentLightboxIndex >= this.images.length) this.currentLightboxIndex = 0;

        const lightbox = document.querySelector('.image-lightbox .lightbox-content img');
        if (lightbox) {
            lightbox.src = this.images[this.currentLightboxIndex].url;
        }
    },

    // ==========================================
    // Gallery Render (for detail pages)
    // ==========================================
    renderGallery(containerId, images, options = {}) {
        const container = document.getElementById(containerId);
        if (!container || !images || images.length === 0) return;

        const maxVisible = options.maxVisible || 4;
        const visibleImages = images.slice(0, maxVisible);
        const remainingCount = images.length - maxVisible;

        container.innerHTML = `
            <div class="gallery-grid ${images.length === 1 ? 'single' : images.length === 2 ? 'dual' : ''}">
                <div class="gallery-main" onclick="ImageManager.openGalleryModal(0, ${JSON.stringify(images).replace(/"/g, '&quot;')})">
                    <img src="${images[0].url}" alt="Photo principale">
                </div>
                ${images.length > 1 ? `
                    <div class="gallery-thumbs">
                        ${visibleImages.slice(1).map((img, index) => `
                            <div class="gallery-thumb" onclick="ImageManager.openGalleryModal(${index + 1}, ${JSON.stringify(images).replace(/"/g, '&quot;')})">
                                <img src="${img.url}" alt="Photo ${index + 2}">
                                ${index === maxVisible - 2 && remainingCount > 0 ? `
                                    <div class="thumb-overlay">+${remainingCount}</div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    openGalleryModal(startIndex, images) {
        const modal = document.createElement('div');
        modal.className = 'gallery-modal';
        modal.innerHTML = `
            <div class="gallery-modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="gallery-modal-content">
                <button class="gallery-close" onclick="this.closest('.gallery-modal').remove()">&times;</button>
                <div class="gallery-main-image">
                    <img src="${images[startIndex].url}" alt="Photo" id="gallery-modal-img">
                </div>
                <div class="gallery-thumbnails">
                    ${images.map((img, i) => `
                        <div class="gallery-thumb-modal ${i === startIndex ? 'active' : ''}" onclick="ImageManager.setGalleryImage(${i}, ${JSON.stringify(images).replace(/"/g, '&quot;')})">
                            <img src="${img.url}" alt="Miniature ${i + 1}">
                        </div>
                    `).join('')}
                </div>
                <div class="gallery-counter">${startIndex + 1} / ${images.length}</div>
                <button class="gallery-nav gallery-prev" onclick="ImageManager.navigateGallery(-1, ${JSON.stringify(images).replace(/"/g, '&quot;')})">‹</button>
                <button class="gallery-nav gallery-next" onclick="ImageManager.navigateGallery(1, ${JSON.stringify(images).replace(/"/g, '&quot;')})">›</button>
            </div>
        `;
        document.body.appendChild(modal);
        this.currentGalleryIndex = startIndex;
        this.currentGalleryImages = images;
    },

    setGalleryImage(index, images) {
        this.currentGalleryIndex = index;
        document.getElementById('gallery-modal-img').src = images[index].url;
        document.querySelectorAll('.gallery-thumb-modal').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });
        document.querySelector('.gallery-counter').textContent = `${index + 1} / ${images.length}`;
    },

    navigateGallery(direction, images) {
        this.currentGalleryIndex += direction;
        if (this.currentGalleryIndex < 0) this.currentGalleryIndex = images.length - 1;
        if (this.currentGalleryIndex >= images.length) this.currentGalleryIndex = 0;
        this.setGalleryImage(this.currentGalleryIndex, images);
    }
};

// Expose globally
window.ImageManager = ImageManager;

console.log('✅ Image Manager loaded');
