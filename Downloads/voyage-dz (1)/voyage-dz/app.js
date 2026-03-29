// ==================== 
// APP LOGIC - Voyage DZ
// ====================

let currentPage = 'home';
let currentCity = null;
let currentListing = null;

// Store selected dates globally
let selectedDates = {
    from: null,
    to: null
};

// ==================== 
// INITIALIZATION
// ====================

document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen and show app
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }, 1500);

    // Initialize app

    // MERGE HOST LISTINGS
    const hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
    if (hostListings.length > 0) {
        const existingIds = new Set(appData.listings.map(l => l.id));
        const newHostListings = hostListings.filter(l => !existingIds.has(l.id));
        appData.listings = [...appData.listings, ...newHostListings];
    }


    // FETCH AMADEUS DATA (Async)
    console.log('🔍 Checking window.Amadeus:', window.Amadeus);
    if (window.Amadeus) {
        setTimeout(async () => {
            console.log('✈️ Starting Amadeus Search...');
            try {
                const results = await Promise.all([
                    Amadeus.searchHotels('ALG'),
                    Amadeus.searchHotels('ORN')
                ]);

                const amadeusHotels = results.flat();

                if (amadeusHotels.length > 0) {
                    console.log(`✅ Amadeus: ${amadeusHotels.length} found.`);
                    appData.listings = [...appData.listings, ...amadeusHotels];

                    // Re-render if on home page
                    if (currentPage === 'home') {
                        renderFeaturedListings();
                    }
                    // Re-render if on listings page
                    if (currentPage === 'explore') {
                        filterListings('all');
                    }
                }
            } catch (err) {
                console.error('Amadeus Error:', err);
            }
        }, 1000); // Increased delay to ensure load
    }

    renderCities();
    renderFeaturedListings();
    setupEventListeners();
    setupNavigation();

    // Initialize authentication
    setupLoginForm();
    updateAuthUI();
    checkHostStatus();
    setupBecomeHostForm();
    setupCreateListingForm();
    setupListingTypeChange();
    setupCitySelector();

    // Initialize hero calendar (Flatpickr)
    const heroDatesPicker = document.getElementById('hero-dates-picker');
    if (heroDatesPicker && window.CalendarSystem) {
        CalendarSystem.initHero(heroDatesPicker);
    }

    // Set min date for date inputs to today
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.setAttribute('min', today);
    });
});

// ==================== 
// RENDER FUNCTIONS
// ====================

function renderCities() {
    const container = document.getElementById('cities-grid');
    container.innerHTML = appData.cities.map(city => `
        <div class="city-card" onclick="selectCity('${city.id}')">
            <img src="${getCityImage(city.id, city.image)}" alt="${city.name}" class="city-image" onerror="this.src='https://via.placeholder.com/800x400/1a1a2e/ffffff?text=${city.name}'">
            <div class="city-overlay">
                <h3 class="city-name">${city.name}</h3>
                <p class="city-count">${city.count}</p>
            </div>
        </div>
    `).join('');
}

function renderFeaturedListings() {
    const container = document.getElementById('featured-listings');
    // Exclude packs from featured listings
    const featured = appData.listings.filter(l => l.rating >= 4.7 && l.type !== 'pack').slice(0, 6);
    container.innerHTML = featured.map(listing => createListingCard(listing)).join('');
}

function renderSearchResults(filter = 'all') {
    let results = currentCity
        ? appData.listings.filter(l => l.city === currentCity)
        : appData.listings;

    // Exclude packs
    results = results.filter(l => l.type !== 'pack');

    // Apply type filter
    if (filter !== 'all') {
        results = results.filter(l => {
            if (filter === 'lodging') return l.type === 'lodging';
            if (filter === 'activities' || filter === 'activity') return l.type === 'activity';
            if (filter === 'tours') return l.type === 'activity' && l.category === 'tours';
            return true;
        });
    }

    // Apply advanced filters (price, amenities)
    results = applyAdvancedFilters(results);

    // Render to list-view container
    const listContainer = document.getElementById('list-view');
    if (listContainer) {
        listContainer.innerHTML = results.map(listing => createListingCard(listing, true)).join('');
    }

    // Also update the hidden search-results for compatibility
    const container = document.getElementById('search-results');
    if (container) {
        container.innerHTML = results.map(listing => createListingCard(listing, true)).join('');
    }

    // Update map if in map view
    if (window.MapSystem && MapSystem.map) {
        MapSystem.addMarkers(results);
    }

    // Store filtered results for map
    window.currentFilteredListings = results;
}

function renderFilteredResults(listings) {
    // Exclude packs
    let filtered = listings.filter(l => l.type !== 'pack');

    // Apply advanced filters
    filtered = applyAdvancedFilters(filtered);

    // Render to list-view
    const listContainer = document.getElementById('list-view');
    if (listContainer) {
        listContainer.innerHTML = filtered.map(listing => createListingCard(listing, true)).join('');
    }

    // Also update hidden search-results
    const container = document.getElementById('search-results');
    if (container) {
        container.innerHTML = filtered.map(listing => createListingCard(listing, true)).join('');
    }

    // Update map
    if (window.MapSystem && MapSystem.map) {
        MapSystem.addMarkers(filtered);
    }

    window.currentFilteredListings = filtered;
}

// Apply advanced filters (price range, amenities)
function applyAdvancedFilters(listings) {
    const priceMin = parseInt(document.getElementById('price-min')?.value || 0);
    const priceMax = parseInt(document.getElementById('price-max')?.value || 50000);

    // Get checked housing types (formerly amenities - logic changed to OR for types)
    const typeCheckboxes = document.querySelectorAll('.filter-checkbox input:checked');
    const selectedTypes = Array.from(typeCheckboxes).map(cb => cb.value);

    // Get dropdown value
    const dropdown = document.getElementById('filter-dropdown');
    if (dropdown && dropdown.value) {
        selectedTypes.push(dropdown.value);
    }

    return listings.filter(listing => {
        // Price filter - handle both string and number types
        let priceNum;
        if (typeof listing.price === 'string') {
            priceNum = parseInt(listing.price.replace(/[^0-9]/g, ''));
        } else if (typeof listing.price === 'number') {
            priceNum = listing.price;
        } else {
            // If price is undefined or invalid, default to 0
            priceNum = 0;
        }

        if (priceNum < priceMin || priceNum > priceMax) return false;

        // Housing Type Filter (OR logic: Show listing if it matches ANY selected type)
        if (selectedTypes.length > 0) {
            const matchesType = selectedTypes.some(type => {
                // Normalize accented characters for comparison
                const normalize = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const term = normalize(type);

                // Special case mapping if needed (e.g. 'Maison' matches 'Riad')
                if (term === 'maison' && (listing.title.toLowerCase().includes('riad') || listing.description.toLowerCase().includes('riad'))) {
                    return true;
                }

                // Check both normalized and original values
                const titleMatch = listing.title && normalize(listing.title).includes(term);
                const descMatch = listing.description && normalize(listing.description).includes(term);
                const typeMatch = listing.type && normalize(listing.type).includes(term);
                const categoryMatch = listing.category && normalize(listing.category).includes(term);

                return titleMatch || descMatch || typeMatch || categoryMatch;
            });

            if (!matchesType) return false;
        }

        return true;
    });
}

// Update Dynamic Filters based on Category
function updateDynamicFilters(category) {
    const container = document.getElementById('dynamic-filters-container');
    if (!container) return; // Silent fail if container missing (e.g. on other pages)

    let html = '';
    let label = '';
    let checkboxes = [];
    let dropdownOptions = [];

    if (category === 'lodging') {
        label = '🏠 Type de logement';
        checkboxes = [
            { value: 'Hôtel', icon: '🏨' },
            { value: 'Appartement', icon: '🏢' }
        ];
        dropdownOptions = [
            { value: 'Maison', label: '🏡 Maison' },
            { value: 'Villa', label: '🌴 Villa' },
            { value: 'Bungalow', label: '🏠 Bungalow' },
            { value: 'Riad', label: '🕌 Riad' }
        ];
    } else if (category === 'activities') {
        label = '🎭 Type d\'activité';
        checkboxes = [
            { value: 'Visites', icon: '🚐' }, // Matches "Tours" usually
            { value: 'Plongée', icon: '🤿' }
        ];
        dropdownOptions = [
            { value: 'Cuisine', label: '🍳 Cuisine' },
            { value: 'Randonnée', label: '🥾 Randonnée' },
            { value: 'Excursion', label: '🗺️ Excursion' },
            { value: 'Sport', label: '🏄‍♂️ Sport' }
        ];
    } else {
        // 'all' or default - Show EVERYTHING side-by-side as requested
        label = '🔍 Filtres rapides';
        checkboxes = [
            { value: 'Hôtel', icon: '🏨' },
            { value: 'Appartement', icon: '🏢' },
            { value: 'Plongée', icon: '🤿' },
            { value: 'Randonnée', icon: '🥾' }
        ];
        dropdownOptions = [
            { value: '', label: '➕ Autres filtres...' }, // Placeholder
            { value: 'Maison', label: '🏡 Maison' },
            { value: 'Villa', label: '🌴 Villa' },
            { value: 'Visites', label: '🚐 Visites' },
            { value: 'Plongée', label: '🤿 Plongée' },
            { value: 'Cuisine', label: '🍳 Cuisine' }
        ];
    }

    // Explicitly expose triggerFilterUpdate globally just in case
    // (Actual definition is in setupEventListeners but we need to ensure ability to call it)
    // We'll rely on the global window.triggerFilterUpdate defined later.

    html = `
        <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
            ${label}:
        </label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
            ${checkboxes.map(cb => `
                <label class="filter-checkbox amenity-checkbox">
                    <input type="checkbox" value="${cb.value}"> ${cb.icon} ${cb.value}
                </label>
            `).join('')}
            
            <select id="filter-dropdown" style="padding: 0.4rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white; font-size: 0.9rem;">
                <option value="">➕ Autres...</option>
                ${dropdownOptions.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
            </select>
        </div>
    `;

    container.innerHTML = html;

    // Re-attach event listeners to new inputs
    // Assuming window.triggerFilterUpdate exists
    const handler = window.triggerFilterUpdate || function () { console.warn('triggerFilterUpdate not ready'); };

    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', handler);
    });
    const dropdownSelect = container.querySelector('select');
    if (dropdownSelect) {
        dropdownSelect.addEventListener('change', handler);
    }
}

// Make updateDynamicFilters globally available
window.updateDynamicFilters = updateDynamicFilters;

