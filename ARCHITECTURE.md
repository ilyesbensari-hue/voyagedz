# Architecture - Voyage DZ

## 📐 Vue d'ensemble

Voyage DZ est une **Progressive Web App (PWA)** pour la réservation touristique en Algérie, avec une architecture **Client-Serveur** moderne.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ index.html │  │  app.js    │  │ styles.css │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │               │                                    │
│         └───────────────┴────────────┐                      │
│                                       │                       │
│                              ┌────────▼────────┐             │
│                              │  api-client.js  │             │
│                              └────────┬────────┘             │
└───────────────────────────────────────┼──────────────────────┘
                                        │
                                  HTTP/REST API
                                        │
┌───────────────────────────────────────▼──────────────────────┐
│                      BACKEND (Node.js)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ server.js  │──│ init-db.js │  │ database   │            │
│  │ (Express)  │  │            │  │  (SQLite)  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└───────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Structure du Projet

```
voyage-dz/
├── backend/                    # Backend Node.js
│   ├── server.js              # Serveur Express + API REST
│   ├── init-db.js             # Script d'initialisation de la BDD
│   ├── package.json           # Dépendances backend
│   ├── database.sqlite        # Base de données (généré)
│   └── uploads/               # Images uploadées (généré)
│
├── index.html                 # Interface principale (SPA)
├── app.js                     # Logique métier frontend
├── api-client.js              # Client API (communication backend)
├── styles.css                 # Styles de l'application
├── sw.js                      # Service Worker (PWA)
├── manifest.json              # Manifeste PWA
│
└── docs/                      # Documentation
    ├── README.md              # Guide de démarrage
    ├── ARCHITECTURE.md        # Ce fichier
    ├── TECHNICAL.md           # Détails techniques
    ├── FEATURES.md            # Liste des fonctionnalités
    └── CUSTOMIZATION.md       # Guide de personnalisation
```

---

## 🔧 Stack Technique

### **Frontend** (Client)
- **HTML5** - Structure sémantique
- **CSS3** - Styles modernes (variables CSS, Grid, Flexbox)
- **JavaScript (Vanilla ES6+)** - Aucun framework (léger et rapide)
- **PWA** - Progressive Web App (offline, installable)
- **Service Worker** - Cache et fonctionnement hors ligne

### **Backend** (Serveur)
- **Node.js** - Runtime JavaScript côté serveur
- **Express.js** - Framework web minimaliste
- **SQLite** (better-sqlite3) - Base de données embarquée
- **JWT** (jsonwebtoken) - Authentification sécurisée
- **bcryptjs** - Hashage de mots de passe
- **Multer** - Upload de fichiers (images)
- **CORS** - Gestion des requêtes cross-origin

---

## 🔄 Flux de Données

### 1. **Authentification**
```
User Login
    ↓
[Frontend] → POST /api/auth/login → [Backend]
                                         ↓
                                    Vérification email/password
                                         ↓
                                    Génération JWT token
                                         ↓
[Frontend] ← { user, token } ← [Backend]
    ↓
Stockage token dans localStorage
    ↓
Ajout du token dans les en-têtes HTTP
```

### 2. **Récupération de données**
```
Page Load
    ↓
[Frontend] → GET /api/listings → [Backend]
                                      ↓
                                 Query SQLite
                                      ↓
[Frontend] ← JSON data ← [Backend]
    ↓
Render UI (createListingCard)
```

### 3. **Création de réservation**
```
User clicks "Réserver"
    ↓
[Frontend] → POST /api/bookings + JWT → [Backend]
                                             ↓
                                        Vérification token
                                             ↓
                                        Vérification disponibilité
                                             ↓
                                        INSERT INTO bookings
                                             ↓
[Frontend] ← { booking, confirmation_code } ← [Backend]
    ↓
Affichage confirmation
```

---

## 🗄️ Modèle de Données (Base de données)

### **Tables principales**

#### **users** - Utilisateurs
```sql
id, name, email, password (hashed), phone, role, 
is_host, host_description, avatar, created_at, updated_at
```

#### **cities** - Villes touristiques
```sql
id, name, slug, description, image, featured
```

#### **listings** - Annonces (logements + activités)
```sql
id, host_id, city_id, title, description, type, 
category, price, location, image, duration, 
max_guests, rating, reviews_count, featured, 
status, created_at, updated_at
```

#### **bookings** - Réservations
```sql
id, user_id, listing_id, date_from, date_to, 
guests, total_price, payment_method, 
confirmation_code, status, created_at
```

