// ==========================================
// ADMIN IMAGE EDITOR - Click to Upload Any Image
// ==========================================
// Allows admin users to click any image and replace it
// ==========================================

const AdminImageEditor = {
    isAdmin: false,
    editingElement: null,
    currentImageUrl: null,

    // ==========================================
    // Initialize Admin Mode
    // ==========================================
    init() {
        this.checkAdminStatus();

        if (this.isAdmin) {
            console.log('👑 Admin Image Editor activé');
            this.enableAdminMode();
        }

        // Re-check on auth changes
        window.addEventListener('authChange', () => this.init());
    },

    checkAdminStatus() {
        const user = localStorage.getItem('voyagedz_user');
        if (user) {
            const parsed = JSON.parse(user);
            this.isAdmin = parsed.role === 'admin';
        } else {
            this.isAdmin = false;
        }
    },

    // ==========================================
    // Enable Admin Mode - Add Edit Overlays
    // ==========================================
    enableAdminMode() {
        // Add CSS if not present
        if (!document.getElementById('admin-image-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-image-styles';
            style.textContent = `
                .admin-editable-image {
                    position: relative;
                    cursor: pointer !important;
                }
                .admin-editable-image::after {
                    content: '📷 Modifier';
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    opacity: 0;
                    transition: opacity 0.2s;
                    pointer-events: none;
                }
                .admin-editable-image:hover::after {
                    opacity: 1;
                }
                .admin-editable-image img {
                    transition: filter 0.2s;
                }
                .admin-editable-image:hover img {
                    filter: brightness(0.7);
                }

                /* Admin Image Upload Modal */
                #admin-image-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 9999;
                    background: rgba(0,0,0,0.85);
                    justify-content: center;
                    align-items: center;
                }
                #admin-image-modal.active {
                    display: flex;
                }
                .admin-modal-content {
                    background: var(--bg-secondary, #1B2838);
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 500px;
                    width: 90%;
                    text-align: center;
                }
                .admin-modal-content h3 {
                    margin-bottom: 1rem;
                    color: var(--text-primary, #F5F0EB);
                }
                .admin-preview-image {
                    max-width: 100%;
                    max-height: 200px;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }
                .admin-upload-zone {
                    border: 2px dashed var(--primary, #E07B53);
                    border-radius: 12px;
                    padding: 2rem;
                    margin: 1rem 0;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .admin-upload-zone:hover {
                    background: rgba(224, 123, 83, 0.1);
                }
                .admin-upload-zone.drag-over {
                    background: rgba(224, 123, 83, 0.2);
                    border-color: var(--accent, #2EC4B6);
                }
                .admin-url-input {
                    width: 100%;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: rgba(255,255,255,0.05);
                    color: var(--text-primary, #F5F0EB);
                    margin: 1rem 0;
                }
                .admin-url-input::placeholder {
                    color: var(--text-muted, #5A6B7D);
                }
                .admin-modal-buttons {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                .admin-modal-buttons button {
                    flex: 1;
                    padding: 12px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .admin-btn-primary {
                    background: var(--primary, #E07B53);
                    color: white;
                }
                .admin-btn-primary:hover {
                    filter: brightness(1.1);
                }
                .admin-btn-secondary {
                    background: rgba(255,255,255,0.1);
                    color: var(--text-primary, #F5F0EB);
                }
                .admin-btn-secondary:hover {
                    background: rgba(255,255,255,0.15);
                }
                
                /* Admin badge on header */
                .admin-mode-indicator {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    background: linear-gradient(135deg, #E07B53, #FFB703);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    z-index: 9000;
                    box-shadow: 0 2px 10px rgba(224, 123, 83, 0.4);
                }
            `;
            document.head.appendChild(style);
        }

        // Add admin badge
        if (!document.getElementById('admin-mode-indicator')) {
            const badge = document.createElement('div');
            badge.id = 'admin-mode-indicator';
            badge.className = 'admin-mode-indicator';
            badge.innerHTML = '👑 Mode Admin';
            document.body.appendChild(badge);
        }

        // Create modal if not exists
        this.createModal();

        // Watch for new images
        this.observeNewImages();

        // Add overlays to existing images
        this.addOverlaysToImages();
    },

    // ==========================================
    // Add Overlays to All Images
    // ==========================================
    addOverlaysToImages() {
        const images = document.querySelectorAll(`
            .listing-card img,
            .city-card img,
            .detail-gallery img,
            .gallery-main img,
            .gallery-thumb img,
            .room-card img,
            .host-listing-image
        `);

        images.forEach(img => {
            if (img.closest('.admin-editable-image')) return; // Already wrapped

            const wrapper = document.createElement('div');
            wrapper.className = 'admin-editable-image';
            wrapper.style.position = 'relative';

            // Fix for city-card and listing-card layout
            if (img.classList.contains('city-image') || img.classList.contains('listing-image')) {
                wrapper.style.display = 'block';
                wrapper.style.width = '100%';
                wrapper.style.height = '100%';
            } else {
                wrapper.style.display = 'inline-block';
            }

            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);

            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.openEditor(img);
            });
        });
    },

    // ==========================================
    // Observe DOM for New Images
    // ==========================================
    observeNewImages() {
        const observer = new MutationObserver((mutations) => {
            let hasNewImages = false;
            mutations.forEach(m => {
                if (m.type === 'childList' && m.addedNodes.length) {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && (node.tagName === 'IMG' || node.querySelector('img'))) {
                            hasNewImages = true;
                        }
                    });
                }
            });
            if (hasNewImages && this.isAdmin) {
                setTimeout(() => this.addOverlaysToImages(), 100);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    },

    // ==========================================
    // Create Upload Modal
    // ==========================================
    createModal() {
        if (document.getElementById('admin-image-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'admin-image-modal';
        modal.innerHTML = `
            <div class="admin-modal-content">
                <h3>📷 Modifier l'image</h3>
                <img id="admin-preview-img" class="admin-preview-image" src="">
                
                <div id="admin-upload-zone" class="admin-upload-zone">
                    <p>📁 Glissez une image ici</p>
                    <p style="font-size: 12px; color: var(--text-muted);">ou cliquez pour parcourir</p>
                    <input type="file" id="admin-file-input" accept="image/*" style="display:none;">
                </div>
                
                <p style="color: var(--text-secondary); margin: 0.5rem 0;">— ou —</p>
                
                <input type="text" id="admin-url-input" class="admin-url-input" 
                       placeholder="Coller l'URL d'une image...">
                
                <div class="admin-modal-buttons">
                    <button class="admin-btn-secondary" onclick="AdminImageEditor.closeModal()">
                        Annuler
                    </button>
                    <button class="admin-btn-primary" onclick="AdminImageEditor.saveImage()">
                        ✓ Appliquer
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Setup events
        const zone = document.getElementById('admin-upload-zone');
        const fileInput = document.getElementById('admin-file-input');
        const urlInput = document.getElementById('admin-url-input');

        zone.addEventListener('click', () => fileInput.click());

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.previewFile(file);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.previewFile(file);
        });

        urlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                document.getElementById('admin-preview-img').src = url;
            }
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    },

    // ==========================================
    // Preview File
    // ==========================================
    previewFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('admin-preview-img').src = e.target.result;
            this.pendingFile = file;
        };
        reader.readAsDataURL(file);
    },

    // ==========================================
    // Open Editor Modal
    // ==========================================
    openEditor(imgElement) {
        this.editingElement = imgElement;
        this.currentImageUrl = imgElement.src;

        document.getElementById('admin-preview-img').src = imgElement.src;
        document.getElementById('admin-url-input').value = '';
        document.getElementById('admin-file-input').value = '';
        this.pendingFile = null;

        document.getElementById('admin-image-modal').classList.add('active');
    },

    closeModal() {
        document.getElementById('admin-image-modal').classList.remove('active');
        this.editingElement = null;
        this.pendingFile = null;
    },

    // ==========================================
    // Save Image
    // ==========================================
    async saveImage() {
        const urlInput = document.getElementById('admin-url-input').value.trim();
        let newUrl = null;

        if (this.pendingFile) {
            // Upload file to server
            newUrl = await this.uploadFile(this.pendingFile);
        } else if (urlInput) {
            // Use URL directly
            newUrl = urlInput;
        }

        if (newUrl && this.editingElement) {
            this.editingElement.src = newUrl;

            // Save to localStorage for persistence
            this.saveImageToStorage(this.currentImageUrl, newUrl);

            if (window.authSystem && window.authSystem.showNotification) {
                window.authSystem.showNotification('✅ Image mise à jour !', 'success');
            } else {
                alert('Image mise à jour !');
            }
        }

        this.closeModal();
    },

    // ==========================================
    // Upload File to Server with Optimization
    // ==========================================
    async uploadFile(file) {
        const token = localStorage.getItem('token');

        // Use optimized upload endpoint if backend is available
        if (token) {
            try {
                const formData = new FormData();
                formData.append('image', file);
                formData.append('sizes', 'medium,large'); // Request these sizes
                formData.append('format', 'webp'); // Convert to WebP

                const res = await fetch('/api/upload/optimized', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log('📸 Image optimized:', data);

                    // Return the primary (large) image URL
                    return data.primary || data.url;
                }
            } catch (error) {
                console.error('Upload error, falling back to data URI:', error);
            }
        }

        // Fallback: Convert to Data URI for local storage
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    },

    // ==========================================
    // Save Image Mapping to Storage
    // ==========================================
    saveImageToStorage(originalUrl, newUrl) {
        const mappings = JSON.parse(localStorage.getItem('admin_image_mappings') || '{}');
        mappings[originalUrl] = newUrl;
        localStorage.setItem('admin_image_mappings', JSON.stringify(mappings));
        console.log('💾 Image mapping saved');
    },

    // ==========================================
    // Apply Saved Mappings on Page Load
    // ==========================================
    applySavedMappings() {
        const mappings = JSON.parse(localStorage.getItem('admin_image_mappings') || '{}');

        Object.entries(mappings).forEach(([original, replacement]) => {
            const images = document.querySelectorAll(`img[src="${original}"]`);
            images.forEach(img => {
                img.src = replacement;
            });
        });
    },

    // ==========================================
    // Toggle Admin Mode (Helper for Demo)
    // ==========================================
    toggleAdminMode() {
        const currentUser = JSON.parse(localStorage.getItem('voyagedz_user') || '{}');

        if (this.isAdmin) {
            // Demote to user
            currentUser.role = 'user';
            this.isAdmin = false;
            alert('👑 Mode Admin DÉSACTIVÉ');
        } else {
            // Promote to admin
            currentUser.role = 'admin';
            currentUser.name = currentUser.name || 'Admin User';
            this.isAdmin = true;
            alert('👑 Mode Admin ACTIVÉ ! Cliquez sur une image pour la modifier.');
        }

        localStorage.setItem('voyagedz_user', JSON.stringify(currentUser));
        location.reload();
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to let auth load first
    setTimeout(() => {
        AdminImageEditor.init();
        AdminImageEditor.applySavedMappings();
    }, 500);
});

// Re-initialize after page navigation
if (typeof window.addEventListener === 'function') {
    const originalNavigateTo = window.navigateTo;
    if (originalNavigateTo) {
        window.navigateTo = function (page) {
            const result = originalNavigateTo.call(this, page);
            setTimeout(() => {
                if (AdminImageEditor.isAdmin) {
                    AdminImageEditor.addOverlaysToImages();
                    AdminImageEditor.applySavedMappings();
                }
            }, 300);
            return result;
        };
    }
}



// Expose globally
window.AdminImageEditor = AdminImageEditor;
window.toggleAdminMode = () => AdminImageEditor.toggleAdminMode();

console.log('✅ Admin Image Editor loaded');