// Toggle between list and map view
function toggleView(viewType) {
    const listView = document.getElementById('list-view');
    const mapView = document.getElementById('map-view');
    const listBtn = document.getElementById('view-list-btn');
    const mapBtn = document.getElementById('view-map-btn');

    if (viewType === 'list') {
        listView.style.display = 'grid';
        mapView.style.display = 'none';
        listBtn.classList.add('active');
        mapBtn.classList.remove('active');
    } else {
        listView.style.display = 'none';
        mapView.style.display = 'block';
        listBtn.classList.remove('active');
        mapBtn.classList.add('active');

        // Initialize map if not already done
        if (!MapSystem.map) {
            MapSystem.init('listings-map');
        }

        // Add markers for current filtered listings
        const listings = window.currentFilteredListings || appData.listings.filter(l => l.type !== 'pack');
        MapSystem.addMarkers(listings);

        // Center on city if selected
        if (currentCity) {
            MapSystem.centerOnCity(currentCity);
        }
    }
}

// Make toggleView globally available
window.toggleView = toggleView;

function createListingCard(listing, fullWidth = false) {
    const isFavorite = API.favorites.isFavorite(listing.id);
    // Category Label Logic (Specific > Generic)
    let typeLabel = 'Expérience';

    // Map categories to display names
    const categoryMap = {
        'hotel': 'Hôtel',
        'apartment': 'Appartement',
        'villa': 'Villa',
        'riad': 'Riad',
        'hostel': 'Auberge',
        'lodging': 'Hébergement',
        'tours': 'Visite',
        'food': 'Gastronomie',
        'nature': 'Nature',
        'activities': 'Activité'
    };

    if (listing.category && categoryMap[listing.category.toLowerCase()]) {
        typeLabel = categoryMap[listing.category.toLowerCase()];
    } else if (listing.type === 'lodging') {
        typeLabel = 'Hébergement';
    } else if (listing.type === 'activity') {
        typeLabel = 'Activité';
    }

    // Color Logic
    // Housing -> Dark Terracotta (User Request)
    // Activities -> Teal/Blue Contrast
    let typeColor = 'var(--secondary)';

    if (listing.type === 'lodging' || listing.type === 'hotel') {
        typeColor = 'var(--primary-dark)';
    } else if (listing.type === 'activity') {
        typeColor = 'var(--accent-dark)';
    }
    const heartFill = isFavorite ? 'var(--primary)' : 'none';
    const heartStroke = isFavorite ? 'var(--primary)' : 'currentColor';

    return `
        <div class="listing-card ${fullWidth ? 'full-width' : ''}" onclick="showDetail('${listing.id}')" style="cursor: pointer;">
            <div class="listing-image-container">
                <img src="${getListingImage(listing.id, listing.type, listing.image)}" alt="${listing.title}" class="listing-image" data-listing-id="${listing.id}" onerror="this.src='https://via.placeholder.com/400x300/1a1a2e/ffffff?text=Image'" style="cursor: pointer;">
                <div class="listing-badge" style="background: ${typeColor};">${typeLabel}</div>
                <button class="listing-fav-btn" onclick="event.stopPropagation(); toggleCardFavorite('${listing.id}', this)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${heartFill}" stroke="${heartStroke}" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </div>
            <div class="listing-content" data-listing-id="${listing.id}">
                <h3 class="listing-title">${listing.title}</h3>
                <div class="listing-location">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>${listing.location}</span>
                </div>
                <div class="listing-footer">
                    <div class="listing-price">${listing.price}</div>
                    <div class="listing-rating">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--warning)" stroke="var(--warning)" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        <span>${listing.rating}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* Duplicate removed


    currentListing = listing;

    // Populate detail page
    document.getElementById('detail-title').textContent = listing.title;
    document.getElementById('detail-location').textContent = listing.location;
    document.getElementById('detail-price').textContent = listing.price;
    document.getElementById('detail-description').textContent = listing.description;
    document.getElementById('detail-rating').textContent = listing.rating;
    document.getElementById('detail-image').src = listing.image;

    // Update favorite button on detail page
    const favBtn = document.getElementById('detail-fav-btn');
    const isFavorite = API.favorites.isFavorite(listing.id);
    const svg = favBtn.querySelector('svg');
    svg.setAttribute('fill', isFavorite ? 'var(--primary)' : 'none');
    svg.setAttribute('stroke', isFavorite ? 'var(--primary)' : 'currentColor');

    // Populate amenities
    const amenitiesContainer = document.getElementById('detail-amenities');
    amenitiesContainer.innerHTML = listing.amenities.map(amenity => `
        <div class="amenity-item">
            <span>•</span>
            <span>${amenity}</span>
        </div>
    `).join('');

    // Setup booking dates if selected globally
    const dateFromInput = document.getElementById('booking-date-from');
    const dateToInput = document.getElementById('booking-date-to');

    if (dateFromInput && selectedDates.from) dateFromInput.value = selectedDates.from;
    if (dateToInput && selectedDates.to) dateToInput.value = selectedDates.to;

*/

function toggleCardFavorite(listingId, button) {
    // Determine context (search results or detail page)
    const isDetailBtn = button.id === 'detail-fav-btn';

    API.favorites.toggle(listingId);
    const isFavorite = API.favorites.isFavorite(listingId);
    const svg = button.querySelector('svg');

    // Update visual state immediately
    svg.setAttribute('fill', isFavorite ? 'var(--primary)' : 'none');
    svg.setAttribute('stroke', isFavorite ? 'var(--primary)' : 'currentColor');

    // Animate
    button.classList.add('pulse');
    setTimeout(() => button.classList.remove('pulse'), 300);

    // If we are on favorites page, removing an item should remove it from DOM immediately
    if (currentPage === 'favorites' && !isFavorite && !isDetailBtn) {
        const card = button.closest('.listing-card');
        if (card) {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
                card.remove();
                // Check if empty
                const container = document.getElementById('favorites-grid');
                if (container.children.length === 0) {
                    renderFavorites(); // Show empty state
                }
            }, 300);
        }
    }
}

function showDetail(listingId) {
    // Debug logging
    console.log('🔍 showDetail called with ID:', listingId, 'Type:', typeof listingId);
    console.log('📋 Available listings:', appData.listings.map(l => ({ id: l.id, type: typeof l.id, title: l.title })));

    // Handle both numeric IDs (local) and string IDs (Amadeus) - improved comparison
    currentListing = appData.listings.find(l => String(l.id) === String(listingId));

    if (!currentListing) {
        console.error('❌ Listing not found for ID:', listingId);
        console.error('📋 Available IDs:', appData.listings.map(l => l.id));
        return;
    }

    console.log('✅ Found listing:', currentListing.title, 'Type:', currentListing.type);

    // ========== ACTIVITY DETAIL (GetYourGuide Style) ==========
    // For activities, use the new ActivityDetail module
    if (currentListing.type === 'activity' && window.ActivityDetail) {
        console.log('🎯 Using ActivityDetail module for activity');
        const detailContainer = document.getElementById('detail-content');
        navigateTo('detail');
        ActivityDetail.render('detail-content', listingId);
        return;
    }
    // ========== END ACTIVITY DETAIL ==========

    const detailContent = document.getElementById('detail-content');
    const isFavorite = API.favorites.isFavorite(listingId);

    // Enhanced Amenities HTML
    const amenitiesHtml = currentListing.amenities ? `
            <div class="detail-section">
                <h3 class="detail-section-title">Équipements</h3>
                <div class="amenities-grid">
                    ${currentListing.amenities.map(a => `
                        <div class="amenity-item">
                            <span>✨</span>
                            <span>${a}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

    // Room Selection HTML (for hotels)
    const roomSelectionHtml = currentListing.type === 'hotel' && currentListing.rooms ? `
            <div class="detail-section">
                <h3 class="detail-section-title">Choisir une chambre</h3>
                <div class="rooms-grid" style="display: grid; gap: 15px; margin-top: 10px;">
                    ${currentListing.rooms.map((room, index) => `
                        <div class="room-card ${index === 0 ? 'selected' : ''}" 
                            onclick="selectRoom('${room.id}', ${room.price}, this)"
                            data-room-id="${room.id}"
                            style="border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.02); cursor: pointer; transition: 0.2s;">
                            <div style="display: flex;">
                                <img src="${room.image}" style="width: 120px; height: 100px; object-fit: cover;">
                                <div style="padding: 10px; flex: 1;">
                                    <div style="display: flex; justify-content: space-between;">
                                        <h4 style="margin: 0; font-size: 1rem;">${room.name}</h4>
                                        <span style="color: var(--primary); font-weight: bold;">${room.price.toLocaleString('fr-DZ')} DA</span>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px;">
                                        🛏️ ${room.beds} • 👥 ${room.capacity} pers • 📏 ${room.size}
                                    </div>
                                </div>
                                <div class="room-radio" style="display: flex; align-items: center; padding-right: 15px;">
                                    <input type="radio" name="room-selection" ${index === 0 ? 'checked' : ''} style="pointer-events: none;">
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

    detailContent.innerHTML = `
        <div class="detail-gallery">
            <img src="${getListingImage(currentListing.id, currentListing.type, currentListing.image)}" alt="${currentListing.title}" onerror="this.src='https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Image'">
        </div>
        <div class="detail-info">
            <h1 class="detail-title">${currentListing.title}</h1>
            
            <div class="detail-meta">
                <div class="detail-rating">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--warning)" stroke="var(--warning)" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span>${currentListing.rating} (${currentListing.reviews} avis)</span>
                </div>
                <div class="detail-location">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>${currentListing.location}</span>
                </div>
                


                <!-- New Feature: Action Buttons -->
                <div style="margin-left: auto; display: flex; gap: 10px;">
                    <button class="btn-secondary" onclick="shareListing()" style="padding: 8px 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        Partager
                    </button>
                    <button class="btn-secondary" onclick="contactHost()" style="padding: 8px 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Contacter
                    </button>
                </div>
            </div>

            ${roomSelectionHtml}

            <!-- Enhanced Description -->
            <div class="detail-description" style="margin-top: 15px;">
                ${currentListing.description}
            </div>

            ${amenitiesHtml}

            <!-- Booking Benefits Badges (for lodging types only) -->
            ${(currentListing.type === 'hotel' || currentListing.type === 'lodging') ? `
            <div class="booking-benefits" style="margin-top: 1.5rem; padding: 1rem; background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-md); border: 1px solid rgba(16, 185, 129, 0.2);">
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; color: #10B981;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span style="color: var(--text-primary);">Annulation gratuite jusqu'à 24h avant</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; color: #10B981;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span style="color: var(--text-primary);">Réservez maintenant, payez plus tard</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; color: #10B981;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span style="color: var(--text-primary);">Confirmation immédiate</span>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Booking Section -->
        <div class="booking-section" style="margin-top: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.05); border-radius: var(--radius-lg); border: 1px solid rgba(255,255,255,0.1);">
            <h3 style="margin-bottom: 1rem; font-size: 1.2rem;">📅 Réserver</h3>

            <!-- Date Picker Container -->
            <div class="date-selection-container" style="margin-bottom: 1.5rem;">
                <input type="text" id="booking-dates-picker" placeholder="Sélectionner les dates"
                    style="width: 100%; padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white; margin-bottom: 10px;">

                    <div id="booking-dates-display" style="font-size: 0.9rem; color: var(--text-secondary); min-height: 20px;"></div>
            </div>

            <div class="booking-summary" style="margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-md);">
                <div class="booking-detail" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: var(--text-secondary);">Check-in</span>
                    <span id="check-in-date" style="font-weight: 600;">Non sélectionné</span>
                </div>
                <div class="booking-detail" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: var(--text-secondary);">Check-out</span>
                    <span id="check-out-date" style="font-weight: 600;">Non sélectionné</span>
                </div>
                <div class="booking-detail" style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                    <span style="color: var(--text-secondary);">Nuits</span>
                    <span id="nights-count" style="font-weight: 600;">0 nuit</span>
                </div>
            </div>

            <div class="price-breakdown" style="margin-bottom: 1rem;">
                <div class="price-line" style="display: flex; justify-content: space-between; padding: 0.5rem 0; color: var(--text-secondary);">
                    <span>Prix par nuit</span>
                    <span id="price-per-night">${currentListing.price}</span>
                </div>
                <div class="price-line" style="display: flex; justify-content: space-between; padding: 0.5rem 0; color: var(--text-secondary);">
                    <span>Frais de service (5%)</span>
                    <span id="service-fees">-- DZD</span>
                </div>
                <div class="price-line price-total" style="display: flex; justify-content: space-between; padding: 0.75rem 0; margin-top: 0.5rem; border-top: 2px solid rgba(255,255,255,0.2); font-size: 1.1rem; font-weight: 700;">
                    <span><strong>Total</strong></span>
                    <span id="total-price" style="color: var(--primary);">-- DZD</span>
                </div>
            </div>

            <button id="book-button" class="btn-primary btn-full" onclick="handleBooking()" style="width: 100%; padding: 1rem; font-size: 1.1rem; background: var(--primary); cursor: pointer;">
                🎯 Réserver maintenant
            </button>
        </div>

        </div >
        `;

    // Ensure first room price is set if hotel
    if (currentListing.type === 'hotel' && currentListing.rooms) {
        window.currentRoomPrice = currentListing.rooms[0].price;
    } else {
        window.currentRoomPrice = parseInt(currentListing.price.replace(/[^0-9]/g, ''));
    }

    // Initialize Calendar & Reviews
    // Use longer timeout to ensure DOM is fully loaded
    setTimeout(() => {


        const dateInput = document.getElementById('booking-dates-picker');

        if (!dateInput) {
            console.error('❌ Element booking-dates-picker non trouvé dans le DOM');
            return;
        }

        if (!window.CalendarSystem) {
            console.error('❌ CalendarSystem non chargé');
            return;
        }

        if (!window.flatpickr) {
            console.error('❌ Flatpickr non chargé - vérifier que la librairie est incluse dans index.html');
            return;
        }

        console.log('✅ Initialisation du calendrier pour listing', listingId);

        // Check if dates were selected in search/hero
        const globalDates = CalendarSystem.getGlobalDates();
        if (globalDates && globalDates.from && globalDates.to) {
            console.log('📅 Dates globales trouvées:', globalDates);
        } else {
            console.log('📅 Aucune date globale sélectionnée');
        }

        // Initialize the calendar
        CalendarSystem.init(listingId, dateInput, globalDates);

        // Initial Render of Reviews
        if (window.renderReviewsList) {
            window.renderReviewsList(listingId);
        }
    }, 300); // Increased timeout from 100ms to 300ms

    // Navigate to detail page
    navigateTo('detail');
}

// ⚠️ CRITICAL: Expose showDetail globally so onclick handlers can access it
window.showDetail = showDetail;


window.hideDetailModal = function () {
    const modal = document.getElementById('detail-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
};

// Function to handle room selection
window.selectRoom = function (roomId, price, element) {
    // Update visual selection
    document.querySelectorAll('.room-card').forEach(card => {
        card.classList.remove('selected');
        card.style.borderColor = 'rgba(255,255,255,0.1)';
        card.querySelector('input').checked = false;
    });

    element.classList.add('selected');
    element.style.borderColor = 'var(--primary)';
    element.querySelector('input').checked = true;

    // Update price
    window.currentRoomPrice = price;

    // Update display if dates are selected
    if (window.updatePriceCalculation) {
        window.updatePriceCalculation();
    } else {
        // Fallback or trigger calendar update
        const priceDisplay = document.getElementById('price-per-night');
        if (priceDisplay) {
            priceDisplay.textContent = price.toLocaleString('fr-DZ') + ' DA';
        }
    }
};

// Extracted from original ShowDetail to keep existing logic valid
function _old_logic_placeholder() {



    // Update favorite button state
    const favBtn = document.getElementById('detail-fav-btn');
    if (favBtn) {
        const svg = favBtn.querySelector('svg');
        svg.setAttribute('fill', isFavorite ? 'var(--primary)' : 'none');
        svg.setAttribute('stroke', isFavorite ? 'var(--primary)' : 'currentColor');
    }

    // Dates are now pre-filled by CalendarSystem.init via Flatpickr (see below)

    // Show date selection reminder (if elements exist)
    const dateDisplay = document.getElementById('detail-date-display');
    const selectionBox = document.getElementById('detail-selection-box');

    if (dateDisplay && selectionBox) {
        if (selectedDates.from && selectedDates.to) {
            const fromDate = new Date(selectedDates.from);
            const toDate = new Date(selectedDates.to);
            dateDisplay.textContent = `${fromDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${toDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} `;
            selectionBox.style.display = 'block';
        } else if (selectedDates.from) {
            const fromDate = new Date(selectedDates.from);
            dateDisplay.textContent = `À partir du ${fromDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} `;
            selectionBox.style.display = 'block';
        } else {
            selectionBox.style.display = 'none';
        }
    }


    // Calculate and display prices if dates are selected
    if (selectedDates.from && selectedDates.to) {
        const fromDate = new Date(selectedDates.from);
        const toDate = new Date(selectedDates.to);
        const nights = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

        // Update date displays
        const checkInEl = document.getElementById('check-in-date');
        const checkOutEl = document.getElementById('check-out-date');
        const nightsEl = document.getElementById('nights-count');

        if (checkInEl) checkInEl.textContent = fromDate.toLocaleDateString('fr-FR');
        if (checkOutEl) checkOutEl.textContent = toDate.toLocaleDateString('fr-FR');
        if (nightsEl) nightsEl.textContent = `${nights} nuit${nights > 1 ? 's' : ''} `;

        // Calculate prices
        const priceMatch = currentListing.price.match(/[\d,]+/);
        const pricePerNight = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
        const subtotal = pricePerNight * nights;
        const serviceFees = subtotal * 0.05;
        const total = subtotal + serviceFees;

        // Update price displays
        const subtotalEl = document.getElementById('subtotal-price');
        const feesEl = document.getElementById('service-fees');
        const totalEl = document.getElementById('total-price');

        if (subtotalEl) subtotalEl.innerHTML = `${subtotal.toFixed(2)} <small>DZD</small>`;
        if (feesEl) feesEl.innerHTML = `${serviceFees.toFixed(2)} <small>DZD</small>`;
        if (totalEl) totalEl.innerHTML = `< strong > ${total.toFixed(2)}</strong > <small>DZD</small>`;

        // Enable booking button
        const bookBtn = document.getElementById('book-button');
        if (bookBtn) {
            bookBtn.disabled = false;
            bookBtn.style.opacity = '1';
            bookBtn.style.cursor = 'pointer';
        }
    }

    navigateTo('detail');
}

// ==================== 
// NAVIGATION
// ====================

const navigateTo = (pageId) => {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    // Show target page
    const targetPage = document.getElementById(pageId + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
        currentPage = pageId;

        // Custom Logic for Pages
        if (pageId === 'search') {
            renderSearchResults();
        } else if (pageId === 'bookings') {
            // Check if user is host/admin to show received bookings vs. my trips
            const user = API.auth.getUser();
            if (user && (user.isHost || user.role === 'admin')) {
                // Determine if we show "My Trips" or "Client Bookings"
                // For now, let's show Client Bookings by default for Host in this view, 
                // or maybe we need a toggle.
                // Simpler: If Host Dashboard is separate, "Bookings" page in Profile usually means "My Trips".
                // But the Host Dashboard has a "Reservations" entry? 

                // Let's keep 'bookings' page for "My Trips" (bookings I made)
                // And use 'host-dashboard' or a sub-view for "Client Bookings"
                renderBookings();
            } else {
                renderBookings();
            }
        } else if (pageId === 'favorites') {
            renderFavorites();
        } else if (pageId === 'host-dashboard') {
            // Render Host Dashboard Listings
            if (window.ListingManager) {
                window.ListingManager.renderHostListings();
                // Also render bookings if there's a container for it in dashboard (optional)
                // window.ListingManager.renderHostBookings(); 
            }
        }
    }

    // Update Bottom Nav
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (pageId === 'search') {
        updateSearchDatesDisplay();
        // Update city filter dropdown to match current city
        const cityFilter = document.getElementById('search-city-filter');
        if (cityFilter && window.currentCity) {
            cityFilter.value = window.currentCity;
        }
    }
};

window.showMyListingsInProfile = function () {
    navigateTo('host-dashboard');
};

function updateSearchDatesDisplay() {
    const display = document.getElementById('search-dates-display');
    if (!display) return;

    if (window.selectedDates && window.selectedDates.from && window.selectedDates.to) {
        const fromDate = new Date(window.selectedDates.from);
        const toDate = new Date(window.selectedDates.to);
        display.textContent = `${fromDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${toDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} `;
        display.style.color = 'var(--text-primary)';
        display.style.fontWeight = '500';
    } else if (window.selectedDates && window.selectedDates.from) {
        const fromDate = new Date(window.selectedDates.from);
        display.textContent = `À partir du ${fromDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} `;
        display.style.color = 'var(--text-primary)';
    } else {
        display.textContent = 'Dates non sélectionnées';
        display.style.color = 'var(--text-secondary)';
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.dataset.page;

            // Block Profile access if not logged in
            if (page === 'profile' && (!window.authSystem || !window.authSystem.isAuthenticated())) {
                e.preventDefault();
                e.stopPropagation();
                // Optional: window.authSystem.openLoginModal(); // Or just silent block as it is "disabled"
                return;
            }

            navigateTo(page);
        });
    });
}

function selectCity(cityId) {
    currentCity = cityId;
    navigateTo('search');
}

// ==================== 
// EVENT LISTENERS
// ====================

function setupEventListeners() {
    // Search inputs
    const searchInput = document.getElementById('search-input');
    const typeInput = document.getElementById('search-type');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const searchBtn = document.getElementById('search-btn');

    // Store dates globally when changed
    if (dateTo) {
        dateTo.addEventListener('change', (e) => {
            selectedDates.to = e.target.value;
            updateSearchDatesDisplay();
        });
    }

    if (dateFrom) {
        dateFrom.addEventListener('change', (e) => {
            selectedDates.from = e.target.value;
            // Auto-set min for date-to
            if (dateTo) dateTo.min = e.target.value;
            updateSearchDatesDisplay();
        });
    }

    function performSearch() {
        const selectedCity = searchInput?.value || null;
        const selectedType = typeInput?.value || 'all';

        currentCity = selectedCity || null;

        let filtered = appData.listings.filter(l => l.type !== 'pack');

        if (selectedCity) {
            filtered = filtered.filter(l => l.city === selectedCity);
        }

        if (selectedType && selectedType !== 'all') {
            filtered = filtered.filter(l => l.type === selectedType);
        }

        renderFilteredResults(filtered);
        navigateTo('search');
    }

    // Only navigate when search button is clicked (not when city dropdown changes)
    if (searchBtn) searchBtn.addEventListener('click', performSearch);

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');

            // Update the category-specific filters
            if (window.updateDynamicFilters) {
                window.updateDynamicFilters(e.target.dataset.filter);
            }

            renderSearchResults(e.target.dataset.filter);
        });
    });

    // City filter dropdown on discover page
    const searchCityFilter = document.getElementById('search-city-filter');
    if (searchCityFilter) {
        searchCityFilter.addEventListener('change', (e) => {
            currentCity = e.target.value || null;
            // Get current type filter
            const activeChip = document.querySelector('.filter-chip.active');
            const currentFilter = activeChip ? activeChip.dataset.filter : 'all';
            renderSearchResults(currentFilter);
        });
    }

    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            currentCity = null;
            renderSearchResults(category);
            navigateTo('search');
        });
    });

    // Price range filters
    const priceMin = document.getElementById('price-min');
    const priceMax = document.getElementById('price-max');
    const priceDisplay = document.getElementById('price-range-display');

    function updatePriceDisplay() {
        const min = parseInt(priceMin?.value || 0);
        const max = parseInt(priceMax?.value || 50000);
        if (priceDisplay) {
            priceDisplay.textContent = `${min.toLocaleString('fr-DZ')} - ${max.toLocaleString('fr-DZ')} DA`;
        }
    }

    window.triggerFilterUpdate = function () {
        const activeChip = document.querySelector('.filter-chip.active');
        const currentFilter = activeChip ? activeChip.dataset.filter : 'all';
        renderSearchResults(currentFilter);
    };

    // Helper for local usage
    const triggerFilterUpdate = window.triggerFilterUpdate;

    if (priceMin) {
        priceMin.addEventListener('input', () => {
            updatePriceDisplay();
            triggerFilterUpdate();
        });
    }

    // Initial call to setup dynamic filters
    updateDynamicFilters('all');

    if (priceMax) {
        priceMax.addEventListener('input', () => {
            updatePriceDisplay();
            triggerFilterUpdate();
        });
    }

    // Amenity checkboxes
    document.querySelectorAll('.amenity-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', triggerFilterUpdate);
    });

    // Book button - opens payment modal
    const bookBtn = document.getElementById('book-btn');
    if (bookBtn) {
        bookBtn.addEventListener('click', openPaymentModal);
    }

    // Detail favorite button
    const detailFavBtn = document.getElementById('detail-fav-btn');
    if (detailFavBtn) {
        detailFavBtn.addEventListener('click', () => {
            if (currentListing) {
                API.favorites.toggle(currentListing.id);
                const isFavorite = API.favorites.isFavorite(currentListing.id);
                const svg = detailFavBtn.querySelector('svg');
                svg.setAttribute('fill', isFavorite ? 'var(--primary)' : 'none');
                svg.setAttribute('stroke', isFavorite ? 'var(--primary)' : 'currentColor');
            }
        });
    }

    // Confirm payment
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', processPayment);
    }

    // Hero Search (New Simplified)
    const heroGoBtn = document.getElementById('hero-go-btn');
    const heroCitySelect = document.getElementById('hero-city-select');

    if (heroGoBtn) {
        heroGoBtn.addEventListener('click', () => {
            const selectedCity = heroCitySelect ? heroCitySelect.value : null;
            if (selectedCity) {
                currentCity = selectedCity;
                // Render with filter
                const filtered = appData.listings.filter(l => l.city === selectedCity);
                renderFilteredResults(filtered);
            } else {
                currentCity = null;
                renderSearchResults(); // Show all
            }
            navigateTo('search');
        });
    }

    // Hero dates are now handled by CalendarSystem.initHero (Flatpickr)
}

