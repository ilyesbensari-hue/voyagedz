# 📋 Intégration Calendrier - Instructions

## Ce qui a été fait ✅

1. **Flatpickr ajouté** dans `index.html` :
   - CSS Flatpickr
   - CSS thème Airbnb
   - JS Flatpickr
   - Locale française

2. **Fichier `calendar.js` créé** avec :
   - `CalendarSystem.init(listingId, inputElement)` - Initialisation
   - `get BokedDates()` - Récupère dates réservées
   - `onDates Selected()` - Callback sélection
   - `calculateTotalPrice()` - Calcul automatique
   - Support localStorage & API

3. **Styles CSS** ajoutés dans `styles.css` :
   - Input calendrier
   - Résumé réservation
   - Affichage prix
   - Bouton réserver
   - Th`me Flatpickr personnalisé
   - Responsive

## Prochaines étapes 🎯

### 1. Intégrer dans la page détails

Ajouter dans la fonction `showDetail()` (app.js, après includesHtml) :

```javascript
// Section réservation avec calendrier
const bookingHtml = `
    <div class="booking-section">
        <h3>📅 Réserver</h3>
        
        <!-- Input calendrier -->
        <div class="date-input-container">
            <input 
                type="text" 
                id="booking-dates" 
                class="date-input" 
                placeholder="Sélectionnez vos dates..."
                readonly
            >
        </div>

        <!-- Affichage des dates sélectionnées -->
        <div id="booking-dates-display" style="display:none;">
            Sélectionnez vos dates
        </div>

        <!-- Résumé réservation -->
        <div class="booking-summary">
            <div class="booking-detail">
                <span>Check-in</span>
                <span id="check-in-date">Non sélectionné</span>
            </div>
            <div class="booking-detail">
                <span>Check-out</span>
                <span id="check-out-date">Non sélectionné</span>
            </div>
            <div class="booking-detail">
                <span>Nuits</span>
                <span id="nights-count">0 nuit</span>
            </div>
        </div>

        <!-- Prix détaillé -->
        <div class="price-breakdown">
            <div class="price-line">
                <span>Prix par nuit</span>
                <span id="price-per-night">${currentListing.price}</span>
            </div>
            <div class="price-line">
                <span>Sous-total</span>
                <span id="subtotal-price">-- DZD</span>
            </div>
            <div class="price-line">
                <span>Frais de service (5%)</span>
                <span id="service-fees">-- DZD</span>
            </div>
            <div class="price-line price-total">
                <span><strong>Total</strong></span>
                <span id="total-price">-- DZD</span>
            </div>
        </div>

        <!-- Bouton réserver -->
        <button 
            id="book-button" 
            class="btn-primary btn-full" 
            disabled
            onclick="handleBooking()"
        >
            Réserver maintenant
        </button>
    </div>
`;
```

### 2. Ajouter bookingHtml dans le template

Dans `showDetail()`, modifier le template principal :

```javascript
detailContent.innerHTML = `
    <div class="detail-gallery">
        <img src="${currentListing.image}" alt="${currentListing.title}">
    </div>
    <div class="detail-info">
        <h1 class="detail-title">${currentListing.title}</h1>
        <!-- ... méta, description, amenities, includes ... -->
        ${amenitiesHtml}
        ${includesHtml}
        
        ${bookingHtml}  <!-- ⭐ AJOUTER ICI -->
    </div>
`;
```

### 3. Initialiser le calendrier

À la fin de `showDetail()`, après `document.getElementById('detail-price')...` :

```javascript
// Initialiser le calendrier
setTimeout(() => {
    const dateInput = document.getElementById('booking-dates');
    if (dateInput && window.CalendarSystem) {
        console.log('🗓️ Initialisation calendrier...');
        CalendarSystem.init(listingId, dateInput);
    }
}, 100);

// Naviguer vers la page détail
navigateTo('detail');
```

### 4. Fonction de réservation

Ajouter cette fonction dans `app.js` :

```javascript
// Handle booking with calendar dates
function handleBooking() {
    if (!window.CalendarSystem) {
        alert('❌ Système de calendrier non disponible');
        return;
    }

    const dates = CalendarSystem.getSelectedDates();
    
    if (!dates) {
        alert('⚠️ Veuillez sélectionner des dates');
        return;
    }

    // Vérifier authentification
    const user = getCurrentUser();
    if (!user) {
        openLoginModal();
        showNotification('Connectez-vous pour réserver', 'info');
        return;
    }

    // Remplir les dates pour le paiement
    selectedDates.from = dates.checkIn;
    selectedDates.to = dates.checkOut;

    // Ouvrir modal paiement
    openPaymentModal();
}

// Exposer globalement
window.handleBooking = handleBooking;
```

### 5. Backend - Route dates réservées (optionnel)

Si vous avez un backend, ajoutez dans `server.js` :

```javascript
app.get('/api/listings/:id/booked-dates', (req, res) => {
    const { id } = req.params;
    
    const bookings = db.prepare(`
        SELECT date_from, date_to 
        FROM bookings 
        WHERE listing_id = ? 
        AND status IN ('confirmed', 'pending')
        AND date_to >= date('now')
        ORDER BY date_from ASC
    `).all(id);

    const dates = bookings.map(b => ({
        from: b.date_from,
        to: b.date_to
    }));

    res.json({ dates });
});
```

## Test du calendrier 🧪

1. Ouvrir `index.html`
2. Cliquer sur un listing
3. **Vérifier :**
   - Input calendrier visible
   - Clic ouvre le calendrier
   - Sélection de période fonctionne
   - Prix calculé automatiquement
   - Nuits affichées
   - Bouton "Réserver" activé après sélection

## Problèmes courants 🔧

**Calendrier ne s'ouvre pas :**
- Vérifier que flatpickr est chargé (`console.log(flatpickr)`)
- Vérifier que calendar.js est chargé après flatpickr

**Prix pas calculé :**
- Vérifier format du price dans `data.js` (doit être nombre ou "5000 DA")
- Vérifier que `calcul ateTotalPrice()` trouve le listing

**Dates réservées pas bloquées :**
- Vérifier route backend `/api/listings/:id/booked-dates`
- Vérifier structure retournée : `{ dates: [{from, to}, ...] }`

