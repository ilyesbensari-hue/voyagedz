// ====================
// MAP SYSTEM - Leaflet Integration
// ====================

const MapSystem = {
    map: null,
    markers: [],
    currentListings: [],

    /**
     * Initialize the map
     * @param {string} containerId - ID of the map container element
     */
    init(containerId = 'listings-map') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('❌ Map container not found:', containerId);
            return;
        }

        // Destroy existing map if any
        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        console.log('🗺️ Initializing map...');

        // Default center: Algeria
        const algeriaCenter = [28.0339, 1.6596];
        const defaultZoom = 5;

        this.map = L.map(containerId).setView(algeriaCenter, defaultZoom);

        // Add OpenStreetMap tiles (free, no API key needed)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(this.map);

        console.log('✅ Map initialized');
    },

    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        this.markers.forEach(marker => marker.remove());
        this.markers = [];
    },

    /**
     * Add markers for listings
     * @param {Array} listings - Array of listing objects
     */
    addMarkers(listings) {
        this.clearMarkers();
        this.currentListings = listings;

        if (!this.map) {
            console.error('❌ Map not initialized');
            return;
        }

        const bounds = [];

        listings.forEach(listing => {
            if (!listing.lat || !listing.lng) return;

            // Custom icon based on type
            const iconHtml = listing.type === 'lodging' ? '🏠' :
                listing.type === 'hotel' ? '🏨' : '🎭';

            const customIcon = L.divIcon({
                html: `<div class="map-marker ${listing.type}">${iconHtml}</div>`,
                className: 'custom-map-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });

            const marker = L.marker([listing.lat, listing.lng], { icon: customIcon })
                .addTo(this.map);

            // Popup content
            const priceNum = parseInt(listing.price.replace(/[^0-9]/g, ''));
            const popupContent = `
                <div class="map-popup" style="min-width: 200px;">
                    <img src="${listing.image}" alt="${listing.title}" 
                        style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;"
                        onerror="this.src='https://via.placeholder.com/200x100/1a1a2e/ffffff?text=Image'">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">${listing.title}</h4>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${listing.location}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; color: #e63946;">${listing.price}</span>
                        <span style="font-size: 12px; color: #666;">⭐ ${listing.rating}</span>
                    </div>
                    <button onclick="showDetail('${listing.id}')" 
                        style="width: 100%; margin-top: 8px; padding: 8px; background: #e63946; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        Voir les détails
                    </button>
                </div>
            `;

            marker.bindPopup(popupContent);

            // Show popup on hover
            marker.on('mouseover', function () {
                this.openPopup();
            });

            this.markers.push(marker);
            bounds.push([listing.lat, listing.lng]);
        });

        // Fit map to show all markers
        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }

        console.log(`📍 Added ${this.markers.length} markers to map`);
    },

    /**
     * Center map on a specific city
     * @param {string} cityId - City ID from cities array
     */
    centerOnCity(cityId) {
        if (!this.map) return;

        const city = cities.find(c => c.id === cityId);
        if (city && city.lat && city.lng) {
            this.map.setView([city.lat, city.lng], 11);
            console.log(`🏙️ Centered on ${city.name}`);
        }
    },

    /**
     * Highlight a specific listing marker
     * @param {number} listingId - ID of the listing to highlight
     */
    highlightMarker(listingId) {
        const listing = this.currentListings.find(l => l.id === listingId);
        if (!listing || !listing.lat || !listing.lng) return;

        const marker = this.markers.find((m, i) =>
            this.currentListings[i] && this.currentListings[i].id === listingId
        );

        if (marker) {
            marker.openPopup();
            this.map.setView([listing.lat, listing.lng], 14);
        }
    }
};

// Expose globally
window.MapSystem = MapSystem;

console.log('✅ Map System loaded');
