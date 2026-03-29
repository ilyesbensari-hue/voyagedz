// ==========================================
// VOYAGE DZ - Database Initialization v2.0
// ==========================================
// Enhanced Activity System (GetYourGuide Style)
// ==========================================

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Ensure data directory exists
const dbDir = './data';
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database('./data/database.sqlite');

console.log('🗄️  Initializing Voyage DZ Database v2.0...\n');

// ==========================================
// Create Tables
// ==========================================

db.exec(`
    -- Drop existing tables (order matters for foreign keys)
    DROP TABLE IF EXISTS review_photos;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS favorites;
    DROP TABLE IF EXISTS bookings;
    DROP TABLE IF EXISTS activity_slots;
    DROP TABLE IF EXISTS itinerary_stops;
    DROP TABLE IF EXISTS listing_inclusions;
    DROP TABLE IF EXISTS listing_languages;
    DROP TABLE IF EXISTS listing_departure_cities;
    DROP TABLE IF EXISTS listing_amenities;
    DROP TABLE IF EXISTS amenities;
    DROP TABLE IF EXISTS listing_images;
    DROP TABLE IF EXISTS listings;
    DROP TABLE IF EXISTS languages;
    DROP TABLE IF EXISTS cities;
    DROP TABLE IF EXISTS users;

    -- ==========================================
    -- Users table
    -- ==========================================
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        google_id TEXT UNIQUE,
        facebook_id TEXT UNIQUE,
        phone TEXT,
        role TEXT DEFAULT 'user',
        is_host INTEGER DEFAULT 0,
        host_description TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    );

    -- ==========================================
    -- Cities table
    -- ==========================================
    CREATE TABLE IF NOT EXISTS cities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        wilaya_code TEXT,
        description TEXT,
        image TEXT,
        latitude REAL,
        longitude REAL,
        featured INTEGER DEFAULT 0
    );

    -- ==========================================
    -- Languages table (for guides)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS languages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        flag TEXT
    );

    -- ==========================================
    -- Listings table (enhanced for activities)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL,
        city_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        price REAL NOT NULL,
        original_price REAL,
        location TEXT,
        image TEXT,
        
        -- Duration fields (for activities)
        duration TEXT,
        duration_hours REAL,
        duration_type TEXT,
        
        -- Meeting point (for activities)
        meeting_point TEXT,
        meeting_point_details TEXT,
        meeting_lat REAL,
        meeting_lng REAL,
        
        -- Activity specifics
        what_to_bring TEXT,
        good_to_know TEXT,
        cancellation_policy TEXT DEFAULT 'free_24h',
        cancellation_hours INTEGER DEFAULT 24,
        min_participants INTEGER DEFAULT 1,
        max_participants INTEGER,
        instant_confirmation INTEGER DEFAULT 1,
        skip_the_line INTEGER DEFAULT 0,
        is_eco_friendly INTEGER DEFAULT 0,
        
        -- General fields
        max_guests INTEGER,
        rating REAL DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        
        FOREIGN KEY (host_id) REFERENCES users(id),
        FOREIGN KEY (city_id) REFERENCES cities(id)
    );

    -- ==========================================
    -- Listing images table (with ordering)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS listing_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        caption TEXT,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    -- ==========================================
    -- Amenities table
    -- ==========================================
    CREATE TABLE IF NOT EXISTS amenities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        icon TEXT,
        category TEXT
    );

    -- ==========================================
    -- Listing amenities junction table
    -- ==========================================
    CREATE TABLE IF NOT EXISTS listing_amenities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        amenity_id INTEGER NOT NULL,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
        FOREIGN KEY (amenity_id) REFERENCES amenities(id)
    );

    -- ==========================================
    -- Listing languages (for guides)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS listing_languages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        language_id INTEGER NOT NULL,
        is_primary INTEGER DEFAULT 0,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
        FOREIGN KEY (language_id) REFERENCES languages(id)
    );

    -- ==========================================
    -- Listing departure cities (for activities)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS listing_departure_cities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        city_id INTEGER NOT NULL,
        pickup_point TEXT,
        pickup_time TEXT,
        extra_price REAL DEFAULT 0,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
        FOREIGN KEY (city_id) REFERENCES cities(id)
    );

    -- ==========================================
    -- Activity slots (time slots for booking)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS activity_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        capacity INTEGER DEFAULT 10,
        booked_count INTEGER DEFAULT 0,
        price_override REAL,
        demand_level TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'available',
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    -- ==========================================
    -- Itinerary stops (for guided tours)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS itinerary_stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        stop_order INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        duration_minutes INTEGER,
        latitude REAL,
        longitude REAL,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    -- ==========================================
    -- Listing inclusions (included/excluded)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS listing_inclusions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        item TEXT NOT NULL,
        is_included INTEGER DEFAULT 1,
        icon TEXT,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    -- ==========================================
    -- Bookings table (enhanced for slots)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        slot_id INTEGER,
        departure_city_id INTEGER,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        guests INTEGER DEFAULT 1,
        adults INTEGER DEFAULT 1,
        children INTEGER DEFAULT 0,
        total_price REAL NOT NULL,
        payment_method TEXT,
        confirmation_code TEXT UNIQUE,
        status TEXT DEFAULT 'pending',
        special_requests TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (listing_id) REFERENCES listings(id),
        FOREIGN KEY (slot_id) REFERENCES activity_slots(id),
        FOREIGN KEY (departure_city_id) REFERENCES cities(id)
    );

    -- ==========================================
    -- Favorites table
    -- ==========================================
    CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, listing_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (listing_id) REFERENCES listings(id)
    );

    -- ==========================================
    -- Reviews table (enhanced)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        booking_id INTEGER,
        rating INTEGER NOT NULL,
        comment TEXT,
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (listing_id) REFERENCES listings(id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    -- ==========================================
    -- Review photos (community photos)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS review_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );

    -- ==========================================
    -- Conversations table (messaging)
    -- ==========================================
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL,
        guest_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES users(id),
        FOREIGN KEY (guest_id) REFERENCES users(id),
        FOREIGN KEY (listing_id) REFERENCES listings(id)
    );

    -- ==========================================
    -- Messages table
    -- ==========================================
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id)
    );
`);

