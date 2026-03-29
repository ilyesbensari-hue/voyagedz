# Backend - Voyage DZ

## 📋 Description

Backend API RESTful pour l'application Voyage DZ. Construit avec Node.js, Express et SQLite.

## 🗂️ Structure

```
backend/
├── server.js          # Serveur Express principal + endpoints API
├── init-db.js         # Script d'initialisation de la base de données
├── package.json       # Dépendances et scripts npm
├── database.sqlite    # Base de données SQLite (généré après init-db.js)
└── uploads/           # Dossier des images uploadées (créé automatiquement)
```

## 🚀 Installation

### 1. Installer les dépendances
```bash
npm install
```

### 2. Initialiser la base de données
```bash
npm run init-db
# ou
node init-db.js
```

### 3. Démarrer le serveur
```bash
npm start              # Mode production
npm run dev            # Mode développement (auto-reload)
```

Le serveur démarre sur **http://localhost:3000**

## 📦 Dépendances

| Package | Version | Usage |
|---------|---------|-------|
| express | ^4.18.2 | Framework web |
| cors | ^2.8.5 | Gestion CORS |
| better-sqlite3 | ^9.2.2 | Base de données SQLite |
| jsonwebtoken | ^9.0.2 | Authentification JWT |
| bcryptjs | ^2.4.3 | Hashage mots de passe |
| multer | ^1.4.5-lts.1 | Upload fichiers |
| uuid | ^9.0.1 | Génération IDs uniques |

## 🗄️ Base de Données

### Tables

#### **users**
Stocke les utilisateurs (clients, hôtes, admins)
- `id` - Identifiant unique
- `name` - Nom complet
- `email` - Email (unique)
- `password` - Mot de passe hashé
- `phone` - Téléphone (optionnel)
- `role` - Role ('user', 'admin')
- `is_host` - Boolean (0 ou 1)
- `host_description` - Description de l'hôte
- `avatar` - URL de l'avatar
- `created_at`, `updated_at` - Timestamps

#### **cities**
Villes touristiques d'Algérie
- `id`, `name`, `slug`, `description`, `image`, `featured`

#### **listings**
Annonces (logements ou activités)
- `id`, `host_id`, `city_id`, `title`, `description`
- `type` - 'lodging' ou 'activity'
- `category` - 'tours', 'activities', 'restaurants'
- `price` - Prix en DZD
- `location`, `image`, `duration`, `max_guests`
- `rating`, `reviews_count`, `featured`, `status`

#### **bookings**
Réservations des utilisateurs
- `id`, `user_id`, `listing_id`
- `date_from`, `date_to`, `guests`
- `total_price`, `payment_method`
- `confirmation_code` - Code unique (ex: VDZ-A1B2C3)
- `status` - 'pending', 'confirmed', 'cancelled'

#### **favorites**
Favoris des utilisateurs
- `id`, `user_id`, `listing_id`, `created_at`

#### **reviews**
Avis sur les annonces
- `id`, `user_id`, `listing_id`, `rating`, `comment`, `created_at`

#### **amenities**
Équipements disponibles
- `id`, `name`, `icon`

#### **listing_amenities**
Association annonces-équipements (many-to-many)
- `id`, `listing_id`, `amenity_id`

#### **listing_images**
Images multiples des annonces
- `id`, `listing_id`, `url`

### Relations
```
users (1) ──< (N) listings (via host_id)
users (1) ──< (N) bookings (via user_id)
cities (1) ──< (N) listings (via city_id)
listings (1) ──< (N) bookings
listings (1) ──< (N) reviews
listings (N) ──< (N) amenities (via listing_amenities)
listings (1) ──< (N) listing_images
```

## 🔌 API Endpoints

### Authentification