// ==================== 
// FAVORITES
// ====================

function toggleFavorite(listingId) {
    API.favorites.toggle(listingId);
    renderFavorites();
}

async function renderFavorites() {
    const container = document.getElementById('favorites-grid');

    // Show loading state
    container.innerHTML = '<div class="loading-spinner">Chargement...</div>';

    try {
        const favListings = await API.favorites.getAll();

        if (favListings.length === 0) {
            container.innerHTML = `
        < div class="empty-state" >
                    <div class="empty-icon">❤️</div>
                    <h3>Aucun favori</h3>
                    <p>Ajoutez vos expériences préférées ici</p>
                </div >
        `;
        } else {
            container.innerHTML = favListings.map(listing => createListingCard(listing, true)).join('');
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
        container.innerHTML = `
        < div class="empty-state" >
                <div class="empty-icon">❤️</div>
                <h3>Aucun favori</h3>
                <p>Connectez-vous pour voir vos favoris</p>
            </div >
        `;
    }
}

// ==================== 
// BOOKINGS
// ====================

async function renderBookings() {
    const container = document.getElementById('bookings-list');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner">Chargement des réservations...</div>';

    try {
        const bookings = await API.bookings.getAll();
        console.log('🔍 DEBUG: Bookings received:', bookings);

        if (!bookings || bookings.length === 0) {
            container.innerHTML = `
        < div class="empty-state" >
                    <div class="empty-icon">📅</div>
                    <h3>Aucune réservation</h3>
                    <p>Vos réservations apparaîtront ici</p>
                    <button class="btn-primary" onclick="navigateTo('search')" style="margin-top: 1rem;">Explorer</button>
                </div >
        `;
        } else {
            container.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');
        }
    } catch (error) {
        console.error('Erreur chargement réservations:', error);
        container.innerHTML = `
        < div class="error-state" >
                <p>Impossible de charger vos réservations.</p>
                <button class="btn-secondary" onclick="renderBookings()">Réessayer</button>
            </div >
        `;
    }
}

function createBookingCard(booking) {
    const statusColors = {
        'confirmed': 'var(--success)',
        'pending': 'var(--warning)',
        'cancelled': 'var(--error)',
        'completed': 'var(--text-secondary)'
    };

    const statusLabels = {
        'confirmed': 'Confirmé',
        'pending': 'En attente',
        'cancelled': 'Annulé',
        'completed': 'Terminé'
    };

    const nights = API.utils.calculateNights(booking.dateFrom, booking.dateTo);

    return `
        < div class="booking-card" >
            <div class="booking-card-header">
                <img src="${booking.listing.image}" alt="${booking.listing.title}" class="booking-image" onerror="this.src='https://via.placeholder.com/100x100/1a1a2e/ffffff?text=Image'">
                <div class="booking-info">
                    <h3 class="booking-title">${booking.listing.title}</h3>
                    <p class="booking-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        ${booking.listing.location}
                    </p>
                    <span class="booking-status" style="background: ${statusColors[booking.status]}20; color: ${statusColors[booking.status]};">
                        ${statusLabels[booking.status]}
                    </span>
                </div>
            </div>
            <div class="booking-card-body">
                <div class="booking-detail">
                    <span class="booking-label">Code</span>
                    <span class="booking-value">${booking.confirmationCode}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-label">Arrivée</span>
                    <span class="booking-value">${API.utils.formatDate(booking.dateFrom, { day: 'numeric', month: 'short' })}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-label">Départ</span>
                    <span class="booking-value">${API.utils.formatDate(booking.dateTo, { day: 'numeric', month: 'short' })}</span>
                </div>
                <div class="booking-detail">
                    <span class="booking-label">Durée</span>
                    <span class="booking-value">${nights} nuit${nights > 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="booking-card-footer">
                <div class="booking-total">
                    <span class="booking-label">Total</span>
                    <span class="booking-price">${API.utils.formatPrice(booking.totalPrice)}</span>
                </div>
                ${booking.status === 'confirmed' ? `
                    <button class="btn-cancel" onclick="cancelBooking('${booking.id}')">Annuler</button>
                ` : ''}
            </div>
        </div >
        `;
}

async function cancelBooking(bookingId) {
    if (confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
        try {
            await API.bookings.cancel(bookingId);
            await renderBookings();
            alert('✅ Réservation annulée avec succès.');
        } catch (error) {
            alert('❌ Erreur : ' + error.message);
        }
    }
}

// ==================== 
// PROFILE STATS
// ====================

function renderProfileStats() {
    const container = document.getElementById('profile-stats');
    const stats = API.bookings.getStats();
    const favCount = API.favorites.getAll().length;

    container.innerHTML = `
        < div class="stats-grid" >
            <div class="stat-card">
                <span class="stat-value">${stats.total}</span>
                <span class="stat-label">Réservations</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${favCount}</span>
                <span class="stat-label">Favoris</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${stats.totalSpent > 0 ? API.utils.formatPrice(stats.totalSpent).replace(' DA', '') : '0'}</span>
                <span class="stat-label">Dépensé (DA)</span>
            </div>
        </div >
        `;
}

// ==================== 
// PAYMENT MODAL
// ====================

function openPaymentModal() {
    // Use global selectedDates (from hero calendar)
    const dateFrom = selectedDates.from;
    const dateTo = selectedDates.to;

    if (!dateFrom || !dateTo) {
        alert('⚠️ Veuillez sélectionner les dates de votre séjour.');
        return;
    }

    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (end <= start) {
        alert('⚠️ La date de départ doit être après la date d\'arrivée.');
        return;
    }

    const nights = API.utils.calculateNights(dateFrom, dateTo);
    const pricePerNight = parseInt(currentListing.price.replace(/[^0-9]/g, ''));
    const totalPrice = pricePerNight * nights;

    // Update booking summary
    const summary = document.getElementById('booking-summary');
    summary.innerHTML = `
        < div class="summary-item" >
            <img src="${currentListing.image}" alt="${currentListing.title}" class="summary-image" onerror="this.src='https://via.placeholder.com/80x80/1a1a2e/ffffff?text=Image'">
            <div class="summary-details">
                <h4>${currentListing.title}</h4>
                <p>${currentListing.location}</p>
            </div>
        </div>
        <div class="summary-dates">
            <div class="summary-date">
                <span class="date-label">Arrivée</span>
                <span class="date-value">${API.utils.formatDate(dateFrom)}</span>
            </div>
            <div class="summary-date">
                <span class="date-label">Départ</span>
                <span class="date-value">${API.utils.formatDate(dateTo)}</span>
            </div>
        </div>
        <div class="summary-total">
            <div class="total-line">
                <span>${currentListing.price} × ${nights} nuit${nights > 1 ? 's' : ''}</span>
                <span>${API.utils.formatPrice(totalPrice)}</span>
            </div>
            <div class="total-line total-final">
                <span>Total</span>
                <span>${API.utils.formatPrice(totalPrice)}</span>
            </div>
        </div>
    `;

    // Show modal
    document.getElementById('payment-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
    document.body.style.overflow = '';
}

async function processPayment() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    // Use global selectedDates
    const dateFrom = selectedDates.from;
    const dateTo = selectedDates.to;

    if (!paymentMethod) {
        alert('Veuillez sélectionner un mode de paiement.');
        return;
    }

    try {
        const btn = document.querySelector('.btn-confirm-pay');
        if (btn) {
            btn.textContent = 'Traitement...';
            btn.disabled = true;
        }

        // Create booking via API
        const booking = await API.bookings.create({
            listingId: currentListing.id,
            listing: currentListing, // Pass full object for fallback creation
            dateFrom: dateFrom,
            dateTo: dateTo,
            guests: document.getElementById('guests-count')?.value || 1,
            paymentMethod: paymentMethod
        });

        // Close modal
        closePaymentModal();

        // Clear selectedDates
        selectedDates = { from: null, to: null };
        if (window.CalendarSystem && CalendarSystem.heroFlatpickrInstance) {
            CalendarSystem.heroFlatpickrInstance.clear();
        }

        // Show success notification
        if (window.authSystem && window.authSystem.showNotification) {
            window.authSystem.showNotification('✅ Réservation confirmée avec succès !', 'success');
        } else {
            alert('✅ Réservation confirmée avec succès !');
        }

        // Redirect to Bookings tab immediately
        setTimeout(() => {
            navigateTo('bookings');
        }, 1000);

        console.log('✅ Réservation enregistrée:', booking);

    } catch (error) {
        alert('❌ Erreur lors du paiement : ' + error.message);
        console.error('Erreur de paiement:', error);

        const btn = document.querySelector('.btn-confirm-pay');
        if (btn) {
            btn.textContent = 'Confirmer le paiement';
            btn.disabled = false;
        }
    }
}

// ==================== 
// DETAIL PAGE UTILITIES
// ====================

/**
 * Handle booking button click from detail page
 */
window.handleBooking = function () {
    if (!currentListing) {
        alert('❌ Erreur: Aucune annonce sélectionnée');
        return;
    }
    openPaymentModal();
};

/**
 * Share listing function
 */
window.shareListing = function () {
    if (!currentListing) return;

    const shareData = {
        title: currentListing.title,
        text: `Découvrez ${currentListing.title} sur Voyage DZ!`,
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('✅ Partagé avec succès'))
            .catch(err => console.log('❌ Erreur de partage:', err));
    } else {
        // Fallback: copy link to clipboard
        const link = `${window.location.origin}${window.location.pathname}?listing = ${currentListing.id} `;
        navigator.clipboard.writeText(link)
            .then(() => alert('🔗 Lien copié dans le presse-papiers!'))
            .catch(() => alert('❌ Impossible de copier le lien'));
    }
};

