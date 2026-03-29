// ==========================================================
// BOOKING SYSTEM - Nouvelle implémentation complète
// ==========================================================

// Global state for temporary booking data
window.currentBookingDraft = null;

/**
 * Gérer la réservation : Validation -> Modal Paiement
 */
window.handleBooking = function () {
    console.log('📝 handleBooking appelé');

    // 1. Vérifier authentification
    if (!API.auth.isAuthenticated()) {
        showError(
            'Connexion requise',
            'Veuillez vous connecter pour effectuer une réservation.',
            () => {
                // Ouvrir modal login si dispo, ou rediriger
                const loginModal = document.getElementById('login-modal');
                if (loginModal) loginModal.classList.add('active');
            },
            'Se connecter'
        );
        return;
    }

    // 2. Vérifier que des dates sont sélectionnées
    const dates = CalendarSystem.getSelectedDates();
    if (!dates || !dates.checkIn || !dates.checkOut) {
        showError(
            'Dates manquantes',
            'Veuillez sélectionner des dates de séjour avant de réserver.',
            null,
            'OK'
        );
        return;
    }

    // 3. Vérifier qu'un listing est sélectionné
    if (!currentListing) {
        showError(
            'Erreur',
            'Aucun logement sélectionné. Veuillez réessayer.',
            null,
            'OK'
        );
        return;
    }

    // 4. Calculer le prix total
    const nights = dates.nights;
    const basePrice = window.currentRoomPrice || parseIntPrice(currentListing.price);
    const subtotal = basePrice * nights;
    const serviceFees = subtotal * 0.05;
    const total = subtotal + serviceFees;

    // 5. Stocker les données temporaires
    window.currentBookingDraft = {
        listingId: currentListing.id,
        dateFrom: dates.checkIn,
        dateTo: dates.checkOut,
        guests: 1, // Par défaut
        totalPrice: total
    };

    // 6. Ouvrir le modal de paiement
    openBookingPaymentModal(total);
};

// Ouvrir le modal de paiement
window.openBookingPaymentModal = function (totalPrice) {
    const modal = document.getElementById('payment-modal');
    const amountDisplay = document.getElementById('payment-total-amount');

    if (modal && amountDisplay) {
        amountDisplay.textContent = API.utils.formatPrice(totalPrice);
        modal.classList.add('active'); // Utiliser class active pour display flex
        modal.style.display = 'flex'; // Force display just in case
    } else {
        console.error('Modal de paiement non trouvé dans le DOM');
    }
};

// Fermer le modal de paiement
window.closeBookingPaymentModal = function () {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
};

// Traiter le paiement et créer la réservation
window.processBookingPayment = async function () {
    if (!window.currentBookingDraft) return;

    const paymentMethodInput = document.querySelector('input[name="payment"]:checked');
    const paymentMethod = paymentMethodInput ? paymentMethodInput.value : null;

    if (!paymentMethod) {
        alert('Veuillez sélectionner un mode de paiement.');
        return;
    }

    const payBtn = document.querySelector('#payment-modal .btn-primary');
    if (payBtn) {
        payBtn.textContent = 'Traitement en cours...';
        payBtn.disabled = true;
    }

    try {
        // Simuler un délai de traitement de paiement (2s)
        await new Promise(resolve => setTimeout(resolve, 1500));

        const bookingData = {
            ...window.currentBookingDraft,
            paymentMethod: paymentMethod
        };

        // Créer la réservation via l'API
        const createdBooking = await API.bookings.create(bookingData);

        // Fermer modal paiement
        closeBookingPaymentModal();

        // Afficher la confirmation
        showSuccessModal(createdBooking);

        console.log('✅ Réservation créée:', createdBooking);

    } catch (error) {
        console.error('❌ Erreur réservation:', error);
        closeBookingPaymentModal();
        showError(
            'Erreur de réservation',
            'Le paiement a échoué ou la réservation n\'a pas pu être créée. Veuillez réessayer.',
            () => openBookingPaymentModal(window.currentBookingDraft.totalPrice), // Retry action
            'Réessayer'
        );
    } finally {
        if (payBtn) {
            payBtn.textContent = 'Confirmer le paiement';
            payBtn.disabled = false;
        }
    }
};

