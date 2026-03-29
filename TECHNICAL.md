# 🏗️ Documentation Technique - Voyage DZ

## 📁 Architecture du Projet

```
voyage-dz/
├── index.html              # Point d'entrée, structure HTML
├── styles.css              # Design System complet (5200+ lignes)
├── app.js                  # Logique JavaScript (320+ lignes)
├── data.js                 # Données mock (17 listings, 3 villes)
├── manifest.json           # Configuration PWA
├── sw.js                   # Service Worker (offline support)
├── icon-192.svg/.png       # Icône PWA 192x192
├── icon-512.svg/.png       # Icône PWA 512x512
├── icon-generator.html     # Générateur d'icônes Canvas
├── README.md               # Documentation principale
├── QUICKSTART.md           # Guide de démarrage rapide
├── FEATURES.md             # Liste des fonctionnalités
└── TECHNICAL.md            # Ce fichier
```

## 🎨 Design System

### Variables CSS (Custom Properties)

#### Couleurs
```css
--primary: #E63946        /* Rouge algérien */
--secondary: #F4A261      /* Orange désert */
--accent: #2A9D8F         /* Turquoise méditerranée */
--bg-primary: #0F0F1E     /* Background dark */
--bg-secondary: #1A1A2E   /* Cards background */
```

#### Spacing
- System de 6 tailles : xs (0.25rem) → 2xl (3rem)
- Basé sur multiples de 0.25rem

#### Border Radius
- sm: 0.5rem, md: 1rem, lg: 1.5rem, xl: 2rem

#### Shadows
- Shadows + glow effects pour glassmorphism

### Typography
- **Body** : Inter (300-800)
- **Headings** : Playfair Display (600-800)
- **Base size** : 16px

### Composants UI

1. **Cards**
   - City Card (200px height)
   - Listing Card (280px width, scroll horizontal)
   - Category Card (grid 2x2)

2. **Navigation**
   - Header (sticky, glassmorphic)
   - Bottom Nav (4 items, active state)
   
3. **Forms**
   - Search Bar (glassmorphic, blur 20px)
   - Filter Chips (pills style)

4. **Buttons**
   - Primary (gradient)
   - Icon (circular, 40px)
   - Filter (rounded square)

## 🧩 Architecture JavaScript

### Modules

#### State Management
```javascript
currentPage     // Page active
currentCity     // Ville sélectionnée (filter)
currentListing  // Listing en détail
favorites       // Array (localStorage)
```

#### Core Functions

**Render Functions**
- `renderCities()` : Affiche les 3 villes
- `renderFeaturedListings()` : Top listings (rating >= 4.8)
- `renderSearchResults(filter)` : Résultats filtrés
- `renderFavorites()` : Favoris de localStorage

**Navigation**
- `navigateTo(page)` : SPA navigation
- `selectCity(cityId)` : Filtre par ville
- `showDetail(listingId)` : Affiche détails

**Data Operations**
- `createListingCard(listing, fullWidth)` : Génère HTML
- `toggleFavorite(listingId)` : Ajoute/retire favoris

**Events**
- Search input (debounce recommendé)
- Filter chips
- Category cards
- Bottom nav

### Data Schema

#### City Object
```javascript
{
    id: 'alger',
    name: 'Alger',
    count: '120+ expériences',
    image: 'url',
    description: 'string'
}
```

#### Listing Object
```javascript
{
    id: number,
    type: 'lodging' | 'activity',
    category?: 'tours' | 'food' | 'activities',
    city: 'alger' | 'oran' | 'tlemcen',
    title: string,
    location: string,
    price: string,
    rating: number,
    reviews: number,
    duration?: string,          // Activités seulement
    maxGuests?: number,         // Logements seulement
    image: string,
    description: string,
    amenities?: string[],       // Logements
    includes?: string[]         // Activités
}
```

## 🔄 Flux de Navigation

### Page d'Accueil → Recherche
1. User clique sur ville
2. `selectCity(cityId)` appelé
3. `currentCity` mis à jour
4. `navigateTo('search')`
5. `renderSearchResults()` filtre par ville

