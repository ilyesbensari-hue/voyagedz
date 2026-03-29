# Frontend - Voyage DZ

## 📋 Description

Frontend de l'application Voyage DZ - Progressive Web App (PWA) pour la réservation touristique en Algérie.

**Architecture:** Single Page Application (SPA) en Vanilla JavaScript

---

## 🗂️ Structure des Fichiers

```
voyage-dz/
├── index.html         # Page HTML principale (structure de l'app)
├── app.js             # Logique métier et gestion des vues
├── api-client.js      # Client API pour communication avec le backend
├── styles.css         # Styles CSS de l'application
├── sw.js              # Service Worker (PWA - cache offline)
├── manifest.json      # Manifeste PWA (métadonnées app)
└── icons/             # Icônes de l'application
```

---

## 📄 Fichiers Principaux

### **index.html**
Page HTML unique qui contient toutes les vues de l'application.

**Structure:**
```html
<body>
    <!-- Navigation -->
    <nav id="navbar">...</nav>
    
    <!-- Pages (affichées/cachées avec JS) -->
    <section id="home-page">...</section>
    <section id="explore-page" class="hidden">...</section>
    <section id="favorites-page" class="hidden">...</section>
    <section id="bookings-page" class="hidden">...</section>
    <section id="profile-page" class="hidden">...</section>
    <section id="host-dashboard-page" class="hidden">...</section>
    
    <!-- Modales -->
    <div id="detail-modal">...</div>
    <div id="payment-modal">...</div>
    <div id="become-host-modal">...</div>
    
    <!-- Scripts -->
    <script src="api-client.js"></script>
    <script src="app.js"></script>
</body>
```

**Principe:** Une seule page HTML, navigation par affichage/masquage de sections.

---

### **app.js** (933 lignes)
Cœur de l'application - Toute la logique métier frontend.

**Organisation:**

#### 1. **Variables globales**
```javascript
let currentPage = 'home';        // Page actuelle
let currentCity = null;          // Ville sélectionnée
let currentListing = null;       // Annonce en détail
let selectedDates = { from, to } // Dates de réservation
```

#### 2. **Fonctions de rendu (Render Functions)**

| Fonction | Description |
|----------|-------------|
| `renderCities()` | Affiche les villes sur la page d'accueil |
| `renderFeaturedListings()` | Affiche les annonces vedettes |
| `renderSearchResults(filter)` | Affiche les résultats de recherche (logements/activités) |
| `renderFilteredResults(listings)` | Affiche une liste d'annonces filtrées |
| `createListingCard(listing)` | Crée une carte d'annonce (component réutilisable) |
| `renderFavorites()` | Affiche la page des favoris |
| `renderBookings()` | Affiche la page des réservations |
| `renderProfileStats()` | Affiche les statistiques utilisateur |
| `renderHostDashboard()` | Affiche le tableau de bord hôte |
| `renderHostListings()` | Affiche les annonces de l'hôte |
| `renderHostStats()` | Affiche les statistiques hôte |

#### 3. **Navigation**

```javascript
navigateTo(page)        // Change de page (masque/affiche sections)
setupNavigation()       // Configure les listeners de navigation
selectCity(cityId)      // Sélectionne une ville et navigue
```

**Principe:** Chaque page est une `<section>` avec classe `.hidden` ajoutée/retirée.

```javascript
function navigateTo(page) {
    // Masquer toutes les pages
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    
    // Afficher la page demandée
    document.getElementById(`${page}-page`).classList.remove('hidden');
    
    currentPage = page;
}
```

#### 4. **Event Listeners**

```javascript
setupEventListeners()   // Configure tous les listeners au chargement
```

**Gère:**
- Clics sur les boutons de filtre
- Soumission du formulaire de recherche
- Clics sur les cartes d'annonce
- Ouverture/fermeture de modales
- Soumission de formulaires (login, inscription, paiement)