/**
 * Générer un code de confirmation unique
 */
function generateConfirmationCode() {
    const prefix = 'VDZ';
    const numbers = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${numbers}`;
}

/**
 * Parser le prix (gérer différents formats)
 */
function parseIntPrice(priceString) {
    if (typeof priceString === 'number') return priceString;
    if (!priceString) return 0;

    // Extraire les chiffres uniquement
    const match = String(priceString).match(/[\d,]+/);
    if (!match) return 0;

    return parseFloat(match[0].replace(/,/g, ''));
}

/**
 * Afficher un message d'erreur avec modal
 */
function showError(title, message, onConfirm = null, confirmText = 'OK') {
    // Créer un modal temporaire
    const modal = document.createElement('div');
    modal.className = 'error-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(230, 57, 70, 0.3);
            animation: slideUp 0.3s ease;
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2" style="margin: 0 auto;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; text-align: center; color: var(--error);">
                ${title}
            </h3>
            <p style="margin: 0 0 2rem 0; text-align: center; color: var(--text-secondary); line-height: 1.6;">
                ${message}
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn-secondary" id="error-cancel-btn" style="flex: 1;">
                    Annuler
                </button>
                <button class="btn-primary" id="error-confirm-btn" style="flex: 1;">
                    ${confirmText}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Gérer les clics
    const confirmBtn = modal.querySelector('#error-confirm-btn');
    const cancelBtn = modal.querySelector('#error-cancel-btn');

    confirmBtn.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });

    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });

    // Fermer en cliquant en dehors
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Ajouter les animations CSS
    if (!document.querySelector('#error-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'error-modal-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Afficher le modal de confirmation de réservation
 */
function showSuccessModal(booking) {
    const modal = document.createElement('div');
    modal.className = 'success-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(42, 157, 143, 0.3);
            animation: slideUp 0.3s ease;
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" style="margin: 0 auto;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem; text-align: center; color: var(--success);">
                🎉 Réservation confirmée !
            </h3>
            <p style="margin: 0 0 1.5rem 0; text-align: center; color: var(--text-secondary);">
                Votre réservation a été créée avec succès.
            </p>
            
            <div style="background: rgba(255,255,255,0.03); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span style="color: var(--text-secondary);">Code de confirmation</span>
                    <strong style="color: var(--primary); font-size: 1.1rem;">${booking.confirmationCode}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-secondary);">Hébergement</span>
                    <strong>${booking.listing.title}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-secondary);">Arrivée</span>
                    <strong>${new Date(booking.dateFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-secondary);">Départ</span>
                    <strong>${new Date(booking.dateTo).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-secondary);">Durée</span>
                    <strong>${(() => {
            const nights = Math.ceil((new Date(booking.dateTo) - new Date(booking.dateFrom)) / (1000 * 60 * 60 * 24));
            return `${nights} nuit${nights > 1 ? 's' : ''}`;
        })()}</strong>
                </div>
                <!-- Validation null check for price -->
                <div style="display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid rgba(255,255,255,0.2); font-size: 1.1rem;">
                    <span style="color: var(--text-secondary);"><strong>Total payé</strong></span>
                    <strong style="color: var(--primary);">${(booking.totalPrice || 0).toLocaleString('fr-DZ')} DA</strong>
                </div>
            </div>

            <p style="margin: 1.5rem 0; text-align: center; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
                📧 Un email de confirmation a été envoyé à votre adresse.<br>
                Vous pouvez retrouver cette réservation dans <strong>Mes Réservations</strong>.
            </p>

            <div style="display: flex; gap: 1rem;">
                <button class="btn-secondary" onclick="this.closest('.success-modal').remove()" style="flex: 1;">
                    Fermer
                </button>
                <button class="btn-primary" onclick="this.closest('.success-modal').remove(); navigateTo('bookings');" style="flex: 1;">
                    Voir mes réservations
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fermer en cliquant en dehors
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

console.log('✅ Booking system loaded (with Payment Modal)');