/**
 * Contact host function
 */
window.contactHost = function () {
    if (!currentListing) return;

    const user = API.auth.getUser();
    if (!user) {
        alert('⚠️ Veuillez vous connecter pour contacter l\'hôte.');
        if (typeof showLoginModal === 'function') showLoginModal();
        return;
    }

    // Open email client
    const subject = encodeURIComponent(`Question à propos de: ${currentListing.title} `);
    const body = encodeURIComponent(`Bonjour, \n\nJe suis intéressé par votre annonce "${currentListing.title}" sur Voyage DZ.\n\nCordialement, \n${user.name} `);
    window.location.href = `mailto:contact @voyagedz.com?subject = ${subject}& body=${body} `;
};

// ==================== 
// UTILITY FUNCTIONS
// ====================

function formatPrice(price) {
    return price.toLocaleString('fr-DZ') + ' DA';
}

// ==================== 
// HOST FUNCTIONS
// ====================

// Check if user is host and update UI
function checkHostStatus() {
    const isHost = localStorage.getItem('is_host') === 'true';
    const becomeHostMenu = document.getElementById('become-host-menu');
    const myListingsMenu = document.getElementById('my-listings-menu');

    if (becomeHostMenu && myListingsMenu) {
        if (isHost) {
            becomeHostMenu.style.display = 'none';
            myListingsMenu.style.display = 'flex';
        } else {
            becomeHostMenu.style.display = 'flex';
            myListingsMenu.style.display = 'none';
        }
    }
}