#### 5. **Interactions utilisateur**

| Fonction | Action |
|----------|--------|
| `showDetail(listingId)` | Affiche le détail d'une annonce (modale) |
| `toggleFavorite(listingId)` | Ajoute/retire un favori |
| `openPaymentModal()` | Ouvre la modale de paiement |
| `processPayment()` | Traite une réservation |
| `cancelBooking(id)` | Annule une réservation |

#### 6. **Fonctionnalités Hôte**

| Fonction | Description |
|----------|-------------|
| `checkHostStatus()` | Vérifie si l'utilisateur est hôte (affiche menu) |
| `openBecomeHostModal()` | Ouvre le formulaire "Devenir Hôte" |
| `setupBecomeHostForm()` | Gère la soumission du formulaire |
| `openCreateListingModal()` | Ouvre le formulaire de création d'annonce |
| `setupCreateListingForm()` | Gère la création d'annonce |
| `deleteHostListing(id)` | Supprime une annonce |
| `editHostListing(id)` | Modifie une annonce |

#### 7. **Initialisation**

```javascript
initApp()               // Fonction principale d'initialisation
loginUser()             // Gère le login
registerUser()          // Gère l'inscription
updateAuthUI()          // Met à jour l'interface selon l'auth
```

**Flux d'initialisation:**
```
DOMContentLoaded
    ↓
initApp()
    ↓
setupNavigation()
    ↓
setupEventListeners()
    ↓
updateAuthUI()          // Vérifie si utilisateur connecté
    ↓
checkHostStatus()       // Vérifie si utilisateur est hôte
    ↓
renderCities()          // Charge les villes
renderFeaturedListings() // Charge les annonces vedettes
```

---

### **api-client.js** (239 lignes)
Client API pour communiquer avec le backend.

**Architecture:**

```javascript
const API_URL = 'http://localhost:3000/api';

// Gestion du token JWT
const getToken = () => localStorage.getItem('auth_token');
const setToken = (token) => localStorage.setItem('auth_token', token);
const removeToken = () => localStorage.removeItem('auth_token');

// Wrapper de fetch avec authentification automatique
async function fetchAPI(endpoint, options = {}) {
    const token = getToken();
    
    // Ajouter le token JWT dans les en-têtes si présent
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    // Gestion des erreurs
    if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
    }
    
    return data;
}
```

**Structure de l'objet ApiClient:**

```javascript
const ApiClient = {
    auth: {
        register(name, email, password, phone),
        login(email, password),
        me(),
        logout(),
        isAuthenticated(),
        getCurrentUser(),
        setCurrentUser(user)
    },
    
    cities: {
        getAll(),
        getById(id)
    },
    
    listings: {
        getAll(filters),           // Avec filtres (city, type, price, etc.)
        getById(id),
        getFeatured(),
        create(formData),          // Upload d'images
        update(id, data),
        delete(id)
    },
    
    bookings: {
        getAll(),
        create(data),
        cancel(id)
    },
    
    favorites: {
        getAll(),
        toggle(listingId)          // Ajouter ou retirer
    },
    
    host: {
        becomeHost(data),
        getListings(),
        getBookings(),
        getStats()
    },
    
    reviews: {
        getForListing(listingId),
        create(listingId, rating, comment)
    },
    
    stats: {
        getUserStats(),
        getHostStats()
    },
    
    amenities: {
        getAll()
    }
};

// Exposer globalement
window.ApiClient = ApiClient;
```

**Utilisation dans app.js:**

```javascript
// Récupérer les annonces
const listings = await ApiClient.listings.getAll({ city: 'alger', type: 'lodging' });

// Créer une réservation
const booking = await ApiClient.bookings.create({
    listing_id: 5,
    date_from: '2024-12-10',
    date_to: '2024-12-15',
    guests: 2,
    payment_method: 'card'
});

// Toggle favori
const result = await ApiClient.favorites.toggle(listingId);
console.log(result.isFavorite); // true ou false
```

