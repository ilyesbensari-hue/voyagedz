// ==========================================
// ADVANCED SEARCH - Filters, Sort, Date Range
// ==========================================

const AdvancedSearch = {
    filters: {
        priceMin: 0,
        priceMax: 100000,
        rating: 0,
        amenities: [],
        type: 'all',
        dateFrom: null,
        dateTo: null,
        guests: 1,
        sortBy: 'featured'
    },

    amenitiesList: [
        { id: 'wifi', name: 'WiFi', icon: '📶' },
        { id: 'pool', name: 'Piscine', icon: '🏊' },
        { id: 'parking', name: 'Parking', icon: '🅿️' },
        { id: 'ac', name: 'Climatisation', icon: '❄️' },
        { id: 'kitchen', name: 'Cuisine', icon: '🍳' },
        { id: 'breakfast', name: 'Petit-déjeuner', icon: '🍳' },
        { id: 'beach', name: 'Plage', icon: '🏖️' },
        { id: 'spa', name: 'Spa', icon: '💆' },
        { id: 'gym', name: 'Salle de sport', icon: '🏋️' }
    ],

    // ==========================================
    // Initialize
    // ==========================================
    init() {
        this.loadFromUrl();
        console.log('🔍 Advanced Search initialized');
    },

    // ==========================================
    // Render Filter Panel
    // ==========================================
    renderFilters(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="search-filters">
                <div class="filter-header">
                    <h3>🔍 Filtres</h3>
                    <button class="reset-btn" onclick="AdvancedSearch.resetFilters()">Réinitialiser</button>
                </div>

                <!-- Price Range -->
                <div class="filter-group">
                    <label>💰 Prix (DA/nuit)</label>
                    <div class="price-inputs">
                        <input type="number" id="price-min" value="${this.filters.priceMin}" 
                               placeholder="Min" onchange="AdvancedSearch.updateFilter('priceMin', this.value)">
                        <span>—</span>
                        <input type="number" id="price-max" value="${this.filters.priceMax}" 
                               placeholder="Max" onchange="AdvancedSearch.updateFilter('priceMax', this.value)">
                    </div>
                    <input type="range" id="price-slider" min="0" max="100000" step="1000"
                           value="${this.filters.priceMax}" 
                           oninput="AdvancedSearch.updatePriceSlider(this.value)">
                </div>

                <!-- Date Range -->
                <div class="filter-group">
                    <label>📅 Dates</label>
                    <div class="date-inputs">
                        <input type="date" id="date-from" value="${this.filters.dateFrom || ''}"
                               onchange="AdvancedSearch.updateFilter('dateFrom', this.value)">
                        <input type="date" id="date-to" value="${this.filters.dateTo || ''}"
                               onchange="AdvancedSearch.updateFilter('dateTo', this.value)">
                    </div>
                </div>

                <!-- Guests -->
                <div class="filter-group">
                    <label>👥 Voyageurs</label>
                    <div class="guests-picker">
                        <button onclick="AdvancedSearch.adjustGuests(-1)">−</button>
                        <span id="guests-count">${this.filters.guests}</span>
                        <button onclick="AdvancedSearch.adjustGuests(1)">+</button>
                    </div>
                </div>

                <!-- Property Type -->
                <div class="filter-group">
                    <label>🏠 Type</label>
                    <div class="type-buttons">
                        <button class="${this.filters.type === 'all' ? 'active' : ''}" 
                                onclick="AdvancedSearch.updateFilter('type', 'all')">Tout</button>
                        <button class="${this.filters.type === 'lodging' ? 'active' : ''}"
                                onclick="AdvancedSearch.updateFilter('type', 'lodging')">Logements</button>
                        <button class="${this.filters.type === 'activity' ? 'active' : ''}"
                                onclick="AdvancedSearch.updateFilter('type', 'activity')">Activités</button>
                        <button class="${this.filters.type === 'hotel' ? 'active' : ''}"
                                onclick="AdvancedSearch.updateFilter('type', 'hotel')">Hôtels</button>
                    </div>
                </div>

                <!-- Rating -->
                <div class="filter-group">
                    <label>⭐ Note minimale</label>
                    <div class="rating-buttons">
                        ${[0, 3, 3.5, 4, 4.5].map(r => `
                            <button class="${this.filters.rating === r ? 'active' : ''}"
                                    onclick="AdvancedSearch.updateFilter('rating', ${r})">
                                ${r === 0 ? 'Tous' : r + '+'}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Amenities -->
                <div class="filter-group">
                    <label>✨ Équipements</label>
                    <div class="amenities-grid">
                        ${this.amenitiesList.map(a => `
                            <label class="amenity-checkbox ${this.filters.amenities.includes(a.id) ? 'checked' : ''}">
                                <input type="checkbox" ${this.filters.amenities.includes(a.id) ? 'checked' : ''}
                                       onchange="AdvancedSearch.toggleAmenity('${a.id}')">
                                <span>${a.icon} ${a.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Apply Button -->
                <button class="apply-filters-btn" onclick="AdvancedSearch.applyFilters()">
                    Appliquer les filtres
                </button>
            </div>
        `;
    },

    // ==========================================
    // Render Sort Dropdown
    // ==========================================
    renderSortDropdown() {
        return `
            <div class="sort-dropdown">
                <select id="sort-select" onchange="AdvancedSearch.updateSort(this.value)">
                    <option value="featured" ${this.filters.sortBy === 'featured' ? 'selected' : ''}>Recommandés</option>
                    <option value="price_asc" ${this.filters.sortBy === 'price_asc' ? 'selected' : ''}>Prix croissant</option>
                    <option value="price_desc" ${this.filters.sortBy === 'price_desc' ? 'selected' : ''}>Prix décroissant</option>
                    <option value="rating" ${this.filters.sortBy === 'rating' ? 'selected' : ''}>Meilleures notes</option>
                    <option value="reviews" ${this.filters.sortBy === 'reviews' ? 'selected' : ''}>Plus d'avis</option>
                </select>
            </div>
        `;
    },

    // ==========================================
    // Update Filters
    // ==========================================
    updateFilter(key, value) {
        this.filters[key] = key.includes('price') || key === 'rating' || key === 'guests'
            ? parseFloat(value) : value;
        this.renderFilters('search-filters-panel');
    },

    updatePriceSlider(value) {
        this.filters.priceMax = parseInt(value);
        document.getElementById('price-max').value = value;
    },

    adjustGuests(delta) {
        this.filters.guests = Math.max(1, Math.min(20, this.filters.guests + delta));
        document.getElementById('guests-count').textContent = this.filters.guests;
    },

    toggleAmenity(amenityId) {
        const idx = this.filters.amenities.indexOf(amenityId);
        if (idx === -1) {
            this.filters.amenities.push(amenityId);
        } else {
            this.filters.amenities.splice(idx, 1);
        }
        this.renderFilters('search-filters-panel');
    },

    updateSort(value) {
        this.filters.sortBy = value;
        this.applyFilters();
    },

    resetFilters() {
        this.filters = {
            priceMin: 0,
            priceMax: 100000,
            rating: 0,
            amenities: [],
            type: 'all',
            dateFrom: null,
            dateTo: null,
            guests: 1,
            sortBy: 'featured'
        };
        this.renderFilters('search-filters-panel');
        this.applyFilters();
    },

    // ==========================================
    // Apply Filters to Listings
    // ==========================================
    applyFilters() {
        if (!window.appData || !window.appData.listings) return;

        let filtered = [...window.appData.listings];

        // Type filter
        if (this.filters.type !== 'all') {
            filtered = filtered.filter(l => l.type === this.filters.type);
        }

        // Price filter
        filtered = filtered.filter(l => {
            const price = this.extractPrice(l.price);
            return price >= this.filters.priceMin && price <= this.filters.priceMax;
        });

        // Rating filter
        if (this.filters.rating > 0) {
            filtered = filtered.filter(l => l.rating >= this.filters.rating);
        }

        // Guests filter (for lodgings)
        if (this.filters.guests > 1) {
            filtered = filtered.filter(l =>
                !l.maxGuests || l.maxGuests >= this.filters.guests
            );
        }

        // Amenities filter
        if (this.filters.amenities.length > 0) {
            filtered = filtered.filter(l => {
                if (!l.amenities) return false;
                const listingAmenities = l.amenities.map(a => a.toLowerCase());
                return this.filters.amenities.every(fa =>
                    listingAmenities.some(la => la.includes(this.getAmenityName(fa).toLowerCase()))
                );
            });
        }

        // Sort
        filtered = this.sortListings(filtered);

        // Update UI
        if (window.renderSearchResults) {
            window.searchResults = filtered;
            window.renderSearchResults();
        }

        // Update URL
        this.saveToUrl();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('filtersApplied', { detail: filtered }));
    },

    sortListings(listings) {
        const sorted = [...listings];

        switch (this.filters.sortBy) {
            case 'price_asc':
                return sorted.sort((a, b) => this.extractPrice(a.price) - this.extractPrice(b.price));
            case 'price_desc':
                return sorted.sort((a, b) => this.extractPrice(b.price) - this.extractPrice(a.price));
            case 'rating':
                return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            case 'reviews':
                return sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
            default: // featured
                return sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        }
    },

    extractPrice(priceStr) {
        if (typeof priceStr === 'number') return priceStr;
        if (!priceStr) return 0;
        return parseInt(priceStr.toString().replace(/[^0-9]/g, '')) || 0;
    },

    getAmenityName(id) {
        const am = this.amenitiesList.find(a => a.id === id);
        return am ? am.name : id;
    },

    // ==========================================
    // URL State
    // ==========================================
    saveToUrl() {
        const params = new URLSearchParams();
        if (this.filters.type !== 'all') params.set('type', this.filters.type);
        if (this.filters.priceMax < 100000) params.set('pmax', this.filters.priceMax);
        if (this.filters.rating > 0) params.set('rating', this.filters.rating);
        if (this.filters.sortBy !== 'featured') params.set('sort', this.filters.sortBy);

        const url = params.toString() ? `?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', url);
    },

    loadFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('type')) this.filters.type = params.get('type');
        if (params.get('pmax')) this.filters.priceMax = parseInt(params.get('pmax'));
        if (params.get('rating')) this.filters.rating = parseFloat(params.get('rating'));
        if (params.get('sort')) this.filters.sortBy = params.get('sort');
    }
};

// Add CSS
const searchStyles = document.createElement('style');
searchStyles.textContent = `
    .search-filters {
        background: var(--bg-secondary);
        border-radius: var(--radius-lg);
        padding: 20px;
    }
    
    .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .reset-btn {
        background: none;
        border: none;
        color: var(--primary);
        cursor: pointer;
        font-size: 0.9rem;
    }
    
    .filter-group {
        margin-bottom: 20px;
    }
    
    .filter-group label {
        display: block;
        margin-bottom: 10px;
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .price-inputs, .date-inputs {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    .price-inputs input, .date-inputs input {
        flex: 1;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }
    
    #price-slider {
        width: 100%;
        margin-top: 10px;
    }
    
    .guests-picker {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .guests-picker button {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid var(--primary);
        background: none;
        color: var(--primary);
        font-size: 1.2rem;
        cursor: pointer;
    }
    
    .guests-picker button:hover {
        background: var(--primary);
        color: white;
    }
    
    #guests-count {
        font-size: 1.2rem;
        font-weight: 600;
        min-width: 30px;
        text-align: center;
    }
    
    .type-buttons, .rating-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    
    .type-buttons button, .rating-buttons button {
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.2);
        background: var(--bg-tertiary);
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .type-buttons button.active, .rating-buttons button.active {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
    }
    
    .amenities-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
    
    .amenity-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        background: var(--bg-tertiary);
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .amenity-checkbox:hover {
        background: rgba(255,255,255,0.1);
    }
    
    .amenity-checkbox.checked {
        background: rgba(224, 123, 83, 0.2);
        border: 1px solid var(--primary);
    }
    
    .amenity-checkbox input {
        display: none;
    }
    
    .apply-filters-btn {
        width: 100%;
        padding: 14px;
        border-radius: 12px;
        background: var(--primary);
        color: white;
        border: none;
        font-weight: 600;
        cursor: pointer;
        margin-top: 10px;
    }
    
    .apply-filters-btn:hover {
        filter: brightness(1.1);
    }
    
    .sort-dropdown select {
        padding: 10px 30px 10px 15px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        background: var(--bg-secondary);
        color: var(--text-primary);
        cursor: pointer;
    }
`;
document.head.appendChild(searchStyles);

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    AdvancedSearch.init();
});

// Expose globally
window.AdvancedSearch = AdvancedSearch;

console.log('✅ Advanced Search module loaded');
