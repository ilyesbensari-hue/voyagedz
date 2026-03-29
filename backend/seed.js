const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database setup
const dbPath = path.join(__dirname, '../data/database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('🌱 Starting Database Seeding...');

// ====================
// INITIALIZATION
// ====================

// Copied from init-db.js (simplified) to ensure tables exist
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'user',
        is_host BOOLEAN DEFAULT 0,
        host_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS cities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        image TEXT,
        description TEXT,
        lat REAL,
        lng REAL
    );

    CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL,
        city_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        price REAL NOT NULL,
        location TEXT,
        duration TEXT,
        max_guests INTEGER,
        status TEXT DEFAULT 'active',
        featured BOOLEAN DEFAULT 0,
        rating REAL DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (host_id) REFERENCES users(id),
        FOREIGN KEY (city_id) REFERENCES cities(id)
    );

    CREATE TABLE IF NOT EXISTS listing_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS amenities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        icon TEXT
    );

    CREATE TABLE IF NOT EXISTS listing_amenities (
        listing_id INTEGER NOT NULL,
        amenity_id INTEGER NOT NULL,
        PRIMARY KEY (listing_id, amenity_id),
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
        FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        listing_id INTEGER NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        guests INTEGER DEFAULT 1,
        total_price REAL NOT NULL,
        status TEXT DEFAULT 'pending', 
        confirmation_code TEXT,
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (listing_id) REFERENCES listings(id)
    );
