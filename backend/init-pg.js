// ==========================================
// VOYAGE DZ - PostgreSQL Schema Init
// Migrated from SQLite → Neon PostgreSQL
// ==========================================

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function init() {
    const client = await pool.connect();
    try {
        console.log('🗄️  Initializing Voyage DZ PostgreSQL Database...\n');

        // ==========================================
        // Drop & Create Tables
        // ==========================================
        await client.query(`
            DROP TABLE IF EXISTS review_photos CASCADE;
            DROP TABLE IF EXISTS reviews CASCADE;
            DROP TABLE IF EXISTS favorites CASCADE;
            DROP TABLE IF EXISTS bookings CASCADE;
            DROP TABLE IF EXISTS activity_slots CASCADE;
            DROP TABLE IF EXISTS itinerary_stops CASCADE;
            DROP TABLE IF EXISTS listing_inclusions CASCADE;
            DROP TABLE IF EXISTS listing_languages CASCADE;
            DROP TABLE IF EXISTS listing_departure_cities CASCADE;
            DROP TABLE IF EXISTS listing_amenities CASCADE;
            DROP TABLE IF EXISTS amenities CASCADE;
            DROP TABLE IF EXISTS listing_images CASCADE;
            DROP TABLE IF EXISTS listings CASCADE;
            DROP TABLE IF EXISTS languages CASCADE;
            DROP TABLE IF EXISTS cities CASCADE;
            DROP TABLE IF EXISTS conversations CASCADE;
            DROP TABLE IF EXISTS messages CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
        `);

        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
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
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP
            );

            CREATE TABLE cities (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                wilaya_code TEXT,
                description TEXT,
                image TEXT,
                latitude REAL,
                longitude REAL,
                featured INTEGER DEFAULT 0
            );

            CREATE TABLE languages (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                flag TEXT
            );

            CREATE TABLE listings (
                id SERIAL PRIMARY KEY,
                host_id INTEGER NOT NULL REFERENCES users(id),
                city_id INTEGER NOT NULL REFERENCES cities(id),
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT,
                price REAL NOT NULL,
                original_price REAL,
                location TEXT,
                image TEXT,
                duration TEXT,
                duration_hours REAL,
                duration_type TEXT,
                meeting_point TEXT,
                meeting_point_details TEXT,
                meeting_lat REAL,
                meeting_lng REAL,
                what_to_bring TEXT,
                good_to_know TEXT,
                cancellation_policy TEXT DEFAULT 'free_24h',
                cancellation_hours INTEGER DEFAULT 24,
                min_participants INTEGER DEFAULT 1,
                max_participants INTEGER,
                instant_confirmation INTEGER DEFAULT 1,
                skip_the_line INTEGER DEFAULT 0,
                is_eco_friendly INTEGER DEFAULT 0,
                max_guests INTEGER,
                rating REAL DEFAULT 0,
                reviews_count INTEGER DEFAULT 0,
                featured INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP
            );

            CREATE TABLE listing_images (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                caption TEXT
            );

            CREATE TABLE amenities (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                icon TEXT,
                category TEXT
            );

            CREATE TABLE listing_amenities (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                amenity_id INTEGER NOT NULL REFERENCES amenities(id)
            );

            CREATE TABLE listing_languages (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                language_id INTEGER NOT NULL REFERENCES languages(id),
                is_primary INTEGER DEFAULT 0
            );

            CREATE TABLE listing_departure_cities (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                city_id INTEGER NOT NULL REFERENCES cities(id),
                pickup_point TEXT,
                pickup_time TEXT,
                extra_price REAL DEFAULT 0
            );

            CREATE TABLE activity_slots (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME,
                capacity INTEGER DEFAULT 10,
                booked_count INTEGER DEFAULT 0,
                price_override REAL,
                demand_level TEXT DEFAULT 'normal',
                status TEXT DEFAULT 'available'
            );

            CREATE TABLE itinerary_stops (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                stop_order INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                duration_minutes INTEGER,
                latitude REAL,
                longitude REAL
            );

            CREATE TABLE listing_inclusions (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                item TEXT NOT NULL,
                is_included INTEGER DEFAULT 1,
                icon TEXT
            );

            CREATE TABLE bookings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                slot_id INTEGER REFERENCES activity_slots(id),
                departure_city_id INTEGER REFERENCES cities(id),
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
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, listing_id)
            );

            CREATE TABLE reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                booking_id INTEGER REFERENCES bookings(id),
                rating INTEGER NOT NULL,
                comment TEXT,
                is_verified INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE review_photos (
                id SERIAL PRIMARY KEY,
                review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
                url TEXT NOT NULL
            );

            CREATE TABLE conversations (
                id SERIAL PRIMARY KEY,
                host_id INTEGER NOT NULL REFERENCES users(id),
                guest_id INTEGER NOT NULL REFERENCES users(id),
                listing_id INTEGER NOT NULL REFERENCES listings(id),
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id),
                content TEXT NOT NULL,
                read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('✅ Tables created\n');

        // ==========================================
        // Seed Users
        // ==========================================
        const adminPwd = bcrypt.hashSync('admin123', 10);
        const hostPwd = bcrypt.hashSync('host123', 10);
        const userPwd = bcrypt.hashSync('user123', 10);

        await client.query(`
            INSERT INTO users (name, email, password, role, is_host) VALUES ($1,$2,$3,'admin',1)
            ON CONFLICT (email) DO NOTHING
        `, ['Admin', 'admin@voyagedz.com', adminPwd]);

        await client.query(`
            INSERT INTO users (name, email, password, role, is_host, phone, host_description)
            VALUES ($1,$2,$3,'user',1,$4,$5) ON CONFLICT (email) DO NOTHING
        `, ['Mohammed Hôte', 'host@voyagedz.com', hostPwd, '+213 555 123 456',
            "Guide professionnel avec 5 ans d'expérience."]);

        await client.query(`
            INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,'user')
            ON CONFLICT (email) DO NOTHING
        `, ['Ismael Bensari', 'ismael@example.com', userPwd]);

        console.log('✅ Users seeded');

        // ==========================================
        // Seed Languages
        // ==========================================
        const langs = [
            ['fr','Français','🇫🇷'], ['ar','العربية','🇩🇿'],
            ['en','English','🇬🇧'], ['es','Español','🇪🇸'],
            ['de','Deutsch','🇩🇪'], ['it','Italiano','🇮🇹'], ['kab','Taqbaylit','🏔️']
        ];
        for (const [code, name, flag] of langs) {
            await client.query(
                `INSERT INTO languages (code,name,flag) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`,
                [code, name, flag]
            );
        }
        console.log('✅ Languages seeded');

        // ==========================================
        // Seed Cities — Oran & Tlemcen uniquement
        // ==========================================
        const cities = [
            ['Oran','oran','31','La perle de la Méditerranée, ville cosmopolite et vibrante',
             'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Vue_sur_le_Port_d%27Oran.jpg/1280px-Vue_sur_le_Port_d%27Oran.jpg',35.6969,-0.6331,1],
            ['Tlemcen','tlemcen','13',"La perle du Maghreb, capitale de l'art et de la culture andalouse",
             'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Mansourah_tlemcen.jpg/1280px-Mansourah_tlemcen.jpg',34.8828,-1.3167,1],
        ];
        for (const [name,slug,wilaya,desc,img,lat,lng,featured] of cities) {
            await client.query(
                `INSERT INTO cities (name,slug,wilaya_code,description,image,latitude,longitude,featured)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (slug) DO NOTHING`,
                [name,slug,wilaya,desc,img,lat,lng,featured]
            );
        }
        console.log('✅ Cities seeded: Oran, Tlemcen');

        // ==========================================
        // Seed Amenities
        // ==========================================
        const amenities = [
            ['WiFi','📶','lodging'], ['Climatisation','❄️','lodging'],
            ['Cuisine équipée','🍳','lodging'], ['Parking','🅿️','lodging'],
            ['Piscine','🏊','lodging'], ['Jardin','🌳','lodging'],
            ['Balcon','🏠','lodging'], ['TV','📺','lodging'],
            ['Lave-linge','🧺','lodging'], ['Petit-déjeuner','🥐','lodging'],
            ['Vue mer','🌊','lodging'], ['Vue montagne','⛰️','lodging'],
            ['Terrasse','☀️','lodging'], ['Sécurité 24/7','🔒','lodging'],
            ['Ascenseur','🛗','lodging'], ['Animaux acceptés','🐕','lodging'],
            ['Guide professionnel','👨‍🏫','activity'], ['Transport inclus','🚐','activity'],
            ['Repas inclus','🍽️','activity'], ['Entrées incluses','🎫','activity'],
            ['Photos incluses','📸','activity'], ['Équipement fourni','🎒','activity'],
            ['Groupe restreint','👥','activity'], ['Accessible PMR','♿','activity'],
        ];
        for (const [name, icon, category] of amenities) {
            await client.query(
                `INSERT INTO amenities (name,icon,category) VALUES ($1,$2,$3) ON CONFLICT (name) DO NOTHING`,
                [name, icon, category]
            );
        }
        console.log('✅ Amenities seeded');

        // ==========================================
        // Seed Listings (Oran + Tlemcen)
        // ==========================================
        const host = (await client.query(`SELECT id FROM users WHERE email='host@voyagedz.com'`)).rows[0];
        const getCityId = async (slug) => {
            const r = await client.query(`SELECT id FROM cities WHERE slug=$1`, [slug]);
            return r.rows[0]?.id;
        };
        const getAmenityId = async (name) => {
            const r = await client.query(`SELECT id FROM amenities WHERE name=$1`, [name]);
            return r.rows[0]?.id;
        };
        const getLangId = async (code) => {
            const r = await client.query(`SELECT id FROM languages WHERE code=$1`, [code]);
            return r.rows[0]?.id;
        };

        const insertListing = async (data) => {
            const r = await client.query(`
                INSERT INTO listings (
                    host_id, city_id, title, description, type, category, price, original_price,
                    location, image, duration, duration_hours, duration_type,
                    meeting_point, meeting_point_details, meeting_lat, meeting_lng,
                    what_to_bring, good_to_know, cancellation_policy,
                    min_participants, max_participants, max_guests,
                    rating, reviews_count, featured, status
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,1,'active')
                RETURNING id
            `, [
                host.id, data.city_id, data.title, data.description, data.type, data.category||null,
                data.price, data.original_price||null, data.location, data.image,
                data.duration||null, data.duration_hours||null, data.duration_type||null,
                data.meeting_point||null, data.meeting_point_details||null,
                data.meeting_lat||null, data.meeting_lng||null,
                data.what_to_bring||null, data.good_to_know||null, 'free_24h',
                1, data.max_participants||null, data.max_guests||null,
                data.rating||0, data.reviews||0
            ]);
            return r.rows[0].id;
        };

        // ==========================================
        // ORAN — Hébergements
        // ==========================================
        const lodgings = [
            {
                city: 'oran', type: 'lodging',
                title: 'Appartement Vue Mer - Les Andalouses',
                location: 'Les Andalouses, Oran', price: 7500, rating: 4.9, reviews: 142,
                image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
                description: "Réveillez-vous face à la Méditerranée dans cet appartement moderne et lumineux. Accès direct à la plage, vue panoramique sur la mer. Idéal pour les familles et couples.",
                amenities: ['WiFi', 'Climatisation', 'Vue mer', 'Parking', 'Balcon', 'TV'], maxGuests: 6
            },
            {
                city: 'oran', type: 'lodging',
                title: "Villa Contemporaine - Hauts d'Oran",
                location: "Hauts d'Oran, Oran", price: 12000, rating: 4.8, reviews: 87,
                image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
                description: "Villa moderne avec piscine privée sur les hauteurs d'Oran. Vue imprenable sur la ville et la Méditerranée. Jardin paysager, barbecue, espace détente.",
                amenities: ['WiFi', 'Piscine', 'Jardin', 'Parking', 'Climatisation', 'Cuisine équipée', 'Sécurité 24/7'], maxGuests: 10
            },
            {
                city: 'oran', type: 'lodging',
                title: 'Appartement Centre-Ville Rénové',
                location: 'Plateau, Oran', price: 4500, rating: 4.7, reviews: 203,
                image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
                description: "Appartement entièrement rénové au cœur d'Oran, à deux pas du Théâtre Régional et du boulevard du Front de Mer. Transport en commun à proximité.",
                amenities: ['WiFi', 'Climatisation', 'Cuisine équipée', 'TV', 'Ascenseur'], maxGuests: 4
            },
            // ==========================================
            // TLEMCEN — Hébergements
            // ==========================================
            {
                city: 'tlemcen', type: 'lodging',
                title: "Maison d'Hôtes Andalouse — Médina",
                location: 'Centre historique, Tlemcen', price: 5500, rating: 4.9, reviews: 178,
                image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
                description: "Authentique maison andalouse restaurée au cœur de la médina de Tlemcen. Patio central avec fontaine, zelliges traditionnels, ambiance hors du temps. Petit-déjeuner berbère offert.",
                amenities: ['WiFi', 'Petit-déjeuner', 'Terrasse', 'Jardin', 'Climatisation'], maxGuests: 5
            },
            {
                city: 'tlemcen', type: 'lodging',
                title: 'Villa Mansourah avec Vue sur les Ruines',
                location: 'Mansourah, Tlemcen', price: 9000, rating: 4.8, reviews: 94,
                image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
                description: "Villa spacieuse face aux ruines médiévales de Mansourah. Cheminée en hiver, grande terrasse avec vue dégagée sur la plaine. Idéale pour un séjour culturel.",
                amenities: ['WiFi', 'Parking', 'Terrasse', 'Vue montagne', 'Cuisine équipée', 'Jardin'], maxGuests: 8
            },
            {
                city: 'tlemcen', type: 'lodging',
                title: 'Riad El Andalous — Suite Royale',
                location: 'Bab El Hadid, Tlemcen', price: 7000, rating: 5.0, reviews: 61,
                image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
                description: "Le summum du luxe andalou à Tlemcen. Suite royale avec bain maure privatif, hammam, salon maghrébin, service hôtelier complet. Une expérience unique au Maghreb.",
                amenities: ['WiFi', 'Petit-déjeuner', 'Terrasse', 'Sécurité 24/7', 'Climatisation', 'TV'], maxGuests: 2
            },
        ];

        for (const l of lodgings) {
            const cityId = await getCityId(l.city);
            const lid = await insertListing({ ...l, city_id: cityId, max_guests: l.maxGuests });
            for (const aName of l.amenities) {
                const aid = await getAmenityId(aName);
                if (aid) await client.query(
                    `INSERT INTO listing_amenities (listing_id,amenity_id) VALUES ($1,$2)`, [lid, aid]
                );
            }
        }
        console.log('✅ Lodgings seeded (Oran x3 + Tlemcen x3)');

        // ==========================================
        // ACTIVITÉS — Oran & Tlemcen
        // ==========================================
        const activities = [
            // --- ORAN ---
            {
                city: 'oran', type: 'activity', category: 'tours',
                title: 'Visite Guidée du Fort Santa Cruz & Murdjajo',
                description: "Découvrez le fort espagnol du XVIème siècle perché sur le mont Murdjajo avec une vue à 360° sur Oran, la mer et la plaine. Un guide local passionné vous raconte 500 ans d'histoire oranaise.",
                location: 'Murdjajo, Oran', price: 1800, original_price: 2200, rating: 4.8, reviews: 312,
                duration: '3h', duration_hours: 3, duration_type: 'hours',
                meeting_point: "Parking du Téléphérique, Boulevard de l'ALN",
                meeting_point_details: 'Cherchez le guide avec le drapeau vert au pied du téléphérique.',
                meeting_lat: 35.7022, meeting_lng: -0.6417,
                what_to_bring: JSON.stringify(['Chaussures de marche', 'Bouteille d\'eau', 'Coupe-vent', 'Appareil photo']),
                good_to_know: 'Le téléphérique peut être fermé par grand vent. Vêtements couvrants recommandés.',
                languages: ['fr', 'ar', 'es'], max_participants: 15,
                amenities: ['Guide professionnel', 'Transport inclus', 'Entrées incluses'],
                image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Fort_Santa_Cruz_Oran.jpg/1280px-Fort_Santa_Cruz_Oran.jpg',
                inclusions: [
                    { item: 'Guide local expert', included: 1, icon: '👨‍🏫' },
                    { item: 'Billet téléphérique A/R', included: 1, icon: '🚡' },
                    { item: 'Entrée Fort Santa Cruz', included: 1, icon: '🎫' },
                    { item: 'Repas', included: 0, icon: '🍽️' },
                    { item: 'Transport depuis Tlemcen', included: 0, icon: '🚐' },
                ],
                itinerary: [
                    { order: 1, name: 'Point de rendez-vous', desc: 'Accueil au pied du téléphérique', dur: 10 },
                    { order: 2, name: 'Montée en téléphérique', desc: 'Vue panoramique sur la baie d\'Oran', dur: 10 },
                    { order: 3, name: 'Fort Santa Cruz', desc: 'Visite complète du fort espagnol', dur: 60 },
                    { order: 4, name: 'Chapelle Santa Cruz', desc: 'Chapelle historique et panorama', dur: 30 },
                    { order: 5, name: 'Pause photo & retour', desc: 'Descente et photos souvenirs', dur: 20 },
                ],
                departure_cities: ['tlemcen'],
            },
            {
                city: 'oran', type: 'activity', category: 'food',
                title: 'Atelier Gastronomie Oranaise — Chorba & Tfina',
                description: "Plongez dans les saveurs de la cuisine oranaise avec un chef local. Apprenez à préparer les emblématiques chorba beïda, tfina pkaïla et baklawa oranaise dans une cuisine familiale authentique.",
                location: 'Quartier Sidi El Houari, Oran', price: 3500, rating: 4.9, reviews: 89,
                duration: '4h', duration_hours: 4, duration_type: 'hours',
                meeting_point: 'Place Sidi El Houari (devant la Grande Mosquée)',
                meeting_point_details: 'Arrivez 5 minutes avant. Tablier fourni sur place.',
                meeting_lat: 35.6969, meeting_lng: -0.6331,
                what_to_bring: JSON.stringify(['Tenue confortable', 'Appétit !']),
                good_to_know: 'Cuisine 100% halal. Prévenez en cas d\'allergie alimentaire.',
                languages: ['fr', 'ar'], max_participants: 8,
                amenities: ['Guide professionnel', 'Repas inclus', 'Équipement fourni', 'Groupe restreint'],
                image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
                inclusions: [
                    { item: 'Chef local expert', included: 1, icon: '👨‍🍳' },
                    { item: 'Tous ingrédients', included: 1, icon: '🛒' },
                    { item: 'Repas complet dégusté', included: 1, icon: '🍲' },
                    { item: 'Recettes imprimées', included: 1, icon: '📄' },
                    { item: 'Transport', included: 0, icon: '🚐' },
                ],
                itinerary: [
                    { order: 1, name: 'Visite du marché', desc: 'Sélection des épices et ingrédients frais', dur: 30 },
                    { order: 2, name: 'Préparation chorba', desc: 'Soupe traditionnelle oranaise', dur: 45 },
                    { order: 3, name: 'Tfina pkaïla', desc: 'Plat de résistance mijoté', dur: 60 },
                    { order: 4, name: 'Baklawa', desc: 'Pâtisserie andalouse', dur: 30 },
                    { order: 5, name: 'Dégustation', desc: 'Repas convivial en famille', dur: 45 },
                ],
                departure_cities: ['tlemcen'],
            },
            {
                city: 'oran', type: 'activity', category: 'nature',
                title: 'Plongée & Snorkeling — Côte des Andalouses',
                description: "Explorez les fonds marins cristallins de la côte oranaise. Des instructeurs certifiés PADI vous accompagnent pour découvrir posidonies, mérous et poulpes dans des eaux à 22°C.",
                location: 'Plage des Andalouses, Oran', price: 4500, rating: 4.7, reviews: 156,
                duration: '3h30', duration_hours: 3.5, duration_type: 'hours',
                meeting_point: 'Club nautique des Andalouses',
                meeting_point_details: 'Parking gratuit sur place. Vestiaires disponibles.',
                meeting_lat: 35.7200, meeting_lng: -0.7100,
                what_to_bring: JSON.stringify(['Maillot de bain', 'Serviette', 'Crème solaire']),
                good_to_know: 'Savoir nager est obligatoire. Non recommandé en cas de temps instable. Min 8 ans.',
                languages: ['fr', 'ar', 'en'], max_participants: 10,
                amenities: ['Guide professionnel', 'Équipement fourni', 'Groupe restreint'],
                image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
                inclusions: [
                    { item: 'Équipement de plongée complet', included: 1, icon: '🤿' },
                    { item: 'Instructeur certifié PADI', included: 1, icon: '👨‍🏫' },
                    { item: 'Photos sous-marines', included: 1, icon: '📸' },
                    { item: 'Déjeuner', included: 0, icon: '🍽️' },
                ],
                itinerary: [
                    { order: 1, name: 'Briefing sécurité', desc: 'Formation et équipement', dur: 30 },
                    { order: 2, name: 'Snorkeling côtier', desc: 'Exploration surface (débutants)', dur: 45 },
                    { order: 3, name: 'Plongée site Epave', desc: 'Immersion 5-8m (confirmés)', dur: 60 },
                    { order: 4, name: 'Retour & débrief', desc: 'Photos et certificat', dur: 15 },
                ],
                departure_cities: ['tlemcen'],
            },
            // --- TLEMCEN ---
            {
                city: 'tlemcen', type: 'activity', category: 'tours',
                title: "Tlemcen Royale — Mosquée, Médersas & Art Zellij",
                description: "La visite incontournable de Tlemcen : Grande Mosquée almoravide, medersa Tachfiniya, palais El Mechouar et les souks de potiers. Un guide historien vous révèle 1000 ans d'histoire arabo-andalouse.",
                location: 'Vieille ville, Tlemcen', price: 2200, original_price: 2800, rating: 5.0, reviews: 287,
                duration: '4h', duration_hours: 4, duration_type: 'hours',
                meeting_point: 'Grande Mosquée de Tlemcen (Place Emir Abdelkader)',
                meeting_point_details: 'Retrouvez le guide avec l\'étendard VoyageDZ devant l\'entrée principale.',
                meeting_lat: 34.8828, meeting_lng: -1.3167,
                what_to_bring: JSON.stringify(['Vêtements couvrants (mosquées)', 'Chaussures confortables', 'Appareil photo']),
                good_to_know: 'Respect du code vestimentaire dans les lieux de culte. Entrée mosquée gratuite.',
                languages: ['fr', 'ar', 'en', 'es'], max_participants: 12,
                amenities: ['Guide professionnel', 'Entrées incluses', 'Groupe restreint'],
                image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&q=80',
                inclusions: [
                    { item: 'Guide historien certifié', included: 1, icon: '👨‍🏫' },
                    { item: 'Entrée Medersa Tachfiniya', included: 1, icon: '🎫' },
                    { item: 'Thé à la menthe en cours de visite', included: 1, icon: '🍵' },
                    { item: 'Transport depuis Oran', included: 0, icon: '🚐' },
                    { item: 'Repas', included: 0, icon: '🍽️' },
                ],
                itinerary: [
                    { order: 1, name: 'Grande Mosquée', desc: 'Chef-d\'œuvre almoravide du XIe siècle', dur: 45 },
                    { order: 2, name: 'Medersa Tachfiniya', desc: 'École coranique mérinide, zelliges fascinants', dur: 40 },
                    { order: 3, name: 'Palais El Mechouar', desc: 'Ancienne résidence royale zianide', dur: 30 },
                    { order: 4, name: 'Souk des potiers', desc: 'Artisanat traditionnel, shopping', dur: 35 },
                    { order: 5, name: 'Café panoramique', desc: 'Thé et vue sur les remparts', dur: 30 },
                ],
                departure_cities: ['oran'],
            },
            {
                city: 'tlemcen', type: 'activity', category: 'nature',
                title: 'Randonnée Cascades de Lalla Setti',
                description: "Trek de moyenne montagne jusqu'aux cascades et au plateau de Lalla Setti. Vue époustouflante à 1015m sur Tlemcen et la plaine jusqu'à la frontière marocaine. Forêts de cèdres et orchidées sauvages.",
                location: 'Lalla Setti, Tlemcen', price: 1500, rating: 4.8, reviews: 134,
                duration: '5h', duration_hours: 5, duration_type: 'hours',
                meeting_point: 'Parking Forêt de Lalla Setti',
                meeting_point_details: 'Départ groupé à 8h00 précises. Covoiturage organisé sur demande.',
                meeting_lat: 34.9100, meeting_lng: -1.3300,
                what_to_bring: JSON.stringify(['Chaussures de randonnée', 'Eau 2L minimum', 'Snacks', 'Protection solaire', 'Vêtements en couches']),
                good_to_know: 'Niveau physique moyen requis. Dénivelé 450m. Annulé si pluie forte.',
                languages: ['fr', 'ar'], max_participants: 12,
                amenities: ['Guide professionnel', 'Équipement fourni', 'Groupe restreint'],
                image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80',
                inclusions: [
                    { item: 'Guide de montagne local', included: 1, icon: '🧗' },
                    { item: 'Pique-nique traditionnel', included: 1, icon: '🧺' },
                    { item: 'Bâtons de randonnée', included: 1, icon: '🥾' },
                    { item: 'Transport depuis Tlemcen-ville', included: 0, icon: '🚐' },
                ],
                itinerary: [
                    { order: 1, name: 'Départ forêt', desc: 'Sentier des cèdres (pente douce)', dur: 60 },
                    { order: 2, name: 'Cascades', desc: 'Pause photos et eau fraîche', dur: 30 },
                    { order: 3, name: 'Plateau Lalla Setti', desc: 'Vue panoramique & pique-nique', dur: 60 },
                    { order: 4, name: 'Retour sentier est', desc: 'Descente via les vignes', dur: 60 },
                ],
                departure_cities: ['oran'],
            },
            {
                city: 'tlemcen', type: 'activity', category: 'tours',
                title: 'Mansourah & Agadir — Cités Médiévales Perdues',
                description: "Explorez les ruines grandioses de Mansourah (XIVe s.) et la cité aghlabide d'Agadir. Deux cités médiévales à ciel ouvert à 3km de Tlemcen, décor de cinéma, époustouflant au coucher du soleil.",
                location: 'Mansourah, Tlemcen', price: 1800, rating: 4.9, reviews: 198,
                duration: '3h', duration_hours: 3, duration_type: 'hours',
                meeting_point: 'Minaret de Mansourah (route de Mansourah)',
                meeting_point_details: 'Parking gratuit disponible devant le minaret.',
                meeting_lat: 34.9020, meeting_lng: -1.3390,
                what_to_bring: JSON.stringify(['Eau', 'Chapeau', 'Chaussures fermées', 'Appareil photo']),
                good_to_know: 'Visite tôt le matin ou en fin d\'après-midi recommandée pour la luminosité photographique.',
                languages: ['fr', 'ar', 'en'], max_participants: 15,
                amenities: ['Guide professionnel', 'Groupe restreint', 'Photos incluses'],
                image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&q=80',
                inclusions: [
                    { item: 'Guide archéologue local', included: 1, icon: '🏛️' },
                    { item: 'Accès aux deux sites', included: 1, icon: '🎫' },
                    { item: 'Thé berbère au coucher du soleil', included: 1, icon: '🍵' },
                    { item: 'Transport', included: 0, icon: '🚐' },
                ],
                itinerary: [
                    { order: 1, name: 'Minaret de Mansourah', desc: 'Tour du XIVe s., symbole de la cité', dur: 30 },
                    { order: 2, name: 'Ruines du Palais', desc: 'Enceinte royale mérinide', dur: 45 },
                    { order: 3, name: 'Site d\'Agadir', desc: 'Cité plus ancienne, céramiques', dur: 45 },
                    { order: 4, name: 'Coucher de soleil', desc: 'Thé et photos magiques', dur: 30 },
                ],
                departure_cities: ['oran'],
            },
        ];

        for (const a of activities) {
            const cityId = await getCityId(a.city);
            const lid = await insertListing({ ...a, city_id: cityId });
            for (const langCode of a.languages) {
                const langId = await getLangId(langCode);
                if (langId) await client.query(
                    `INSERT INTO listing_languages (listing_id,language_id,is_primary) VALUES ($1,$2,$3)`,
                    [lid, langId, a.languages.indexOf(langCode) === 0 ? 1 : 0]
                );
            }
            for (const inc of a.inclusions) {
                await client.query(
                    `INSERT INTO listing_inclusions (listing_id,item,is_included,icon) VALUES ($1,$2,$3,$4)`,
                    [lid, inc.item, inc.included, inc.icon]
                );
            }
            for (const stop of a.itinerary) {
                await client.query(
                    `INSERT INTO itinerary_stops (listing_id,stop_order,name,description,duration_minutes) VALUES ($1,$2,$3,$4,$5)`,
                    [lid, stop.order, stop.name, stop.desc, stop.dur]
                );
            }
            for (const aName of a.amenities) {
                const aid = await getAmenityId(aName);
                if (aid) await client.query(
                    `INSERT INTO listing_amenities (listing_id,amenity_id) VALUES ($1,$2)`, [lid, aid]
                );
            }
            for (const depSlug of a.departure_cities) {
                const depId = await getCityId(depSlug);
                if (depId) await client.query(
                    `INSERT INTO listing_departure_cities (listing_id,city_id,pickup_point,pickup_time) VALUES ($1,$2,$3,$4)`,
                    [lid, depId, `Point de départ ${depSlug}`, '07:00']
                );
            }

            // Créneaux pour les 45 prochains jours (matin + après-midi)
            const today = new Date();
            for (let i = 1; i <= 45; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const isWeekend = d.getDay() === 5 || d.getDay() === 6; // Vendredi/Samedi
                await client.query(
                    `INSERT INTO activity_slots (listing_id,date,start_time,end_time,capacity,demand_level) VALUES ($1,$2,'09:00','13:00',$3,$4)`,
                    [lid, dateStr, a.max_participants || 12, isWeekend ? 'high' : 'normal']
                );
                await client.query(
                    `INSERT INTO activity_slots (listing_id,date,start_time,end_time,capacity,demand_level) VALUES ($1,$2,'14:00','18:00',$3,'normal')`,
                    [lid, dateStr, a.max_participants || 12]
                );
            }
        }
        console.log('✅ Activities seeded (Oran x3 + Tlemcen x3)');
        console.log('\n🎉 Database initialized successfully!');
        console.log('📧 Admin: admin@voyagedz.com / admin123');
        console.log('📧 Host:  host@voyagedz.com / host123');
        console.log('📧 User:  ismael@example.com / user123');
        console.log('\n🏙️  Villes: Oran, Tlemcen');
        console.log('🏠 Hébergements: 6 (3 Oran + 3 Tlemcen)');
        console.log('🎯 Activités: 6 (3 Oran + 3 Tlemcen)');

    } finally {
        client.release();
        await pool.end();
    }
}

init().catch(err => {
    console.error('❌ Init failed:', err);
    process.exit(1);
});