### Recherche → Détails
1. User clique sur listing card
2. `showDetail(listingId)` appelé
3. Trouve listing dans data
4. Génère HTML détails
5. `navigateTo('detail')`

### Favoris
1. User clique icône cœur
2. `toggleFavorite(listingId)`
3. Update localStorage
4. Re-render favoris page

## 🌐 PWA Architecture

### Service Worker Strategy
- **Cache First** pour assets statiques
- **Network First** pour données dynamiques
- **Offline Fallback** pour pages

### Cache Management
```javascript
CACHE_NAME = 'voyage-dz-v1'
urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/data.js',
    '/manifest.json',
    'fonts...'
]
```

### Manifest Configuration
- **Display** : standalone (fullscreen app)
- **Orientation** : portrait
- **Start URL** : /
- **Background** : #0F0F1E
- **Theme** : #E63946

## 📱 Responsive Breakpoints

```css
/* Mobile-first (default) */
@media (min-width: 768px)   /* Tablet */
@media (min-width: 1024px)  /* Desktop */
```

### Adaptive Layouts
- Cities Grid : 1 col → 2 cols → 3 cols
- Listings Grid : 1 col → 2 cols → 3 cols
- Categories : 2x2 → 4x1

## ⚡ Performance Optimizations

### Implemented
- [x] CSS custom properties (évite inline styles)
- [x] SVG icons (pas d'image external)
- [x] Font preconnect (Google Fonts)
- [x] Lazy placeholder images (onerror fallback)
- [x] Minimal JavaScript (vanilla, no framework)
- [x] Service Worker caching

### Recommended (Future)
- [ ] Image lazy loading (Intersection Observer)
- [ ] Code splitting
- [ ] CSS purging (PurgeCSS)
- [ ] Brotli compression
- [ ] WebP images avec fallback

## 🔐 Security Considerations

### Current (Client-Only)
- localStorage (XSS vulnerable)
- No authentication
- Mock data only

### Future (With Backend)
- JWT authentication
- HTTPS only
- CORS configuration
- Input sanitization
- SQL injection prevention
- Rate limiting

## 🧪 Testing Strategy

### Manual Testing
- ✓ Navigation flows
- ✓ Search functionality
- ✓ Filters
- ✓ Responsive design
- ✓ PWA installation

### Future Automated Testing
- Unit tests (Jest)
- E2E tests (Playwright)
- Visual regression (Percy)
- Performance (Lighthouse CI)

## 📊 Browser Compatibility

### Minimum Requirements
- **Chrome/Edge** : 90+
- **Safari** : 14+
- **Firefox** : 88+
- **Mobile Safari** : iOS 14+
- **Chrome Mobile** : Latest

### Progressive Enhancement
- Service Worker : Modern browsers only
- Backdrop-filter : Fallback to solid background
- CSS Grid : Flexbox fallback

## 🚀 Deployment Options

### Static Hosting (Recommended for MVP)
- **Netlify** : Drag & Drop
- **Vercel** : CLI deploy
- **GitHub Pages** : Free hosting
- **Firebase Hosting** : Google Cloud

### Future (Full-Stack)
- **Backend** : Heroku, Railway, Render
- **Database** : MongoDB Atlas, Supabase
- **CDN** : Cloudflare, CloudFront

## 📝 Code Style

### HTML
- Semantic tags
- BEM-like naming (non strict)
- Accessibility attributes

### CSS
- Mobile-first
- Custom properties
- Utility classes minimal
- Component-based

### JavaScript
- ES6+ syntax
- Functional approach
- DRY principle
- Clear naming

## 🔗 Dependencies

### Runtime
- **None** (Vanilla JS)

### Development (Future)
- Prettier (formatting)
- ESLint (linting)
- Live Server (dev server)

## 📚 Resources & References

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

**Version** : 1.0.0 (MVP)  
**Last Updated** : Décembre 2025
