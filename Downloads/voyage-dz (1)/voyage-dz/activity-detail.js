// ==========================================
// ACTIVITY DETAIL - GetYourGuide Style
// ==========================================
// Renders detailed activity view for visitors
// ==========================================

const ActivityDetail = {
    activity: null,
    selectedDate: null,
    selectedSlot: null,
    selectedDepartureCity: null,
    selectedLanguage: null,
    adults: 1,
    children: 0,

    // ==========================================
    // Render Activity Detail Page
    // ==========================================
    async render(containerId, activityId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<div class="loading">Chargement de l\'activité...</div>';

        try {
            // Try to fetch full activity data from API
            const res = await fetch(`/api/listings/${activityId}/full`);
            if (!res.ok) throw new Error('API not available');

            this.activity = await res.json();
            container.innerHTML = this.generateHTML();

            this.bindEvents();
            this.initSlotPicker();

        } catch (error) {
            console.warn('API unavailable, using local data:', error.message);

            // Fallback to local data from data.js
            if (window.appData && window.appData.listings) {
                const localActivity = window.appData.listings.find(l =>
                    String(l.id) === String(activityId) && l.type === 'activity'
                );

                if (localActivity) {
                    // Normalize local data to match API format
                    this.activity = this.normalizeLocalData(localActivity);
                    container.innerHTML = this.generateHTML();
                    this.bindEvents();
                    this.initLocalSlotPicker();
                    return;
                }
            }

            container.innerHTML = '<div class="error-state">Activité non trouvée</div>';
        }
    },

    // ==========================================
    // Normalize Local Data to API Format
    // ==========================================
    normalizeLocalData(local) {
        return {
            ...local,
            id: local.id,
            title: local.title,
            description: local.description,
            location: local.location,
            rating: local.rating,
            reviews_count: local.reviews || 0,
            image: local.image,
            images: local.images || [],
            price: this.parsePrice(local.price),
            duration: local.duration,
            duration_hours: local.duration_hours || this.parseDuration(local.duration),
            category: local.category || 'activities',

            // GetYourGuide fields
            meeting_point: local.meeting_point || null,
            meeting_point_details: local.meeting_point_details || null,
            what_to_bring: local.what_to_bring || [],
            good_to_know: local.good_to_know || null,
            cancellation_policy: local.cancellation_policy || 'free_24h',
            instant_confirmation: local.instant_confirmation !== false,
            skip_the_line: local.skip_the_line || false,
            max_participants: local.max_participants || 20,
            is_eco_friendly: local.is_eco_friendly || false,

            // Normalize inclusions
            inclusions: local.inclusions_list || (local.includes ?
                local.includes.map(item => ({ item, is_included: true })) : []),

            // Normalize itinerary
            itinerary: local.itinerary || [],

            // Normalize languages
            languages: local.languages ?
                (Array.isArray(local.languages) && typeof local.languages[0] === 'string' ?
                    local.languages.map((name, i) => ({
                        id: i, name, flag: this.getLanguageFlag(name), is_primary: i === 0
                    })) :
                    local.languages
                ) : [{ id: 0, name: 'Français', flag: '🇫🇷', is_primary: true }],

            // Departure cities
            departure_cities: local.departure_cities || [],
            city_name: local.city || local.location?.split(',')[1]?.trim() || 'Point de RDV',

            // Host info
            host_name: local.host_name || 'Guide Local',
            host_avatar: local.host_avatar || null,
            host_description: local.host_description || 'Votre guide local expérimenté',

            // Slots (generate mock slots for local data)
            next_slots: this.generateMockSlots()
        };
    },

    parsePrice(priceStr) {
        if (typeof priceStr === 'number') return priceStr;
        const match = priceStr?.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : 0;
    },

    parseDuration(durationStr) {
        if (!durationStr) return 2;
        const hours = durationStr.match(/(\d+(?:\.\d+)?)\s*h/i);
        if (hours) return parseFloat(hours[1]);
        if (durationStr.toLowerCase().includes('journée')) return 8;
        return 2;
    },

    getLanguageFlag(name) {
        const flags = {
            'Français': '🇫🇷', 'Anglais': '🇬🇧', 'Arabe': '🇩🇿',
            'Espagnol': '🇪🇸', 'Allemand': '🇩🇪', 'Italien': '🇮🇹'
        };
        return flags[name] || '🌍';
    },

    generateMockSlots() {
        const slots = [];
        const today = new Date();

        for (let i = 1; i <= 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // Add morning and afternoon slots
            ['09:00', '14:00'].forEach((time, idx) => {
                slots.push({
                    id: i * 10 + idx,
                    date: dateStr,
                    start_time: time,
                    capacity: 15,
                    booked_count: Math.floor(Math.random() * 10),
                    demand_level: Math.random() > 0.7 ? 'high' : 'normal'
                });
            });
        }
        return slots;
    },

    // ==========================================
    // Init Local Slot Picker (no API)
    // ==========================================
    initLocalSlotPicker() {
        const dateInput = document.getElementById('slot-date-picker');
        if (!dateInput || !window.flatpickr) return;

        const slots = this.activity.next_slots || [];
        const availableDates = [...new Set(slots.map(s => s.date))];
        const highDemandDates = [...new Set(slots.filter(s => s.demand_level === 'high').map(s => s.date))];

        this.slotPicker = flatpickr(dateInput, {
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'D j M Y',
            locale: 'fr',
            minDate: 'today',
            enable: availableDates,
            onDayCreate: (dObj, dStr, fp, dayElem) => {
                const dateStr = dayElem.dateObj.toISOString().split('T')[0];
                if (availableDates.includes(dateStr)) {
                    dayElem.classList.add('available');
                    if (highDemandDates.includes(dateStr)) {
                        dayElem.classList.add('high-demand');
                    }
                }
            },
            onChange: (selectedDates) => {
                if (selectedDates[0]) {
                    this.selectedDate = selectedDates[0].toISOString().split('T')[0];
                    this.loadLocalSlotsForDate(this.selectedDate);
                }
            }
        });
    },

    loadLocalSlotsForDate(date) {
        const container = document.getElementById('slot-times-container');
        const slotsDiv = document.getElementById('slot-times');

        if (!container || !slotsDiv) return;

        const slots = (this.activity.next_slots || []).filter(s => s.date === date);

        if (slots.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        slotsDiv.innerHTML = slots.map(slot => {
            const available = slot.capacity - slot.booked_count;
            const isLow = available <= 3;

            return `
                <button type="button" class="slot-time-btn ${slot.demand_level === 'high' ? 'high-demand' : ''}"
                        data-slot-id="${slot.id}"
                        onclick="ActivityDetail.selectSlot(${slot.id}, '${slot.start_time}')">
                    <span class="time">${slot.start_time}</span>
                    <span class="availability ${isLow ? 'low' : ''}">
                        ${available} place${available > 1 ? 's' : ''}
                    </span>
                    ${slot.demand_level === 'high' ? '<span class="demand-indicator">🔥</span>' : ''}
                </button>
            `;
        }).join('');
    },


    // ==========================================
    // Generate HTML
    // ==========================================
    generateHTML() {
        const a = this.activity;

        return `
            <article class="activity-detail">
                <!-- Gallery -->
                <section class="activity-gallery" id="activity-gallery">
                    ${this.renderGallery()}
                </section>

                <div class="activity-layout">
                    <!-- Main Content -->
                    <div class="activity-main">
                        <!-- Header -->
                        <header class="activity-header">
                            <div class="activity-meta">
                                <span class="category-badge">${this.getCategoryLabel()}</span>
                                ${a.rating ? `
                                    <div class="activity-rating">
                                        <span class="stars">⭐</span>
                                        <span class="rating-value">${a.rating}</span>
                                        <span class="rating-count">(${a.reviews_count} avis)</span>
                                    </div>
                                ` : ''}
                            </div>
                            <h1 class="activity-title">${a.title}</h1>
                            <p class="activity-location">📍 ${a.location}</p>
                        </header>

                        <!-- Highlights -->
                        <section class="activity-highlights">
                            ${this.renderHighlights()}
                        </section>

                        <!-- Languages -->
                        ${a.languages?.length > 0 ? `
                            <section class="activity-languages">
                                <h3>🗣️ Langues disponibles</h3>
                                <div class="language-badges">
                                    ${a.languages.map(lang => `
                                        <span class="language-badge ${lang.is_primary ? 'primary' : ''}">
                                            ${lang.flag} ${lang.name}
                                        </span>
                                    `).join('')}
                                </div>
                            </section>
                        ` : ''}

                        <!-- Description -->
                        <section class="activity-description">
                            <h3>À propos de cette activité</h3>
                            <div class="description-content ${a.description.length > 500 ? 'truncated' : ''}" id="description-content">
                                <p>${a.description.replace(/\n/g, '<br>')}</p>
                            </div>
                            ${a.description.length > 500 ? `
                                <button class="see-more-btn" onclick="ActivityDetail.toggleDescription()">
                                    Voir plus
                                </button>
                            ` : ''}
                        </section>

                        <!-- Inclusions -->
                        ${a.inclusions?.length > 0 ? this.renderInclusions() : ''}

                        <!-- Itinerary -->
                        ${a.itinerary?.length > 0 ? this.renderItinerary() : ''}

                        <!-- Meeting Point -->
                        ${a.meeting_point ? this.renderMeetingPoint() : ''}

                        <!-- What to Bring -->
                        ${a.what_to_bring?.length > 0 ? this.renderWhatToBring() : ''}

                        <!-- Good to Know -->
                        ${a.good_to_know ? `
                            <section class="good-to-know">
                                <h4>⚠️ Bon à savoir</h4>
                                <p>${a.good_to_know}</p>
                            </section>
                        ` : ''}

                        <!-- Departure Cities -->
                        ${a.departure_cities?.length > 0 ? this.renderDepartureCities() : ''}

                        <!-- Host Info -->
                        <section class="host-info">
                            <h3>Votre guide</h3>
                            <div class="host-card">
                                <div class="host-avatar">
                                    ${a.host_avatar ?
                `<img src="${a.host_avatar}" alt="${a.host_name}">` :
                `<span>${a.host_name.charAt(0)}</span>`
            }
                                </div>
                                <div class="host-details">
                                    <h4>${a.host_name}</h4>
                                    <p>${a.host_description || 'Guide local expérimenté'}</p>
                                </div>
                            </div>
                        </section>

                        <!-- Cancellation Policy -->
                        <section class="cancellation-policy">
                            <h3>Politique d'annulation</h3>
                            ${this.renderCancellationPolicy()}
                        </section>
                    </div>

                    <!-- Booking Widget (Sidebar) -->
                    <aside class="activity-sidebar">
                        ${this.renderBookingWidget()}
                    </aside>
                </div>
            </article>
        `;
    },

    // ==========================================
    // Render Gallery
    // ==========================================
    renderGallery() {
        const images = this.activity.images || [];
        const mainImage = this.activity.image || (images[0]?.url);

        if (!mainImage && images.length === 0) {
            return '<div class="gallery-placeholder">📸 Aucune photo</div>';
        }

        const allImages = images.length > 0 ? images : [{ url: mainImage }];
        const maxVisible = 4;
        const remaining = allImages.length - maxVisible;

        return `
            <div class="gallery-grid ${allImages.length === 1 ? 'single' : allImages.length === 2 ? 'dual' : ''}">
                <div class="gallery-main" onclick="ActivityDetail.openGallery(0)">
                    <img src="${allImages[0].url}" alt="${this.activity.title}">
                </div>
                ${allImages.length > 1 ? `
                    <div class="gallery-thumbs">
                        ${allImages.slice(1, maxVisible).map((img, i) => `
                            <div class="gallery-thumb" onclick="ActivityDetail.openGallery(${i + 1})">
                                <img src="${img.url}" alt="Photo ${i + 2}">
                                ${i === maxVisible - 2 && remaining > 0 ? `
                                    <div class="thumb-overlay">+${remaining}</div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    openGallery(startIndex) {
        const images = this.activity.images || [{ url: this.activity.image }];
        ImageManager.openGalleryModal(startIndex, images);
    },

    // ==========================================
    // Render Highlights
    // ==========================================
    renderHighlights() {
        const a = this.activity;
        const highlights = [];

        // Duration
        if (a.duration) {
            highlights.push(`<div class="highlight-item"><span class="icon">⏱️</span> ${a.duration}</div>`);
        }

        // Skip the line
        if (a.skip_the_line) {
            highlights.push(`<div class="highlight-item"><span class="icon">⚡</span> Coupe-file</div>`);
        }

        // Group size
        if (a.max_participants) {
            highlights.push(`<div class="highlight-item"><span class="icon">👥</span> Max ${a.max_participants} pers.</div>`);
        }

        // Instant confirmation
        if (a.instant_confirmation) {
            highlights.push(`<div class="highlight-item"><span class="icon">✅</span> Confirmation immédiate</div>`);
        }

        // Eco-friendly
        if (a.is_eco_friendly) {
            highlights.push(`<div class="highlight-item"><span class="icon">🌿</span> Éco-responsable</div>`);
        }

        // Free cancellation
        if (a.cancellation_policy === 'free_24h') {
            highlights.push(`<div class="highlight-item"><span class="icon">🔄</span> Annulation gratuite</div>`);
        }

        return highlights.join('');
    },

    // ==========================================
    // Render Inclusions
    // ==========================================
    renderInclusions() {
        const included = this.activity.inclusions.filter(i => i.is_included);
        const excluded = this.activity.inclusions.filter(i => !i.is_included);

        return `
            <section class="inclusions-display">
                ${included.length > 0 ? `
                    <div class="inclusions-column included">
                        <h4>✔️ Ce qui est inclus</h4>
                        <ul>
                            ${included.map(i => `<li>${i.icon || ''} ${i.item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${excluded.length > 0 ? `
                    <div class="inclusions-column excluded">
                        <h4>✗ Non inclus</h4>
                        <ul>
                            ${excluded.map(i => `<li>${i.item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </section>
        `;
    },

    // ==========================================
    // Render Itinerary
    // ==========================================
    renderItinerary() {
        return `
            <section class="itinerary-display">
                <h3>🗺️ Itinéraire</h3>
                <div class="itinerary-timeline">
                    ${this.activity.itinerary.map((stop, i) => `
                        <div class="itinerary-item">
                            <div class="itinerary-number">${i + 1}</div>
                            <div class="itinerary-content">
                                <h4>${stop.name}</h4>
                                ${stop.description ? `<p>${stop.description}</p>` : ''}
                                ${stop.duration_minutes ? `<span class="itinerary-duration">⏱️ ${stop.duration_minutes} min</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    },

    // ==========================================
    // Render Meeting Point
    // ==========================================
    renderMeetingPoint() {
        const a = this.activity;
        const mapsUrl = a.meeting_lat && a.meeting_lng
            ? `https://www.google.com/maps?q=${a.meeting_lat},${a.meeting_lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.meeting_point)}`;

        return `
            <section class="meeting-point-card">
                <h4>📍 Point de rendez-vous</h4>
                <p class="meeting-point-address">${a.meeting_point}</p>
                ${a.meeting_point_details ? `
                    <p class="meeting-point-details">${a.meeting_point_details}</p>
                ` : ''}
                <a href="${mapsUrl}" target="_blank" rel="noopener" class="map-button">
                    🗺️ Ouvrir dans Google Maps
                </a>
            </section>
        `;
    },

    // ==========================================
    // Render What to Bring
    // ==========================================
    renderWhatToBring() {
        const items = Array.isArray(this.activity.what_to_bring)
            ? this.activity.what_to_bring
            : [this.activity.what_to_bring];

        return `
            <section class="what-to-bring">
                <h4>🎒 Ce qu'il faut apporter</h4>
                <ul>
                    ${items.map(item => `<li>• ${item}</li>`).join('')}
                </ul>
            </section>
        `;
    },

    // ==========================================
    // Render Departure Cities
    // ==========================================
    renderDepartureCities() {
        return `
            <section class="departure-cities-display">
                <h4>🚐 Choisissez votre ville de départ</h4>
                <div class="departure-options">
                    <label class="departure-option selected" data-city-id="0">
                        <input type="radio" name="departure" value="0" checked>
                        <span class="departure-city-name">${this.activity.city_name} (point de RDV)</span>
                        <span class="departure-price">Inclus</span>
                    </label>
                    ${this.activity.departure_cities.map(dep => `
                        <label class="departure-option" data-city-id="${dep.city_id}">
                            <input type="radio" name="departure" value="${dep.city_id}">
                            <span class="departure-city-name">${dep.city_name}</span>
                            <span class="departure-pickup">${dep.pickup_point || ''} ${dep.pickup_time ? `• ${dep.pickup_time}` : ''}</span>
                            <span class="departure-price">${dep.extra_price > 0 ? `+${dep.extra_price.toLocaleString()} DZD` : 'Inclus'}</span>
                        </label>
                    `).join('')}
                </div>
            </section>
        `;
    },

    // ==========================================
    // Render Cancellation Policy
    // ==========================================
    renderCancellationPolicy() {
        const policy = this.activity.cancellation_policy;
        const hours = this.activity.cancellation_hours || 24;

        const policies = {
            'free_24h': `<p class="policy-free">✅ <strong>Annulation gratuite</strong> jusqu'à ${hours}h avant le début</p>`,
            'free_48h': `<p class="policy-free">✅ <strong>Annulation gratuite</strong> jusqu'à 48h avant le début</p>`,
            'flexible': `<p class="policy-flexible">🔄 <strong>Politique flexible</strong> - Remboursement partiel possible</p>`,
            'strict': `<p class="policy-strict">⚠️ <strong>Non remboursable</strong> - Aucun remboursement après réservation</p>`
        };

        return policies[policy] || policies['free_24h'];
    },

    // ==========================================
    // Render Booking Widget
    // ==========================================
    renderBookingWidget() {
        const a = this.activity;
        const hasDiscount = a.original_price && a.original_price > a.price;

        return `
            <div class="booking-widget" id="booking-widget">
                <!-- Price -->
                <div class="widget-price">
                    ${hasDiscount ? `<span class="price-original">${a.original_price.toLocaleString()} DZD</span>` : ''}
                    <div class="price-current">
                        ${a.price.toLocaleString()} DZD
                        <span class="price-unit">/ personne</span>
                    </div>
                </div>

                <!-- Urgency Badge -->
                ${this.renderUrgencyBadge()}

                <!-- Booking Form -->
                <form class="widget-form" onsubmit="ActivityDetail.handleBooking(event)">
                    <!-- Date Picker -->
                    <div class="form-group">
                        <label>📅 Date</label>
                        <input type="text" id="slot-date-picker" placeholder="Sélectionnez une date" readonly>
                    </div>

                    <!-- Time Slot -->
                    <div class="form-group" id="slot-times-container" style="display:none;">
                        <label>⏰ Horaire</label>
                        <div class="slot-times" id="slot-times">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Language -->
                    ${a.languages?.length > 1 ? `
                        <div class="form-group">
                            <label>🗣️ Langue</label>
                            <select id="language-select">
                                ${a.languages.map(l => `
                                    <option value="${l.id}" ${l.is_primary ? 'selected' : ''}>
                                        ${l.flag} ${l.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    ` : ''}

                    <!-- Participants -->
                    <div class="form-group">
                        <label>👥 Participants</label>
                        <div class="participants-control">
                            <div class="participant-row">
                                <span>Adultes</span>
                                <div class="quantity-control">
                                    <button type="button" onclick="ActivityDetail.updateParticipants('adults', -1)">-</button>
                                    <span id="adults-count">1</span>
                                    <button type="button" onclick="ActivityDetail.updateParticipants('adults', 1)">+</button>
                                </div>
                            </div>
                            <div class="participant-row">
                                <span>Enfants (3-12 ans)</span>
                                <div class="quantity-control">
                                    <button type="button" onclick="ActivityDetail.updateParticipants('children', -1)">-</button>
                                    <span id="children-count">0</span>
                                    <button type="button" onclick="ActivityDetail.updateParticipants('children', 1)">+</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Price Summary -->
                    <div class="price-summary" id="price-summary">
                        <div class="summary-row">
                            <span>Total</span>
                            <span class="total-price" id="total-price">${a.price.toLocaleString()} DZD</span>
                        </div>
                    </div>

                    <!-- Book Button -->
                    <button type="submit" class="btn btn-primary btn-block" id="book-btn" disabled>
                        Réserver maintenant
                    </button>
                </form>

                <!-- Trust Badges -->
                <div class="trust-badges">
                    <div class="trust-badge">
                        <span class="check">✓</span>
                        Annulation gratuite jusqu'à 24h avant
                    </div>
                    <div class="trust-badge">
                        <span class="check">✓</span>
                        Réservez maintenant, payez plus tard
                    </div>
                    <div class="trust-badge">
                        <span class="check">✓</span>
                        Confirmation immédiate
                    </div>
                </div>
            </div>
        `;
    },

    renderUrgencyBadge() {
        const slots = this.activity.next_slots || [];
        if (slots.length === 0) return '';

        // Check if any slot has high demand
        const highDemand = slots.some(s => s.demand_level === 'high');
        const lowAvailability = slots.some(s => (s.capacity - s.booked_count) <= 3);

        if (highDemand || lowAvailability) {
            return `
                <div class="urgency-badge">
                    🔥 ${highDemand ? 'Forte demande' : 'Dernières places'}
                </div>
            `;
        }
        return '';
    },

    // ==========================================
    // Slot Picker
    // ==========================================
    async initSlotPicker() {
        const dateInput = document.getElementById('slot-date-picker');
        if (!dateInput || !window.flatpickr) return;

        // Get available dates from slots
        const slots = this.activity.next_slots || [];
        const availableDates = [...new Set(slots.map(s => s.date))];
        const highDemandDates = [...new Set(slots.filter(s => s.demand_level === 'high').map(s => s.date))];

        this.slotPicker = flatpickr(dateInput, {
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'D j M Y',
            locale: 'fr',
            minDate: 'today',
            enable: availableDates.length > 0 ? availableDates : undefined,
            onDayCreate: (dObj, dStr, fp, dayElem) => {
                const dateStr = dayElem.dateObj.toISOString().split('T')[0];
                if (availableDates.includes(dateStr)) {
                    dayElem.classList.add('available');
                    if (highDemandDates.includes(dateStr)) {
                        dayElem.classList.add('high-demand');
                    }
                }
            },
            onChange: (selectedDates) => {
                if (selectedDates[0]) {
                    this.selectedDate = selectedDates[0].toISOString().split('T')[0];
                    this.loadSlotsForDate(this.selectedDate);
                }
            }
        });
    },

    async loadSlotsForDate(date) {
        const container = document.getElementById('slot-times-container');
        const slotsDiv = document.getElementById('slot-times');

        if (!container || !slotsDiv) return;

        try {
            const res = await fetch(`/api/listings/${this.activity.id}/slots/${date}`);
            const slots = res.ok ? await res.json() : [];

            if (slots.length === 0) {
                container.style.display = 'none';
                return;
            }

            container.style.display = 'block';
            slotsDiv.innerHTML = slots.map(slot => {
                const available = slot.capacity - slot.booked_count;
                const isLow = available <= 3;

                return `
                    <button type="button" class="slot-time-btn ${slot.demand_level === 'high' ? 'high-demand' : ''}"
                            data-slot-id="${slot.id}"
                            onclick="ActivityDetail.selectSlot(${slot.id}, '${slot.start_time}')">
                        <span class="time">${slot.start_time}</span>
                        <span class="availability ${isLow ? 'low' : ''}">
                            ${available} place${available > 1 ? 's' : ''}
                        </span>
                        ${slot.demand_level === 'high' ? '<span class="demand-indicator">%</span>' : ''}
                    </button>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading slots:', error);
        }
    },

    selectSlot(slotId, time) {
        this.selectedSlot = slotId;

        // Update UI
        document.querySelectorAll('.slot-time-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.slotId) === slotId);
        });

        // Enable book button
        document.getElementById('book-btn').disabled = false;

        this.updatePriceSummary();
    },

    // ==========================================
    // Participants Control
    // ==========================================
    updateParticipants(type, delta) {
        if (type === 'adults') {
            this.adults = Math.max(1, this.adults + delta);
            document.getElementById('adults-count').textContent = this.adults;
        } else {
            this.children = Math.max(0, this.children + delta);
            document.getElementById('children-count').textContent = this.children;
        }

        // Check max participants
        const total = this.adults + this.children;
        const max = this.activity.max_participants;
        if (max && total > max) {
            alert(`Maximum ${max} participants par réservation`);
            if (type === 'adults') this.adults--;
            else this.children--;
            document.getElementById(`${type}-count`).textContent = type === 'adults' ? this.adults : this.children;
            return;
        }

        this.updatePriceSummary();
    },

    updatePriceSummary() {
        const total = this.adults + this.children;
        const basePrice = this.activity.price * total;

        // Add departure city price
        let departureExtra = 0;
        if (this.selectedDepartureCity) {
            const dep = this.activity.departure_cities.find(d => d.city_id === this.selectedDepartureCity);
            if (dep) departureExtra = dep.extra_price * total;
        }

        const totalPrice = basePrice + departureExtra;

        document.getElementById('total-price').textContent = `${totalPrice.toLocaleString()} DZD`;
    },

    // ==========================================
    // Booking Handler
    // ==========================================
    async handleBooking(event) {
        event.preventDefault();

        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Veuillez vous connecter pour réserver');
            // Trigger login modal
            if (window.showLoginModal) showLoginModal();
            return;
        }

        if (!this.selectedDate || !this.selectedSlot) {
            alert('Veuillez sélectionner une date et un horaire');
            return;
        }

        const total = this.adults + this.children;
        const basePrice = this.activity.price * total;

        let departureExtra = 0;
        if (this.selectedDepartureCity) {
            const dep = this.activity.departure_cities.find(d => d.city_id === this.selectedDepartureCity);
            if (dep) departureExtra = dep.extra_price * total;
        }

        const bookingData = {
            listing_id: this.activity.id,
            slot_id: this.selectedSlot,
            departure_city_id: this.selectedDepartureCity || null,
            date_from: this.selectedDate,
            date_to: this.selectedDate,
            guests: total,
            adults: this.adults,
            children: this.children,
            total_price: basePrice + departureExtra,
            language_id: document.getElementById('language-select')?.value || null
        };

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });

            if (res.ok) {
                const result = await res.json();
                alert(`Réservation confirmée ! Code: ${result.confirmation_code}`);
                // Redirect to bookings page
                if (window.navigateTo) navigateTo('bookings');
            } else {
                const error = await res.json();
                alert(error.error || 'Erreur lors de la réservation');
            }
        } catch (error) {
            console.error('Booking error:', error);
            alert('Erreur réseau');
        }
    },

    // ==========================================
    // Utility Methods
    // ==========================================
    getCategoryLabel() {
        const categories = {
            'tours': '🚶 Visite guidée',
            'activities': '🎯 Activité',
            'experiences': '✨ Expérience',
            'day_trips': '🌄 Excursion',
            'food_wine': '🍷 Gastronomie'
        };
        return categories[this.activity.category] || '📍 Activité';
    },

    toggleDescription() {
        const content = document.getElementById('description-content');
        const btn = content.nextElementSibling;

        content.classList.toggle('truncated');
        btn.textContent = content.classList.contains('truncated') ? 'Voir plus' : 'Voir moins';
    },

    // ==========================================
    // Event Bindings
    // ==========================================
    bindEvents() {
        // Departure city selection
        document.querySelectorAll('.departure-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.departure-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                option.querySelector('input').checked = true;
                this.selectedDepartureCity = parseInt(option.dataset.cityId) || null;
                this.updatePriceSummary();
            });
        });

        // Sticky widget on scroll
        this.setupStickyWidget();
    },

    setupStickyWidget() {
        const widget = document.getElementById('booking-widget');
        if (!widget) return;

        // Widget is already sticky via CSS
        // Could add scroll-aware behavior here if needed
    }
};

// Expose globally
window.ActivityDetail = ActivityDetail;

console.log('✅ Activity Detail module loaded');
