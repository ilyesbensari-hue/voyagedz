// ==========================================
// CALENDAR SYSTEM - Voyage DZ
// ==========================================

const CalendarSystem = {
    flatpickrInstance: null,
    heroFlatpickrInstance: null,
    currentListingId: null,
    bookedDates: [],

    /**
     * Initialiser le calendrier pour un listing
     * @param {Number} listingId - ID du listing
     * @param {HTMLElement} inputElement - Input du calendrier
     * @param {Object} defaultDates - Dates par défaut {from: '2025-12-15', to: '2025-12-20'}
     */
    async init(listingId, inputElement, defaultDates = null) {
        if (!inputElement) {
            console.error('❌ Calendar: Input element not found');
            return;
        }

        this.currentListingId = listingId;
        console.log(`📅 Initialisation calendrier pour listing ${listingId}`);

        // Récupérer les dates déjà réservées
        await this.loadBookedDates(listingId);

        // Détruire l'instance précédente si elle existe
        if (this.flatpickrInstance) {
            this.flatpickrInstance.destroy();
        }

        // Créer le calendrier Flatpickr
        this.flatpickrInstance = flatpickr(inputElement, {
            mode: 'range',
            minDate: 'today',
            dateFormat: 'Y-m-d',
            locale: 'fr',
            disable: this.bookedDates,
            inline: false, // false = popup, true = toujours visible
            showMonths: window.innerWidth > 768 ? 2 : 1, // 2 mois sur desktop
            defaultDate: defaultDates && defaultDates.from && defaultDates.to
                ? [defaultDates.from, defaultDates.to]
                : undefined,
            onChange: (selectedDates) => {
                if (selectedDates.length === 2) {
                    this.onDatesSelected(selectedDates[0], selectedDates[1], listingId);
                } else if (selectedDates.length === 0) {
                    // Réinitialiser l'affichage si dates effacées
                    this.resetBookingDisplay();
                }
            },
            onReady: () => {
                console.log('✅ Calendrier prêt');
                // Si des dates par défaut ont été fournies, déclencher onDatesSelected
                if (defaultDates && defaultDates.from && defaultDates.to) {
                    const from = new Date(defaultDates.from);
                    const to = new Date(defaultDates.to);
                    this.onDatesSelected(from, to, listingId);
                }
            }
        });
    },

    /**
     * Charger les dates réservées depuis l'API
     */
    async loadBookedDates(listingId) {
        try {
            // Si une API backend existe
            if (typeof API_URL !== 'undefined') {
                const response = await fetch(`${API_URL}/api/listings/${listingId}/booked-dates`);
                if (response.ok) {
                    const data = await response.json();
                    this.bookedDates = data.dates || [];
                    console.log(`📅 ${this.bookedDates.length} périodes réservées chargées`);
                    return;
                }
            }

            // Fallback: utiliser localStorage (simulation)
            const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
            const listingBookings = bookings.filter(b =>
                b.listing_id === listingId &&
                b.status === 'confirmed' &&
                new Date(b.date_to) >= new Date()
            );

            this.bookedDates = listingBookings.map(booking => ({
                from: booking.date_from,
                to: booking.date_to
            }));

            console.log(`📅 ${this.bookedDates.length} périodes réservées (local)`);

        } catch (error) {
            console.error('❌ Erreur chargement dates:', error);
            this.bookedDates = [];
        }
    },

    /**
     * Callback quand des dates sont sélectionnées
     */
    onDatesSelected(checkIn, checkOut, listingId) {
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        console.log(`📅 Dates sélectionnées:`);
        console.log(`   Check-in: ${checkIn.toLocaleDateString('fr-FR')}`);
        console.log(`   Check-out: ${checkOut.toLocaleDateString('fr-FR')}`);
        console.log(`   🌙 Nuits: ${nights}`);

        // Formater les dates pour l'affichage
        const formatOptions = {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        };

        const checkInFormatted = checkIn.toLocaleDateString('fr-FR', formatOptions);
        const checkOutFormatted = checkOut.toLocaleDateString('fr-FR', formatOptions);

        // Mettre à jour l'UI
        this.updateBookingDisplay(checkInFormatted, checkOutFormatted, nights);

        // Calculer le prix total
        this.calculateTotalPrice(listingId, nights);

        // Activer le bouton de réservation SEULEMENT si l'utilisateur est connecté
        const bookButton = document.getElementById('book-button');
        if (bookButton) {
            // Vérifier si l'utilisateur est connecté (utiliser ApiClient au lieu de API)
            const isAuthenticated = window.ApiClient && window.ApiClient.auth && window.ApiClient.auth.isAuthenticated();

            console.log('🔍 Vérification authentification:', isAuthenticated);

            if (isAuthenticated) {
                // Utilisateur connecté : activer le bouton normalement
                bookButton.disabled = false;
                bookButton.removeAttribute('disabled');
                bookButton.style.opacity = '1';
                bookButton.style.cursor = 'pointer';
                bookButton.style.pointerEvents = 'auto';
                bookButton.classList.add('pulse-animation');
                setTimeout(() => bookButton.classList.remove('pulse-animation'), 600);

                // Retirer l'icône de cadenas si présente
                const lockIcon = bookButton.querySelector('.lock-icon');
                if (lockIcon) {
                    lockIcon.remove();
                    console.log('✅ Cadenas retiré - utilisateur connecté');
                }

                console.log('✅ Bouton réservation activé (utilisateur connecté)');
            } else {
                // Utilisateur NON connecté : permettre le clic mais montrer indicateur
                bookButton.disabled = false;
                bookButton.removeAttribute('disabled');
                bookButton.style.opacity = '0.7';
                bookButton.style.cursor = 'pointer';
                bookButton.style.pointerEvents = 'auto';

                // Ajouter un indicateur visuel (icône de cadenas)
                if (!bookButton.querySelector('.lock-icon')) {
                    const lockIcon = document.createElement('span');
                    lockIcon.className = 'lock-icon';
                    lockIcon.innerHTML = '🔒 ';
                    lockIcon.style.marginRight = '4px';
                    bookButton.insertBefore(lockIcon, bookButton.firstChild);
                    console.log('⚠️ Cadenas ajouté - utilisateur NON connecté');
                }

                console.log('⚠️ Bouton visible mais nécessite connexion');
            }
        }
    },

    /**
     * Mettre à jour l'affichage des dates de réservation
     */
    updateBookingDisplay(checkIn, checkOut, nights) {
        const checkInElement = document.getElementById('check-in-date');
        const checkOutElement = document.getElementById('check-out-date');
        const nightsElement = document.getElementById('nights-count');
        const datesDisplay = document.getElementById('booking-dates-display');

        if (checkInElement) checkInElement.textContent = checkIn;
        if (checkOutElement) checkOutElement.textContent = checkOut;
        if (nightsElement) nightsElement.textContent = `${nights} nuit${nights > 1 ? 's' : ''}`;

        if (datesDisplay) {
            datesDisplay.innerHTML = `
                <span class="date-badge">${checkIn}</span> 
                <span class="date-arrow">→</span> 
                <span class="date-badge">${checkOut}</span>
            `;
        }
    },

    /**
     * Réinitialiser l'affichage
     */
    resetBookingDisplay() {
        const checkInElement = document.getElementById('check-in-date');
        const checkOutElement = document.getElementById('check-out-date');
        const nightsElement = document.getElementById('nights-count');
        const datesDisplay = document.getElementById('booking-dates-display');

        const placeholder = 'Non sélectionné';
        if (checkInElement) checkInElement.textContent = placeholder;
        if (checkOutElement) checkOutElement.textContent = placeholder;
        if (nightsElement) nightsElement.textContent = '0 nuit';
        if (datesDisplay) datesDisplay.textContent = 'Sélectionnez vos dates';

        // Réinitialiser les prix
        const priceElement = document.getElementById('total-price');
        const subtotalElement = document.getElementById('subtotal-price');
        const feesElement = document.getElementById('service-fees');

        if (subtotalElement) subtotalElement.textContent = '-- DZD';
        if (feesElement) feesElement.textContent = '-- DZD';
        if (priceElement) priceElement.textContent = '-- DZD';

        // Désactiver le bouton
        const bookButton = document.getElementById('book-button');
        if (bookButton) bookButton.disabled = true;
    },

    /**
     * Calculer le prix total
     */
    /**
     * Calculer le prix total
     */
    async calculateTotalPrice(listingId, nights) {
        try {
            // Récupérer le listing (depuis appData global ou API)
            let listing = null;

            if (typeof appData !== 'undefined') {
                listing = appData.listings.find(l => l.id === listingId);
            } else if (typeof API_URL !== 'undefined') {
                const response = await fetch(`${API_URL}/api/listings/${listingId}`);
                listing = await response.json();
            }

            if (!listing) {
                console.error('❌ Listing introuvable');
                return;
            }

            // Extraire le prix
            let pricePerNight = 0;

            // CHECK IF ROOM PRICE IS SELECTED (For Hotels)
            if (typeof window.currentRoomPrice !== 'undefined' && window.currentRoomPrice > 0) {
                pricePerNight = window.currentRoomPrice;
            } else if (typeof listing.price === 'number') {
                pricePerNight = listing.price;
            } else if (typeof listing.price === 'string') {
                const match = listing.price.match(/[\d,]+/);
                if (match) {
                    pricePerNight = parseFloat(match[0].replace(/,/g, ''));
                }
            }

            const subtotal = pricePerNight * nights;
            const serviceFees = subtotal * 0.05; // 5% frais de service
            const total = subtotal + serviceFees;

            console.log(`💰 Calcul prix: ${pricePerNight} DZD x ${nights} nuits = ${total.toFixed(2)} DZD`);

            // Mettre à jour l'UI
            const priceElement = document.getElementById('total-price');
            const subtotalElement = document.getElementById('subtotal-price');
            const feesElement = document.getElementById('service-fees');
            const pricePerNightElement = document.getElementById('price-per-night');

            if (pricePerNightElement) {
                pricePerNightElement.textContent = `${pricePerNight.toLocaleString('fr-DZ')} DA`;
            }

            if (subtotalElement) {
                subtotalElement.innerHTML = `${subtotal.toLocaleString('fr-DZ')} <small>DA</small>`;
            }

            if (feesElement) {
                feesElement.innerHTML = `${serviceFees.toLocaleString('fr-DZ')} <small>DA</small>`;
            }

            if (priceElement) {
                priceElement.innerHTML = `<strong>${total.toLocaleString('fr-DZ')}</strong> <small>DA</small>`;
            }

        } catch (error) {
            console.error('❌ Erreur calcul prix:', error);
        }
    },

    /**
     * Recalculer le prix (appelé quand on change de chambre)
     */
    recalculateTotal() {
        if (this.flatpickrInstance && this.flatpickrInstance.selectedDates.length === 2) {
            const [checkIn, checkOut] = this.flatpickrInstance.selectedDates;
            this.onDatesSelected(checkIn, checkOut, this.currentListingId);
        }
    },

    /**
     * Obtenir les dates sélectionnées
     */
    getSelectedDates() {
        if (!this.flatpickrInstance) return null;

        const dates = this.flatpickrInstance.selectedDates;
        if (dates.length === 2) {
            return {
                checkIn: dates[0].toISOString().split('T')[0],
                checkOut: dates[1].toISOString().split('T')[0],
                nights: Math.ceil((dates[1] - dates[0]) / (1000 * 60 * 60 * 24))
            };
        }

        return null;
    },

    /**
     * Effacer la sélection
     */
    clear() {
        if (this.flatpickrInstance) {
            this.flatpickrInstance.clear();
            this.resetBookingDisplay();
        }
    },

    /**
     * Détruire l'instance du calendrier
     */
    destroy() {
        if (this.flatpickrInstance) {
            this.flatpickrInstance.destroy();
            this.flatpickrInstance = null;
            console.log('🗑️ Calendrier détruit');
        }
    },

    /**
     * Initialiser le calendrier sur la page d'accueil (hero section)
     * @param {HTMLElement} inputElement - Input du calendrier hero
     */
    initHero(inputElement) {
        if (!inputElement) {
            console.error('❌ Calendar: Hero input element not found');
            return;
        }

        console.log('📅 Initialisation calendrier Hero');

        // Détruire l'instance précédente si elle existe
        if (this.heroFlatpickrInstance) {
            this.heroFlatpickrInstance.destroy();
        }

        this.heroFlatpickrInstance = flatpickr(inputElement, {
            mode: 'range',
            minDate: 'today',
            dateFormat: 'd M Y',
            locale: 'fr',
            inline: false,
            showMonths: window.innerWidth > 768 ? 2 : 1,
            onChange: (dates) => {
                if (dates.length === 2) {
                    // Sync with global selectedDates
                    if (typeof selectedDates !== 'undefined') {
                        selectedDates.from = dates[0].toISOString().split('T')[0];
                        selectedDates.to = dates[1].toISOString().split('T')[0];
                        console.log('📅 Hero dates synced:', selectedDates);
                    }

                    // Also update discover calendar if it exists
                    if (this.discoverFlatpickrInstance) {
                        this.discoverFlatpickrInstance.setDate(dates, false);
                    }

                    // Update the warning message on discover page if visible
                    const messageEl = document.getElementById('discover-dates-message');
                    if (messageEl) messageEl.style.display = 'none';
                } else if (dates.length === 0) {
                    if (typeof selectedDates !== 'undefined') {
                        selectedDates.from = null;
                        selectedDates.to = null;
                    }
                    // Clear discover calendar if it exists
                    if (this.discoverFlatpickrInstance) {
                        this.discoverFlatpickrInstance.clear();
                    }
                }
            },
            onReady: () => {
                console.log('✅ Hero calendrier prêt');
            }
        });
    },

    /**
     * Get current global selected dates
     */
    getGlobalDates() {
        if (typeof selectedDates !== 'undefined') {
            return {
                from: selectedDates.from,
                to: selectedDates.to
            };
        }
        return null;
    },

    /**
     * Flatpickr instance for discover page
     */
    discoverFlatpickrInstance: null,

    /**
     * Initialize the calendar on the discover page
     * @param {HTMLElement} inputElement - Input for the discover page calendar
     */
    initDiscover(inputElement) {
        if (!inputElement) {
            console.error('❌ Calendar: Discover input element not found');
            return;
        }

        console.log('📅 Initialisation calendrier Discover');

        // Destroy previous instance if it exists
        if (this.discoverFlatpickrInstance) {
            this.discoverFlatpickrInstance.destroy();
        }

        // Get default dates from global selectedDates
        const defaultDates = [];
        if (typeof selectedDates !== 'undefined' && selectedDates.from && selectedDates.to) {
            defaultDates.push(selectedDates.from, selectedDates.to);
        }

        this.discoverFlatpickrInstance = flatpickr(inputElement, {
            mode: 'range',
            minDate: 'today',
            dateFormat: 'd M Y',
            locale: 'fr',
            inline: false,
            showMonths: window.innerWidth > 768 ? 2 : 1,
            defaultDate: defaultDates.length === 2 ? defaultDates : undefined,
            onChange: (dates) => {
                const messageEl = document.getElementById('discover-dates-message');
                const displayEl = document.getElementById('search-dates-display');

                if (dates.length === 2) {
                    // Sync with global selectedDates
                    if (typeof selectedDates !== 'undefined') {
                        selectedDates.from = dates[0].toISOString().split('T')[0];
                        selectedDates.to = dates[1].toISOString().split('T')[0];
                        console.log('📅 Discover dates synced:', selectedDates);
                    }

                    // Hide warning message
                    if (messageEl) messageEl.style.display = 'none';

                    // Update display
                    if (displayEl) {
                        const nights = Math.ceil((dates[1] - dates[0]) / (1000 * 60 * 60 * 24));
                        displayEl.textContent = `${nights} nuit${nights > 1 ? 's' : ''}`;
                        displayEl.style.display = 'inline';
                    }

                    // Also update hero calendar if it exists
                    if (this.heroFlatpickrInstance) {
                        this.heroFlatpickrInstance.setDate(dates, false);
                    }
                } else if (dates.length === 0) {
                    if (typeof selectedDates !== 'undefined') {
                        selectedDates.from = null;
                        selectedDates.to = null;
                    }
                    // Show warning message
                    if (messageEl) messageEl.style.display = 'block';
                    if (displayEl) displayEl.style.display = 'none';
                }
            },
            onReady: () => {
                console.log('✅ Discover calendrier prêt');
                // Check if dates are already selected
                const messageEl = document.getElementById('discover-dates-message');
                if (typeof selectedDates !== 'undefined' && selectedDates.from && selectedDates.to) {
                    if (messageEl) messageEl.style.display = 'none';
                }
            }
        });
    }
};

// Exposer globalement
window.CalendarSystem = CalendarSystem;

console.log('✅ Calendar System loaded');