// Open Become Host Modal or Create Listing if already host
function openBecomeHostModal() {
    const user = getCurrentUser();

    if (!user) {
        // Store intent
        localStorage.setItem('authRedirect', 'become-host');
        showLoginModal();
        showNotification('Veuillez vous connecter pour devenir hôte', 'info');
        return;
    }

    if (user.isHost) {
        // Already a host -> go to create listing
        openCreateListingModal();
    } else {
        // Not a host -> open upgrade form
        const modal = document.getElementById('become-host-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Pre-fill user data
            const nameInput = document.getElementById('host-company-name');
            if (nameInput) nameInput.value = user.name || '';
        }
    }
}

// Close Become Host Modal
function closeBecomeHostModal() {
    document.getElementById('become-host-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Handle Become Host Form
function setupBecomeHostForm() {
    const form = document.getElementById('become-host-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const phone = document.getElementById('host-phone').value;
            const description = document.getElementById('host-description').value;

            // Save host status
            localStorage.setItem('is_host', 'true');
            localStorage.setItem('host_phone', phone);
            localStorage.setItem('host_description', description);

            closeBecomeHostModal();
            checkHostStatus();

            alert(`
🎉 Félicitations!

Vous êtes maintenant hôte sur Voyage DZ!

Vous pouvez désormais:
✅ Créer des annonces de logements
✅ Proposer des activités et expériences
✅ Gérer vos réservations

Cliquez sur "Mes annonces" pour commencer.
            `.trim());
        });
    }
}

// Open Create Listing Modal
function openCreateListingModal() {
    document.getElementById('create-listing-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close Create Listing Modal
function closeCreateListingModal() {
    document.getElementById('create-listing-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Handle listing type change (show/hide duration field)
function setupListingTypeChange() {
    const typeSelect = document.getElementById('listing-type');
    const durationGroup = document.getElementById('duration-group');

    if (typeSelect && durationGroup) {
        typeSelect.addEventListener('change', (e) => {
            durationGroup.style.display = e.target.value === 'activity' ? 'block' : 'none';
        });
    }
}

// Handle Create Listing Form
function setupCreateListingForm() {
    const form = document.getElementById('create-listing-form');
    const imageFileInput = document.getElementById('listing-image-file');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');

    // Handle image file selection with preview
    if (imageFileInput) {
        imageFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Preview image
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (previewImg && imagePreview) {
                        previewImg.src = event.target.result;
                        imagePreview.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Get image - file upload ONLY
            let imageData = '';

            if (imageFileInput && imageFileInput.files.length > 0) {
                // Convert uploaded file to base64
                const file = imageFileInput.files[0];
                imageData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target.result);
                    reader.readAsDataURL(file);
                });
            } else {
                // Default fallback image if no file selected (though field should be required)
                imageData = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80';
            }

            const listing = {
                id: Date.now(), // Generate ID
                type: document.getElementById('listing-type').value,
                title: document.getElementById('listing-title').value,
                city: document.getElementById('listing-city').value,
                location: document.getElementById('listing-location').value,
                price: document.getElementById('listing-price').value + ' DA',
                description: document.getElementById('listing-description').value,
                image: imageData,
                duration: document.getElementById('listing-duration')?.value || null,
                rating: 0,
                reviews: 0,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            // Save to host listings (localStorage)
            const currentHostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
            currentHostListings.push(listing);
            localStorage.setItem('host_listings', JSON.stringify(currentHostListings));

            // Also update runtime appData immediately so it's visible without reload
            appData.listings.push(listing);

            closeCreateListingModal();
            form.reset();

            // Reset preview
            if (imagePreview) imagePreview.style.display = 'none';

            // Refresh host dashboard
            if (window.renderHostListings) renderHostListings();

            alert(`
✅ Annonce créée avec succès!

📝 ${listing.title}

⏳ Votre annonce est en attente de validation.
(Mode démo: elle est visible immédiatement)
        `.trim());
        });
    }
}

// Render Host Dashboard
function renderHostDashboard() {
    renderHostStats();
    renderHostListings();
}

// Render Host Stats
function renderHostStats() {
    const container = document.getElementById('host-stats');
    if (!container) return;

    const hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
    const activeListings = hostListings.filter(l => l.status === 'active').length;
    const pendingListings = hostListings.filter(l => l.status === 'pending').length;

    container.innerHTML = `
        < div class="stats-grid" >
            <div class="stat-card">
                <span class="stat-value">${hostListings.length}</span>
                <span class="stat-label">Annonces</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${activeListings}</span>
                <span class="stat-label">Actives</span>
            </div>
            <div class="stat-card">
                <span class="stat-value">${pendingListings}</span>
                <span class="stat-label">En attente</span>
            </div>
        </div >
        `;
}

// Render Host Listings
function renderHostListings() {
    const container = document.getElementById('host-listings-grid');
    if (!container) return;

    const hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');

    if (hostListings.length === 0) {
        container.innerHTML = `
        < div class="empty-state" >
                <div class="empty-icon">🏠</div>
                <h3>Aucune annonce</h3>
                <p>Créez votre première annonce pour commencer</p>
                <button class="btn-primary" onclick="openCreateListingModal()" style="margin-top: 1rem;">
                    + Nouvelle annonce
                </button>
            </div >
        `;
        return;
    }

    container.innerHTML = hostListings.map(listing => `
        < div class="host-listing-card" >
            <img src="${listing.image}" alt="${listing.title}" class="host-listing-image"
                onclick="showDetail('${listing.id}')"
                style="cursor: pointer;"
                onerror="this.src='https://via.placeholder.com/100x100/1a1a2e/ffffff?text=Image'">
                <div class="host-listing-info" onclick="showDetail('${listing.id}')" style="cursor: pointer;">
                    <h3 class="host-listing-title">${listing.title}</h3>
                    <p class="host-listing-location">${listing.location}</p>
                    <div class="host-listing-meta">
                        <span class="host-listing-price">${listing.price}</span>
                        <span class="host-listing-type">${listing.type === 'activity' ? '🎯 Activité' : '🏠 Logement'}</span>
                        <span class="host-listing-status status-${listing.status}">
                            ${listing.status === 'active' ? '✓ Active' : listing.status === 'pending' ? '⏳ En attente' : listing.status}
                        </span>
                    </div>
                </div>
                <div class="host-listing-actions">
                    ${listing.type === 'activity' ? `
                    <button class="icon-btn-small activity" onclick="openActivityManager('${listing.id}')" title="Gérer les créneaux">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </button>
                ` : ''}
                    <button class="icon-btn-small" onclick="editHostListing('${listing.id}')" title="Modifier">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="icon-btn-small danger" onclick="deleteHostListing('${listing.id}')" title="Supprimer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
    `).join('');
}

// Delete Host Listing
function deleteHostListing(listingId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
        let hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
        hostListings = hostListings.filter(l => l.id !== listingId);
        localStorage.setItem('host_listings', JSON.stringify(hostListings));
        renderHostListings();
        renderHostStats();
        alert('✅ Annonce supprimée.');
    }
}