---

### **styles.css** (42kb)
Feuille de styles complète de l'application.

**Organisation:**

1. **CSS Variables** - Couleurs, espacements, polices
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #10b981;
    --text-dark: #1f2937;
    --bg-light: #f9fafb;
    ...
}
```

2. **Reset & Base** - Styles de base
3. **Layout** - Grilles et conteneurs
4. **Navigation** - Barre de navigation
5. **Components** - Cartes, boutons, modales
6. **Pages** - Styles spécifiques aux pages
7. **Responsive** - Media queries mobile

**Approche:** CSS moderne (Grid, Flexbox, Variables CSS)

---

### **sw.js** (Service Worker)
Gère le cache pour le mode offline (PWA).

**Stratégie:**
- Cache les assets statiques (HTML, CSS, JS, icônes)
- Cache les images des annonces
- Permet l'utilisation hors ligne basique

**Événements:**

```javascript
// Installation: Mise en cache des assets
self.addEventListener('install', event => {
    caches.open('voyage-dz-v1').then(cache => {
        return cache.addAll([
            '/',
            '/index.html',
            '/styles.css',
            '/app.js',
            '/api-client.js',
            '/manifest.json'
        ]);
    });
});

// Fetch: Stratégie Cache-First
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
```

---

### **manifest.json**
Manifeste PWA pour rendre l'app installable.

```json
{
  "name": "Voyage DZ",
  "short_name": "VoyageDZ",
  "description": "Découvrez et réservez des logements et activités en Algérie",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🔄 Flux de Données

### 1. Chargement initial
```
DOMContentLoaded
    ↓
initApp()
    ↓
Vérifier localStorage (auth_token, current_user)
    ↓
Si connecté: updateAuthUI() + checkHostStatus()
    ↓
ApiClient.cities.getAll() → renderCities()
    ↓
ApiClient.listings.getFeatured() → renderFeaturedListings()
```

### 2. Navigation
```
Click sur "Explorer"
    ↓
navigateTo('explore')
    ↓
Masquer toutes sections
Afficher #explore-page
    ↓
renderSearchResults('all')
    ↓
ApiClient.listings.getAll() → createListingCard() × N
```

### 3. Authentification
```
Soumission formulaire login
    ↓
ApiClient.auth.login(email, password)
    ↓
Backend renvoie { user, token }
    ↓
setToken(token) → localStorage
setCurrentUser(user) → localStorage
    ↓
updateAuthUI() - Afficher boutons connecté
checkHostStatus() - Afficher menu hôte si applicable
```

### 4. Réservation
```
Click "Réserver"
    ↓
Vérifier auth (sinon rediriger login)
    ↓
Vérifier dates sélectionnées
    ↓
openPaymentModal()
    ↓
Soumission formulaire paiement
    ↓
ApiClient.bookings.create(data)
    ↓
Backend:
  - Vérifier disponibilité
  - Créer réservation
  - Générer code confirmation
    ↓
Afficher confirmation
Rediriger vers "Mes réservations"
```

---

## 🎨 Création de Composants

### Exemple: Carte d'annonce

```javascript
/**
 * Crée une carte d'annonce (component réutilisable)
 * 
 * @param {Object} listing - Objet annonce
 * @param {boolean} fullWidth - Carte pleine largeur ou non
 * @returns {string} HTML de la carte
 */
function createListingCard(listing, fullWidth = false) {
    return `
        <div class="listing-card ${fullWidth ? 'full-width' : ''}" 
             onclick="showDetail(${listing.id})">
            
            <!-- Image -->
            <img src="${listing.image}" alt="${listing.title}">
            
            <!-- Badge type -->
            <span class="listing-badge">${listing.type === 'lodging' ? '🏠 Logement' : '🎯 Activité'}</span>
            
            <!-- Bouton favori -->
            ${ApiClient.auth.isAuthenticated() ? `
                <button class="favorite-btn ${listing.isFavorite ? 'active' : ''}"
                        onclick="toggleCardFavorite(${listing.id}, this); event.stopPropagation();">
                    ❤️
                </button>
            ` : ''}
            
            <!-- Contenu -->
            <div class="listing-info">
                <h3>${listing.title}</h3>
                <p class="location">${listing.location || listing.city_name}</p>
                <div class="rating">⭐ ${listing.rating} (${listing.reviews_count} avis)</div>
                <p class="price">${formatPrice(listing.price)} DZD</p>
            </div>
        </div>
    `;
}
```

**Utilisation:**
```javascript
const html = listings.map(listing => createListingCard(listing)).join('');
document.getElementById('listings-grid').innerHTML = html;
```

---

## 📱 Responsive Design

**Breakpoints:**
```css
/* Mobile-first approach */

/* Tablette */
@media (min-width: 768px) {
    .listings-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Desktop */
@media (min-width: 1024px) {
    .listings-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
```

---

## 🔒 Gestion de l'Authentification

### Stockage
```javascript
// Token JWT
localStorage.setItem('auth_token', token);

// Infos utilisateur
localStorage.setItem('current_user', JSON.stringify(user));
```

### Vérification
```javascript
// Vérifier si connecté
if (ApiClient.auth.isAuthenticated()) {
    // Utilisateur connecté
    const user = ApiClient.auth.getCurrentUser();
    console.log(`Bonjour ${user.name}`);
} else {
    // Rediriger vers login
    navigateTo('home');
    openLoginModal();
}
```

### UI Dynamique
```javascript
function updateAuthUI() {
    if (ApiClient.auth.isAuthenticated()) {
        // Masquer boutons login/register
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('register-btn').classList.add('hidden');
        
        // Afficher boutons profil/logout
        document.getElementById('profile-btn').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
    } else {
        // Inverse
    }
}
```

---

## 🛠️ Débogage

### Console du navigateur
```javascript
// Activer les logs détaillés
localStorage.setItem('debug', 'true');

// Vérifier l'état
console.log('Current page:', currentPage);
console.log('Current user:', ApiClient.auth.getCurrentUser());
console.log('Auth token:', localStorage.getItem('auth_token'));
```

### Network Tab (F12)
- Voir les requêtes API
- Vérifier les en-têtes (Authorization)
- Inspecter les réponses JSON

---

## 🚀 Optimisations

### Performances
- **Lazy loading** des images
- **Debouncing** de la recherche
- **Cache** des données API
- **Minimisation** du code en production

### SEO
- Balises meta appropriées
- Titres descriptifs
- Structure sémantique HTML5

---

## 📦 Déploiement

### Local (Développement)
1. Ouvrir `index.html` dans le navigateur
2. Ou utiliser Live Server (VS Code extension)

### Production
1. Minifier CSS/JS
2. Optimiser les images
3. Déployer sur un serveur web (Nginx, Apache)
4. Activer HTTPS (requis pour PWA)

---

## 🎯 Points d'Extension

Pour ajouter une fonctionnalité:

1. **API Client**: Ajouter la méthode dans `api-client.js`
2. **Render Function**: Créer une fonction de rendu dans `app.js`
3. **HTML**: Ajouter la structure dans `index.html`
4. **Event Listener**: Connecter les interactions dans `setupEventListeners()`
5. **Styles**: Ajouter les styles dans `styles.css`

**Exemple: Ajouter une page "Blog"**

1. `api-client.js`: Ajouter `blog: { getAll(), getById(id) }`
2. `app.js`: Créer `renderBlog()` et `createBlogCard()`
3. `index.html`: Ajouter `<section id="blog-page">`
4. `app.js`: Ajouter listener dans `setupNavigation()`
5. `styles.css`: Ajouter `.blog-card { ... }`
