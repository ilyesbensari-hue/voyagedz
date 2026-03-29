// ==========================================
// HOST ONBOARDING FLOW - Multi-Step System
// Inspired by Airbnb's "Become a Host" flow
// ==========================================

const HostOnboardingFlow = {
    currentStep: 0,
    totalSteps: 8,
    listingData: {
        photos: [], // Array of photo data URLs
        amenities: [],
        type: 'lodging',
        city: 'alger',
        guests: 2,
        bedrooms: 1,
        beds: 1,
        baths: 1
    },

    steps: [
        {
            id: 'property-type',
            title: 'Quel type de propriété proposez-vous?',
            subtitle: 'Choisissez la catégorie qui correspond le mieux',
            validator: () => !!HostOnboardingFlow.listingData.type,
            component: 'renderPropertyTypeStep'
        },
        {
            id: 'location',
            title: 'Où se trouve votre propriété?',
            subtitle: 'Votre adresse ne sera partagée qu\'après réservation',
            validator: () => !!HostOnboardingFlow.listingData.location && HostOnboardingFlow.listingData.location.length >= 5,
            component: 'renderLocationStep'
        },
        {
            id: 'structure',
            title: 'De combien d\'espaces les voyageurs disposeront-ils?',
            subtitle: 'Partagez les détails de base de votre propriété',
            validator: () => HostOnboardingFlow.listingData.guests >= 1,
            component: 'renderStructureStep'
        },
        {
            id: 'amenities',
            title: 'Quels équipements proposez-vous?',
            subtitle: 'Vous pourrez en ajouter d\'autres plus tard',
            validator: () => HostOnboardingFlow.listingData.amenities.length >= 3,
            component: 'renderAmenitiesStep'
        },
        {
            id: 'photos',
            title: 'Ajoutez des photos de votre propriété',
            subtitle: 'Vous aurez besoin d\'au moins 5 photos pour commencer',
            validator: () => HostOnboardingFlow.listingData.photos.length >= 5,
            component: 'renderPhotosStep'
        },
        {
            id: 'title-description',
            title: 'Donnez un titre accrocheur à votre annonce',
            subtitle: 'Les titres courts fonctionnent mieux. Pas d\'inquiétude, vous pourrez toujours modifier',
            validator: () => {
                const title = HostOnboardingFlow.listingData.title;
                const desc = HostOnboardingFlow.listingData.description;
                return title && title.length >= 10 && desc && desc.length >= 50;
            },
            component: 'renderTitleDescriptionStep'
        },
        {
            id: 'pricing',
            title: 'Fixez votre tarif',
            subtitle: 'Vous pouvez le modifier à tout moment',
            validator: () => HostOnboardingFlow.listingData.price >= 1000,
            component: 'renderPricingStep'
        },
        {
            id: 'preview',
            title: 'Aperçu de votre annonce',
            subtitle: 'Voici comment les voyageurs verront votre annonce',
            validator: () => true,
            component: 'renderPreviewStep'
        }
    ],

    init() {
        this.loadDraft();
        this.render();
    },

    loadDraft() {
        const draft = localStorage.getItem('listing_draft');
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                this.listingData = { ...this.listingData, ...parsed };
                console.log('📝 Draft loaded:', this.listingData);
            } catch (e) {
                console.error('Failed to load draft:', e);
            }
        }
    },

    saveDraft() {
        localStorage.setItem('listing_draft', JSON.stringify(this.listingData));
        console.log('💾 Draft saved');
    },

    clearDraft() {
        localStorage.removeItem('listing_draft');
        this.listingData = {
            photos: [],
            amenities: [],
            type: 'lodging',
            city: 'alger',
            guests: 2,
            bedrooms: 1,
            beds: 1,
            baths: 1
        };
    },

    nextStep() {
        const currentStepData = this.steps[this.currentStep];

        if (!currentStepData.validator()) {
            this.showValidationError();
            return;
        }

        this.saveDraft();

        if (this.currentStep < this.totalSteps - 1) {
            this.currentStep++;
            this.render();
            this.scrollToTop();
        }
    },

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.render();
            this.scrollToTop();
        }
    },

    goToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.totalSteps) {
            this.currentStep = stepIndex;
            this.render();
            this.scrollToTop();
        }
    },

    scrollToTop() {
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            modal.querySelector('.modal-body').scrollTop = 0;
        }
    },

    showValidationError() {
        const step = this.steps[this.currentStep];
        let message = 'Veuillez remplir tous les champs requis';

        switch (step.id) {
            case 'location':
                message = 'Entrez une adresse complète (minimum 5 caractères)';
                break;
            case 'amenities':
                message = 'Sélectionnez au moins 3 équipements';
                break;
            case 'photos':
                message = 'Ajoutez au moins 5 photos de qualité';
                break;
            case 'title-description':
                message = 'Le titre doit faire au moins 10 caractères et la description 50 caractères';
                break;
            case 'pricing':
                message = 'Le prix doit être d\'au moins 1000 DA';
                break;
        }

        this.showNotification(message, 'error');
    },

    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    },

    render() {
        const modal = document.getElementById('onboarding-modal');
        if (!modal) return;

        const step = this.steps[this.currentStep];
        const progress = ((this.currentStep + 1) / this.totalSteps) * 100;

        const html = `
            <div class="onboarding-container">
                <!-- Progress Bar -->
                <div class="onboarding-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <span class="progress-text">Étape ${this.currentStep + 1} sur ${this.totalSteps}</span>
                </div>

                <!-- Step Header -->
                <div class="step-header">
                    <h2 class="step-title">${step.title}</h2>
                    <p class="step-subtitle">${step.subtitle}</p>
                </div>

                <!-- Step Content -->
                <div class="step-content" id="step-content">
                    ${this[step.component]()}
                </div>

                <!-- Navigation -->
                <div class="step-navigation">
                    <button class="btn-back" onclick="HostOnboardingFlow.previousStep()" 
                        ${this.currentStep === 0 ? 'style="visibility: hidden;"' : ''}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Retour
                    </button>
                    
                    <button class="btn-save-exit" onclick="HostOnboardingFlow.saveAndExit()">
                        Enregistrer et quitter
                    </button>
                    
                    <button class="btn-next btn-primary" onclick="HostOnboardingFlow.${this.currentStep === this.totalSteps - 1 ? 'publish()' : 'nextStep()'}">
                        ${this.currentStep === this.totalSteps - 1 ? 'Publier l\'annonce' : 'Continuer'}
                        ${this.currentStep < this.totalSteps - 1 ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>' : ''}
                    </button>
                </div>
            </div>
        `;

        modal.querySelector('.modal-body').innerHTML = html;
        this.attachEventListeners();
    },

    attachEventListeners() {
        // Event listeners specific to each step will be attached here
        const stepId = this.steps[this.currentStep].id;

        switch (stepId) {
            case 'photos':
                this.setupPhotoUpload();
                break;
            case 'amenities':
                this.setupAmenities();
                break;
            case 'pricing':
                this.setupPricingAssistant();
                break;
        }
    },

    saveAndExit() {
        this.saveDraft();
        this.showNotification('💾 Brouillon enregistré! Vous pouvez reprendre plus tard.', 'success');
        closeOnboardingModal();
    },

    async publish() {
        const step = this.steps[this.currentStep];
        if (!step.validator()) {
            this.showValidationError();
            return;
        }

        // Create listing from accumulated data
        try {
            await this.createListing();
            this.clearDraft();
            this.showNotification('🎉 Annonce publiée avec succès!', 'success');
            closeOnboardingModal();

            // Navigate to host dashboard
            if (typeof navigateTo === 'function') {
                navigateTo('host-dashboard');
            }
        } catch (error) {
            this.showNotification('❌ Erreur lors de la publication: ' + error.message, 'error');
        }
    },

    async createListing() {
        try {
            const formData = new FormData();
            const data = this.listingData;

            // Append basic fields
            formData.append('title', data.title);
            formData.append('description', data.description);
            formData.append('type', data.type);
            formData.append('category', data.type === 'lodging' ? 'Logement' : data.type === 'hotel' ? 'Hôtel' : 'Activité');
            formData.append('city_id', this.getCityId(data.city)); // Helper needed or mapping
            formData.append('price', data.price);
            formData.append('location', data.location);
            formData.append('max_guests', data.guests);
            formData.append('amenities', JSON.stringify(data.amenities));

            // Append Images
            // Convert DataURLs to Blobs
            for (let i = 0; i < data.photos.length; i++) {
                const blob = await this.dataURLtoBlob(data.photos[i]);
                formData.append('images', blob, `photo_${i}.jpg`);
            }

            console.log('🚀 Sending listing to API...', formData);
            const displayCity = data.city; // Store for fallback or UI

            // Call API
            const newListing = await API.listings.create(formData);

            console.log('✅ Listing created via API:', newListing);
            return newListing;

        } catch (error) {
            console.error('API Error:', error);
            // Fallback to localStorage for demo if API fails
            console.warn('⚠️ API Failure, falling back to local storage');
            const listing = {
                id: Date.now(),
                ...this.listingData,
                rating: 0,
                reviews: 0,
                createdAt: new Date().toISOString(),
                hostId: API.auth.getUser()?.id || 1
            };
            const hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
            hostListings.push(listing);
            localStorage.setItem('host_listings', JSON.stringify(hostListings));
            return listing;
        }
    },

    // Helper: Convert Data URL to Blob for upload
    async dataURLtoBlob(dataURL) {
        return await (await fetch(dataURL)).blob();
    },

    // Helper: Get City ID (Mock mapping, should be from API ideally)
    getCityId(slug) {
        const mapping = {
            'alger': 1,
            'oran': 2,
            'tlemcen': 3,
            'constantine': 4,
            'bejaia': 5
        };
        return mapping[slug] || 1;
    },

    // Step Renderers
    renderPropertyTypeStep() {
        return `
            <div class="property-type-grid">
                <label class="property-type-card ${this.listingData.type === 'lodging' ? 'selected' : ''}" 
                    onclick="HostOnboardingFlow.selectPropertyType('lodging')">
                    <input type="radio" name="property-type" value="lodging" ${this.listingData.type === 'lodging' ? 'checked' : ''}>
                    <div class="card-icon">🏠</div>
                    <div class="card-title">Hébergement</div>
                    <div class="card-desc">Appartement, maison, villa...</div>
                </label>
                
                <label class="property-type-card ${this.listingData.type === 'hotel' ? 'selected' : ''}"
                    onclick="HostOnboardingFlow.selectPropertyType('hotel')">
                    <input type="radio" name="property-type" value="hotel" ${this.listingData.type === 'hotel' ? 'checked' : ''}>
                    <div class="card-icon">🏨</div>
                    <div class="card-title">Hôtel</div>
                    <div class="card-desc">Chambres multiples, services hôteliers</div>
                </label>
                
                <label class="property-type-card ${this.listingData.type === 'activities' ? 'selected' : ''}"
                    onclick="HostOnboardingFlow.selectPropertyType('activities')">
                    <input type="radio" name="property-type" value="activities" ${this.listingData.type === 'activities' ? 'checked' : ''}>
                    <div class="card-icon">🎭</div>
                    <div class="card-title">Activité</div>
                    <div class="card-desc">Expérience, visite guidée...</div>
                </label>
            </div>
        `;
    },

    selectPropertyType(type) {
        this.listingData.type = type;
        this.render();
    },

    renderLocationStep() {
        return `
            <div class="location-form">
                <div class="form-group">
                    <label>Ville</label>
                    <select class="form-control" id="location-city" onchange="HostOnboardingFlow.updateData('city', this.value)">
                        <option value="alger" ${this.listingData.city === 'alger' ? 'selected' : ''}>Alger</option>
                        <option value="oran" ${this.listingData.city === 'oran' ? 'selected' : ''}>Oran</option>
                        <option value="tlemcen" ${this.listingData.city === 'tlemcen' ? 'selected' : ''}>Tlemcen</option>
                        <option value="constantine" ${this.listingData.city === 'constantine' ? 'selected' : ''}>Constantine</option>
                        <option value="bejaia" ${this.listingData.city === 'bejaia' ? 'selected' : ''}>Béjaïa</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Adresse complète</label>
                    <input type="text" class="form-control" id="location-address" 
                        value="${this.listingData.location || ''}"
                        placeholder="Ex: 15 Rue Didouche Mourad, Alger Centre"
                        oninput="HostOnboardingFlow.updateData('location', this.value)">
                    <small class="form-hint">Votre adresse exacte ne sera partagée qu'après réservation confirmée</small>
                </div>
            </div>
        `;
    },

    renderStructureStep() {
        return `
            <div class="structure-form">
                <div class="capacity-grid">
                    <div class="capacity-item">
                        <label>Voyageurs</label>
                        <div class="number-input">
                            <button type="button" onclick="HostOnboardingFlow.decrementValue('guests')" ${this.listingData.guests <= 1 ? 'disabled' : ''}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                            <span class="number-value">${this.listingData.guests}</span>
                            <button type="button" onclick="HostOnboardingFlow.incrementValue('guests')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="capacity-item">
                        <label>Chambres</label>
                        <div class="number-input">
                            <button type="button" onclick="HostOnboardingFlow.decrementValue('bedrooms')" ${this.listingData.bedrooms <= 0 ? 'disabled' : ''}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                            <span class="number-value">${this.listingData.bedrooms}</span>
                            <button type="button" onclick="HostOnboardingFlow.incrementValue('bedrooms')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="capacity-item">
                        <label>Lits</label>
                        <div class="number-input">
                            <button type="button" onclick="HostOnboardingFlow.decrementValue('beds')" ${this.listingData.beds <= 1 ? 'disabled' : ''}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                            <span class="number-value">${this.listingData.beds}</span>
                            <button type="button" onclick="HostOnboardingFlow.incrementValue('beds')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="capacity-item">
                        <label>Salles de bain</label>
                        <div class="number-input">
                            <button type="button" onclick="HostOnboardingFlow.decrementValue('baths')" ${this.listingData.baths <= 1 ? 'disabled' : ''}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                            <span class="number-value">${this.listingData.baths}</span>
                            <button type="button" onclick="HostOnboardingFlow.incrementValue('baths')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    incrementValue(field) {
        this.listingData[field]++;
        this.render();
    },

    decrementValue(field) {
        if (this.listingData[field] > (field === 'guests' || field === 'beds' || field === 'baths' ? 1 : 0)) {
            this.listingData[field]--;
            this.render();
        }
    },

    renderAmenitiesStep() {
        const commonAmenities = [
            { value: 'WiFi', icon: '📶', label: 'WiFi' },
            { value: 'Climatisation', icon: '❄️', label: 'Climatisation' },
            { value: 'TV', icon: '📺', label: 'Télévision' },
            { value: 'Cuisine', icon: '🍳', label: 'Cuisine' },
            { value: 'Lave-linge', icon: '🧺', label: 'Lave-linge' },
            { value: 'Parking', icon: '🚗', label: 'Parking gratuit' },
            { value: 'Piscine', icon: '🏊', label: 'Piscine' },
            { value: 'Jacuzzi', icon: '🛁', label: 'Jacuzzi' },
            { value: 'Vue mer', icon: '🌊', label: 'Vue mer' },
            { value: 'Jardin', icon: '🌳', label: 'Jardin' },
            { value: 'Terrasse', icon: '🏡', label: 'Terrasse/Balcon' },
            { value: 'Cheminée', icon: '🔥', label: 'Cheminée' }
        ];

        return `
            <div class="amenities-grid" id="amenities-grid">
                ${commonAmenities.map(amenity => `
                    <label class="amenity-card ${this.listingData.amenities.includes(amenity.value) ? 'selected' : ''}" data-amenity="${amenity.value}">
                        <input type="checkbox" value="${amenity.value}" 
                            ${this.listingData.amenities.includes(amenity.value) ? 'checked' : ''}>
                        <span class="amenity-icon">${amenity.icon}</span>
                        <span class="amenity-label">${amenity.label}</span>
                    </label>
                `).join('')}
            </div>
            <p class="amenities-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <span id="amenities-count">${this.listingData.amenities.length} équipement(s) sélectionné(s)</span> · Minimum 3 requis
            </p>
        `;
    },

    toggleAmenity(value) {
        const index = this.listingData.amenities.indexOf(value);
        if (index > -1) {
            this.listingData.amenities.splice(index, 1);
        } else {
            this.listingData.amenities.push(value);
        }
        console.log('Amenities updated:', this.listingData.amenities);

        // Update UI without full re-render for better UX
        const card = document.querySelector(`.amenity-card[data-amenity="${value}"]`);
        if (card) {
            card.classList.toggle('selected');
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = this.listingData.amenities.includes(value);
            }
        }

        // Update counter
        const counter = document.getElementById('amenities-count');
        if (counter) {
            counter.textContent = `${this.listingData.amenities.length} équipement(s) sélectionné(s)`;
        }
    },

    setupAmenities() {
        // Attach click event listeners to all amenity cards
        const amenityCards = document.querySelectorAll('.amenity-card');
        amenityCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const value = card.getAttribute('data-amenity');
                this.toggleAmenity(value);
            });
        });

        console.log('✅ Amenities event listeners attached to', amenityCards.length, 'cards');
    },

    renderPhotosStep() {
        return `
            <div class="photos-section">
                <!-- Upload Zone -->
                <div class="photo-upload-zone" id="photo-dropzone">
                    <input type="file" id="listing-photos-input" multiple accept="image/*" hidden 
                        onchange="HostOnboardingFlow.handlePhotoUpload(event)">
                    <div class="upload-placeholder" onclick="document.getElementById('listing-photos-input').click()">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <p>Glissez des photos ici ou cliquez pour parcourir</p>
                        <span class="upload-hint">JPG, PNG · Max 10 MB par image</span>
                    </div>
                </div>

                <!-- Photos Grid -->
                ${this.listingData.photos.length > 0 ? `
                    <div class="photos-grid" id="photos-grid">
                        ${this.listingData.photos.map((photo, index) => `
                            <div class="photo-tile ${index === 0 ? 'main-photo' : ''}">
                                <img src="${photo}" alt="Photo ${index + 1}">
                                ${index === 0 ? '<span class="photo-badge">Photo principale</span>' : ''}
                                <button class="photo-delete" onclick="HostOnboardingFlow.deletePhoto(${index})" type="button">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Photo Tips -->
                <div class="photo-tips">
                    <h4>💡 Conseils pour de meilleures photos</h4>
                    <ul>
                        <li>✨ Utilisez la lumière naturelle</li>
                        <li>📐 Photographiez en mode paysage</li>
                        <li>🧹 Assurez-vous que les espaces sont propres et rangés</li>
                        <li>🏠 Montrez tous les espaces importants</li>
                        <li>🎨 Mettez en valeur les caractéristiques uniques</li>
                    </ul>
                </div>
            </div>
        `;
    },

    setupPhotoUpload() {
        const dropzone = document.getElementById('photo-dropzone');
        if (!dropzone) return;

        // Drag and drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            this.processPhotos(files);
        });
    },

    handlePhotoUpload(event) {
        const files = event.target.files;
        this.processPhotos(files);
    },

    async processPhotos(files) {
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const dataUrl = await this.readFileAsDataURL(file);
                this.listingData.photos.push(dataUrl);
            }
        }
        this.render();
    },

    readFileAsDataURL(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    },

    deletePhoto(index) {
        this.listingData.photos.splice(index, 1);
        this.render();
    },

    renderTitleDescriptionStep() {
        return `
            <div class="title-description-form">
                <div class="form-group">
                    <label>Titre de votre annonce</label>
                    <input type="text" class="form-control" id="listing-title" maxlength="50"
                        value="${this.listingData.title || ''}"
                        placeholder="Ex: Villa luxueuse avec vue panoramique sur la mer"
                        oninput="HostOnboardingFlow.updateData('title', this.value)">
                    <div class="char-counter">
                        <span id="title-count">${(this.listingData.title || '').length}</span>/50
                    </div>
                    <small class="form-hint">Les titres courts et descriptifs fonctionnent mieux</small>
                </div>

                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-control" id="listing-description" rows="6" maxlength="500"
                        placeholder="Décrivez votre espace, ce qui le rend unique, les points forts du quartier..."
                        oninput="HostOnboardingFlow.updateData('description', this.value)">${this.listingData.description || ''}</textarea>
                    <div class="char-counter">
                        <span id="desc-count">${(this.listingData.description || '').length}</span>/500
                    </div>
                </div>

                <div class="description-tips">
                    <h4>✍️ Que mettre dans votre description?</h4>
                    <ul>
                        <li>Ce qui rend votre logement spécial</li>
                        <li>L'accès aux transports et commerces</li>
                        <li>Les attractions à proximité</li>
                        <li>L'ambiance du quartier</li>
                    </ul>
                </div>
            </div>
        `;
    },

    renderPricingStep() {
        const suggestion = this.getPricingSuggestion();

        return `
            <div class="pricing-form">
                <!-- Pricing Suggestion -->
                ${suggestion ? `
                    <div class="pricing-suggestion">
                        <div class="suggestion-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 8v4M12 16h.01"/>
                            </svg>
                            <span>Prix suggéré basé sur le marché</span>
                        </div>
                        <div class="suggestion-price">${suggestion.suggested.toLocaleString('fr-DZ')} DA / nuit</div>
                        <div class="suggestion-range">
                            Fourchette: ${suggestion.min.toLocaleString('fr-DZ')} - ${suggestion.max.toLocaleString('fr-DZ')} DA
                        </div>
                        <button type="button" class="btn-apply-suggestion" onclick="HostOnboardingFlow.applySuggestedPrice(${suggestion.suggested})">
                            Utiliser ce prix
                        </button>
                    </div>
                ` : ''}

                <!-- Price Input -->
                <div class="form-group">
                    <label>Votre tarif par nuit (DA)</label>
                    <div class="price-input-wrapper">
                        <input type="number" class="form-control price-input" id="listing-price" 
                            value="${this.listingData.price || ''}" min="1000" step="500"
                            placeholder="Ex: 8000"
                            oninput="HostOnboardingFlow.updateData('price', parseInt(this.value) || 0)">
                        <span class="currency">DA</span>
                    </div>
                    <small class="form-hint">Vous pouvez modifier votre tarif à tout moment</small>
                </div>

                <!-- Pricing Insights -->
                ${suggestion ? `
                    <div class="pricing-insights">
                        <h4>📊 Infos marché</h4>
                        <ul>
                            ${suggestion.insights.map(insight => `<li>${insight}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <!-- Rules (Optional) -->
                <div class="form-group">
                    <label>Règlement intérieur (Optionnel)</label>
                    <textarea class="form-control" id="listing-rules" rows="3"
                        placeholder="Ex: Pas d'animaux, non fumeur, arrivée après 14h..."
                        oninput="HostOnboardingFlow.updateData('rules', this.value)">${this.listingData.rules || ''}</textarea>
                </div>
            </div>
        `;
    },

    getPricingSuggestion() {
        if (!window.PricingAssistant) return null;
        return PricingAssistant.suggestPrice(this.listingData);
    },

    applySuggestedPrice(price) {
        this.listingData.price = price;
        this.render();
    },

    setupPricingAssistant() {
        // Already handled in render
    },

    renderPreviewStep() {
        // Generate a mock image if no photos
        const mainImage = this.listingData.photos[0] || 'https://via.placeholder.com/400x300/1a1a2e/ffffff?text=Apercu';

        return `
            <div class="preview-container">
                <p class="preview-intro">Voici comment les voyageurs verront votre annonce dans les résultats de recherche</p>
                
                <!-- Preview Card -->
                <div class="preview-card-wrapper">
                    <div class="listing-card preview-listing-card">
                        <div class="listing-image-container">
                            <img src="${mainImage}" alt="${this.listingData.title}" class="listing-image">
                            <div class="listing-badge" style="background: var(--accent);">
                                ${this.listingData.type === 'lodging' ? 'Logement' :
                this.listingData.type === 'hotel' ? 'Hôtel' : 'Activité'}
                            </div>
                        </div>
                        <div class="listing-content">
                            <h3 class="listing-title">${this.listingData.title || 'Titre de votre annonce'}</h3>
                            <div class="listing-location">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>
                                <span>${this.listingData.location || 'Alger'}</span>
                            </div>
                            <div class="listing-footer">
                                <div class="listing-price">${(this.listingData.price || 0).toLocaleString('fr-DZ')} DA/nuit</div>
                                <div class="listing-rating">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--warning)" stroke="var(--warning)" stroke-width="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                    <span>Nouveau</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Details Summary -->
                <div class="preview-details">
                    <h3>Résumé de votre annonce</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Type</span>
                            <span class="detail-value">${this.listingData.type === 'lodging' ? 'Hébergement' :
                this.listingData.type === 'hotel' ? 'Hôtel' : 'Activité'
            }</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Localisation</span>
                            <span class="detail-value">${this.listingData.location || 'Non renseignée'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Capacité</span>
                            <span class="detail-value">${this.listingData.guests} voyageurs · ${this.listingData.bedrooms} chambres · ${this.listingData.beds} lits · ${this.listingData.baths} SdB</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Équipements</span>
                            <span class="detail-value">${this.listingData.amenities.length} équipements</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Photos</span>
                            <span class="detail-value">${this.listingData.photos.length} photos</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Prix</span>
                            <span class="detail-value">${(this.listingData.price || 0).toLocaleString('fr-DZ')} DA/nuit</span>
                        </div>
                    </div>
                </div>

                <div class="preview-note">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <p>Vous pourrez modifier ces informations à tout moment depuis votre tableau de bord</p>
                </div>
            </div>
        `;
    },

    updateData(field, value) {
        this.listingData[field] = value;
        // Update char counters if present
        if (field === 'title') {
            const counter = document.getElementById('title-count');
            if (counter) counter.textContent = value.length;
        } else if (field === 'description') {
            const counter = document.getElementById('desc-count');
            if (counter) counter.textContent = value.length;
        }
    }
};

// Global function to open onboarding modal
function openOnboardingModal() {
    HostOnboardingFlow.currentStep = 0;
    HostOnboardingFlow.init();
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Expose globally
window.HostOnboardingFlow = HostOnboardingFlow;
window.openOnboardingModal = openOnboardingModal;
window.closeOnboardingModal = closeOnboardingModal;

// Backward compatibility alias
window.openCreateListingModal = openOnboardingModal;
window.closeCreateListingModal = closeOnboardingModal;

console.log('✅ Host Onboarding Flow loaded');