// Edit Host Listing (simple implementation)
function editHostListing(listingId) {
    alert('La modification d\'annonce sera disponible prochainement.');
}

// Open Activity Manager Modal (GetYourGuide style)
function openActivityManager(listingId) {
    // Get the listing data
    const hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
    const listing = hostListings.find(l => String(l.id) === String(listingId));

    if (!listing) {
        alert('Annonce non trouvée');
        return;
    }

    // Create modal if doesn't exist
    let modal = document.getElementById('activity-manager-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'activity-manager-modal';
        modal.className = 'modal';
        modal.innerHTML = `
        < div class="modal-overlay" onclick = "closeActivityManagerModal()" ></div >
            <div class="modal-content large-modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>⏰ Gérer l'Activité</h2>
                    <button class="close-btn" onclick="closeActivityManagerModal()">&times;</button>
                </div>
                <div class="modal-body" id="activity-manager-content">
                    <!-- Content will be injected by ActivityManager -->
                </div>
            </div>
    `;
        document.body.appendChild(modal);
    }

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize ActivityManager if available
    if (window.ActivityManager) {
        ActivityManager.init(listingId, 'activity-manager-content');
    } else {
        document.getElementById('activity-manager-content').innerHTML = `
        < div class="activity-manager-fallback" style = "padding: 2rem; text-align: center;" >
                <h3>📅 Gestion des Créneaux</h3>
                <p>ID de l'activité: ${listingId}</p>
                <p style="color: var(--text-secondary); margin-top: 1rem;">
                    Le module de gestion des activités est en cours de chargement...
                </p>
                <div style="margin-top: 2rem; display: grid; gap: 1rem; max-width: 400px; margin-left: auto; margin-right: auto;">
                    <div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; text-align: left;">
                        <strong>⏰ Créneaux horaires</strong>
                        <p style="font-size: 0.9rem; color: var(--text-secondary);">Définir les horaires disponibles</p>
                    </div>
                    <div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; text-align: left;">
                        <strong>🗣️ Langues</strong>
                        <p style="font-size: 0.9rem; color: var(--text-secondary);">Langues parlées par le guide</p>
                    </div>
                    <div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; text-align: left;">
                        <strong>✅ Inclusions</strong>
                        <p style="font-size: 0.9rem; color: var(--text-secondary);">Ce qui est inclus/exclu</p>
                    </div>
                    <div style="padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px; text-align: left;">
                        <strong>🗺️ Itinéraire</strong>
                        <p style="font-size: 0.9rem; color: var(--text-secondary);">Les étapes de l'activité</p>
                    </div>
                </div>
            </div >
        `;
    }
}

function closeActivityManagerModal() {
    const modal = document.getElementById('activity-manager-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Expose functions globally
window.editHostListing = editHostListing;
window.openActivityManager = openActivityManager;
window.closeActivityManagerModal = closeActivityManagerModal;


// Setup Social Login
function setupSocialLogin() {
    const facebookBtn = document.querySelector('.btn-facebook');
    const googleBtn = document.querySelector('.btn-google');

    const handleSocialClick = (provider) => {
        if (window.authSystem) {
            // Simulate successful social login
            const user = {
                name: provider === 'Facebook' ? 'Utilisateur Facebook' : 'Utilisateur Google',
                email: provider === 'Facebook' ? 'user@facebook.com' : 'user@google.com',
                role: 'user',
                avatar: provider === 'Facebook' ? 'https://graph.facebook.com/100000000000000/picture' : 'https://lh3.googleusercontent.com/a/default-user',
                isAuthenticated: true
            };

            // Save to localStorage mimicking auth.js behavior
            localStorage.setItem('current_user', JSON.stringify(user));

            window.authSystem.closeLoginModal();
            window.authSystem.updateAuthUI();

            if (typeof checkHostStatus === 'function') {
                checkHostStatus();
            }

            window.authSystem.showNotification(`🎉 Connecté avec ${provider} !`, 'success');
        }
    };

    if (facebookBtn) {
        // Clone to safely remove any previous listeners
        const newFbBtn = facebookBtn.cloneNode(true);
        facebookBtn.parentNode.replaceChild(newFbBtn, facebookBtn);
        newFbBtn.addEventListener('click', () => handleSocialClick('Facebook'));
    }

    if (googleBtn) {
        const newGoogleBtn = googleBtn.cloneNode(true);
        googleBtn.parentNode.replaceChild(newGoogleBtn, googleBtn);
        newGoogleBtn.addEventListener('click', () => handleSocialClick('Google'));
    }
}

// ====================
// CITY SELECTOR
// ====================

function setupCitySelector() {
    // Target active buttons in both Home and Search pages
    const cityButtons = document.querySelectorAll('.city-selector-btn');

    cityButtons.forEach(btn => {
        // Clone node to remove existing listeners (prevent duplicates)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            // Remove active from all buttons
            document.querySelectorAll('.city-selector-btn').forEach(b => b.classList.remove('active'));

            // Add active to clicked button (and others with same data-city for consistency)
            const selectedCity = newBtn.dataset.city;
            document.querySelectorAll(`.city - selector - btn[data - city="${selectedCity}"]`).forEach(b => b.classList.add('active'));

            // Update currentCity global variable  
            currentCity = selectedCity === 'all' ? null : selectedCity;

            // If on home page, go to search page
            if (currentPage !== 'search') {
                navigateTo('search');
            } else {
                // Just re-render if already on search page
                renderSearchResults();
            }
        });
    });
}

// ====================
// INIT FUNCTIONS
// ====================

function init() {
    renderCities();
    renderFeaturedListings();
    setupEventListeners();
    setupNavigation();
    checkHostStatus();
    setupBecomeHostForm();
    setupCreateListingForm();
    setupListingTypeChange();
    // Check for social login token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        // Decode token to get user info (simple base64 decode of payload)
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const user = JSON.parse(jsonPayload);

            // Save to localStorage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('current_user', JSON.stringify({
                ...user,
                isAuthenticated: true
            }));

            // Clean URL
            window.history.replaceState({}, document.title, "/");

            if (window.authSystem) {
                window.authSystem.updateAuthUI();
                window.authSystem.showNotification(`🎉 Bienvenue ${user.name} !`, 'success');
            }
        } catch (e) {
            console.error('Error processing token', e);
        }
    }

    setupSocialLogin();
}

function setupRealSocialAuth() {
    // Wait a bit to ensure DOM is ready and listeners are attached so we can override them
    setTimeout(() => {
        const facebookBtn = document.querySelector('.btn-facebook');
        const googleBtn = document.querySelector('.btn-google');

        if (facebookBtn) {
            // Clone to remove old listeners
            const newFbBtn = facebookBtn.cloneNode(true);
            facebookBtn.parentNode.replaceChild(newFbBtn, facebookBtn);

            newFbBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/api/auth/facebook';
            });
        }

        if (googleBtn) {
            // Clone to remove old listeners
            const newGoogleBtn = googleBtn.cloneNode(true);
            googleBtn.parentNode.replaceChild(newGoogleBtn, googleBtn);

            newGoogleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/api/auth/google';
            });
        }
    }, 100);
}

// Call init on page load
// Call init on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check host status on profile page load
    checkHostStatus();

    // Populate Host Create Listing City Select
    const citySelect = document.getElementById('listing-city');
    if (citySelect && appData.host_cities) {
        citySelect.innerHTML = appData.host_cities.map(city =>
            `<option value="${city.id}">${city.name}</option>`
        ).join('');
    }

    // Populate Search Dropdowns (MVP Restricted: Oran & Tlemcen)
    const heroCitySelect = document.getElementById('hero-city-select');
    const searchCityFilter = document.getElementById('search-city-filter');

    const populatePublicCities = (selectElement, defaultText) => {
        if (!selectElement || !appData.cities) return;
        const options = appData.cities.map(city =>
            `<option value="${city.id}">${city.name}</option>`
        ).join('');
        // Keep the first default option and append dynamic cities
        selectElement.innerHTML = `<option value="">${defaultText}</option>` + options;
    };

    if (heroCitySelect) populatePublicCities(heroCitySelect, '📍 Choisir une destination...');
    if (searchCityFilter) populatePublicCities(searchCityFilter, '🏙️ Toutes les villes');
    setupBecomeHostForm();
    setupCreateListingForm();
    setupListingTypeChange();
    setupSocialLogin();
    setupSocialLogin();
});