#### `POST /api/auth/register`
Créer un nouveau compte utilisateur

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+213 555 123 456"  // optionnel
}
```

**Response:**
```json
{
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### `POST /api/auth/login`
Se connecter

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user", "isHost": false },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### `GET /api/auth/me`
Récupérer le profil utilisateur (authentifié)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "is_host": 0,
  "phone": "+213 555 123 456",
  "created_at": "2024-12-05T10:30:00Z"
}
```

---

### Villes

#### `GET /api/cities`
Liste de toutes les villes

**Response:**
```json
[
  {
    "id": 1,
    "name": "Alger",
    "slug": "alger",
    "description": "La capitale blanche face à la Méditerranée",
    "image": "https://...",
    "listings_count": 15
  }
]
```

#### `GET /api/cities/:id`
Détails d'une ville

---

### Annonces

#### `GET /api/listings`
Liste des annonces avec filtres

**Query Params (optionnels):**
- `city` - Slug de la ville (ex: "alger")
- `type` - 'lodging' ou 'activity'
- `category` - 'tours', 'activities', 'restaurants'
- `minPrice` - Prix minimum
- `maxPrice` - Prix maximum
- `minRating` - Note minimale (1-5)
- `search` - Recherche texte (titre/description)
- `featured` - 'true' pour annonces vedettes

**Exemple:**
```
GET /api/listings?city=alger&type=lodging&minPrice=5000&maxPrice=10000
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Appartement Vue Mer - Baie d'Alger",
    "description": "Superbe appartement...",
    "type": "lodging",
    "category": null,
    "price": 8500,
    "location": "Alger Centre, Alger",
    "image": "https://...",
    "rating": 4.9,
    "reviews_count": 127,
    "city_name": "Alger",
    "host_name": "Mohammed Hôte"
  }
]
```

#### `GET /api/listings/:id`
Détails d'une annonce (avec équipements et images)

**Response:**
```json
{
  "id": 1,
  "title": "Appartement Vue Mer",
  "description": "...",
  "price": 8500,
  "amenities": ["WiFi", "Climatisation", "Parking"],
  "images": ["/uploads/img1.jpg", "/uploads/img2.jpg"],
  "isFavorite": true,  // si authentifié
  "city_name": "Alger",
  "host_name": "Mohammed Hôte",
  "host_id": 2
}
```

#### `POST /api/listings`
Créer une annonce (hôte uniquement)

**Headers:** `Authorization: Bearer <token>`

**Body:** `multipart/form-data`
```
title: "Villa Moderne"
description: "Belle villa..."
type: "lodging"
category: null
city_id: 1
price: 15000
location: "Hydra, Alger"
duration: null
max_guests: 8
amenities: ["WiFi", "Piscine", "Jardin"]  // JSON string
images: [File, File]  // Max 5 images
```

**Response:**
```json
{
  "id": 15,
  "title": "Villa Moderne",
  "status": "pending",  // En attente de validation
  ...
}
```

#### `PUT /api/listings/:id`
Modifier une annonce (propriétaire ou admin)

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "title": "Nouveau titre",
  "price": 12000,
  "status": "active"
}
```

#### `DELETE /api/listings/:id`
Supprimer une annonce (propriétaire ou admin)

**Headers:** `Authorization: Bearer <token>`

#### `GET /api/host/listings`
Annonces de l'hôte connecté

**Headers:** `Authorization: Bearer <token>`

---

### Réservations

#### `GET /api/bookings`
Réservations de l'utilisateur

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "listing_id": 5,
    "listing_title": "Appartement Vue Mer",
    "listing_image": "https://...",
    "date_from": "2024-12-10",
    "date_to": "2024-12-15",
    "guests": 2,
    "total_price": 42500,
    "confirmation_code": "VDZ-A1B2C3",
    "status": "confirmed",
    "created_at": "2024-12-05T10:00:00Z"
  }
]
```

#### `POST /api/bookings`
Créer une réservation

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "listing_id": 5,
  "date_from": "2024-12-10",
  "date_to": "2024-12-15",
  "guests": 2,
  "payment_method": "card"  // 'card' ou 'edahabia'
}
```

**Validations:**
- Vérifie que l'annonce existe et est active
- Vérifie la disponibilité (pas de conflit de dates)
- Calcule le prix total automatiquement

**Response:**
```json
{
  "id": 1,
  "confirmation_code": "VDZ-A1B2C3",
  "total_price": 42500,
  "status": "confirmed"
}
```

#### `PATCH /api/bookings/:id/cancel`
Annuler une réservation

**Headers:** `Authorization: Bearer <token>`