console.log('✅ Tables created\n');

// ==========================================
// Seed Data
// ==========================================

// Create admin user
const adminPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role, is_host)
    VALUES ('Admin', 'admin@voyagedz.com', ?, 'admin', 1)
`).run(adminPassword);

// Create demo host (guide)
const hostPassword = bcrypt.hashSync('host123', 10);
db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role, is_host, phone, host_description)
    VALUES ('Mohammed Hôte', 'host@voyagedz.com', ?, 'user', 1, '+213 555 123 456', 'Guide professionnel avec 5 ans d''expérience. Passionné par l''histoire et la culture algérienne.')
`).run(hostPassword);

// Create demo user
const userPassword = bcrypt.hashSync('user123', 10);
db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role)
    VALUES ('Ismael Bensari', 'ismael@example.com', ?, 'user')
`).run(userPassword);

console.log('✅ Users created');

// ==========================================
// Languages
// ==========================================
const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇩🇿' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'kab', name: 'Taqbaylit', flag: '🏔️' }
];

const insertLanguage = db.prepare('INSERT OR IGNORE INTO languages (code, name, flag) VALUES (?, ?, ?)');
languages.forEach(lang => insertLanguage.run(lang.code, lang.name, lang.flag));
console.log('✅ Languages created');

// ==========================================
// Cities (enhanced with coordinates)
// ==========================================
const cities = [
    {
        name: 'Alger',
        slug: 'alger',
        wilaya_code: '16',
        description: 'La capitale blanche face à la Méditerranée',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Algiers_coast_panorama.jpg/1280px-Algiers_coast_panorama.jpg',
        latitude: 36.7538,
        longitude: 3.0588
    },
    {
        name: 'Oran',
        slug: 'oran',
        wilaya_code: '31',
        description: 'La perle de la Méditerranée',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Vue_sur_le_Port_d%27Oran.jpg/1280px-Vue_sur_le_Port_d%27Oran.jpg',
        latitude: 35.6969,
        longitude: -0.6331
    },
    {
        name: 'Tlemcen',
        slug: 'tlemcen',
        wilaya_code: '13',
        description: 'La perle du Maghreb, ville d\'histoire et de culture',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Mansourah_tlemcen.jpg/1280px-Mansourah_tlemcen.jpg',
        latitude: 34.8828,
        longitude: -1.3167
    },
    {
        name: 'Constantine',
        slug: 'constantine',
        wilaya_code: '25',
        description: 'La ville des ponts suspendus',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Constantine_Algeria.jpg/1280px-Constantine_Algeria.jpg',
        latitude: 36.3650,
        longitude: 6.6147
    },
    {
        name: 'Béjaïa',
        slug: 'bejaia',
        wilaya_code: '06',
        description: 'Bougie, entre mer et montagnes',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Bejaia_port.jpg/1280px-Bejaia_port.jpg',
        latitude: 36.7509,
        longitude: 5.0567
    },
    {
        name: 'Ghardaïa',
        slug: 'ghardaia',
        wilaya_code: '47',
        description: 'La vallée du M\'Zab, patrimoine mondial UNESCO',
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Ghardaia.jpg/1280px-Ghardaia.jpg',
        latitude: 32.4900,
        longitude: 3.6700
    }
];

const insertCity = db.prepare('INSERT OR IGNORE INTO cities (name, slug, wilaya_code, description, image, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)');
cities.forEach(city => insertCity.run(city.name, city.slug, city.wilaya_code, city.description, city.image, city.latitude, city.longitude));
console.log('✅ Cities created');

// ==========================================
// Amenities (with categories)
// ==========================================
const amenities = [
    // Lodging amenities
    { name: 'WiFi', icon: '📶', category: 'lodging' },
    { name: 'Climatisation', icon: '❄️', category: 'lodging' },
    { name: 'Cuisine équipée', icon: '🍳', category: 'lodging' },
    { name: 'Parking', icon: '🅿️', category: 'lodging' },
    { name: 'Piscine', icon: '🏊', category: 'lodging' },
    { name: 'Jardin', icon: '🌳', category: 'lodging' },
    { name: 'Balcon', icon: '🏠', category: 'lodging' },
    { name: 'TV', icon: '📺', category: 'lodging' },
    { name: 'Lave-linge', icon: '🧺', category: 'lodging' },
    { name: 'Petit-déjeuner', icon: '🥐', category: 'lodging' },
    { name: 'Vue mer', icon: '🌊', category: 'lodging' },
    { name: 'Vue montagne', icon: '⛰️', category: 'lodging' },
    { name: 'Terrasse', icon: '☀️', category: 'lodging' },
    { name: 'Sécurité 24/7', icon: '🔒', category: 'lodging' },
    { name: 'Ascenseur', icon: '🛗', category: 'lodging' },
    { name: 'Animaux acceptés', icon: '🐕', category: 'lodging' },
    // Activity amenities
    { name: 'Guide professionnel', icon: '👨‍🏫', category: 'activity' },
    { name: 'Transport inclus', icon: '🚐', category: 'activity' },
    { name: 'Repas inclus', icon: '🍽️', category: 'activity' },
    { name: 'Entrées incluses', icon: '🎫', category: 'activity' },
    { name: 'Photos incluses', icon: '📸', category: 'activity' },
    { name: 'Équipement fourni', icon: '🎒', category: 'activity' },
    { name: 'Groupe restreint', icon: '👥', category: 'activity' },
    { name: 'Accessible PMR', icon: '♿', category: 'activity' }
];

const insertAmenity = db.prepare('INSERT OR IGNORE INTO amenities (name, icon, category) VALUES (?, ?, ?)');
amenities.forEach(a => insertAmenity.run(a.name, a.icon, a.category));
console.log('✅ Amenities created');

// ==========================================
// Get IDs for seeding
// ==========================================
const getCityId = db.prepare('SELECT id FROM cities WHERE slug = ?');
const getHostId = db.prepare('SELECT id FROM users WHERE email = ?');
const getLanguageId = db.prepare('SELECT id FROM languages WHERE code = ?');
const getAmenityId = db.prepare('SELECT id FROM amenities WHERE name = ?');
const host = getHostId.get('host@voyagedz.com');

// ==========================================
// Listings - Lodging
// ==========================================
const lodgings = [
    {
        city: 'alger', type: 'lodging', title: 'Appartement Vue Mer - Baie d\'Alger',
        location: 'Alger Centre, Alger', price: 8500, rating: 4.9, reviews: 127,
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
        description: 'Superbe appartement avec vue panoramique sur la baie d\'Alger. À deux pas de la Casbah et du front de mer.',
        amenities: ['WiFi', 'Climatisation', 'Cuisine équipée', 'Parking', 'Balcon', 'TV'],
        maxGuests: 4
    },
    {
        city: 'alger', type: 'lodging', title: 'Villa Moderne Hydra',
        location: 'Hydra, Alger', price: 15000, rating: 5.0, reviews: 89,
        image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
        description: 'Villa luxueuse dans le quartier résidentiel d\'Hydra. Jardin privé et piscine.',
        amenities: ['WiFi', 'Piscine', 'Jardin', 'Parking', 'Sécurité 24/7', 'Cuisine équipée'],
        maxGuests: 8
    },
    {
        city: 'oran', type: 'lodging', title: 'Appartement Front de Mer',
        location: 'Les Andalouses, Oran', price: 7000, rating: 4.8, reviews: 142,
        image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
        description: 'Réveillez-vous face à la Méditerranée dans cet appartement moderne.',
        amenities: ['WiFi', 'Climatisation', 'Vue mer', 'Parking'],
        maxGuests: 6
    },
    {
        city: 'tlemcen', type: 'lodging', title: 'Maison d\'Hôtes Andalouse',
        location: 'Centre historique, Tlemcen', price: 5500, rating: 4.9, reviews: 112,
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
        description: 'Maison traditionnelle andalouse au cœur de la médina de Tlemcen.',
        amenities: ['WiFi', 'Petit-déjeuner', 'Terrasse'],
        maxGuests: 5
    }
];

const insertListing = db.prepare(`
    INSERT INTO listings (
        host_id, city_id, title, description, type, category, price, location, image,
        duration, duration_hours, duration_type, meeting_point, meeting_point_details,
        meeting_lat, meeting_lng, what_to_bring, good_to_know, cancellation_policy,
        min_participants, max_participants, max_guests, rating, reviews_count, featured, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')
`);

const insertListingAmenity = db.prepare('INSERT OR IGNORE INTO listing_amenities (listing_id, amenity_id) VALUES (?, ?)');
const insertListingLanguage = db.prepare('INSERT OR IGNORE INTO listing_languages (listing_id, language_id, is_primary) VALUES (?, ?, ?)');
const insertInclusion = db.prepare('INSERT INTO listing_inclusions (listing_id, item, is_included, icon) VALUES (?, ?, ?, ?)');
const insertItinerary = db.prepare('INSERT INTO itinerary_stops (listing_id, stop_order, name, description, duration_minutes) VALUES (?, ?, ?, ?, ?)');
const insertDepartureCity = db.prepare('INSERT INTO listing_departure_cities (listing_id, city_id, pickup_point, pickup_time) VALUES (?, ?, ?, ?)');

// Insert lodgings
lodgings.forEach(listing => {
    const cityId = getCityId.get(listing.city).id;
    const result = insertListing.run(
        host.id, cityId, listing.title, listing.description, listing.type,
        null, listing.price, listing.location, listing.image,
        null, null, null, null, null, null, null, null, null, 'flexible',
        1, listing.maxGuests, listing.maxGuests, listing.rating, listing.reviews
    );

    listing.amenities.forEach(amenityName => {
        const amenity = getAmenityId.get(amenityName);
        if (amenity) insertListingAmenity.run(result.lastInsertRowid, amenity.id);
    });
});

console.log('✅ Lodgings created');

// ==========================================
// Listings - Activities (GetYourGuide Style)
// ==========================================
const activities = [
    {
        city: 'alger',
        type: 'activity',
        category: 'tours',
        title: 'Visite Guidée de la Casbah d\'Alger',
        description: 'Découvrez l\'histoire fascinante de la Casbah d\'Alger, classée au patrimoine mondial de l\'UNESCO. Parcourez les ruelles étroites, visitez les palais ottomans et imprégnez-vous de l\'atmosphère unique de ce quartier historique.',
        location: 'Casbah, Alger',
        price: 2500,
        original_price: 3000,
        rating: 4.8,
        reviews: 312,
        duration: '3 heures',
        duration_hours: 3,
        duration_type: 'hours',
        meeting_point: 'Place des Martyrs, devant la Mosquée Ketchaoua',
        meeting_point_details: 'Cherchez le guide avec le drapeau vert VoyageDZ. Arrivez 10 minutes avant le départ.',
        meeting_lat: 36.7871,
        meeting_lng: 3.0599,
        what_to_bring: JSON.stringify(['Chaussures confortables', 'Bouteille d\'eau', 'Appareil photo', 'Protection solaire']),
        good_to_know: 'Les ruelles sont étroites et pentues. Activité déconseillée aux personnes à mobilité réduite. En été, privilégiez les créneaux du matin.',
        languages: ['fr', 'ar', 'en'],
        max_participants: 12,
        inclusions: [
            { item: 'Guide local expert', included: true, icon: '👨‍🏫' },
            { item: 'Thé à la menthe traditionnel', included: true, icon: '🍵' },
            { item: 'Entrée Palais des Raïs', included: true, icon: '🎫' },
            { item: 'Transport', included: false, icon: '🚐' },
            { item: 'Repas', included: false, icon: '🍽️' }
        ],
        itinerary: [
            { name: 'Mosquée Ketchaoua', description: 'Point de départ - mosquée ottomane emblématique', duration: 15 },
            { name: 'Palais des Raïs (Bastion 23)', description: 'Visite du complexe palatial restauré', duration: 45 },
            { name: 'Ruelles de la Casbah', description: 'Promenade dans le dédale des ruelles', duration: 60 },
            { name: 'Maison traditionnelle', description: 'Découverte de l\'architecture intérieure', duration: 30 },
            { name: 'Terrasse panoramique', description: 'Vue imprenable sur la baie d\'Alger', duration: 30 }
        ],
        departure_cities: ['oran', 'constantine', 'bejaia'],
        amenities: ['Guide professionnel', 'Entrées incluses', 'Groupe restreint'],
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Casbah_d%27Alger.jpg/800px-Casbah_d%27Alger.jpg'
    },
    {
        city: 'oran',
        type: 'activity',
        category: 'tours',
        title: 'Découverte du Fort Santa Cruz et Chapelle',
        description: 'Montez au sommet du Murdjajo pour explorer le fort espagnol Santa Cruz et la chapelle Notre-Dame du Salut. Profitez d\'une vue panoramique exceptionnelle sur la ville d\'Oran et la Méditerranée.',
        location: 'Murdjajo, Oran',
        price: 1800,
        rating: 4.7,
        reviews: 221,
        duration: '2h30',
        duration_hours: 2.5,
        duration_type: 'hours',
        meeting_point: 'Parking du téléphérique, Boulevard de l\'ALN',
        meeting_point_details: 'RDV au pied du téléphérique. Le ticket est inclus dans le prix.',
        meeting_lat: 35.7022,
        meeting_lng: -0.6417,
        what_to_bring: JSON.stringify(['Chaussures de marche', 'Coupe-vent', 'Appareil photo']),
        good_to_know: 'Prévoyez une veste car il peut faire frais en altitude. La montée en téléphérique offre déjà une vue magnifique !',
        languages: ['fr', 'ar', 'es'],
        max_participants: 15,
        inclusions: [
            { item: 'Guide local', included: true, icon: '👨‍🏫' },
            { item: 'Billet téléphérique A/R', included: true, icon: '🚡' },
            { item: 'Boisson rafraîchissante', included: true, icon: '🥤' },
            { item: 'Repas', included: false, icon: '🍽️' }
        ],
        itinerary: [
            { name: 'Téléphérique', description: 'Montée panoramique vers le Murdjajo', duration: 10 },
            { name: 'Fort Santa Cruz', description: 'Visite du fort espagnol du XVIe siècle', duration: 45 },
            { name: 'Chapelle Santa Cruz', description: 'Découverte de ce lieu de pèlerinage', duration: 30 },
            { name: 'Point de vue', description: 'Pause photo avec vue sur Oran', duration: 30 },
            { name: 'Descente', description: 'Retour en téléphérique', duration: 10 }
        ],
        departure_cities: ['alger', 'tlemcen'],
        amenities: ['Guide professionnel', 'Transport inclus'],
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Fort_Santa_Cruz_Oran.jpg/1280px-Fort_Santa_Cruz_Oran.jpg'
    },
    {
        city: 'ghardaia',
        type: 'activity',
        category: 'tours',
        title: 'Circuit Vallée du M\'Zab - 2 Jours',
        description: 'Immersion complète dans la vallée du M\'Zab, inscrite au patrimoine mondial de l\'UNESCO. Visitez les cinq ksour (Ghardaïa, Beni Isguen, Melika, Bounoura, El Atteuf) et découvrez l\'architecture mozabite unique.',
        location: 'Ghardaïa',
        price: 15000,
        rating: 4.9,
        reviews: 89,
        duration: '2 jours',
        duration_hours: 48,
        duration_type: 'days',
        meeting_point: 'Aéroport de Ghardaïa ou Hôtel partenaire',
        meeting_point_details: 'Transfert depuis l\'aéroport inclus. Hébergement en maison d\'hôtes traditionnelle.',
        meeting_lat: 32.4900,
        meeting_lng: 3.6700,
        what_to_bring: JSON.stringify(['Vêtements modestes', 'Protection solaire', 'Chapeau', 'Chaussures fermées']),
        good_to_know: 'Tenue modeste obligatoire (épaules et genoux couverts). Beni Isguen est une ville sainte avec des règles spécifiques que le guide vous expliquera.',
        languages: ['fr', 'ar'],
        max_participants: 8,
        inclusions: [
            { item: 'Guide mozabite local', included: true, icon: '👨‍🏫' },
            { item: '1 nuit en maison d\'hôtes', included: true, icon: '🏠' },
            { item: 'Petit-déjeuner + Dîner', included: true, icon: '🍽️' },
            { item: 'Transferts locaux', included: true, icon: '🚐' },
            { item: 'Entrées sites', included: true, icon: '🎫' },
            { item: 'Vol/Train vers Ghardaïa', included: false, icon: '✈️' },
            { item: 'Déjeuners', included: false, icon: '🥗' }
        ],
        itinerary: [
            { name: 'Jour 1 - Ghardaïa', description: 'Visite du ksar principal et du marché', duration: 180 },
            { name: 'Jour 1 - Beni Isguen', description: 'Découverte de la ville sainte', duration: 120 },
            { name: 'Jour 1 - Coucher de soleil', description: 'Vue panoramique depuis Bounoura', duration: 60 },
            { name: 'Jour 2 - El Atteuf', description: 'Plus ancien ksar de la vallée', duration: 90 },
            { name: 'Jour 2 - Melika', description: 'Cimetière coloré et architecture', duration: 60 }
        ],
        departure_cities: ['alger', 'oran', 'constantine'],
        amenities: ['Guide professionnel', 'Transport inclus', 'Repas inclus', 'Groupe restreint'],
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Ghardaia.jpg/1280px-Ghardaia.jpg'
    },
    {
        city: 'bejaia',
        type: 'activity',
        category: 'activities',
        title: 'Randonnée et Baignade aux Aiguades',
        description: 'Journée nature dans le parc national de Gouraya. Randonnée jusqu\'aux criques secrètes des Aiguades, baignade dans des eaux cristallines et pique-nique face à la mer.',
        location: 'Parc National de Gouraya, Béjaïa',
        price: 3500,
        rating: 4.9,
        reviews: 156,
        duration: 'Journée complète',
        duration_hours: 8,
        duration_type: 'hours',
        meeting_point: 'Entrée du Parc National de Gouraya',
        meeting_point_details: 'Parking disponible à l\'entrée. Rendez-vous à 8h30 pour profiter de la fraîcheur matinale.',
        meeting_lat: 36.7700,
        meeting_lng: 5.0833,
        what_to_bring: JSON.stringify(['Maillot de bain', 'Serviette', 'Chaussures de randonnée', 'Crème solaire', 'Chapeau', 'Bouteille d\'eau 1.5L']),
        good_to_know: 'Niveau de difficulté : modéré. Prévoir de bonnes chaussures car le sentier est rocailleux par endroits. Non recommandé aux enfants de moins de 10 ans.',
        languages: ['fr', 'kab', 'ar'],
        max_participants: 10,
        inclusions: [
            { item: 'Guide accompagnateur', included: true, icon: '👨‍🏫' },
            { item: 'Pique-nique local', included: true, icon: '🥪' },
            { item: 'Masque et tuba', included: true, icon: '🤿' },
            { item: 'Photos souvenir', included: true, icon: '📸' },
            { item: 'Transport vers le parc', included: false, icon: '🚐' }
        ],
        itinerary: [
            { name: 'Départ randonnée', description: 'Sentier côtier avec vues sur la mer', duration: 90 },
            { name: 'Crique des Aiguades', description: 'Baignade et snorkeling', duration: 120 },
            { name: 'Pique-nique', description: 'Repas traditionnel kabyle', duration: 60 },
            { name: 'Exploration', description: 'Découverte des criques voisines', duration: 90 },
            { name: 'Retour', description: 'Sentier panoramique', duration: 60 }
        ],
        departure_cities: ['alger'],
        amenities: ['Guide professionnel', 'Équipement fourni', 'Repas inclus', 'Photos incluses'],
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80'
    }
];

// Insert activities
activities.forEach(activity => {
    const cityId = getCityId.get(activity.city).id;
    const result = insertListing.run(
        host.id, cityId, activity.title, activity.description, activity.type,
        activity.category, activity.price, activity.location, activity.image,
        activity.duration, activity.duration_hours, activity.duration_type,
        activity.meeting_point, activity.meeting_point_details,
        activity.meeting_lat, activity.meeting_lng,
        activity.what_to_bring, activity.good_to_know, 'free_24h',
        1, activity.max_participants, activity.max_participants,
        activity.rating, activity.reviews
    );

    const listingId = result.lastInsertRowid;

    // Add languages
    activity.languages.forEach((langCode, index) => {
        const lang = getLanguageId.get(langCode);
        if (lang) insertListingLanguage.run(listingId, lang.id, index === 0 ? 1 : 0);
    });

    // Add inclusions
    activity.inclusions.forEach(inc => {
        insertInclusion.run(listingId, inc.item, inc.included ? 1 : 0, inc.icon);
    });

    // Add itinerary
    activity.itinerary.forEach((stop, index) => {
        insertItinerary.run(listingId, index + 1, stop.name, stop.description, stop.duration);
    });

    // Add departure cities
    activity.departure_cities.forEach(citySlug => {
        const dCity = getCityId.get(citySlug);
        if (dCity) {
            insertDepartureCity.run(listingId, dCity.id, `Point de départ ${citySlug}`, '07:00');
        }
    });

    // Add amenities
    activity.amenities.forEach(amenityName => {
        const amenity = getAmenityId.get(amenityName);
        if (amenity) insertListingAmenity.run(listingId, amenity.id);
    });
});

console.log('✅ Activities created');

// ==========================================
// Create sample activity slots for next 30 days
// ==========================================
const insertSlot = db.prepare(`
    INSERT INTO activity_slots (listing_id, date, start_time, end_time, capacity, demand_level)
    VALUES (?, ?, ?, ?, ?, ?)
`);

// Get first activity listing
const firstActivity = db.prepare("SELECT id, duration_hours, max_participants FROM listings WHERE type = 'activity' LIMIT 1").get();
if (firstActivity) {
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // Morning slot
        insertSlot.run(firstActivity.id, dateStr, '09:00', '12:00', firstActivity.max_participants || 10, i % 7 === 0 ? 'high' : 'normal');

        // Afternoon slot
        insertSlot.run(firstActivity.id, dateStr, '14:00', '17:00', firstActivity.max_participants || 10, 'normal');
    }
    console.log('✅ Activity slots created (30 days)');
}

// ==========================================
// Done
// ==========================================

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║       🎉 Database v2.0 initialized successfully!                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  NEW FEATURES:                                                     ║
║  ─────────────────────────────────────────────────────────────     ║
║  ✓ Languages table (guide languages)                              ║
║  ✓ Activity slots (time-based booking)                            ║
║  ✓ Itinerary stops (tour waypoints)                               ║
║  ✓ Listing inclusions (what's included/excluded)                  ║
║  ✓ Departure cities (pickup points)                               ║
║  ✓ Review photos (community gallery)                              ║
║  ✓ Enhanced listings (meeting point, duration type, etc.)         ║
║                                                                    ║
║  Demo accounts:                                                    ║
║  ─────────────────────────────────────────────────────────────     ║
║  Admin:  admin@voyagedz.com / admin123                            ║
║  Host:   host@voyagedz.com / host123                              ║
║  User:   ismael@example.com / user123                             ║
║                                                                    ║
║  Next: Run 'npm start' to start the server                        ║
║                                                                    ║
╚══════════════════════════════════════════════════════════════════╝
`);

db.close();