// ==================== 
// BOOKING LOGIC
// ====================


// ====================
// REVIEW SYSTEM
// ====================

window.submitReview = async function (listingId) {
    if (!window.supabaseClient) return;

    // 1. Check Auth (Strict for DB)
    if (!window.currentSupabaseUser) {
        alert('Veuillez vous connecter pour laisser un avis.');
        window.authSystem.openLoginModal();
        return;
    }

    // 2. Get Input
    const ratingEl = document.getElementById('review-rating');
    const textEl = document.getElementById('review-text');

    if (!ratingEl || !textEl || !textEl.value.trim()) {
        alert('Veuillez écrire un commentaire.');
        return;
    }

    const rating = parseInt(ratingEl.value);
    const text = textEl.value.trim();

    // 3. Insert into Supabase
    const { data, error } = await window.supabaseClient
        .from('reviews')
        .insert({
            listing_id: listingId,
            user_id: window.currentSupabaseUser.id,
            rating: rating,
            text: text
        });

    if (error) {
        console.error('Review Error:', error);
        alert('Erreur: ' + error.message);
        return;
    }

    // 4. Refresh UI
    alert('✅ Merci pour votre avis !');
    textEl.value = '';

    if (window.renderReviewsList) {
        window.renderReviewsList(listingId);
    }
};

window.renderReviewsList = async function (listingId) {
    const container = document.getElementById('reviews-list');
    if (!container) return;

    if (!window.supabaseClient) {
        container.innerHTML = '<p>Chargement des avis...</p>';
        return;
    }

    // Fetch reviews with user info (JOIN profiles)
    // Note: We need to enable foreign key or select manually. 
    // For simplicity, we assume we want just the review text first.
    // If we want user names, we need: .select('*, profiles(full_name)')

    const { data: reviews, error } = await window.supabaseClient
        .from('reviews')
        .select(`
        *,
        profiles(full_name)
            `)
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Fetch Reviews Error:', error);
        return;
    }

    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Soyez le premier à donner votre avis !</p>';
        return;
    }

    container.innerHTML = reviews.map(r => `
        < div class="review-item" style = "margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);" >
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span style="font-weight: bold;">${r.profiles ? r.profiles.full_name : 'Voyageur'}</span>
                <span style="color: var(--warning);">⭐ ${r.rating}</span>
            </div>
            <p style="font-size: 0.9rem; line-height: 1.4; color: var(--text-primary);">${r.text}</p>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
        </div >
        `).join('');
};

window.handleBooking = function () {
    // 1. Check Authentication
    if (!window.authSystem || !window.authSystem.isAuthenticated()) {
        // Save current listing to return after login
        localStorage.setItem('redirect_after_login', `listing:${currentListing.id} `);

        window.authSystem.openLoginModal();
        window.authSystem.showNotification('Veuillez vous connecter pour réserver', 'info');
        return;
    }

    // 2. Validate Dates using CalendarSystem
    const dates = CalendarSystem.getSelectedDates();
    if (!dates) {
        alert('⚠️ Veuillez sélectionner les dates de votre séjour.');
        return;
    }

    // 3. Open Payment
    openPaymentModal();
};

// ====================
// NEW FEATURES
// ====================

window.shareListing = function () {
    // Determine share URL (current URL or fallback)
    const shareData = {
        title: currentListing ? currentListing.title : 'Voyage DZ',
        text: 'Découvre ce logement incroyable sur Voyage DZ !',
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        // Fallback for PC
        navigator.clipboard.writeText(window.location.href);
        window.authSystem.showNotification('🔗 Lien copié dans le presse-papier !', 'success');
    }
};

window.contactHost = function () {
    if (!currentListing) return;

    // Simulate opening a chat
    window.authSystem.showNotification(`💬 Conversation ouverte avec l'hôte de "${currentListing.title}"`, 'info');

    // You could simulate a modal here, but a notification is enough for MVP
    setTimeout(() => {
        alert(`Message envoyé à l'hôte : "Bonjour, je suis intéressé par votre annonce ${currentListing.title}."`);
    }, 500);
};

// ==================== 
// GLOBAL AUTH HELPERS (for HTML access)
// ====================

window.showLoginModal = function () {
    if (window.authSystem) {
        window.authSystem.openLoginModal();
    } else {
        console.error('Auth system not initialized');
    }
};

window.hideLoginModal = function () {
    if (window.authSystem) {
        window.authSystem.closeLoginModal();
    }
};

// Edit Host Listing (simple implementation)
function editHostListing(listingId) {
    alert('La modification d\'annonce sera disponible prochainement.');
}

// Setup Social Login
function setupSocialLogin() {
    const facebookBtn = document.querySelector('.btn-facebook');
    const googleBtn = document.querySelector('.btn-google');

    const handleSocialClick = (provider) => {
        if (window.authSystem) {
            // Simulate successful social login
            const user = {
                name: provider === 'Facebook' ? 'Utilisateur Facebook' : 'Utilisateur Google',
                email: provider === 'Facebook' ? 'user@facebook.com' : 'user@google.com',
                role: 'user',
                avatar: provider === 'Facebook' ? 'https://graph.facebook.com/100000000000000/picture' : 'https://lh3.googleusercontent.com/a/default-user',
                isAuthenticated: true
            };

            // Save to localStorage mimicking auth.js behavior
            localStorage.setItem('current_user', JSON.stringify(user));

            window.authSystem.closeLoginModal();
            window.authSystem.updateAuthUI();

            if (typeof checkHostStatus === 'function') {
                checkHostStatus();
            }

            window.authSystem.showNotification(`🎉 Connecté avec ${provider} !`, 'success');
        }
    };

    if (facebookBtn) {
        // Clone to safely remove any previous listeners
        const newFbBtn = facebookBtn.cloneNode(true);
        facebookBtn.parentNode.replaceChild(newFbBtn, facebookBtn);
        newFbBtn.addEventListener('click', () => handleSocialClick('Facebook'));
    }

    if (googleBtn) {
        const newGoogleBtn = googleBtn.cloneNode(true);
        googleBtn.parentNode.replaceChild(newGoogleBtn, googleBtn);
        newGoogleBtn.addEventListener('click', () => handleSocialClick('Google'));
    }
}

// ====================
// CITY SELECTOR
// ====================

function setupCitySelector() {
    // Target active buttons in both Home and Search pages
    const cityButtons = document.querySelectorAll('.city-selector-btn');

    cityButtons.forEach(btn => {
        // Clone node to remove existing listeners (prevent duplicates)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            // Remove active from all buttons
            document.querySelectorAll('.city-selector-btn').forEach(b => b.classList.remove('active'));

            // Add active to clicked button (and others with same data-city for consistency)
            const selectedCity = newBtn.dataset.city;
            document.querySelectorAll(`.city - selector - btn[data - city="${selectedCity}"]`).forEach(b => b.classList.add('active'));

            // Update currentCity global variable  
            currentCity = selectedCity === 'all' ? null : selectedCity;

            // If on home page, go to search page
            if (currentPage !== 'search') {
                navigateTo('search');
            } else {
                // Just re-render if already on search page
                renderSearchResults();
            }
        });
    });
}

// ====================
// INIT FUNCTIONS
// ====================

function init() {
    renderCities();
    renderFeaturedListings();
    setupEventListeners();
    setupNavigation();
    checkHostStatus();
    setupBecomeHostForm();
    setupCreateListingForm();
    setupListingTypeChange();
    // Check for social login token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        // Decode token to get user info (simple base64 decode of payload)
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const user = JSON.parse(jsonPayload);

            // Save to localStorage
            localStorage.setItem('auth_token', token);
            localStorage.setItem('current_user', JSON.stringify({
                ...user,
                isAuthenticated: true
            }));

            // Clean URL
            window.history.replaceState({}, document.title, "/");

            if (window.authSystem) {
                window.authSystem.updateAuthUI();
                window.authSystem.showNotification(`🎉 Bienvenue ${user.name} !`, 'success');
            }
        } catch (e) {
            console.error('Error processing token', e);
        }
    }

    setupSocialLogin();
}

function setupRealSocialAuth() {
    // Wait a bit to ensure DOM is ready and listeners are attached so we can override them
    setTimeout(() => {
        const facebookBtn = document.querySelector('.btn-facebook');
        const googleBtn = document.querySelector('.btn-google');

        if (facebookBtn) {
            // Clone to remove old listeners
            const newFbBtn = facebookBtn.cloneNode(true);
            facebookBtn.parentNode.replaceChild(newFbBtn, facebookBtn);

            newFbBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/api/auth/facebook';
            });
        }

        if (googleBtn) {
            // Clone to remove old listeners
            const newGoogleBtn = googleBtn.cloneNode(true);
            googleBtn.parentNode.replaceChild(newGoogleBtn, googleBtn);

            newGoogleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '/api/auth/google';
            });
        }
    }, 100);
}

// Call init on page load
// Call init on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check host status on profile page load
    checkHostStatus();
    setupBecomeHostForm();
    setupCreateListingForm();
    setupListingTypeChange();
    setupSocialLogin();
});

// ==================== 
// GLOBAL AUTH HELPERS (for HTML access)
// ====================

// showLoginModal et hideLoginModal déjà définis plus haut (lignes 1341-1360)

// NOTE: handleLogin is defined in auth.js - do not duplicate here!
// The auth.js version properly waits for login completion before closing the modal.

window.logout = function () {
    if (window.authSystem) {
        window.authSystem.logout();
    }
};

window.showDetail = showDetail;
window.toggleCardFavorite = toggleCardFavorite;

// ==================== 
// USER DROPDOWN MENU
// ====================

// Setup User Menu Dropdown
function setupUserMenu() {
    const menuBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');

    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleUserDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (dropdown.style.display === 'block' && !dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
                closeUserDropdown();
            }
        });
    }
}

// Toggle User Dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        if (dropdown.style.display === 'none') {
            dropdown.style.display = 'block';
            updateDropdownUserInfo();
        } else {
            dropdown.style.display = 'none';
        }
    }
}

// Close User Dropdown
function closeUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Update Dropdown User Info
function updateDropdownUserInfo() {
    const user = getCurrentUser();
    if (!user) return;

    const dropdownAvatar = document.getElementById('dropdown-avatar');
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownEmail = document.getElementById('dropdown-email');

    if (dropdownAvatar) {
        if (user.avatar && user.avatar.includes('http')) {
            dropdownAvatar.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            dropdownAvatar.textContent = user.name ? user.name.substring(0, 2).toUpperCase() : 'U';
        }
    }

    if (dropdownName) {
        dropdownName.textContent = user.name || 'Utilisateur';
    }

    if (dropdownEmail) {
        dropdownEmail.textContent = user.email || '';
    }
}

