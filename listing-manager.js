// ==========================================
// LISTING MANAGER - Complete CRUD for Host Listings
// ==========================================
// Allows hosts to create, edit, update photos, and manage calendar
// ==========================================

const ListingManager = {
    currentListing: null,
    isEditing: false,

    // ==========================================
    // Storage Keys
    // ==========================================
    KEYS: {
        LISTINGS: 'voyagedz_listings',
        BLOCKED_DATES: 'voyagedz_blocked_dates',
        PRICING: 'voyagedz_custom_pricing'
    },

    // ==========================================
    // Initialize Manager
    // ==========================================
    init() {
        this.createModals();
        console.log('✅ ListingManager initialized');
    },

    // ==========================================
    // Get Listings for Current User
    // ==========================================
    async getHostListings() {
        const user = this.getCurrentUser();
        if (!user) return [];

        // Use API to get ALL listings (merged local + static)
        const allListings = await API.listings.getAll();

        // Admin sees ALL listings
        if (user.role === 'admin') {
            return allListings;
        }

        return allListings.filter(l => l.hostId === user.id);
    },

    // ==========================================
    // Render Host Listings in Dashboard
    // ==========================================
    async renderHostListings() {
        const container = document.getElementById('host-listings-grid');
        const countEl = document.getElementById('host-listings-count');

        if (!container) return;

        // Show loading state
        container.innerHTML = '<div class="loading-spinner">Chargement des annonces...</div>';

        const listings = await this.getHostListings();

        if (countEl) {
            countEl.textContent = `${listings.length} annonce(s)`;
        }

        if (listings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    <p>Vous n'avez pas encore d'annonces</p>
                    <button class="btn-primary" onclick="ListingManager.openCreateModal()">
                        Créer votre première annonce
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = listings.map(listing => `
            <div class="host-listing-card" data-id="${listing.id}">
                <div class="listing-image-container">
                    <img src="${listing.image || listing.images?.[0] || 'https://via.placeholder.com/300x200'}" 
                         alt="${listing.title}" class="listing-image">
                    <span class="listing-type-badge">${this.getTypeLabel(listing.type)}</span>
                    <div class="listing-status ${listing.status || 'active'}">
                        ${listing.status === 'paused' ? '⏸️ En pause' : '✅ Active'}
                    </div>
                </div>
                <div class="listing-content">
                    <h4 class="listing-title">${listing.title}</h4>
                    <p class="listing-location">📍 ${listing.location || listing.city || ''}</p>
                    <div class="listing-meta">
                        <span class="listing-price">${listing.price}</span>
                        <span class="listing-rating">⭐ ${listing.rating || 'Nouveau'}</span>
                    </div>
                    <div class="listing-actions">
                        <button class="btn-action-edit" onclick="ListingManager.openEditModal(${listing.id}, '${listing.id}')">
                            <span class="icon">✏️</span>
                            <span>Modifier</span>
                        </button>
                        <button class="btn-action-photos" onclick="ListingManager.openPhotoModal(${listing.id})">
                            <span class="icon">📷</span>
                            <span>Photos</span>
                        </button>
                        <button class="btn-action-calendar" onclick="ListingManager.openCalendarModal(${listing.id})">
                            <span class="icon">📅</span>
                            <span>Calendrier</span>
                        </button>
                        <button class="btn-action-delete" onclick="ListingManager.deleteListing(${listing.id})">
                            <span class="icon">🗑️</span>
                            <span>Supprimer</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // ==========================================
    // Render Host Bookings (Reservations received)
    // ==========================================
    async renderHostBookings() {
        // This function will display bookings made on the host's listings
        const container = document.getElementById('reservations-list'); // Reusing existing container or need new one?
        // Actually, we should check if we are on the dashboard view for reservations.
        // Let's assume there is a specific container for host bookings, or we reuse 'reservations-list' but with different content if host.

        if (!container) return;

        const user = this.getCurrentUser();
        if (!user || (!user.isHost && user.role !== 'admin')) return;

        try {
            const bookings = await API.bookings.getHostBookings(user.id);

            if (bookings.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>Aucune réservation reçue pour le moment.</p>
                    </div>
                `;
                return;
            }

            // Simple table view for host bookings
            container.innerHTML = `
                <div class="host-bookings-list" style="display: grid; gap: 15px;">
                    <h3 style="margin-bottom: 10px;">Réservations Reçues (${bookings.length})</h3>
                    ${bookings.map(b => `
                        <div class="booking-card" style="display: flex; gap: 15px; padding: 15px; background: white; border-radius: 12px; border: 1px solid #e0e0e0; align-items: center;">
                            <img src="${b.listing.image}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 5px 0;">${b.listing.title}</h4>
                                <div style="font-size: 0.9rem; color: #666;">
                                    <div>👤 Client: <strong>${b.bookerName}</strong> (${b.bookerPhone || 'N/A'})</div>
                                    <div>📅 ${new Date(b.dateFrom).toLocaleDateString()} - ${new Date(b.dateTo).toLocaleDateString()}</div>
                                    <div>💰 ${b.totalPrice.toLocaleString()} DA</div>
                                </div>
                            </div>
                            <div class="booking-status status-${b.status}" style="padding: 5px 10px; border-radius: 20px; background: #e8f5e9; color: #2e7d32; font-size: 0.85rem; font-weight: bold;">
                                ${b.status}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

        } catch (e) {
            console.error('Error rendering host bookings:', e);
            container.innerHTML = '<p>Erreur lors du chargement des réservations.</p>';
        }
    },

    // ==========================================
    // Create Modals HTML
    // ==========================================
    createModals() {
        if (document.getElementById('listing-edit-modal')) return;

        const modalHTML = `
            <!-- Edit Listing Modal -->
            <div id="listing-edit-modal" class="modal-overlay" style="display:none;">
                <div class="modal-container listing-modal">
                    <div class="modal-header">
                        <h3 id="listing-modal-title">Créer une annonce</h3>
                        <button class="modal-close" onclick="ListingManager.closeModals()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="listing-form" onsubmit="ListingManager.saveListing(event)">
                            <input type="hidden" id="listing-id">
                            
                            <div class="form-group">
                                <label for="listing-category">Catégorie *</label>
                                <select id="listing-category" required onchange="ListingManager.handleCategoryChange()">
                                    <option value="lodging">🏨 Hébergement</option>
                                    <option value="activity">🎯 Activité</option>
                                </select>
                            </div>

                            <div class="form-group" id="subtype-group">
                                <label for="listing-subtype">Type de logement *</label>
                                <select id="listing-subtype" required onchange="ListingManager.toggleTypeFields()">
                                    <!-- Populated by JS -->
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="listing-title">Titre *</label>
                                <input type="text" id="listing-title" placeholder="Ex: Villa avec piscine..." required>
                            </div>

                            <div class="form-group">
                                <label for="listing-description">Description *</label>
                                <textarea id="listing-description" rows="4" placeholder="Décrivez votre offre..." required></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="listing-city">Ville *</label>
                                    <select id="listing-city" required>
                                        <option value="">Sélectionnez...</option>
                                        <option value="Alger">Alger</option>
                                        <option value="Oran">Oran</option>
                                        <option value="Constantine">Constantine</option>
                                        <option value="Annaba">Annaba</option>
                                        <option value="Béjaïa">Béjaïa</option>
                                        <option value="Tlemcen">Tlemcen</option>
                                        <option value="Ghardaïa">Ghardaïa</option>
                                        <option value="Tamanrasset">Tamanrasset</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="listing-location">Adresse</label>
                                    <input type="text" id="listing-location" placeholder="Quartier, rue...">
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="listing-phone">Numéro de téléphone de l'hôte *</label>
                                <input type="tel" id="listing-phone" placeholder="Ex: 05 55 12 34 56" required>
                                <small style="color: #6B7280; font-style: italic;">🔒 Ce numéro sera masqué et communiqué uniquement aux voyageurs après réservation.</small>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="listing-price">Prix (DA) *</label>
                                    <input type="number" id="listing-price" min="0" placeholder="5000" required>
                                    <small id="price-hint">par nuit</small>
                                </div>
                                <div class="form-group" id="max-guests-group">
                                    <label for="listing-max-guests">Capacité max</label>
                                    <input type="number" id="listing-max-guests" min="1" value="4">
                                </div>
                            </div>

                            <!-- ========== APARTMENT/LODGING FIELDS ========== -->
                            <div id="fields-apartment" class="type-fields">
                                <div class="section-title">🏠 Détails de l'hébergement</div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="apt-bedrooms">Chambres</label>
                                        <select id="apt-bedrooms">
                                            <option value="1">1 chambre</option>
                                            <option value="2">2 chambres</option>
                                            <option value="3">3 chambres</option>
                                            <option value="4">4 chambres</option>
                                            <option value="5">5+ chambres</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="apt-bathrooms">Salles de bain</label>
                                        <select id="apt-bathrooms">
                                            <option value="1">1 salle de bain</option>
                                            <option value="2">2 salles de bain</option>
                                            <option value="3">3+ salles de bain</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="apt-surface">Surface (m²)</label>
                                        <input type="number" id="apt-surface" min="10" placeholder="80">
                                    </div>
                                    <div class="form-group">
                                        <label for="apt-floor">Étage</label>
                                        <select id="apt-floor">
                                            <option value="rdc">RDC</option>
                                            <option value="1">1er étage</option>
                                            <option value="2">2ème étage</option>
                                            <option value="3">3ème étage</option>
                                            <option value="4+">4ème et +</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- ========== HOTEL FIELDS ========== -->
                            <div id="fields-hotel" class="type-fields" style="display:none;">
                                <div class="section-title">🏢 Détails de l'hôtel</div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="hotel-stars">Étoiles</label>
                                        <select id="hotel-stars">
                                            <option value="1">⭐ 1 étoile</option>
                                            <option value="2">⭐⭐ 2 étoiles</option>
                                            <option value="3" selected>⭐⭐⭐ 3 étoiles</option>
                                            <option value="4">⭐⭐⭐⭐ 4 étoiles</option>
                                            <option value="5">⭐⭐⭐⭐⭐ 5 étoiles</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="hotel-room-type">Type de chambre</label>
                                        <select id="hotel-room-type">
                                            <option value="single">Chambre Simple</option>
                                            <option value="double">Chambre Double</option>
                                            <option value="twin">Chambre Twin</option>
                                            <option value="suite">Suite</option>
                                            <option value="family">Chambre Familiale</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="hotel-checkin">Check-in</label>
                                        <input type="time" id="hotel-checkin" value="14:00">
                                    </div>
                                    <div class="form-group">
                                        <label for="hotel-checkout">Check-out</label>
                                        <input type="time" id="hotel-checkout" value="11:00">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Services inclus</label>
                                    <div class="amenities-grid">
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="hotel-services" value="breakfast"> 🥐 Petit-déjeuner
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="hotel-services" value="room-service"> 🛎️ Room Service
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="hotel-services" value="spa"> 💆 Spa
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="hotel-services" value="restaurant"> 🍽️ Restaurant
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="hotel-services" value="bar"> 🍸 Bar
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="hotel-services" value="concierge"> 🛎️ Conciergerie
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- ========== ACTIVITY FIELDS ========== -->
                            <div id="fields-activity" class="type-fields" style="display:none;">
                                <div class="section-title">🎯 Détails de l'activité</div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="activity-duration">Durée</label>
                                        <select id="activity-duration">
                                            <option value="1h">1 heure</option>
                                            <option value="2h">2 heures</option>
                                            <option value="3h">3 heures</option>
                                            <option value="half-day">Demi-journée (4h)</option>
                                            <option value="full-day">Journée complète (8h)</option>
                                            <option value="multi-day">Plusieurs jours</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="activity-difficulty">Niveau de difficulté</label>
                                        <select id="activity-difficulty">
                                            <option value="easy">🟢 Facile - Tout public</option>
                                            <option value="moderate">🟡 Modéré</option>
                                            <option value="challenging">🟠 Difficile</option>
                                            <option value="expert">🔴 Expert</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="activity-category">Catégorie</label>
                                        <select id="activity-category">
                                            <option value="adventure">🏔️ Aventure</option>
                                            <option value="culture">🏛️ Culture & Histoire</option>
                                            <option value="nature">🌿 Nature</option>
                                            <option value="food">🍽️ Gastronomie</option>
                                            <option value="water">🌊 Activités nautiques</option>
                                            <option value="sport">⚽ Sport</option>
                                            <option value="wellness">💆 Bien-être</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label for="activity-language">Langues</label>
                                        <select id="activity-language" multiple>
                                            <option value="fr" selected>🇫🇷 Français</option>
                                            <option value="ar">🇩🇿 Arabe</option>
                                            <option value="en">🇬🇧 Anglais</option>
                                            <option value="es">🇪🇸 Espagnol</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="activity-included">Ce qui est inclus</label>
                                    <textarea id="activity-included" rows="2" placeholder="Ex: Transport, déjeuner, guide, équipement..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label for="activity-bring">Ce qu'il faut apporter</label>
                                    <textarea id="activity-bring" rows="2" placeholder="Ex: Chaussures de marche, crème solaire, eau..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label>Points forts</label>
                                    <div class="amenities-grid">
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="activity-highlights" value="guide"> 👨‍🏫 Guide local
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="activity-highlights" value="transport"> 🚐 Transport inclus
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="activity-highlights" value="food"> 🍽️ Repas inclus
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="activity-highlights" value="photos"> 📸 Photos incluses
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="activity-highlights" value="small-group"> 👥 Petit groupe
                                        </label>
                                        <label class="amenity-checkbox">
                                            <input type="checkbox" name="activity-highlights" value="instant"> ⚡ Confirmation immédiate
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- ========== COMMON AMENITIES (for lodging types) ========== -->
                            <div id="common-amenities" class="form-group">
                                <label>Équipements</label>
                                <div class="amenities-grid">
                                    <label class="amenity-checkbox">
                                        <input type="checkbox" name="amenities" value="wifi"> 📶 WiFi
                                    </label>
                                    <label class="amenity-checkbox">
                                        <input type="checkbox" name="amenities" value="parking"> 🅿️ Parking
                                    </label>
                                    <label class="amenity-checkbox">
                                        <input type="checkbox" name="amenities" value="pool"> 🏊 Piscine
                                    </label>
                                    <label class="amenity-checkbox">
                                        <input type="checkbox" name="amenities" value="ac"> ❄️ Climatisation
                                    </label>
                                    <label class="amenity-checkbox">
                                        <input type="checkbox" name="amenities" value="kitchen"> 🍳 Cuisine
                                    </label>
                                    <label class="amenity-checkbox">
                                        <input type="checkbox" name="amenities" value="tv"> 📺 TV
                                    </label>
                                    <label class="amenity-checkbox">
                                        <input type="checkbox" name="amenities" value="washer"> 🧺 Lave-linge
                                    </label>
                                    <label class="amenity-checkbox">
                                        <input type="checkbox" name="amenities" value="balcony"> 🌅 Balcon/Terrasse
                                    </label>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="listing-image-url">Image principale (URL)</label>
                                <input type="url" id="listing-image-url" placeholder="https://...">
                                <small>Ou ajoutez des photos après la création</small>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="ListingManager.closeModals()">
                                    Annuler
                                </button>
                                <button type="submit" class="btn-primary">
                                    💾 Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Photos Modal -->
            <div id="listing-photos-modal" class="modal-overlay" style="display:none;">
                <div class="modal-container listing-modal">
                    <div class="modal-header">
                        <h3>📷 Gérer les photos</h3>
                        <button class="modal-close" onclick="ListingManager.closeModals()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="photos-listing-title" class="photos-listing-title"></div>
                        
                        <div class="photo-upload-zone" id="photo-upload-zone">
                            <p>📁 Glissez des images ici ou cliquez pour parcourir</p>
                            <input type="file" id="photo-input" accept="image/*" multiple style="display:none;">
                        </div>
                        
                        <div class="photo-url-input">
                            <input type="url" id="photo-url" placeholder="Ou collez l'URL d'une image...">
                            <button type="button" class="btn-primary" onclick="ListingManager.addPhotoByUrl()">
                                Ajouter
                            </button>
                        </div>
                        
                        <div id="photos-grid" class="photos-grid"></div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-primary" onclick="ListingManager.closeModals()">
                                ✓ Terminé
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Calendar Modal -->
            <div id="listing-calendar-modal" class="modal-overlay" style="display:none;">
                <div class="modal-container listing-modal calendar-modal">
                    <div class="modal-header">
                        <h3>📅 Gérer le calendrier</h3>
                        <button class="modal-close" onclick="ListingManager.closeModals()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="calendar-listing-title" class="photos-listing-title"></div>
                        
                        <div class="calendar-legend">
                            <span class="legend-item"><span class="dot available"></span> Disponible</span>
                            <span class="legend-item"><span class="dot blocked"></span> Bloqué</span>
                            <span class="legend-item"><span class="dot booked"></span> Réservé</span>
                        </div>
                        
                        <div id="listing-calendar-container"></div>
                        
                        <div class="calendar-actions">
                            <h4>Bloquer des dates</h4>
                            <div class="date-range-picker">
                                <div class="form-group">
                                    <label>Du</label>
                                    <input type="date" id="block-date-from">
                                </div>
                                <div class="form-group">
                                    <label>Au</label>
                                    <input type="date" id="block-date-to">
                                </div>
                                <button type="button" class="btn-primary" onclick="ListingManager.blockDates()">
                                    🚫 Bloquer
                                </button>
                            </div>
                            
                            <h4>Prix personnalisé (optionnel)</h4>
                            <div class="custom-pricing">
                                <div class="form-group">
                                    <label>Du</label>
                                    <input type="date" id="price-date-from">
                                </div>
                                <div class="form-group">
                                    <label>Au</label>
                                    <input type="date" id="price-date-to">
                                </div>
                                <div class="form-group">
                                    <label>Prix (DA)</label>
                                    <input type="number" id="custom-price" min="0">
                                </div>
                                <button type="button" class="btn-secondary" onclick="ListingManager.setCustomPrice()">
                                    💰 Appliquer
                                </button>
                            </div>
                        </div>
                        
                        <div class="blocked-dates-list">
                            <h4>Dates bloquées</h4>
                            <div id="blocked-dates-container"></div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-primary" onclick="ListingManager.closeModals()">
                                ✓ Terminé
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupPhotoUpload();
        this.addStyles();
    },

    // ==========================================
    // Add CSS Styles
    // ==========================================
    addStyles() {
        if (document.getElementById('listing-manager-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'listing-manager-styles';
        styles.textContent = `
            /* ================================================
               MODAL OVERLAY & CONTAINER - Improved Design
               ================================================ */
            .modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 1rem;
            }
            
            /* No blur on modals - keep content clear */
            
            .listing-modal {
                width: 100%;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                background: linear-gradient(145deg, #FEFCFB 0%, #F5F0EB 100%);
                border-radius: 20px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
                color: #1B2838;
            }
            .calendar-modal {
                max-width: 900px;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2rem;
                background: linear-gradient(135deg, #E07B53 0%, #D64545 100%);
                border-radius: 20px 20px 0 0;
                color: white;
            }
            .modal-header h3 {
                margin: 0;
                font-size: 1.4rem;
                font-weight: 700;
            }
            .modal-close {
                background: rgba(255,255,255,0.2);
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 1.5rem;
                color: white;
                cursor: pointer;
                transition: all 0.2s;
            }
            .modal-close:hover {
                background: rgba(255,255,255,0.3);
                transform: scale(1.1);
            }
            
            .modal-body {
                padding: 2rem;
            }
            
            /* ================================================
               FORM STYLES - Better Contrast
               ================================================ */
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1.5rem;
            }
            .form-group {
                margin-bottom: 1.25rem;
            }
            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #1B2838;
                font-size: 0.95rem;
            }
            .form-group input, .form-group select, .form-group textarea {
                width: 100%;
                padding: 0.85rem 1rem;
                border: 2px solid #E0D5C9;
                border-radius: 10px;
                background: white;
                color: #1B2838;
                font-size: 1rem;
                transition: all 0.2s;
            }
            .form-group input::placeholder, .form-group textarea::placeholder {
                color: #9CA3AF;
            }
            .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
                outline: none;
                border-color: #E07B53;
                box-shadow: 0 0 0 4px rgba(224, 123, 83, 0.15);
            }
            .form-group small {
                display: block;
                margin-top: 0.35rem;
                color: #6B7280;
                font-size: 0.85rem;
            }
            .form-actions {
                display: flex;
                gap: 1rem;
                margin-top: 2rem;
                justify-content: flex-end;
                padding-top: 1.5rem;
                border-top: 1px solid #E0D5C9;
            }
            .form-actions .btn-primary {
                background: linear-gradient(135deg, #E07B53 0%, #D64545 100%);
                color: white;
                padding: 0.85rem 2rem;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .form-actions .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(224, 123, 83, 0.4);
            }
            .form-actions .btn-secondary {
                background: #E5E7EB;
                color: #374151;
                padding: 0.85rem 1.5rem;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .form-actions .btn-secondary:hover {
                background: #D1D5DB;
            }
            
            /* ================================================
               AMENITIES GRID - Improved Design
               ================================================ */
            .amenities-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 0.75rem;
            }
            .amenity-checkbox {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                padding: 0.75rem 1rem;
                border-radius: 10px;
                background: white;
                border: 2px solid #E0D5C9;
                cursor: pointer;
                font-size: 0.95rem;
                color: #374151;
                transition: all 0.2s;
            }
            .amenity-checkbox:hover {
                background: #FEF3EC;
                border-color: #E07B53;
            }
            .amenity-checkbox input {
                width: 18px;
                height: 18px;
                accent-color: #E07B53;
            }
            .amenity-checkbox input:checked + * {
                color: #E07B53;
            }
            
            /* ================================================
               HOST LISTING CARD - Redesigned with Toolbar
               ================================================ */
            .host-listing-card {
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                transition: all 0.3s;
                border: 1px solid rgba(0, 0, 0, 0.05);
            }
            .host-listing-card:hover {
                transform: translateY(-6px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            }
            .listing-image-container {
                position: relative;
                height: 200px;
            }
            .listing-image-container img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .listing-type-badge {
                position: absolute;
                top: 12px;
                left: 12px;
                background: linear-gradient(135deg, #1B2838 0%, #2D3748 100%);
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 0.8rem;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            .listing-status {
                position: absolute;
                top: 12px;
                right: 12px;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 0.8rem;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            .listing-status.active {
                background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                color: white;
            }
            .listing-status.paused {
                background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
                color: white;
            }
            
            .listing-content {
                padding: 1.25rem;
            }
            .listing-title {
                font-size: 1.15rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                color: #1B2838;
            }
            .listing-location {
                color: #6B7280;
                font-size: 0.9rem;
                margin-bottom: 0.75rem;
            }
            .listing-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 1rem;
                border-bottom: 1px solid #E5E7EB;
                margin-bottom: 1rem;
            }
            .listing-price {
                font-size: 1.2rem;
                font-weight: 700;
                color: #E07B53;
            }
            .listing-rating {
                color: #374151;
                font-weight: 500;
            }
            
            /* ================================================
               LISTING ACTION TOOLBAR - Integrated Design
               ================================================ */
            .listing-actions {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                background: #F8FAFC;
                margin: -1.25rem;
                margin-top: 0;
                padding: 1rem;
                border-radius: 0 0 16px 16px;
            }
            .listing-actions button {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 0.75rem 0.5rem;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 0.75rem;
                font-weight: 600;
            }
            .listing-actions button span.icon {
                font-size: 1.3rem;
            }
            .listing-actions .btn-action-edit {
                background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
                color: white;
            }
            .listing-actions .btn-action-edit:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            .listing-actions .btn-action-photos {
                background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                color: white;
            }
            .listing-actions .btn-action-photos:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
            }
            .listing-actions .btn-action-calendar {
                background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                color: white;
            }
            .listing-actions .btn-action-calendar:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            }
            .listing-actions .btn-action-delete {
                background: #FEE2E2;
                color: #DC2626;
            }
            .listing-actions .btn-action-delete:hover {
                background: #FCA5A5;
                transform: scale(1.05);
            }
            
            /* ================================================
               PHOTOS MODAL
               ================================================ */
            .photos-listing-title {
                font-size: 1.1rem;
                font-weight: 700;
                margin-bottom: 1.25rem;
                padding-bottom: 0.75rem;
                border-bottom: 2px solid #E0D5C9;
                color: #1B2838;
            }
            .photo-upload-zone {
                border: 3px dashed #E07B53;
                border-radius: 16px;
                padding: 2.5rem;
                text-align: center;
                cursor: pointer;
                margin-bottom: 1.25rem;
                transition: all 0.2s;
                background: #FEF3EC;
                color: #1B2838;
            }
            .photo-upload-zone p {
                margin: 0;
                font-size: 1rem;
                color: #374151;
            }
            .photo-upload-zone:hover, .photo-upload-zone.drag-over {
                background: #FDE8DD;
                border-color: #D64545;
            }
            .photo-url-input {
                display: flex;
                gap: 0.75rem;
                margin-bottom: 1.25rem;
            }
            .photo-url-input input {
                flex: 1;
                padding: 0.85rem 1rem;
                border: 2px solid #E0D5C9;
                border-radius: 10px;
                background: white;
                color: #1B2838;
                font-size: 1rem;
            }
            .photo-url-input .btn-primary {
                background: linear-gradient(135deg, #E07B53 0%, #D64545 100%);
                color: white;
                border: none;
                padding: 0.85rem 1.5rem;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                white-space: nowrap;
            }
            .photos-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 1rem;
                margin-bottom: 1.5rem;
            }
            .photo-item {
                position: relative;
                aspect-ratio: 1;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .photo-item img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .photo-item .photo-actions {
                position: absolute;
                top: 8px;
                right: 8px;
                display: flex;
                gap: 6px;
            }
            .photo-item button {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: none;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            .photo-item button:hover {
                transform: scale(1.1);
            }
            .photo-item.primary::after {
                content: '⭐ Principale';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #E07B53 0%, #D64545 100%);
                color: white;
                text-align: center;
                font-size: 0.75rem;
                font-weight: 600;
                padding: 5px;
            }
            
            /* ================================================
               CALENDAR MODAL
               ================================================ */
            .calendar-legend {
                display: flex;
                gap: 2rem;
                margin-bottom: 1.25rem;
                font-size: 0.95rem;
                color: #374151;
            }
            .legend-item {
                display: flex;
                align-items: center;
                gap: 0.6rem;
            }
            .legend-item .dot {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .dot.available { background: linear-gradient(135deg, #10B981, #059669); }
            .dot.blocked { background: linear-gradient(135deg, #6B7280, #4B5563); }
            .dot.booked { background: linear-gradient(135deg, #E07B53, #D64545); }
            
            .calendar-actions h4 {
                color: #1B2838;
                margin: 1.25rem 0 0.75rem;
                font-size: 1rem;
            }
            .date-range-picker, .custom-pricing {
                display: flex;
                flex-wrap: wrap;
                gap: 0.75rem;
                align-items: flex-end;
                margin-bottom: 1rem;
                background: white;
                padding: 1rem;
                border-radius: 12px;
                border: 1px solid #E0D5C9;
            }
            .date-range-picker .form-group, .custom-pricing .form-group {
                flex: 1;
                min-width: 110px;
                margin-bottom: 0;
            }
            .date-range-picker .btn-primary, .custom-pricing .btn-secondary {
                padding: 0.85rem 1.25rem;
                border-radius: 10px;
                font-weight: 600;
                border: none;
                cursor: pointer;
            }
            .blocked-dates-list {
                margin-top: 1.5rem;
            }
            .blocked-dates-list h4 {
                color: #1B2838;
                margin-bottom: 0.75rem;
            }
            .blocked-date-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background: white;
                border: 1px solid #E0D5C9;
                border-radius: 10px;
                margin-bottom: 0.5rem;
                color: #374151;
            }
            .blocked-date-item button {
                background: none;
                border: none;
                color: #DC2626;
                cursor: pointer;
                font-size: 1.2rem;
            }
            
            /* Calendar Grid */
            .calendar-month {
                background: white;
                border-radius: 12px;
                padding: 1rem;
                margin-bottom: 1rem;
                border: 1px solid #E0D5C9;
            }
            .calendar-month h4 {
                text-align: center;
                color: #1B2838;
                margin: 0 0 1rem;
                font-size: 1.1rem;
            }
            .calendar-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
            }
            .day-header {
                text-align: center;
                font-weight: 600;
                font-size: 0.8rem;
                color: #6B7280;
                padding: 8px;
            }
            .day-cell {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                font-size: 0.9rem;
                color: #1B2838;
                background: #F0FAF6;
            }
            .day-cell.empty {
                background: transparent;
            }
            .day-cell.blocked {
                background: #E5E7EB;
                color: #6B7280;
            }
            .day-cell.past {
                background: #F9FAFB;
                color: #9CA3AF;
            }
            
            /* ================================================
               HOST LISTINGS GRID
               ================================================ */
            .host-listings-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 1.5rem;
            }
            
            @media (max-width: 768px) {
                .form-row {
                    grid-template-columns: 1fr;
                }
                .listing-modal {
                    max-width: 100%;
                    max-height: 100vh;
                    border-radius: 0;
                }
                .modal-header {
                    border-radius: 0;
                }
                .listing-actions {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            /* ================================================
               TYPE-SPECIFIC FIELD SECTIONS
               ================================================ */
            .type-fields {
                background: linear-gradient(145deg, #F0FAF6 0%, #E8F4F0 100%);
                border: 2px solid #10B981;
                border-radius: 16px;
                padding: 1.5rem;
                margin: 1.5rem 0;
                animation: slideDown 0.3s ease;
            }
            .type-fields[style*="display: none"] {
                animation: none;
            }
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            #fields-hotel {
                background: linear-gradient(145deg, #FEF3EC 0%, #FDEAE0 100%);
                border-color: #E07B53;
            }
            #fields-activity {
                background: linear-gradient(145deg, #EEF2FF 0%, #E0E7FF 100%);
                border-color: #6366F1;
            }
            .section-title {
                font-size: 1.1rem;
                font-weight: 700;
                color: #1B2838;
                margin-bottom: 1.25rem;
                padding-bottom: 0.75rem;
                border-bottom: 2px solid rgba(0, 0, 0, 0.1);
            }
            #price-hint {
                color: #6B7280;
            }
        `;
        document.head.appendChild(styles);
    },

    // ==========================================
    // Photo Upload Setup
    // ==========================================
    setupPhotoUpload() {
        const zone = document.getElementById('photo-upload-zone');
        const input = document.getElementById('photo-input');

        if (!zone || !input) return;

        zone.addEventListener('click', () => input.click());

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
            const files = e.dataTransfer.files;
            this.handlePhotoFiles(files);
        });

        input.addEventListener('change', (e) => {
            this.handlePhotoFiles(e.target.files);
        });
    },

    // ==========================================
    // Open Create Modal
    // ==========================================
    openCreateModal() {
        this.isEditing = false;
        this.currentListing = null;

        document.getElementById('listing-modal-title').textContent = 'Créer une annonce';
        document.getElementById('listing-form').reset();
        document.getElementById('listing-id').value = '';

        // Uncheck all amenities
        document.querySelectorAll('input[name="amenities"]').forEach(cb => cb.checked = false);

        document.getElementById('listing-edit-modal').style.display = 'flex';

        // Show default type fields
        this.handleCategoryChange();
    },

    // ==========================================
    // Handle Category Change
    // ==========================================
    handleCategoryChange() {
        const category = document.getElementById('listing-category').value;
        const subtypeSelect = document.getElementById('listing-subtype');
        const subtypeLabel = document.querySelector('label[for="listing-subtype"]');

        subtypeSelect.innerHTML = '';

        if (category === 'lodging') {
            subtypeLabel.textContent = "Type de logement *";
            subtypeSelect.innerHTML = `
                <option value="apartment">🏠 Appartement</option>
                <option value="hotel">🏢 Hôtel</option>
                <option value="guesthouse">🏡 Maison d'hôte</option>
                <option value="villa">🏰 Villa</option>
            `;
        } else {
            subtypeLabel.textContent = "Type d'activité *";
            subtypeSelect.innerHTML = `
                <option value="hiking">🥾 Randonnée</option>
                <option value="diving">🤿 Plongée</option>
                <option value="excursion">🚌 Excursion</option>
                <option value="culture">🏛️ Visite Culturelle</option>
                <option value="gastronomy">🍽️ Gastronomie</option>
            `;
        }

        this.toggleTypeFields();
    },

    // ==========================================
    // Toggle Type-Specific Fields
    // ==========================================
    toggleTypeFields() {
        const category = document.getElementById('listing-category').value;
        const subtype = document.getElementById('listing-subtype').value;

        // Hide all type-specific fields
        document.getElementById('fields-apartment').style.display = 'none';
        document.getElementById('fields-hotel').style.display = 'none';
        document.getElementById('fields-activity').style.display = 'none';

        // Show common amenities by default
        const amenitiesEl = document.getElementById('common-amenities');
        const maxGuestsEl = document.getElementById('max-guests-group');
        const priceHint = document.getElementById('price-hint');

        if (amenitiesEl) amenitiesEl.style.display = 'block';
        if (maxGuestsEl) maxGuestsEl.style.display = 'block';

        // Show type-specific fields
        if (category === 'lodging') {
            if (priceHint) priceHint.textContent = 'par nuit';

            if (subtype === 'hotel') {
                document.getElementById('fields-hotel').style.display = 'block';
                if (priceHint) priceHint.textContent = 'par nuit / chambre';
            } else {
                // Apartment, Villa, Guesthouse share apartment fields for now
                document.getElementById('fields-apartment').style.display = 'block';
            }
        } else {
            // Activity
            document.getElementById('fields-activity').style.display = 'block';
            if (amenitiesEl) amenitiesEl.style.display = 'none';
            if (priceHint) priceHint.textContent = 'par personne';
        }
    },

    // ==========================================
    // Open Edit Modal
    // ==========================================
    async openEditModal(id) {
        // Stringify ID to ensure matching
        const strId = String(id);
        const allListings = await API.listings.getAll();

        const listing = allListings.find(l => String(l.id) === strId);

        if (!listing) {
            this.showNotification('❌ Erreur: Annonce introuvable', 'error');
            return;
        }

        this.currentListing = listing;
        this.isEditing = true;

        document.getElementById('listing-modal-title').textContent = 'Modifier l\'annonce';

        // Use timeout to ensure modal is open before filling invalid elements? No.
        // Just fill data.

        document.getElementById('listing-id').value = listing.id;
        try {
            document.getElementById('listing-category').value = listing.category || (listing.type === 'activity' ? 'activity' : 'lodging');
            this.handleCategoryChange(); // Populate subtypes
            document.getElementById('listing-subtype').value = listing.subtype || listing.type || 'apartment';
        } catch (e) {
            console.log("Could not set category/subtype", e);
        }

        document.getElementById('listing-title').value = listing.title;
        document.getElementById('listing-description').value = listing.description;
        document.getElementById('listing-city').value = listing.cityId || listing.city; // Try ID first
        document.getElementById('listing-location').value = listing.location;

        // Handle Price (remove non-numeric if needed, or keeping stored value)
        let priceVal = listing.price;
        if (typeof listing.price === 'string') {
            priceVal = parseFloat(listing.price.replace(/[^0-9.]/g, ''));
        }
        document.getElementById('listing-price').value = priceVal;

        document.getElementById('listing-max-guests').value = listing.maxGuests || 2;

        if (listing.hostPhone) {
            const phoneInput = document.getElementById('listing-phone');
            if (phoneInput) phoneInput.value = listing.hostPhone;
        }

        document.getElementById('listing-image-url').value = listing.image || '';

        // Set amenities
        document.querySelectorAll('input[name="amenities"]').forEach(cb => {
            cb.checked = listing.amenities?.includes(cb.value);
        });

        document.getElementById('listing-edit-modal').style.display = 'flex';

        // Show appropriate type fields
        this.toggleTypeFields();
    },

    // ==========================================
    // Save Listing
    // ==========================================
    saveListing(event) {
        event.preventDefault();

        const user = this.getCurrentUser();
        if (!user) {
            this.showNotification('Vous devez être connecté', 'error');
            return;
        }

        const id = document.getElementById('listing-id').value;
        const listings = JSON.parse(localStorage.getItem(this.KEYS.LISTINGS) || '[]');

        const amenities = Array.from(document.querySelectorAll('input[name="amenities"]:checked'))
            .map(cb => cb.value);

        const price = parseInt(document.getElementById('listing-price').value);

        const listingData = {
            category: document.getElementById('listing-category').value,
            type: document.getElementById('listing-subtype').value, // Use subtype as main type for backward compatibility
            subtype: document.getElementById('listing-subtype').value,
            title: document.getElementById('listing-title').value,
            description: document.getElementById('listing-description').value,
            city: document.getElementById('listing-city').value,
            location: document.getElementById('listing-location').value || document.getElementById('listing-city').value,
            price: price + ' DA',
            priceValue: price,
            maxGuests: parseInt(document.getElementById('listing-max-guests').value) || 4,
            amenities,
            image: document.getElementById('listing-image-url').value || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            hostId: user.id || 999, // Fallback if editing static 
            hostPhone: document.getElementById('listing-phone').value,
            status: 'active'
        };

        if (this.isEditing && id) {
            // Update existing or Convert Static to Local
            // We search by string comparison to handle both number/string IDs
            const index = listings.findIndex(l => String(l.id) === String(id));

            if (index !== -1) {
                // It exists locally - Update it
                listings[index] = { ...listings[index], ...listingData };
            } else {
                // It's a static listing being edited -> Create local copy with SAME ID
                // Preserve original ID
                listingData.id = isNaN(id) ? id : Number(id);
                // Restore images if not present in form (we only have one URL input)
                if (this.currentListing && this.currentListing.images) {
                    listingData.images = this.currentListing.images;
                }
                listings.push(listingData);
            }
            this.showNotification('✅ Annonce mise à jour !', 'success');
        } else {
            // Create new
            listingData.id = Date.now() + Math.floor(Math.random() * 1000);
            listingData.rating = 0;
            listingData.reviews = 0;
            listingData.images = listingData.image ? [listingData.image] : [];
            listingData.createdAt = new Date().toISOString();
            listings.push(listingData);
            this.showNotification('🎉 Annonce créée avec succès !', 'success');
        }

        localStorage.setItem(this.KEYS.LISTINGS, JSON.stringify(listings));
        this.closeModals();
        this.renderHostListings();
    },

    // ==========================================
    // Open Photos Modal
    // ==========================================
    async openPhotoModal(id) {
        // Support pulling from API if not local
        const strId = String(id);
        const allListings = await API.listings.getAll();
        const listing = allListings.find(l => String(l.id) === strId);

        if (!listing) return;

        this.currentListing = listing;
        document.getElementById('photos-listing-title').textContent = listing.title;
        this.renderPhotos();
        document.getElementById('listing-photos-modal').style.display = 'flex';
    },

    // ==========================================
    // Render Photos in Modal
    // ==========================================
    renderPhotos() {
        const container = document.getElementById('photos-grid');
        if (!this.currentListing || !container) return;

        const images = this.currentListing.images || [this.currentListing.image].filter(Boolean);

        if (images.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Aucune photo pour le moment</p>';
            return;
        }

        container.innerHTML = images.map((img, index) => `
            <div class="photo-item ${index === 0 ? 'primary' : ''}">
                <img src="${img}" alt="Photo ${index + 1}">
                <div class="photo-actions">
                    ${index > 0 ? `<button onclick="ListingManager.setAsPrimary(${index})" title="Définir comme principale">⭐</button>` : ''}
                    <button onclick="ListingManager.removePhoto(${index})" title="Supprimer">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    // ==========================================
    // Handle Photo Files
    // ==========================================
    handlePhotoFiles(files) {
        if (!this.currentListing) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            // Use the ImageCropper to crop/resize
            if (window.ImageCropperInstance) {
                window.ImageCropperInstance.open(file, (croppedDataUrl) => {
                    this.addPhotoToListing(croppedDataUrl);
                });
            } else {
                // Fallback if cropper not loaded
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.addPhotoToListing(e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    },

    // ==========================================
    // Add Photo by URL
    // ==========================================
    addPhotoByUrl() {
        const url = document.getElementById('photo-url').value.trim();
        if (!url) return;

        this.addPhotoToListing(url);
        document.getElementById('photo-url').value = '';
    },

    // ==========================================
    // Add Photo to Listing
    // ==========================================
    addPhotoToListing(url) {
        if (!this.currentListing) return;

        let listings = JSON.parse(localStorage.getItem(this.KEYS.LISTINGS) || '[]');
        let index = listings.findIndex(l => String(l.id) === String(this.currentListing.id));

        if (index === -1) {
            // Static listing -> Create local copy
            const newLocal = { ...this.currentListing };
            if (!newLocal.images) newLocal.images = [];
            // Ensure ID consistency
            listings.push(newLocal);
            index = listings.length - 1;
        }

        if (!listings[index].images) {
            listings[index].images = [];
        }

        listings[index].images.push(url);

        // Update main image if first photo
        if (listings[index].images.length === 1) {
            listings[index].image = url;
        }

        localStorage.setItem(this.KEYS.LISTINGS, JSON.stringify(listings));
        this.currentListing = listings[index];
        this.renderPhotos();
        this.showNotification('📷 Photo ajoutée !', 'success');
        this.renderHostListings();
    },

    // ==========================================
    // Remove Photo
    // ==========================================
    removePhoto(photoIndex) {
        if (!this.currentListing) return;

        let listings = JSON.parse(localStorage.getItem(this.KEYS.LISTINGS) || '[]');
        let index = listings.findIndex(l => String(l.id) === String(this.currentListing.id));

        // If static, we must create local copy to remove a photo (even if it means copying all static photos first)
        if (index === -1) {
            const newLocal = { ...this.currentListing };
            if (!newLocal.images) newLocal.images = [newLocal.image].filter(Boolean);
            listings.push(newLocal);
            index = listings.length - 1;
        }

        if (!listings[index].images) return;

        listings[index].images.splice(photoIndex, 1);

        // Update main image
        listings[index].image = listings[index].images[0] || '';

        localStorage.setItem(this.KEYS.LISTINGS, JSON.stringify(listings));
        this.currentListing = listings[index];
        this.renderPhotos();
        this.renderHostListings();
    },

    // ==========================================
    // Set Photo as Primary
    // ==========================================
    setAsPrimary(photoIndex) {
        if (!this.currentListing) return;

        let listings = JSON.parse(localStorage.getItem(this.KEYS.LISTINGS) || '[]');
        let index = listings.findIndex(l => String(l.id) === String(this.currentListing.id));

        if (index === -1) {
            const newLocal = { ...this.currentListing };
            if (!newLocal.images) newLocal.images = [newLocal.image].filter(Boolean);
            listings.push(newLocal);
            index = listings.length - 1;
        }

        if (!listings[index].images) return;

        // Move photo to front
        const photo = listings[index].images.splice(photoIndex, 1)[0];
        listings[index].images.unshift(photo);
        listings[index].image = photo;

        localStorage.setItem(this.KEYS.LISTINGS, JSON.stringify(listings));
        this.currentListing = listings[index];
        this.renderPhotos();
        this.renderHostListings();
        this.showNotification('⭐ Photo principale mise à jour', 'success');
    },

    // ==========================================
    // Open Calendar Modal
    // ==========================================
    async openCalendarModal(id) {
        const strId = String(id);
        const allListings = await API.listings.getAll();
        const listing = allListings.find(l => String(l.id) === strId);

        if (!listing) return;

        this.currentListing = listing;
        document.getElementById('calendar-listing-title').textContent = listing.title;
        this.renderCalendar();
        this.renderBlockedDates();
        document.getElementById('listing-calendar-modal').style.display = 'flex';
    },

    // ==========================================
    // Render Calendar
    // ==========================================
    renderCalendar() {
        const container = document.getElementById('listing-calendar-container');
        if (!container || !this.currentListing) return;

        // Simple calendar display for next 3 months
        const today = new Date();
        let html = '';

        for (let m = 0; m < 3; m++) {
            const month = new Date(today.getFullYear(), today.getMonth() + m, 1);
            html += this.renderMonth(month);
        }

        container.innerHTML = html;
    },

    renderMonth(date) {
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const blockedDates = this.getBlockedDates();

        let html = `
            <div class="calendar-month">
                <h4>${monthNames[month]} ${year}</h4>
                <div class="calendar-grid">
                    ${dayNames.map(d => `<div class="day-header">${d}</div>`).join('')}
        `;

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="day-cell empty"></div>';
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isBlocked = blockedDates.includes(dateStr);
            const isPast = new Date(dateStr) < new Date().setHours(0, 0, 0, 0);

            html += `
                <div class="day-cell ${isBlocked ? 'blocked' : ''} ${isPast ? 'past' : ''}">
                    ${day}
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    },

    // ==========================================
    // Get Blocked Dates
    // ==========================================
    getBlockedDates() {
        if (!this.currentListing) return [];

        const allBlocked = JSON.parse(localStorage.getItem(this.KEYS.BLOCKED_DATES) || '{}');
        return allBlocked[this.currentListing.id] || [];
    },

    // ==========================================
    // Block Dates
    // ==========================================
    blockDates() {
        const from = document.getElementById('block-date-from').value;
        const to = document.getElementById('block-date-to').value;

        if (!from || !to || !this.currentListing) {
            this.showNotification('Veuillez sélectionner une période', 'error');
            return;
        }

        const allBlocked = JSON.parse(localStorage.getItem(this.KEYS.BLOCKED_DATES) || '{}');
        if (!allBlocked[this.currentListing.id]) {
            allBlocked[this.currentListing.id] = [];
        }

        // Generate all dates in range
        const start = new Date(from);
        const end = new Date(to);

        while (start <= end) {
            const dateStr = start.toISOString().split('T')[0];
            if (!allBlocked[this.currentListing.id].includes(dateStr)) {
                allBlocked[this.currentListing.id].push(dateStr);
            }
            start.setDate(start.getDate() + 1);
        }

        localStorage.setItem(this.KEYS.BLOCKED_DATES, JSON.stringify(allBlocked));

        // Clear inputs
        document.getElementById('block-date-from').value = '';
        document.getElementById('block-date-to').value = '';

        this.renderCalendar();
        this.renderBlockedDates();
        this.showNotification('🚫 Dates bloquées', 'success');
    },

    // ==========================================
    // Render Blocked Dates List
    // ==========================================
    renderBlockedDates() {
        const container = document.getElementById('blocked-dates-container');
        if (!container || !this.currentListing) return;

        const dates = this.getBlockedDates();

        if (dates.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);">Aucune date bloquée</p>';
            return;
        }

        // Group consecutive dates
        const ranges = this.groupConsecutiveDates(dates);

        container.innerHTML = ranges.map(range => `
            <div class="blocked-date-item">
                <span>${range.from} → ${range.to}</span>
                <button onclick="ListingManager.unblockRange('${range.from}', '${range.to}')">❌</button>
            </div>
        `).join('');
    },

    groupConsecutiveDates(dates) {
        if (dates.length === 0) return [];

        const sorted = [...dates].sort();
        const ranges = [];
        let rangeStart = sorted[0];
        let rangeEnd = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1]);
            const curr = new Date(sorted[i]);
            const diff = (curr - prev) / (1000 * 60 * 60 * 24);

            if (diff === 1) {
                rangeEnd = sorted[i];
            } else {
                ranges.push({ from: rangeStart, to: rangeEnd });
                rangeStart = sorted[i];
                rangeEnd = sorted[i];
            }
        }
        ranges.push({ from: rangeStart, to: rangeEnd });

        return ranges;
    },

    // ==========================================
    // Unblock Range
    // ==========================================
    unblockRange(from, to) {
        if (!this.currentListing) return;

        const allBlocked = JSON.parse(localStorage.getItem(this.KEYS.BLOCKED_DATES) || '{}');
        if (!allBlocked[this.currentListing.id]) return;

        const start = new Date(from);
        const end = new Date(to);

        while (start <= end) {
            const dateStr = start.toISOString().split('T')[0];
            const index = allBlocked[this.currentListing.id].indexOf(dateStr);
            if (index !== -1) {
                allBlocked[this.currentListing.id].splice(index, 1);
            }
            start.setDate(start.getDate() + 1);
        }

        localStorage.setItem(this.KEYS.BLOCKED_DATES, JSON.stringify(allBlocked));
        this.renderCalendar();
        this.renderBlockedDates();
        this.showNotification('✅ Dates débloquées', 'success');
    },

    // ==========================================
    // Set Custom Price
    // ==========================================
    setCustomPrice() {
        const from = document.getElementById('price-date-from').value;
        const to = document.getElementById('price-date-to').value;
        const price = document.getElementById('custom-price').value;

        if (!from || !to || !price || !this.currentListing) {
            this.showNotification('Veuillez remplir tous les champs', 'error');
            return;
        }

        const allPricing = JSON.parse(localStorage.getItem(this.KEYS.PRICING) || '{}');
        if (!allPricing[this.currentListing.id]) {
            allPricing[this.currentListing.id] = [];
        }

        allPricing[this.currentListing.id].push({
            from, to, price: parseInt(price)
        });

        localStorage.setItem(this.KEYS.PRICING, JSON.stringify(allPricing));

        // Clear inputs
        document.getElementById('price-date-from').value = '';
        document.getElementById('price-date-to').value = '';
        document.getElementById('custom-price').value = '';

        this.showNotification('💰 Prix personnalisé enregistré', 'success');
    },

    // ==========================================
    // Delete Listing
    // ==========================================
    deleteListing(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

        const strId = String(id);
        const listings = JSON.parse(localStorage.getItem(this.KEYS.LISTINGS) || '[]');
        const index = listings.findIndex(l => String(l.id) === strId);

        if (index !== -1) {
            // It's a local listing - remove it completely (or mark deleted if we want history)
            listings.splice(index, 1);
            localStorage.setItem(this.KEYS.LISTINGS, JSON.stringify(listings));
            this.showNotification('🗑️ Annonce supprimée', 'success');
            this.renderHostListings();
        } else {
            // It's a static/Amadeus listing we want to "hide"
            // We create a local entry with status 'deleted'
            // We need to fetch the original to keep consistency if needed, but for deletion ID is enough
            // BUT, getAll() merges based on ID. So if we have {id: '123', status: 'deleted'} in local,
            // we need getAll() to filter it out.

            // Let's create a minimal tombstone record
            const tombstone = {
                id: isNaN(id) ? id : Number(id),
                status: 'deleted',
                hostId: this.getCurrentUser().id // Claim ownership to delete it
            };

            listings.push(tombstone);
            localStorage.setItem(this.KEYS.LISTINGS, JSON.stringify(listings));
            this.showNotification('🗑️ Annonce supprimée', 'success');

            // Force refresh which should now filter this out
            this.renderHostListings();
        }
    },

    // ==========================================
    // Close Modals
    // ==========================================
    closeModals() {
        document.getElementById('listing-edit-modal').style.display = 'none';
        document.getElementById('listing-photos-modal').style.display = 'none';
        document.getElementById('listing-calendar-modal').style.display = 'none';
    },

    // ==========================================
    // Helper Functions
    // ==========================================
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('voyagedz_user'));
    },

    getTypeLabel(type) {
        const labels = {
            'lodging': '🏨 Hébergement',
            'activity': '🎯 Activité',
            'hotel': '🏢 Hôtel'
        };
        return labels[type] || type;
    },

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
};

// ==========================================
// Expose globally and initialize
// ==========================================
window.ListingManager = ListingManager;

// Legacy support
window.openCreateListingModal = () => ListingManager.openCreateModal();
window.showHostCalendar = () => {
    // Need to handle promise if getHostListings is async now
    // But for legacy support usually synchronous. We'll try.
    // However, since we made getHostListings async, this might break. 
    // Let's make this async wrapper.
    ListingManager.getHostListings().then(listings => {
        if (listings.length > 0) {
            ListingManager.openCalendarModal(listings[0].id);
        } else {
            ListingManager.showNotification('Créez d\'abord une annonce', 'info');
        }
    });
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ListingManager.init();
});
// Re-render on page navigation
if (window.navigateTo) {
    const origNavigateTo = window.navigateTo;
    window.navigateTo = function (page) {
        const result = origNavigateTo.call(this, page);
        if (page === 'host-dashboard' || page === 'host') {
            setTimeout(() => ListingManager.renderHostListings(), 100);
        }
        return result;
    };
}

console.log('✅ ListingManager loaded');