#### `GET /api/host/bookings`
Réservations reçues (pour les hôtes)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": 1,
    "listing_title": "Appartement Vue Mer",
    "guest_name": "John Doe",
    "guest_email": "john@example.com",
    "date_from": "2024-12-10",
    "date_to": "2024-12-15",
    "guests": 2,
    "total_price": 42500,
    "status": "confirmed"
  }
]
```

---

### Favoris

#### `GET /api/favorites`
Liste des favoris

**Headers:** `Authorization: Bearer <token>`

#### `POST /api/favorites/:listingId`
Ajouter/Retirer un favori (toggle)

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{ "isFavorite": true }  // ou false si retiré
```

---

### Avis

#### `GET /api/listings/:id/reviews`
Avis d'une annonce

**Response:**
```json
[
  {
    "id": 1,
    "user_name": "John Doe",
    "rating": 5,
    "comment": "Excellent séjour !",
    "created_at": "2024-12-01T14:30:00Z"
  }
]
```

#### `POST /api/listings/:id/reviews`
Laisser un avis

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "rating": 5,  // 1-5
  "comment": "Excellent séjour !"  // optionnel
}
```

**Validations:**
- L'utilisateur doit avoir réservé l'annonce
- Un seul avis par utilisateur par annonce
- La note moyenne de l'annonce est mise à jour automatiquement

---

### Hôte

#### `POST /api/become-host`
Devenir hôte

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "phone": "+213 555 123 456",
  "description": "Hôte expérimenté avec...",
  "id_document": "url-ou-base64"  // optionnel
}
```

**Response:**
```json
{
  "user": { "id": 1, "is_host": 1, ... },
  "token": "nouveau-token-avec-statut-hote",
  "message": "Félicitations ! Vous êtes maintenant hôte."
}
```

---

### Statistiques

#### `GET /api/stats`
Statistiques utilisateur

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "bookings": 5,
  "favorites": 12,
  "totalSpent": 125000
}
```

#### `GET /api/host/stats`
Statistiques hôte

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "listings": 3,
  "bookings": 25,
  "totalEarned": 450000
}
```

---

### Équipements

#### `GET /api/amenities`
Liste de tous les équipements disponibles

**Response:**
```json
[
  { "id": 1, "name": "WiFi", "icon": null },
  { "id": 2, "name": "Climatisation", "icon": null },
  ...
]
```

---

## 🔒 Sécurité

### Authentification
- Les routes protégées utilisent le middleware `authenticateToken`
- Le token JWT doit être envoyé dans l'en-tête: `Authorization: Bearer <token>`
- Durée de validité du token: 7 jours

### Autorisations
- Les utilisateurs ne peuvent modifier/supprimer que leurs propres données
- Les hôtes peuvent créer des annonces
- Les admins ont tous les droits

### Mots de passe
- Hashés avec bcryptjs (10 rounds)
- Jamais stockés en clair

### Upload de fichiers
- Limite: 5 MB par image
- Types acceptés: JPEG, PNG, WebP
- Noms de fichiers: UUID pour éviter les conflits

---

## 🧪 Comptes de Test

Après `npm run init-db`, ces comptes sont disponibles:

| Email | Mot de passe | Role | Hôte |
|-------|--------------|------|------|
| admin@voyagedz.com | admin123 | admin | ✅ |
| host@voyagedz.com | host123 | user | ✅ |
| ismael@example.com | user123 | user | ❌ |

---

## 🛠️ Scripts npm

```bash
npm start        # Démarrer le serveur
npm run dev      # Mode développement (auto-reload avec --watch)
npm run init-db  # Initialiser/réinitialiser la base de données
```

---

## 📝 Variables d'environnement

Par défaut, le serveur utilise:
- `PORT=3000`
- `JWT_SECRET=voyage-dz-secret-key-2024`

Pour production, créez un fichier `.env`:
```
PORT=8080
JWT_SECRET=votre-secret-ultra-securise
```

---

## 🐛 Débogage

- Les logs du serveur s'affichent dans le terminal
- SQLite verbose mode est activé (`{ verbose: console.log }`)
- Utilisez un client SQLite (DB Browser) pour inspecter la BDD
- Routes API testables avec Postman ou curl

---

## 🚀 Production

Pour déployer en production:
1. Changez `JWT_SECRET` dans les variables d'environnement
2. Utilisez un serveur de processus (PM2)
3. Configurez un reverse proxy (Nginx)
4. Activez HTTPS
5. Mettez en place des backups de `database.sqlite`