`);

async function seed() {
    // 1. Create Host User
    console.log('Creating Host User...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    db.prepare('DELETE FROM users WHERE email = ?').run('host@voyagedz.com');

    const hostResult = db.prepare(`
        INSERT INTO users (name, email, password, role, is_host)
        VALUES (?, ?, ?, 'user', 1)
    `).run('Mohammed Host', 'host@voyagedz.com', hashedPassword);

    const hostId = hostResult.lastInsertRowid;

    // 2. Create Admin User
    console.log('Creating Admin User...');
    const adminPassword = await bcrypt.hash('admin123', salt);

    db.prepare('DELETE FROM users WHERE email = ?').run('admin@voyagedz.com');

    db.prepare(`
        INSERT INTO users (name, email, password, role, is_host)
        VALUES (?, ?, ?, 'admin', 1)
    `).run('Administrateur', 'admin@voyagedz.com', adminPassword);

    console.log('✅ Admin user created: admin@voyagedz.com / admin123');

    // 2. Create Amenities
    console.log('Creating Amenities...');
    const amenitiesList = [
        'WiFi', 'Piscine', 'Parking', 'Climatisation', 'Cuisine',
        'Vue mer', 'Plage privée', 'Patio', 'Petit-déjeuner',
        'Architecture traditionnelle', 'Spa', 'Restaurant panoramique'
    ];

    const amenityMap = {}; // name -> id
    const insertAmenity = db.prepare('INSERT OR IGNORE INTO amenities (name) VALUES (?)');
    const getAmenityId = db.prepare('SELECT id FROM amenities WHERE name = ?');

    amenitiesList.forEach(name => {
        insertAmenity.run(name);
        const row = getAmenityId.get(name);
        if (row) amenityMap[name] = row.id;
    });

    // 3. Create Cities
    console.log('Creating Cities...');
    const citiesData = [
        {
            name: 'Oran',
            slug: 'oran',
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Vue_sur_le_Port_d%27Oran.jpg/1280px-Vue_sur_le_Port_d%27Oran.jpg',
            description: 'La perle de la Méditerranée',
            lat: 35.6976,
            lng: -0.6337
        },
        {
            name: 'Tlemcen',
            slug: 'tlemcen',
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Mansourah_tlemcen.jpg/1280px-Mansourah_tlemcen.jpg',
            description: 'La perle du Maghreb, ville d\'histoire et de culture',
            lat: 34.8780,
            lng: -1.3157
        }
    ];

    const cityMap = {}; // slug -> id
    const insertCity = db.prepare(`
        INSERT OR IGNORE INTO cities (name, slug, image, description, lat, lng)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const getCityId = db.prepare('SELECT id FROM cities WHERE slug = ?');

    citiesData.forEach(city => {
        insertCity.run(city.name, city.slug, city.image, city.description, city.lat, city.lng);
        const row = getCityId.get(city.slug);
        if (row) cityMap[city.slug] = row.id;
    });

    // 4. Create Listings (From our verified data.js)
    console.log('Creating Listings...');

    const listingsData = [
        // ORAN - Logements
        {
            city: 'oran',
            title: 'Appartement Front de Mer',
            location: 'Les Andalouses, Oran',
            price: 7000,
            rating: 4.8,
            reviews: 142,
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Front_de_mer_d%27oran_2.jpg/1280px-Front_de_mer_d%27oran_2.jpg',
            description: 'Réveillez-vous face à la Méditerranée dans cet appartement moderne situé sur le célèbre Front de Mer.',
            amenities: ['WiFi', 'Climatisation', 'Vue mer', 'Plage privée', 'Parking'],
            type: 'lodging',
            maxGuests: 6,
            lat: 35.7595,
            lng: -0.7643
        },
        {
            city: 'oran',
            title: 'Riad Traditionnel Centre-Ville',
            location: 'Sidi El Houari, Oran',
            price: 6500,
            rating: 4.9,
            reviews: 87,
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sidi_El_Houari.jpg/1280px-Sidi_El_Houari.jpg',
            description: 'Riad authentique restauré dans le quartier historique de Sidi El Houari.',
            amenities: ['WiFi', 'Patio', 'Architecture traditionnelle', 'Petit-déjeuner'],
            type: 'lodging',
            maxGuests: 4,
            lat: 35.7091,
            lng: -0.6418
        },
        // ORAN - Activités
        {
            city: 'oran',
            title: 'Découverte du Fort Santa Cruz',
            location: 'Murdjajo, Oran',
            price: 1800,
            rating: 4.7,
            reviews: 221,
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Fort_Santa_Cruz_Oran.jpg/1280px-Fort_Santa_Cruz_Oran.jpg',
            description: 'Explorez le fort espagnol et profitez d\'une vue panoramique imprenable sur la baie d\'Oran.',
            type: 'activity',
            category: 'tours',
            duration: '2.5 heures',
            lat: 35.7154,
            lng: -0.6505
        },
        // TLEMCEN - Logements
        {
            city: 'tlemcen',
            title: 'Maison d\'Hôtes Andalouse',
            location: 'Centre historique, Tlemcen',
            price: 5500,
            rating: 4.9,
            reviews: 112,
            image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Mechouar_Tlemcen.jpg/1280px-Mechouar_Tlemcen.jpg',
            description: 'Séjournez dans une maison traditionnelle inspirée du Palais El Mechouar.',
            amenities: ['WiFi', 'Patio', 'Architecture traditionnelle', 'Petit-déjeuner'],
            type: 'lodging',
            maxGuests: 5,
            lat: 34.8771,
            lng: -1.3209
        }
    ];

    const insertListing = db.prepare(`
        INSERT INTO listings (
            host_id, city_id, title, description, type, category, price, 
            location, duration, max_guests, rating, reviews_count, featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertListingImage = db.prepare('INSERT INTO listing_images (listing_id, url) VALUES (?, ?)');
    const insertListingAmenity = db.prepare('INSERT INTO listing_amenities (listing_id, amenity_id) VALUES (?, ?)');

    listingsData.forEach(l => {
        const cityId = cityMap[l.city];
        if (!cityId) return;

        console.log(`Creating listing: ${l.title}`);
        const result = insertListing.run(
            hostId, cityId, l.title, l.description, l.type, l.category || null,
            l.price, l.location, l.duration || null, l.maxGuests || null,
            l.rating, l.reviews, l.featured ? 1 : 0
        );
        const listId = result.lastInsertRowid;

        // Image
        insertListingImage.run(listId, l.image);

        // Amenities
        if (l.amenities) {
            l.amenities.forEach(a => {
                if (amenityMap[a]) {
                    insertListingAmenity.run(listId, amenityMap[a]);
                }
            });
        }
    });

    console.log('✅ Seeding Complete!');
}

seed().catch(err => {
    console.error('Seeding failed:', err);
});
