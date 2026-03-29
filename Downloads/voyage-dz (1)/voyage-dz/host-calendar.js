// ==========================================
// HOST CALENDAR SYSTEM - Gestion Disponibilité & Prix
// ==========================================

const HostCalendar = {
    flatpickrInstance: null,
    currentListingId: null,
    availabilityData: {
        blockedDates: [],
        customPrices: {}, // Format: { '2024-12-25': 8000, '2024-12-31': 12000 }
        maxGuests: 2,
        basePrice: 5000
    },

    /**
     * Initialiser le calendrier hôte
     */
    init(inputElement, options = {}) {
        if (!inputElement) {
            console.error('❌ Host Calendar: Input element not found');
            return;
        }

        this.availabilityData.basePrice = options.basePrice || 5000;
        this.availabilityData.maxGuests = options.maxGuests || 2;

        console.log('📅 Initialisation calendrier hôte');

        // Charger données existantes si modification
        if (options.listingId) {
            this.loadExistingData(options.listingId);
        }

        // Détruire instance précédente
        if (this.flatpickrInstance) {
            this.flatpickrInstance.destroy();
        }

        // Créer calendrier inline (toujours visible)
        this.flatpickrInstance = flatpickr(inputElement, {
            mode: 'multiple',
            inline: true, // Toujours visible
            minDate: 'today',
            dateFormat: 'Y-m-d',
            locale: 'fr',
            showMonths: 2,
            onChange: (selectedDates) => {
                this.onDatesSelected(selectedDates);
            },
            onDayCreate: (dObj, dStr, fp, dayElem) => {
                this.customizeDayElement(dayElem);
            }
        });

        this.setupControls();
        this.renderAvailabilityLegend();
    },

    /**
     * Personnaliser l'affichage des jours
     */
    customizeDayElement(dayElem) {
        const dateStr = dayElem.dateObj.toISOString().split('T')[0];

        // Date bloquée
        if (this.availabilityData.blockedDates.includes(dateStr)) {
            dayElem.classList.add('blocked-date');
            dayElem.innerHTML += '<span class="date-icon">🚫</span>';
        }

        // Prix personnalisé
        if (this.availabilityData.customPrices[dateStr]) {
            const price = this.availabilityData.customPrices[dateStr];
            dayElem.classList.add('custom-price-date');
            dayElem.innerHTML += `<span class="custom-price">${price} DA</span>`;
        }
    },

    /**
     * Callback sélection de dates
     */
    onDatesSelected(selectedDates) {
        console.log(`📅 ${selectedDates.length} date(s) sélectionnée(s)`);

        // Afficher panneau d'action
        const panel = document.getElementById('date-action-panel');
        if (panel) {
            panel.style.display = selectedDates.length > 0 ? 'block' : 'none';

            // Afficher résumé
            const summary = document.getElementById('selected-dates-summary');
            if (summary) {
                summary.textContent = `${selectedDates.length} date(s) sélectionnée(s)`;
            }
        }
    },

    /**
     * Bloquer les dates sélectionnées
     */
    blockSelectedDates() {
        const selectedDates = this.flatpickrInstance.selectedDates;

        selectedDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            if (!this.availabilityData.blockedDates.includes(dateStr)) {
                this.availabilityData.blockedDates.push(dateStr);
            }
        });

        this.flatpickrInstance.clear();
        this.refreshCalendar();
        this.updateSummary();

        showNotification(`🚫 ${selectedDates.length} date(s) bloquée(s)`, 'success');
    },

    /**
     * Débloquer les dates sélectionnées
     */
    unblockSelectedDates() {
        const selectedDates = this.flatpickrInstance.selectedDates;

        selectedDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const index = this.availabilityData.blockedDates.indexOf(dateStr);
            if (index > -1) {
                this.availabilityData.blockedDates.splice(index, 1);
            }
        });

        this.flatpickrInstance.clear();
        this.refreshCalendar();
        this.updateSummary();

        showNotification(`✅ ${selectedDates.length} date(s) débloquée(s)`, 'success');
    },

    /**
     * Définir un prix personnalisé
     */
    setCustomPrice() {
        const selectedDates = this.flatpickrInstance.selectedDates;

        if (selectedDates.length === 0) {
            alert('⚠️ Veuillez sélectionner au moins une date');
            return;
        }

        const priceInput = prompt(
            `💰 Prix personnalisé pour ${selectedDates.length} date(s):\n\n` +
            `Prix de base: ${this.availabilityData.basePrice} DA\n` +
            `Entrez le nouveau prix (en DA):`,
            this.availabilityData.basePrice
        );

        if (priceInput === null) return;

        const customPrice = parseInt(priceInput);

        if (isNaN(customPrice) || customPrice <= 0) {
            alert('❌ Prix invalide');
            return;
        }

        selectedDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            this.availabilityData.customPrices[dateStr] = customPrice;
        });

        this.flatpickrInstance.clear();
        this.refreshCalendar();
        this.updateSummary();

        showNotification(`💰 Prix défini: ${customPrice} DA pour ${selectedDates.length} date(s)`, 'success');
    },

    /**
     * Supprimer prix personnalisé
     */
    removeCustomPrice() {
        const selectedDates = this.flatpickrInstance.selectedDates;

        selectedDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            delete this.availabilityData.customPrices[dateStr];
        });

        this.flatpickrInstance.clear();
        this.refreshCalendar();
        this.updateSummary();

        showNotification(`🔄 Prix réinitialisé pour ${selectedDates.length} date(s)`, 'success');
    },

    /**
     * Actualiser le calendrier
     */
    refreshCalendar() {
        if (this.flatpickrInstance) {
            this.flatpickrInstance.redraw();
        }
    },

    /**
     * Configurer les contrôles
     */
    setupControls() {
        // Bouton bloquer
        const blockBtn = document.getElementById('btn-block-dates');
        if (blockBtn) {
            blockBtn.onclick = () => this.blockSelectedDates();
        }

        // Bouton débloquer
        const unblockBtn = document.getElementById('btn-unblock-dates');
        if (unblockBtn) {
            unblockBtn.onclick = () => this.unblockSelectedDates();
        }

        // Bouton prix personnalisé
        const priceBtn = document.getElementById('btn-set-custom-price');
        if (priceBtn) {
            priceBtn.onclick = () => this.setCustomPrice();
        }

        // Bouton réinitialiser prix
        const resetPriceBtn = document.getElementById('btn-reset-price');
        if (resetPriceBtn) {
            resetPriceBtn.onclick = () => this.removeCustomPrice();
        }

        // Input nombre de personnes
        const guestsInput = document.getElementById('max-guests-input');
        if (guestsInput) {
            guestsInput.value = this.availabilityData.maxGuests;
            guestsInput.addEventListener('change', (e) => {
                this.availabilityData.maxGuests = parseInt(e.target.value) || 2;
                this.updateSummary();
            });
        }

        // Input prix de base
        const basePriceInput = document.getElementById('base-price-input');
        if (basePriceInput) {
            basePriceInput.value = this.availabilityData.basePrice;
            basePriceInput.addEventListener('change', (e) => {
                this.availabilityData.basePrice = parseInt(e.target.value) || 5000;
                this.updateSummary();
            });
        }
    },

    /**
     * Afficher légende
     */
    renderAvailabilityLegend() {
        const legendContainer = document.getElementById('availability-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = `
            <div class="legend-item">
                <span class="legend-color legend-available"></span>
                <span>Disponible (prix de base)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-blocked"></span>
                <span>Bloqué (indisponible)</span>
            </div>
            <div class="legend-item">
                <span class="legend-color legend-custom"></span>
                <span>Prix personnalisé</span>
            </div>
        `;
    },

    /**
     * Mettre à jour le résumé
     */
    updateSummary() {
        const summaryContainer = document.getElementById('availability-summary');
        if (!summaryContainer) return;

        const blockedCount = this.availabilityData.blockedDates.length;
        const customPriceCount = Object.keys(this.availabilityData.customPrices).length;

        summaryContainer.innerHTML = `
            <div class="summary-stat">
                <span class="stat-value">${blockedCount}</span>
                <span class="stat-label">Date(s) bloquée(s)</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${customPriceCount}</span>
                <span class="stat-label">Prix personnalisé(s)</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${this.availabilityData.maxGuests}</span>
                <span class="stat-label">Voyageurs max</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${this.availabilityData.basePrice} DA</span>
                <span class="stat-label">Prix de base</span>
            </div>
        `;
    },

    /**
     * Charger données existantes
     */
    loadExistingData(listingId) {
        const hostListings = JSON.parse(localStorage.getItem('host_listings') || '[]');
        const listing = hostListings.find(l => l.id === listingId);

        if (listing && listing.availability) {
            this.availabilityData = listing.availability;
            console.log('📅 Données chargées:', this.availabilityData);
        }
    },

    /**
     * Obtenir les données de disponibilité
     */
    getData() {
        return {
            blockedDates: [...this.availabilityData.blockedDates],
            customPrices: { ...this.availabilityData.customPrices },
            maxGuests: this.availabilityData.maxGuests,
            basePrice: this.availabilityData.basePrice
        };
    },

    /**
     * Réinitialiser
     */
    reset() {
        this.availabilityData = {
            blockedDates: [],
            customPrices: {},
            maxGuests: 2,
            basePrice: 5000
        };

        if (this.flatpickrInstance) {
            this.flatpickrInstance.clear();
            this.refreshCalendar();
        }

        this.updateSummary();
    },

    /**
     * Détruire
     */
    destroy() {
        if (this.flatpickrInstance) {
            this.flatpickrInstance.destroy();
            this.flatpickrInstance = null;
        }
    }
};

// Exposer globalement
window.HostCalendar = HostCalendar;

console.log('✅ Host Calendar System loaded');