// Handle Logout
function handleLogout() {
    closeUserDropdown();

    if (typeof authSystem !== 'undefined' && authSystem.logout) {
        authSystem.logout();
    } else {
        // Fallback logout
        localStorage.removeItem('current_user');
        localStorage.removeItem('auth_token');
        updateAuthUI();
        navigateTo('home');
        if (typeof authSystem !== 'undefined' && authSystem.showNotification) {
            authSystem.showNotification('✅ Déconnexion réussie', 'success');
        }
    }
}

// Update Profile Page with User Info
function updateProfilePage() {
    const user = getCurrentUser();
    if (!user) return;

    const profileAvatar = document.getElementById('profile-avatar-display');
    const profileName = document.getElementById('profile-name-display');
    const profileEmail = document.getElementById('profile-email-display');

    if (profileAvatar) {
        if (user.avatar && user.avatar.includes('http')) {
            profileAvatar.innerHTML = `< img src = "${user.avatar}" style = "width:100%;height:100%;border-radius:50%;object-fit:cover;" > `;
        } else {
            profileAvatar.textContent = user.name ? user.name.substring(0, 2).toUpperCase() : 'U';
        }
    }

    if (profileName) {
        profileName.textContent = user.name || 'Utilisateur';
    }

    if (profileEmail) {
        profileEmail.textContent = user.email || '';
    }
}

// Enhanced updateAuthUI to populate all user elements
function updateAuthUI() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');

    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';

            // Update header avatar
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                if (user.avatar && user.avatar.includes('http')) {
                    userAvatar.innerHTML = `< img src = "${user.avatar}" style = "width:100%;height:100%;border-radius:50%;object-fit:cover;" > `;
                } else {
                    userAvatar.textContent = user.name ? user.name.substring(0, 2).toUpperCase() : 'U';
                }
            }
        }

        // Update dropdown info
        updateDropdownUserInfo();

        // Update profile page
        updateProfilePage();

        // Show/hide bookings menu item based on whether user has bookings
        const bookingsMenuItem = document.getElementById('bookings-menu-item');
        const bookingsProfileItem = document.getElementById('bookings-profile-item');
        if (API && API.bookings) {
            const bookings = API.bookings.getAll();
            if (bookingsMenuItem) {
                bookingsMenuItem.style.display = bookings.length > 0 ? 'flex' : 'none';
            }
            if (bookingsProfileItem) {
                bookingsProfileItem.style.display = bookings.length > 0 ? 'flex' : 'none';
            }
        }

        // Hide become host menu if already a host
        if (user.isHost) {
            const becomeHostMenuItem = document.getElementById('become-host-menu-item');
            if (becomeHostMenuItem) {
                becomeHostMenuItem.style.display = 'none';
            }
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Initialize user menu on load
document.addEventListener('DOMContentLoaded', () => {
    setupUserMenu();
    updateAuthUI();
});

// Export functions globally
window.toggleUserDropdown = toggleUserDropdown;
window.closeUserDropdown = closeUserDropdown;
window.handleLogout = handleLogout;
window.updateAuthUI = updateAuthUI;
window.updateProfilePage = updateProfilePage;
window.navigateTo = navigateTo;
window.openCreateListingModal = openCreateListingModal;
window.openBecomeHostModal = openBecomeHostModal;
window.checkHostStatus = checkHostStatus;
window.openBecomeHostModal = openBecomeHostModal;
window.checkHostStatus = checkHostStatus;

// ==================== 
// CALENDAR BOOKING FUNCTION
// ====================

// Handle booking with calendar dates
function handleBooking() {
    let dates = null;

    // First try to get from CalendarSystem (Flatpickr instance)
    if (window.CalendarSystem) {
        dates = CalendarSystem.getSelectedDates();
    }

    // Fallback: check global selectedDates
    if (!dates && selectedDates.from && selectedDates.to) {
        const fromDate = new Date(selectedDates.from);
        const toDate = new Date(selectedDates.to);
        dates = {
            checkIn: selectedDates.from,
            checkOut: selectedDates.to,
            nights: Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24))
        };
        console.log('📅 Using global selectedDates:', dates);
    }

    if (!dates) {
        alert('⚠️ Veuillez sélectionner des dates');
        return;
    }

    // Vérifier authentification
    const user = getCurrentUser();
    if (!user) {
        openLoginModal();
        if (window.authSystem && window.authSystem.showNotification) {
            authSystem.showNotification('Connectez-vous pour réserver', 'info');
        }
        return;
    }

    // Remplir les dates pour le paiement
    selectedDates.from = dates.checkIn;
    selectedDates.to = dates.checkOut;

    // Ouvrir modal paiement
    openPaymentModal();
}

// Handle Create Listing Form Submission (called from onsubmit)
// Handle Create Listing Form Submission (called from onsubmit)
async function handleCreateListing(event) {
    try {
        event.preventDefault();
        console.log('📝 handleCreateListing started');

        const form = event.target;
        const imageFileInput = document.getElementById('listing-image-file');
        const imageUrlInput = document.getElementById('listing-image-url');
        const imagePreview = document.getElementById('image-preview');

        // Get image - either from file upload or URL
        let imageData = '';

        if (imageFileInput && imageFileInput.files.length > 0) {
            // Convert uploaded file to base64
            const file = imageFileInput.files[0];
            imageData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsDataURL(file);
            });
        } else if (imageUrlInput && imageUrlInput.value) {
            // Use URL
            imageData = imageUrlInput.value;
        } else {
            // Default fallback image
            imageData = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80';
        }

        // Get Amenities
        const selectedAmenities = Array.from(document.querySelectorAll('.amenity-checkbox input:checked'))
            .map(cb => cb.value);

        // Get Capacity
        const capacity = {
            guests: parseInt(document.getElementById('listing-guests')?.value || 2),
            bedrooms: parseInt(document.getElementById('listing-bedrooms')?.value || 1),
            beds: parseInt(document.getElementById('listing-beds')?.value || 1),
            baths: parseInt(document.getElementById('listing-baths')?.value || 1)
        };

        const rules = document.getElementById('listing-rules')?.value || '';

        const listing = {
            id: Date.now(),
            type: document.getElementById('listing-type')?.value || 'lodging',
            title: document.getElementById('listing-title')?.value || 'Sans titre',
            city: document.getElementById('listing-city')?.value || 'alger',
            location: document.getElementById('listing-location')?.value || 'Adresse non spécifiée',
            price: (document.getElementById('listing-price')?.value || '0') + ' DA',
            description: document.getElementById('listing-description')?.value || '',
            image: imageData,
            rating: 0,
            reviews: 0,
            amenities: selectedAmenities,
            capacity: capacity, // Store object
            rules: rules,
            status: 'active',
            createdAt: new Date().toISOString()
        };

        // Construct a rich description string if needed for display compatibility
        if (capacity) {
            // listing.description += `\n\nCapacité: ${capacity.guests} voyageurs, ${capacity.bedrooms} chambres, ${capacity.beds} lits, ${capacity.baths} sdb.`;
        }

        // specific handling for hotel type to create dummy rooms if needed
        if (listing.type === 'hotel') {
            const basePrice = parseInt(listing.price.replace(/[^0-9]/g, ''));
            listing.rooms = [
                {
                    id: 'room-' + Date.now() + '-1',
                    name: 'Chambre Standard',
                    price: basePrice,
                    capacity: 2,
                    beds: '1 Lit Double',
                    size: '20m²',
                    image: listing.image
                },
                {
                    id: 'room-' + Date.now() + '-2',
                    name: 'Suite Deluxe',
                    price: Math.floor(basePrice * 1.5),
                    capacity: 2,
                    beds: '1 Grand Lit King',
                    size: '35m²',
                    image: listing.image
                }
            ];
        }

        // Save to host listings
        const hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
        hostListings.push(listing);
        localStorage.setItem('host_listings', JSON.stringify(hostListings));

        // Also add to appData so it appears in main listings
        if (window.appData && window.appData.listings) {
            appData.listings.push(listing);
        }

        closeCreateListingModal();
        form.reset();

        // Reset preview
        if (imagePreview) imagePreview.style.display = 'none'; // Keep space but hide img if needed or just reset path
        // Actually our new form has img always visible but with placeholder. 
        // Let's reset the img src to placeholder.
        const previewImg = document.getElementById('preview-img');
        if (previewImg) previewImg.src = 'https://via.placeholder.com/400x200?text=Aperçu';


        // Refresh host dashboard
        renderHostListings();

        // Update profile menu visibility
        updateMyListingsVisibility();

        alert(`
✅ Annonce créée avec succès !

📝 ${listing.title}
📍 ${listing.location}
💰 ${listing.price}

✓ Votre annonce est maintenant visible.
Retrouvez-la dans "Mes annonces" de votre profil.
    `.trim());

        console.log('✅ Annonce créée:', listing);
    } catch (e) {
        console.error('Create Listing Error:', e);
        alert('❌ Erreur lors de la création: ' + e.message);
    }
}

// Show My Listings in Profile (navigates to host dashboard)
function showMyListingsInProfile() {
    navigateTo('host-dashboard');
    renderHostListings();
}

// Update visibility of "Mes annonces" menu item
function updateMyListingsVisibility() {
    const hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
    const myListingsMenu = document.getElementById('my-listings-profile-item');

    if (myListingsMenu) {
        myListingsMenu.style.display = hostListings.length > 0 ? 'flex' : 'none';
    }
}

// Exposer globalement
window.handleBooking = handleBooking;
window.handleCreateListing = handleCreateListing;
window.showMyListingsInProfile = showMyListingsInProfile;
window.updateMyListingsVisibility = updateMyListingsVisibility;

// ==========================================
// EVENT DELEGATION POUR LES CLICS SUR LES CARTES
// ==========================================
// Utiliser event delegation car les cartes sont créées dynamiquement
document.addEventListener('click', function (e) {
    // Chercher l'élément parent avec data-listing-id
    const target = e.target.closest('[data-listing-id]');

    if (target) {
        const listingId = target.getAttribute('data-listing-id');

        // Ne pas déclencher si on a cliqué sur le bouton favori
        if (e.target.closest('.listing-fav-btn')) {
            return;
        }

        console.log('🖱️ Click detected on listing card, ID:', listingId);
        showDetail(listingId);
    }
});

// Initialize Mes annonces visibility on page load
document.addEventListener('DOMContentLoaded', updateMyListingsVisibility);

