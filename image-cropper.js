
/**
 * Image Cropper Utility
 * Allows users to crop and resize images before uploading.
 * Returns compressed Data URLs.
 */
class ImageCropper {
    constructor() {
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.scale = 1;
        this.position = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastMousePosition = { x: 0, y: 0 };
        this.onSave = null;
        this.onCancel = null;
    }

    /**
     * Initialize the cropper modal if it doesn't exist
     */
    init() {
        if (document.getElementById('image-cropper-modal')) return;

        const modalHTML = `
            <div id="image-cropper-modal" class="modal-overlay" style="display: none; z-index: 10000;">
                <div class="modal-container" style="max-width: 600px; width: 90%; background: white; padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 15px;">
                    <div class="modal-header" style="justify-content: space-between; display: flex; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0;">Ajuster l'image</h3>
                        <button onclick="ImageCropperInstance.cancel()" style="background:none; border:none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>
                    
                    <div class="cropper-area" style="position: relative; height: 400px; background: #333; overflow: hidden; border-radius: 8px; cursor: move;">
                        <canvas id="cropper-canvas" style="display: block; width: 100%; height: 100%;"></canvas>
                        <div class="crop-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; border: 20px solid rgba(0,0,0,0.5);">
                            <div style="width: 100%; height: 100%; border: 2px solid white; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);"></div>
                        </div>
                    </div>

                    <div class="cropper-controls" style="display: flex; gap: 10px; align-items: center;">
                        <span>Zoom:</span>
                        <input type="range" id="cropper-zoom" min="0.5" max="3" step="0.1" value="1" style="flex: 1;">
                    </div>

                    <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button class="btn-secondary" onclick="ImageCropperInstance.cancel()">Annuler</button>
                        <button class="btn-primary" onclick="ImageCropperInstance.save()">✓ Valider</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('image-cropper-modal');
        this.canvas = document.getElementById('cropper-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Event Listeners
        const zoomInput = document.getElementById('cropper-zoom');
        zoomInput.addEventListener('input', (e) => {
            this.scale = parseFloat(e.target.value);
            this.draw();
        });

        // Mouse Events for Pan
        const area = document.querySelector('.cropper-area');

        const startDrag = (e) => {
            this.isDragging = true;
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            this.lastMousePosition = { x: clientX, y: clientY };
        };

        const onDrag = (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            const dx = clientX - this.lastMousePosition.x;
            const dy = clientY - this.lastMousePosition.y;

            this.position.x += dx;
            this.position.y += dy;
            this.lastMousePosition = { x: clientX, y: clientY };
            this.draw();
        };

        const stopDrag = () => {
            this.isDragging = false;
        };

        area.addEventListener('mousedown', startDrag);
        area.addEventListener('mousemove', onDrag);
        area.addEventListener('mouseup', stopDrag);
        area.addEventListener('mouseleave', stopDrag);

        // Touch events
        area.addEventListener('touchstart', startDrag);
        area.addEventListener('touchmove', onDrag);
        area.addEventListener('touchend', stopDrag);
    }

    /**
     * Open the cropper with an image file or URL
     * @param {File|string} source - File object or Image URL
     * @param {Function} onSave - Callback when saved (returns DataURL)
     */
    open(source, onSave) {
        this.init();
        this.onSave = onSave;
        this.image = new Image();
        this.scale = 1;
        this.position = { x: 0, y: 0 };
        document.getElementById('cropper-zoom').value = 1;

        const handleLoad = () => {
            // center image
            const aspect = this.image.width / this.image.height;
            // Fit to canvas initially
            if (aspect > 1) {
                this.scale = this.canvas.width / this.image.width;
            } else {
                this.scale = this.canvas.height / this.image.height;
            }

            // Initial center
            this.position.x = (this.canvas.width - this.image.width * this.scale) / 2;
            this.position.y = (this.canvas.height - this.image.height * this.scale) / 2;

            this.draw();
            this.modal.style.display = 'flex';
        };

        if (source instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.image.onload = handleLoad;
                this.image.src = e.target.result;
            };
            reader.readAsDataURL(source);
        } else {
            this.image.onload = handleLoad;
            this.image.src = source;
        }

        // Set canvas size
        const container = this.modal.querySelector('.cropper-area');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    draw() {
        if (!this.ctx || !this.image) return;

        // Clear
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image transformed
        this.ctx.save();
        this.ctx.translate(this.position.x, this.position.y);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(this.image, 0, 0);
        this.ctx.restore();
    }

    save() {
        if (!this.onSave) return;

        // Create a result canvas
        const resultCanvas = document.createElement('canvas');
        // Output size - fixed to 800x600 for performance/storage
        resultCanvas.width = 800;
        resultCanvas.height = 600;
        const ctx = resultCanvas.getContext('2d');

        // Draw white background (for transparency)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);

        // Calculate source rectangle mapping to result
        // We need to map what is visible in the crop box to the 800x600 canvas

        // This is a simplified approach: just draw the current view scaled to fit 800x600
        // Ideally we map the center crop area.

        // The crop area in UI is effectively the whole canvas minus borders.
        // Let's assume the user positioned the image within the view.
        // We want to capture exactly what is visible on the 'cropper-canvas'

        ctx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, 800, 600);

        // Compress
        const dataURL = resultCanvas.toDataURL('image/jpeg', 0.85);
        this.onSave(dataURL);
        this.close();
    }

    cancel() {
        this.close();
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }
}

// Global Instance
window.ImageCropperInstance = new ImageCropper();