#### **favorites** - Favoris
```sql
id, user_id, listing_id, created_at
```

#### **reviews** - Avis
```sql
id, user_id, listing_id, rating, comment, created_at
```

#### **amenities** - Équipements
```sql
id, name, icon
```

#### **listing_amenities** - Association annonces-équipements
```sql
id, listing_id, amenity_id
```

#### **listing_images** - Images des annonces
```sql
id, listing_id, url
```

### **Relations**
```
users (1) ──── (N) listings (hôte possède plusieurs annonces)
users (1) ──── (N) bookings (user réserve plusieurs annonces)
cities (1) ──── (N) listings (ville contient plusieurs annonces)
listings (1) ──── (N) bookings
listings (1) ──── (N) reviews
listings (N) ──── (N) amenities (via listing_amenities)
listings (1) ──── (N) listing_images
```

---

## 🔌 API REST Endpoints

### **Authentification**
```
POST   /api/auth/register    - Créer un compte
POST   /api/auth/login       - Se connecter
GET    /api/auth/me          - Profil utilisateur (auth requis)
```

### **Villes**
```
GET    /api/cities           - Liste des villes
GET    /api/cities/:id       - Détails d'une ville
```

### **Annonces**
```
GET    /api/listings                  - Liste (avec filtres)
GET    /api/listings/:id              - Détails
POST   /api/listings                  - Créer (hôte uniquement)
PUT    /api/listings/:id              - Modifier (hôte uniquement)
DELETE /api/listings/:id              - Supprimer (hôte uniquement)
GET    /api/host/listings             - Annonces de l'hôte
```

### **Réservations**
```
GET    /api/bookings                  - Mes réservations
POST   /api/bookings                  - Créer une réservation
PATCH  /api/bookings/:id/cancel       - Annuler
GET    /api/host/bookings             - Réservations reçues (hôte)
```

### **Favoris**
```
GET    /api/favorites                 - Mes favoris
POST   /api/favorites/:listingId      - Ajouter/Retirer
```

### **Avis**
```
GET    /api/listings/:id/reviews      - Avis d'une annonce
POST   /api/listings/:id/reviews      - Laisser un avis
```

### **Hôte**
```
POST   /api/become-host               - Devenir hôte
GET    /api/host/stats                - Statistiques hôte
```

### **Statistiques**
```
GET    /api/stats                     - Stats utilisateur
GET    /api/amenities                 - Liste des équipements
```

---

## 🔒 Sécurité

### **Authentification JWT**
- Token généré lors du login
- Stocké dans `localStorage`
- Envoyé dans l'en-tête `Authorization: Bearer <token>`
- Vérifié par le middleware `authenticateToken`

### **Hashage des mots de passe**
- Utilisation de **bcryptjs** avec 10 rounds de salage
- Jamais de mots de passe en clair dans la BDD

### **Autorisations**
- Middleware `authenticateToken` pour les routes protégées
- Vérification propriétaire pour modifications/suppressions
- Séparation des rôles (user / host / admin)

### **Upload de fichiers**
- Limite de taille: 5 MB par image
- Types acceptés: JPEG, PNG, WebP
- Stockage dans `/uploads` avec noms UUID

---

## 🚀 Flux d'Initialisation

### **Backend**
1. `npm install` → Installation dépendances
2. `node init-db.js` → Création BDD + données de test
3. `npm start` → Lancement serveur Express (port 3000)

### **Frontend**
1. Ouverture `index.html` (ou Live Server)
2. Chargement `app.js` et `api-client.js`
3. `initApp()` → Initialisation UI
4. Appels API pour charger données initiales

---

## 🎯 Points d'Extension

Pour ajouter une fonctionnalité :

1. **Backend** : Ajouter un endpoint dans `server.js`
2. **API Client** : Ajouter une méthode dans `api-client.js`
3. **Frontend** : Créer une fonction de render dans `app.js`
4. **UI** : Ajouter les éléments HTML dans `index.html`

---

## 📊 Performances

- **Backend** : SQLite synchrone (better-sqlite3) pour rapidité
- **Frontend** : Aucun framework lourd (chargement rapide)
- **PWA** : Cache des assets pour offline
- **Images** : Optimisation recommandée (WebP, compression)

---

## 🔍 Débogage

- **Console backend** : Logs serveur (`console.log` dans server.js)
- **Console navigateur** : Logs frontend (F12 → Console)
- **Réseau** : F12 → Network → Voir les requêtes API
- **Base de données** : Utiliser un viewer SQLite (DB Browser for SQLite)
