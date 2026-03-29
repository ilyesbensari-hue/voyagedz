# 🎨 Guide de Personnalisation

## Modifier les Couleurs

Ouvrez `styles.css` et modifiez les variables CSS (lignes 1-30) :

```css
:root {
    /* Couleurs principales */
    --primary: #E63946;      /* Votre couleur principale */
    --secondary: #F4A261;    /* Couleur secondaire */
    --accent: #2A9D8F;       /* Couleur d'accent */
    
    /* Backgrounds */
    --bg-primary: #0F0F1E;   /* Fond principal */
    --bg-secondary: #1A1A2E; /* Fond des cards */
}
```

### Exemples de Palettes

**Palette Bleue (Mer)** :
```css
--primary: #0077B6;
--secondary: #00B4D8;
--accent: #90E0EF;
```

**Palette Verte (Nature)** :
```css
--primary: #2D6A4F;
--secondary: #52B788;
--accent: #95D5B2;
```

**Palette Violette (Moderne)** :
```css
--primary: #7209B7;
--secondary: #B5179E;
--accent: #F72585;
```

## Ajouter une Nouvelle Ville

### 1. Ajouter les données dans `data.js`

```javascript
// Dans l'array cities
{
    id: 'constantine',
    name: 'Constantine',
    count: '75+ expériences',
    image: 'URL_IMAGE',
    description: 'La ville des ponts suspendus'
}
```

### 2. Ajouter des listings pour cette ville

```javascript
// Dans l'array listings
{
    id: 18,
    type: 'lodging',
    city: 'constantine',
    title: 'Appartement Vue Pont Sidi M\'Cid',
    location: 'Centre-ville, Constantine',
    price: '7,500 DA',
    rating: 4.8,
    reviews: 95,
    image: 'URL_IMAGE',
    description: 'Description du logement...',
    amenities: ['WiFi', 'Climatisation', 'Vue'],
    maxGuests: 4
}
```

## Changer le Nom de l'Application

### 1. Dans `index.html` (ligne 9)
```html
<title>Votre Nom - Découvrez l'Algérie</title>
```

### 2. Dans `manifest.json`
```json
{
    "name": "Votre Nom",
    "short_name": "VotreNom"
}
```

### 3. Dans les en-têtes (logo)
Cherchez `.logo` dans `index.html` et remplacez "Voyage DZ"

## Modifier les Prix

### Changer la devise

Dans `data.js`, remplacez tous les `DA` par votre devise :
```javascript
price: '8,500 EUR'  // Euros
price: '$85'        // Dollars
```

### Ajouter la fonction de formatage

Dans `app.js`, utilisez la fonction `formatPrice()` :
```javascript
function formatPrice(price, currency = 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency
    }).format(price);
}
```

## Ajouter une Nouvelle Catégorie

### 1. Dans `index.html`, section catégories
```html
<div class="category-card" data-category="culture">
    <div class="category-icon">🏛️</div>
    <div class="category-name">Culture</div>
</div>
```

### 2. Dans `app.js`, fonction de filtrage
```javascript
if (filter === 'culture') {
    return l.type === 'activity' && l.category === 'culture';
}
```

### 3. Dans `data.js`, ajouter des listings avec cette catégorie
```javascript
{
    type: 'activity',
    category: 'culture',
    // ...
}
```

## Personnaliser les Animations

Dans `styles.css`, cherchez les `@keyframes` :

```css
/* Modifier la vitesse */
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(40px); /* Plus grand = plus lent */
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Changer la durée */
.hero-title {
    animation: slideUp 1s ease; /* 0.6s → 1s */
}
```

## Ajouter une Page

### 1. Créer la structure HTML dans `index.html`
```html
<div id="about-page" class="page">
    <div class="page-header">
        <h2 class="page-title">À Propos</h2>
    </div>
    <div class="page-content">
        <!-- Votre contenu -->
    </div>
</div>
```

### 2. Ajouter le bouton de navigation
```html
<button class="nav-item" data-page="about">
    <svg><!-- Icône --></svg>
    <span>À Propos</span>
</button>
```

### 3. Pas besoin de JS supplémentaire !
La fonction `setupNavigation()` gère automatiquement les nouvelles pages.

## Modifier les Polices

### 1. Changer les Google Fonts dans `index.html`
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&family=Montserrat:wght@700&display=swap" rel="stylesheet">
```

### 2. Mettre à jour dans `styles.css`
```css
body {
    font-family: 'Poppins', sans-serif;
}

.hero-title, .section-title {
    font-family: 'Montserrat', serif;
}
```

## Ajouter des Images Locales

### 1. Créer un dossier `images/`
```
voyage-dz/
├── images/
│   ├── alger.jpg
│   ├── oran.jpg
│   └── tlemcen.jpg
```

### 2. Mettre à jour dans `data.js`
```javascript
{
    id: 'alger',
    image: 'images/alger.jpg',  // Au lieu de l'URL
}
```

## Modifier le Mode Clair/Sombre

### Ajouter un toggle dans `index.html`
```html
<button class="icon-btn" id="theme-toggle">🌙</button>
```

### Dans `app.js`
```javascript
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', 
        document.body.classList.contains('light-mode') ? 'light' : 'dark'
    );
});
```

### Dans `styles.css`
```css
body.light-mode {
    --bg-primary: #FFFFFF;
    --bg-secondary: #F5F5F5;
    --text-primary: #1A1A1A;
    --text-secondary: #666666;
}
```

## Personnaliser le Service Worker

Dans `sw.js`, modifiez la stratégie de cache :

```javascript
// Cache First (plus rapide, pas toujours à jour)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// Network First (toujours à jour, plus lent)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});
```

## Optimisation des Images

### Utiliser unsplash avec des paramètres
```javascript
image: 'https://images.unsplash.com/photo-ID?w=800&q=80&fm=webp'
```

### Ajouter du lazy loading
```html
<img src="placeholder.jpg" 
     data-src="real-image.jpg" 
     loading="lazy">
```

## Ajouter Google Analytics

Dans `index.html`, avant `</head>` :
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Bonnes Pratiques

✅ **Toujours tester** après chaque modification  
✅ **Sauvegarder** une version avant de modifier  
✅ **Commenter** vos modifications dans le code  
✅ **Valider** le CSS et HTML (W3C Validator)  
✅ **Tester** sur mobile après modifications  

---

**Astuce** : Utilisez l'inspecteur du navigateur (F12) pour tester les modifications en temps réel avant de les appliquer au code !
